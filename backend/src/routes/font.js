/**
 * 字体管理路由
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { fontUpload, fontDir } = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

// ========== 公开路由（不需要登录） ==========

// 获取字体文件（用于前端加载，所有用户都可访问公开字体）
router.get('/:id/file', async (req, res) => {
  try {
    const font = await prisma.userFont.findUnique({
      where: { id: req.params.id }
    });

    if (!font) {
      return res.status(404).json({ success: false, error: '字体不存在' });
    }

    // 使用绝对路径
    const filePath = path.resolve(fontDir, font.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: '字体文件不存在' });
    }

    // 设置正确的 Content-Type
    const ext = path.extname(font.filePath).toLowerCase();
    const mimeTypes = {
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2'
    };

    // 设置 CORS 头，允许跨域加载字体
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 缓存1年
    res.sendFile(filePath);
  } catch (error) {
    console.error('获取字体文件失败:', error);
    res.status(500).json({ success: false, error: '获取字体文件失败' });
  }
});

// ========== 需要登录的路由 ==========
router.use(authenticate);

// 获取所有公开字体列表（所有用户上传的字体大家一起用）
router.get('/', async (req, res) => {
  try {
    const fonts = await prisma.userFont.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    // 标记当前用户的默认字体
    const fontsWithDefault = fonts.map(font => ({
      ...font,
      isDefault: font.userId === req.user.id && font.isDefault,
      isOwner: font.userId === req.user.id,
      uploaderName: font.user?.username || '未知用户'
    }));

    res.json({ success: true, data: fontsWithDefault });
  } catch (error) {
    console.error('获取字体列表失败:', error);
    res.status(500).json({ success: false, error: '获取字体列表失败' });
  }
});

// 上传字体
router.post('/', fontUpload.single('font'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '请选择字体文件' });
    }

    const { name } = req.body;
    const fontName = name || path.basename(req.file.originalname, path.extname(req.file.originalname));

    // 检查是否有默认字体
    const hasDefault = await prisma.userFont.findFirst({
      where: { userId: req.user.id, isDefault: true }
    });

    const font = await prisma.userFont.create({
      data: {
        userId: req.user.id,
        name: fontName,
        fileName: req.file.originalname,
        filePath: req.file.filename,
        fileSize: req.file.size,
        isDefault: !hasDefault // 第一个字体自动设为默认
      }
    });

    res.json({ success: true, data: font });
  } catch (error) {
    console.error('上传字体失败:', error);
    // 删除已上传的文件
    if (req.file) {
      const filePath = path.join(fontDir, req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ success: false, error: '上传字体失败' });
  }
});

// 删除字体
router.delete('/:id', async (req, res) => {
  try {
    const font = await prisma.userFont.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!font) {
      return res.status(404).json({ success: false, error: '字体不存在' });
    }

    // 删除文件
    const filePath = path.join(fontDir, font.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 删除数据库记录
    await prisma.userFont.delete({ where: { id: font.id } });

    // 如果删除的是默认字体，设置另一个为默认
    if (font.isDefault) {
      const anotherFont = await prisma.userFont.findFirst({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' }
      });
      if (anotherFont) {
        await prisma.userFont.update({
          where: { id: anotherFont.id },
          data: { isDefault: true }
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除字体失败:', error);
    res.status(500).json({ success: false, error: '删除字体失败' });
  }
});

// 设为默认字体
router.put('/:id/default', async (req, res) => {
  try {
    const font = await prisma.userFont.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!font) {
      return res.status(404).json({ success: false, error: '字体不存在' });
    }

    // 取消其他默认
    await prisma.userFont.updateMany({
      where: { userId: req.user.id, isDefault: true },
      data: { isDefault: false }
    });

    // 设置新默认
    const updated = await prisma.userFont.update({
      where: { id: font.id },
      data: { isDefault: true }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('设置默认字体失败:', error);
    res.status(500).json({ success: false, error: '设置默认字体失败' });
  }
});

module.exports = router;
