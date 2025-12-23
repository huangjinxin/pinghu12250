#!/usr/bin/env node
/**
 * 批量修复 Prisma 导入，替换为单例模式
 */

const fs = require('fs');
const path = require('path');

// 需要替换的文件列表
const files = [
  'src/middleware/auth.js',
  'src/controllers/submissionController.js',
  'src/controllers/bookController.js',
  'src/controllers/classController.js',
  'src/controllers/musicController.js',
  'src/controllers/campusController.js',
  'src/controllers/postController.js',
  'src/controllers/movieController.js',
  'src/controllers/userController.js',
  'src/controllers/htmlWorkController.js',
  'src/controllers/authController.js',
  'src/controllers/recordController.js',
  'src/routes/diary.js',
  'src/routes/game.js',
  'src/routes/message.js',
  'src/routes/follows.js',
  'src/routes/question.js',
  'src/routes/board.js',
  'src/routes/task.js',
  'src/routes/readingNote.js',
  'src/routes/admin/gameAdmin.js',
  'src/routes/homework.js',
  'src/routes/reward.js',
  'src/routes/learning.js',
  'src/routes/achievements.js',
  'src/routes/wallet.js',
  'src/routes/tag.js',
  'src/routes/note.js',
  'src/routes/challenge.js',
  'src/routes/admin.js',
  'src/routes/calendar.js',
  'src/routes/point.js',
  'src/routes/search.js',
  'src/routes/stats.js',
  'src/routes/pay.js',
  'src/services/challengeService.js',
  'src/services/transactionService.js',
  'src/services/walletService.js',
  'src/services/tagService.js',
  'src/services/followService.js',
  'src/services/notificationService.js',
  'src/services/achievementService.js',
];

const baseDir = path.join(__dirname, '..');

let successCount = 0;
let errorCount = 0;

files.forEach(file => {
  const filePath = path.join(baseDir, file);

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${file}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // 计算相对路径深度
    const depth = file.split('/').length - 1;
    const relativePath = '../'.repeat(depth) + 'lib/prisma';

    // 替换模式1: const { PrismaClient } = require('@prisma/client');\nconst prisma = new PrismaClient();
    content = content.replace(
      /const\s*{\s*PrismaClient\s*}\s*=\s*require\(['"]@prisma\/client['"]\);\s*\n\s*const\s+prisma\s*=\s*new\s+PrismaClient\(\);/g,
      `// 使用 Prisma 单例\nconst prisma = require('${relativePath}');`
    );

    // 替换模式2: const { PrismaClient } = require('@prisma/client');\n...\nconst prisma = new PrismaClient();
    // 分两步处理这种情况
    if (content.includes('new PrismaClient()')) {
      // 先移除 PrismaClient 导入
      content = content.replace(
        /const\s*{\s*PrismaClient\s*}\s*=\s*require\(['"]@prisma\/client['"]\);?\s*\n/g,
        ''
      );

      // 再替换 new PrismaClient()
      content = content.replace(
        /const\s+prisma\s*=\s*new\s+PrismaClient\(\);/g,
        `// 使用 Prisma 单例\nconst prisma = require('${relativePath}');`
      );
    }

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已修复: ${file}`);
      successCount++;
    } else {
      console.log(`ℹ️  无需修改: ${file}`);
    }

  } catch (error) {
    console.error(`❌ 处理失败: ${file}`, error.message);
    errorCount++;
  }
});

console.log(`\n✅ 修复完成: ${successCount} 个文件`);
if (errorCount > 0) {
  console.log(`❌ 失败: ${errorCount} 个文件`);
}
