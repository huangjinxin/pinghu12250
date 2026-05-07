/**
 * 孤儿文件关联脚本（修正版）
 * 将 uploads 中无数据库记录的文件以"勤学好问"用户名义创建记录
 * - images → Dynamic(photo) 展示在 /photos
 * - audios → RuleSubmission(背诗词古文) 展示在 /works 朗诵tab
 * - photos → Dynamic(photo) 展示在 /photos
 */
const prisma = require('../src/lib/prisma');
const fs = require('fs');
const path = require('path');

const UPLOADS = '/app/uploads';
const PHOTOS = '/photos';

async function main() {
  const bot = await prisma.user.findUnique({ where: { username: 'echo-bot' } });
  if (!bot) { console.error('echo-bot 用户不存在'); return; }
  const botId = bot.id;
  console.log(`Bot ID: ${botId}`);

  // 收集已引用的文件
  const referenced = new Set();
  (await prisma.dynamic.findMany({ select: { images: true } }))
    .forEach(d => (d.images || []).forEach(img => referenced.add(img)));
  (await prisma.homework.findMany({ select: { images: true } }))
    .forEach(h => (h.images || []).forEach(img => referenced.add(img)));
  (await prisma.ruleSubmission.findMany({ select: { images: true, audios: true } }))
    .forEach(s => { (s.images||[]).forEach(f => referenced.add(f)); (s.audios||[]).forEach(f => referenced.add(f)); });
  (await prisma.user.findMany({ where: { avatar: { not: null } }, select: { avatar: true } }))
    .forEach(u => referenced.add(u.avatar));

  console.log(`数据库已引用 ${referenced.size} 个文件`);

  // ========== 1. images → Dynamic(photo) 展示在 /photos ==========
  const imageFiles = scanDir(path.join(UPLOADS, 'images'));
  const orphanImages = imageFiles.filter(f => !referenced.has(`/uploads/images/${f}`));
  console.log(`\nimages: ${imageFiles.length} 总, ${orphanImages.length} 孤儿`);

  let imgCount = 0;
  const imgBatch = 9; // photos 页面每条最多9张
  for (let i = 0; i < orphanImages.length; i += imgBatch) {
    const batch = orphanImages.slice(i, i + imgBatch);
    const images = batch.map(f => `/uploads/images/${f}`);
    const ts = extractTimestamp(batch[0]);
    await prisma.dynamic.create({
      data: {
        authorId: botId,
        dynamicType: 'photo',
        content: `待归档照片 #${Math.floor(i / imgBatch) + 1}`,
        images,
        isPublic: true,
        createdAt: ts,
        updatedAt: ts,
      }
    });
    imgCount++;
  }
  console.log(`  → 创建 ${imgCount} 条 Dynamic(photo)`);

  // ========== 2. photos → Dynamic(photo) 展示在 /photos ==========
  const photoFiles = scanPhotos(PHOTOS);
  const orphanPhotos = photoFiles.filter(f => !referenced.has(f.url));
  console.log(`\nphotos: ${photoFiles.length} 总, ${orphanPhotos.length} 孤儿`);

  let photoCount = 0;
  for (let i = 0; i < orphanPhotos.length; i += imgBatch) {
    const batch = orphanPhotos.slice(i, i + imgBatch);
    await prisma.dynamic.create({
      data: {
        authorId: botId,
        dynamicType: 'photo',
        content: `待归档照片 #${imgCount + Math.floor(i / imgBatch) + 1}`,
        images: batch.map(p => p.url),
        isPublic: true,
        createdAt: batch[0].mtime,
        updatedAt: batch[0].mtime,
      }
    });
    photoCount++;
  }
  console.log(`  → 创建 ${photoCount} 条 Dynamic(photo)`);

  // ========== 3. audios → RuleSubmission(背诗词古文) 展示在 /works 朗诵tab ==========
  const audioFiles = scanDir(path.join(UPLOADS, 'audios'));
  const orphanAudios = audioFiles.filter(f => !referenced.has(`/uploads/audios/${f}`));
  console.log(`\naudios: ${audioFiles.length} 总, ${orphanAudios.length} 孤儿`);

  // 朗诵模板: 背诗词古文
  const reciteTemplate = await prisma.ruleTemplate.findFirst({
    where: { name: '背诗词古文', status: 'ENABLED' }
  });
  if (!reciteTemplate) {
    console.log('  ⚠️ 未找到"背诗词古文"模板，跳过音频关联');
  } else {
    for (const f of orphanAudios) {
      const ts = extractTimestamp(f);
      await prisma.ruleSubmission.create({
        data: {
          userId: botId,
          templateId: reciteTemplate.id,
          content: '',
          images: [],
          audios: [`/uploads/audios/${f}`],
          status: 'APPROVED',
          createdAt: ts,
          updatedAt: ts,
        }
      });
    }
    console.log(`  → 创建 ${orphanAudios.length} 条 RuleSubmission(朗诵)`);
  }

  // ========== 4. HTMLWork — 已有24条在12月备份中，检查是否有更多 ==========
  const existingHtml = await prisma.hTMLWork.count();
  console.log(`\nHTMLWork: 已有 ${existingHtml} 条记录（来自12月备份）`);

  console.log('\n✅ 孤儿文件关联完成');
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => !f.startsWith('.') && fs.statSync(path.join(dir, f)).isFile());
}

function scanPhotos(baseDir) {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;
  const years = fs.readdirSync(baseDir).filter(d => /^\d{4}$/.test(d));
  for (const year of years) {
    const yDir = path.join(baseDir, year);
    const months = fs.readdirSync(yDir).filter(d => /^\d{2}$/.test(d));
    for (const month of months) {
      const dir = path.join(yDir, month);
      for (const f of fs.readdirSync(dir).filter(f => !f.startsWith('.'))) {
        const stat = fs.statSync(path.join(dir, f));
        if (stat.isFile()) results.push({ url: `/photos-static/${year}/${month}/${f}`, mtime: stat.mtime });
      }
    }
  }
  return results;
}

function extractTimestamp(filename) {
  const match = filename.match(/^(\d{13})/);
  if (match) return new Date(parseInt(match[1]));
  return new Date();
}

main().catch(console.error).finally(() => prisma.$disconnect());
