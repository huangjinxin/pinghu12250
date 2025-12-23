#!/usr/bin/env node
/**
 * 修复脚本文件中的 Prisma 导入
 */

const fs = require('fs');
const path = require('path');

const scriptFiles = [
  'seed-tags.js',
  'test-daily-limit.js',
  'init-game-data.js',
  'create-admin.js',
  'seed-achievements.js',
  'init-daily-limit-config.js',
  'seed-learning-data.js',
  'migrate-rule-templates.js',
  'create-demo-data.js',
  'test-rule-creation.js',
  'init-board-data.js',
  'seed-reward-system.js',
  'seed-challenges.js',
  'init-system-settings.js',
  'seed-data.js',
];

const scriptsDir = path.join(__dirname);

let successCount = 0;

scriptFiles.forEach(file => {
  const filePath = path.join(scriptsDir, file);

  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在: ${file}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;

    // 替换导入语句
    content = content.replace(
      /const\s*{\s*PrismaClient\s*}\s*=\s*require\(['"]@prisma\/client['"]\);\s*\n\s*const\s+prisma\s*=\s*new\s+PrismaClient\(\);/g,
      `// 使用 Prisma 单例\nconst prisma = require('../src/lib/prisma');`
    );

    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 已修复: ${file}`);
      successCount++;
    } else {
      console.log(`ℹ️  无需修改: ${file}`);
    }

  } catch (error) {
    console.error(`❌ 处理失败: ${file}`, error.message);
  }
});

console.log(`\n✅ 修复完成: ${successCount} 个文件`);
