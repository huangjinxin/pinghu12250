/**
 * 数据迁移脚本：将 PoetryWork 和 HTMLWork 迁移到 CreativeWork
 *
 * 运行方式：docker exec children-growth-backend node scripts/migrate-creative-works.js
 */

const prisma = require('../src/lib/prisma');

// 预置栏目配置
const PRESET_CATEGORIES = [
  {
    name: '唐诗宋词',
    slug: 'poetry',
    description: '古诗词创作与展示',
    icon: '📜',
    points: 5,
    sortOrder: 1,
  },
  {
    name: 'HTML作品',
    slug: 'html-work',
    description: 'HTML/CSS/JS 创意作品',
    icon: '💻',
    points: 5,
    sortOrder: 2,
  },
  {
    name: '工具箱',
    slug: 'toolbox',
    description: '实用工具与小应用',
    icon: '🔧',
    points: 5,
    sortOrder: 3,
  },
  {
    name: '其他',
    slug: 'other',
    description: '其他创意内容',
    icon: '📦',
    points: 5,
    sortOrder: 99,
  },
];

// 将 HTMLWork 的三段代码合并为单个 HTML 文件
function mergeHtmlCode(htmlCode, cssCode, jsCode) {
  // 如果已经是完整的 HTML 文档，尝试注入 CSS 和 JS
  if (htmlCode.includes('<!DOCTYPE') || htmlCode.includes('<html')) {
    let merged = htmlCode;

    // 注入 CSS
    if (cssCode && cssCode.trim()) {
      const styleTag = `<style>\n${cssCode}\n</style>`;
      if (merged.includes('</head>')) {
        merged = merged.replace('</head>', `${styleTag}\n</head>`);
      } else if (merged.includes('<body')) {
        merged = merged.replace('<body', `${styleTag}\n<body`);
      } else {
        merged = styleTag + '\n' + merged;
      }
    }

    // 注入 JS
    if (jsCode && jsCode.trim()) {
      const scriptTag = `<script>\n${jsCode}\n</script>`;
      if (merged.includes('</body>')) {
        merged = merged.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        merged = merged + '\n' + scriptTag;
      }
    }

    return merged;
  }

  // 构建完整的 HTML 文档
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>作品</title>
  ${cssCode && cssCode.trim() ? `<style>\n${cssCode}\n</style>` : ''}
</head>
<body>
${htmlCode || ''}
${jsCode && jsCode.trim() ? `<script>\n${jsCode}\n</script>` : ''}
</body>
</html>`;
}

// PoetryWorkStatus 到 CreativeWorkStatus 的映射
const STATUS_MAP = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

async function migrate() {
  console.log('===== 开始数据迁移 =====\n');

  try {
    // 1. 创建预置栏目
    console.log('1. 创建预置栏目...');
    const categoryMap = {};

    for (const cat of PRESET_CATEGORIES) {
      const existing = await prisma.category.findUnique({
        where: { slug: cat.slug },
      });

      if (existing) {
        console.log(`   - 栏目 "${cat.name}" 已存在，跳过`);
        categoryMap[cat.slug] = existing.id;
      } else {
        const created = await prisma.category.create({ data: cat });
        console.log(`   - 创建栏目 "${cat.name}"`);
        categoryMap[cat.slug] = created.id;
      }
    }
    console.log('');

    // 2. 迁移 PoetryWork
    console.log('2. 迁移 PoetryWork 数据...');
    const poetryWorks = await prisma.poetryWork.findMany({
      include: { likes: true },
    });
    console.log(`   - 找到 ${poetryWorks.length} 条 PoetryWork 记录`);

    let poetryMigrated = 0;
    let poetrySkipped = 0;

    for (const work of poetryWorks) {
      // 检查是否已迁移（通过查找相同 authorId + title + createdAt）
      const existing = await prisma.creativeWork.findFirst({
        where: {
          authorId: work.authorId,
          title: work.title,
          categoryId: categoryMap['poetry'],
        },
      });

      if (existing) {
        poetrySkipped++;
        continue;
      }

      // 创建新作品
      const newWork = await prisma.creativeWork.create({
        data: {
          authorId: work.authorId,
          categoryId: categoryMap['poetry'],
          title: work.title,
          htmlCode: work.htmlCode,
          status: STATUS_MAP[work.status] || 'PENDING',
          reviewReason: work.reviewReason,
          createdAt: work.createdAt,
          updatedAt: work.updatedAt,
        },
      });

      // 迁移点赞
      for (const like of work.likes) {
        await prisma.creativeWorkLike.create({
          data: {
            userId: like.userId,
            workId: newWork.id,
            isLike: like.isLike,
            createdAt: like.createdAt,
          },
        }).catch(() => {
          // 忽略重复点赞错误
        });
      }

      poetryMigrated++;
    }
    console.log(`   - 已迁移 ${poetryMigrated} 条，跳过 ${poetrySkipped} 条（已存在）`);
    console.log('');

    // 3. 迁移 HTMLWork
    console.log('3. 迁移 HTMLWork 数据...');
    const htmlWorks = await prisma.hTMLWork.findMany({
      include: { likes: true },
    });
    console.log(`   - 找到 ${htmlWorks.length} 条 HTMLWork 记录`);

    let htmlMigrated = 0;
    let htmlSkipped = 0;

    for (const work of htmlWorks) {
      // 检查是否已迁移
      const existing = await prisma.creativeWork.findFirst({
        where: {
          authorId: work.authorId,
          title: work.title,
          categoryId: categoryMap['html-work'],
        },
      });

      if (existing) {
        htmlSkipped++;
        continue;
      }

      // 合并代码
      const mergedHtml = mergeHtmlCode(work.htmlCode, work.cssCode, work.jsCode);

      // HTMLWork 没有审核流程，公开的设为 APPROVED，私有的设为 PENDING
      const status = work.isPublic ? 'APPROVED' : 'PENDING';

      // 创建新作品
      const newWork = await prisma.creativeWork.create({
        data: {
          authorId: work.authorId,
          categoryId: categoryMap['html-work'],
          title: work.title,
          htmlCode: mergedHtml,
          status: status,
          createdAt: work.createdAt,
          updatedAt: work.updatedAt,
        },
      });

      // 迁移点赞（HTMLWork 使用通用 Like 表）
      for (const like of work.likes) {
        await prisma.creativeWorkLike.create({
          data: {
            userId: like.userId,
            workId: newWork.id,
            isLike: true, // Like 表没有 isLike 字段，默认为点赞
            createdAt: like.createdAt,
          },
        }).catch(() => {
          // 忽略重复点赞错误
        });
      }

      htmlMigrated++;
    }
    console.log(`   - 已迁移 ${htmlMigrated} 条，跳过 ${htmlSkipped} 条（已存在）`);
    console.log('');

    // 4. 统计结果
    console.log('===== 迁移完成 =====');
    const stats = await prisma.creativeWork.groupBy({
      by: ['categoryId'],
      _count: { id: true },
    });

    console.log('\n当前 CreativeWork 统计:');
    for (const stat of stats) {
      const category = await prisma.category.findUnique({
        where: { id: stat.categoryId },
      });
      console.log(`   - ${category?.name || '未知'}: ${stat._count.id} 条`);
    }

    const totalLikes = await prisma.creativeWorkLike.count();
    console.log(`   - 总点赞数: ${totalLikes}`);

  } catch (error) {
    console.error('迁移出错:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
