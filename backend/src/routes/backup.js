/**
 * 数据库备份管理路由（仅管理员）
 * - 列出/下载/删除备份文件
 * - 手动触发备份（通过 Prisma 连接导出）
 * - 读取自动备份状态
 */
const router = require('express').Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const prisma = require('../lib/prisma');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BACKUP_DIR = '/backups';
const STATUS_FILE = path.join(BACKUP_DIR, 'status.json');
const DB_PREFIX = 'children_growth_';

function writeStatus(success, file, size, error) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.writeFileSync(STATUS_FILE, JSON.stringify({
      success, time: new Date().toISOString(), file, size, error
    }));
  } catch (e) { console.error('[Backup] 写入状态失败:', e.message); }
}

// GET /api/backup/list
router.get('/list', authenticate, isAdmin, async (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return res.json({ success: true, data: [] });
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(DB_PREFIX) && f.endsWith('.sql.gz'))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        const m = f.match(/(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
        const createdAt = m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : stat.mtime.toISOString();
        return { filename: f, size: stat.size, sizeHuman: fmtSize(stat.size), createdAt };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ success: true, data: files });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/backup/status
router.get('/status', authenticate, isAdmin, async (req, res) => {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      return res.json({ success: true, data: JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8')) });
    }
    res.json({ success: true, data: { success: null, time: null, file: '', size: '', error: '无备份记录' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/backup/trigger
router.post('/trigger', authenticate, isAdmin, async (req, res) => {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const now = new Date();
    const ts = `${now.getFullYear()}${p(now.getMonth()+1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
    const filename = `${DB_PREFIX}${ts}.sql.gz`;
    const gzPath = path.join(BACKUP_DIR, filename);

    // 获取所有表
    const tables = await prisma.$queryRawUnsafe(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
      ORDER BY tablename
    `);

    let sql = `-- Backup: ${now.toISOString()} (${tables.length} tables)\nSET client_encoding = 'UTF8';\n\n`;

    for (const { tablename } of tables) {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${tablename}"`);
      if (!rows.length) continue;

      const cols = Object.keys(rows[0]);
      const colList = cols.map(c => `"${c}"`).join(', ');
      sql += `-- ${tablename}: ${rows.length} rows\n`;

      for (const row of rows) {
        const vals = cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'boolean') return v ? 'true' : 'false';
          if (typeof v === 'number' || typeof v === 'bigint') return String(v);
          if (v instanceof Date) return `'${v.toISOString()}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        }).join(', ');
        sql += `INSERT INTO "${tablename}" (${colList}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
      }
      sql += '\n';
    }

    const gz = zlib.gzipSync(Buffer.from(sql, 'utf-8'));
    fs.writeFileSync(gzPath, gz);

    const size = fmtSize(gz.length);
    writeStatus(true, filename, size, '');

    // 清理7天前
    const cutoff = Date.now() - 7 * 86400000;
    fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(DB_PREFIX) && f.endsWith('.sql.gz'))
      .forEach(f => {
        const fp = path.join(BACKUP_DIR, f);
        if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp);
      });

    console.log(`[Backup] 完成: ${filename} (${size}, ${tables.length}表)`);
    res.json({ success: true, data: { file: filename, size, tables: tables.length } });
  } catch (error) {
    console.error('[Backup] 失败:', error.message);
    writeStatus(false, '', '', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/backup/download/:filename
router.get('/download/:filename', authenticate, isAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename.startsWith(DB_PREFIX) || !filename.endsWith('.sql.gz') || filename.includes('..'))
      return res.status(400).json({ success: false, error: '无效文件名' });
    const fp = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(fp)) return res.status(404).json({ success: false, error: '文件不存在' });
    res.download(fp, filename);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/backup/:filename
router.delete('/:filename', authenticate, isAdmin, async (req, res) => {
  try {
    const { filename } = req.params;
    if (!filename.startsWith(DB_PREFIX) || !filename.endsWith('.sql.gz') || filename.includes('..'))
      return res.status(400).json({ success: false, error: '无效文件名' });
    const fp = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(fp)) return res.status(404).json({ success: false, error: '文件不存在' });
    fs.unlinkSync(fp);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function p(n) { return String(n).padStart(2, '0'); }
function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(1) + ' GB';
}

module.exports = router;
