/**
 * 迁移脚本：将 PoetryWork 数据迁移到 CreativeWork（诗词文章栏目）
 * 安全：不删除原数据，仅复制
 */
const prisma = require('../src/lib/prisma');

async function main() {
  const poetryCat = await prisma.category.findUnique({ where: { slug: 'poetry' } });
  if (!poetryCat) {
    console.error('找不到 poetry 栏目');
    process.exit(1);
  }

  // 获取所有 PoetryWork
  const poetryWorks = await prisma.poetryWork.findMany({
    include: { likes: true }
  });

  console.log(`找到 ${poetryWorks.length} 条 PoetryWork 数据`);

  // 检查已迁移的（通过 title + authorId 去重）
  const existing = await prisma.creativeWork.findMany({
    where: { categoryId: poetryCat.id },
    select: { title: true, authorId: true }
  });
  const existingSet = new Set(existing.map(e => `${e.authorId}:${e.title}`));

  let migrated = 0, skipped = 0;

  for (const pw of poetryWorks) {
    const key = `${pw.authorId}:${pw.title}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    // 映射状态
    const statusMap = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' };

    const cw = await prisma.creativeWork.create({
      data: {
        authorId: pw.authorId,
        categoryId: poetryCat.id,
        title: pw.title,
        type: '诗', // 旧数据默认为"诗"
        htmlCode: pw.htmlCode,
        status: statusMap[pw.status] || 'PENDING',
        reviewReason: pw.reviewReason,
        createdAt: pw.createdAt,
        updatedAt: pw.updatedAt,
      }
    });

    // 迁移点赞
    for (const like of pw.likes) {
      try {
        await prisma.creativeWorkLike.create({
          data: {
            userId: like.userId,
            workId: cw.id,
            isLike: like.isLike,
            createdAt: like.createdAt,
          }
        });
      } catch (e) {
        // 忽略重复点赞
      }
    }

    migrated++;
  }

  // 更新栏目名称
  await prisma.category.update({
    where: { slug: 'poetry' },
    data: { name: '诗词文章' }
  });

  console.log(`迁移完成: ${migrated} 条新增, ${skipped} 条跳过（已存在）`);
  console.log('栏目名称已更新: 唐诗宋词 → 诗词文章');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
