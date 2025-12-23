/**
 * 为旧的规则模板添加新字段的默认值
 */

// 使用 Prisma 单例
const prisma = require('../src/lib/prisma');

async function migrateRuleTemplates() {
  try {
    console.log('开始迁移规则模板数据...\n');

    // 查找所有规则模板
    const templates = await prisma.ruleTemplate.findMany();

    console.log(`找到 ${templates.length} 个规则模板`);

    if (templates.length === 0) {
      console.log('没有需要迁移的数据');
      return;
    }

    // 更新所有模板，确保新字段有默认值
    let updated = 0;
    for (const template of templates) {
      // 检查是否需要更新
      if (template.requireAudio === null || template.allowQuantity === null) {
        await prisma.ruleTemplate.update({
          where: { id: template.id },
          data: {
            requireAudio: template.requireAudio ?? false,
            audioUrl: template.audioUrl ?? null,
            allowQuantity: template.allowQuantity ?? false
          }
        });
        console.log(`✓ 更新模板: ${template.name}`);
        updated++;
      }
    }

    console.log(`\n完成！更新了 ${updated} 个规则模板`);

  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行迁移
migrateRuleTemplates()
  .then(() => {
    console.log('\n迁移成功完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n迁移失败:', error);
    process.exit(1);
  });
