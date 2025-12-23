/**
 * 奖罚系统测试数据脚本
 */

require('dotenv').config();
// 使用 Prisma 单例
const prisma = require('../src/lib/prisma');

async function main() {
  console.log('开始创建奖罚系统测试数据...');

  try {
    // 1. 创建技术类型
    console.log('\n1. 创建技术类型...');
    const types = [
      { name: 'Web开发' },
      { name: 'Python编程' },
      { name: '数学竞赛' },
      { name: '英语学习' },
      { name: '阅读写作' }
    ];

    const createdTypes = [];
    for (const type of types) {
      const existing = await prisma.ruleType.findFirst({
        where: { name: type.name }
      });

      if (existing) {
        console.log(`  ✓ 技术类型 "${type.name}" 已存在`);
        createdTypes.push(existing);
      } else {
        const created = await prisma.ruleType.create({ data: type });
        console.log(`  ✓ 创建技术类型: ${created.name}`);
        createdTypes.push(created);
      }
    }

    // 2. 创建展示标准
    console.log('\n2. 创建展示标准...');
    const standards = [
      { name: '完成作品' },
      { name: '课堂表现' },
      { name: '考试成绩' },
      { name: '帮助他人' },
      { name: '违反纪律' }
    ];

    const createdStandards = [];
    for (const standard of standards) {
      const existing = await prisma.ruleStandard.findFirst({
        where: { name: standard.name }
      });

      if (existing) {
        console.log(`  ✓ 展示标准 "${standard.name}" 已存在`);
        createdStandards.push(existing);
      } else {
        const created = await prisma.ruleStandard.create({ data: standard });
        console.log(`  ✓ 创建展示标准: ${created.name}`);
        createdStandards.push(created);
      }
    }

    // 3. 查找管理员用户
    console.log('\n3. 查找管理员用户...');
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log('  ✗ 找不到管理员用户，请先创建管理员账号');
      return;
    }
    console.log(`  ✓ 找到管理员: ${admin.username}`);

    // 4. 创建规则模板
    console.log('\n4. 创建规则模板...');
    const templates = [
      {
        name: '完成网页作品',
        typeId: createdTypes[0].id, // Web开发
        standardId: createdStandards[0].id, // 完成作品
        requireImage: true,
        requireText: true,
        requireLink: true,
        textMaxLength: 500,
        points: 50,
        createdBy: admin.id
      },
      {
        name: 'Python课后练习',
        typeId: createdTypes[1].id, // Python编程
        standardId: createdStandards[0].id, // 完成作品
        requireImage: false,
        requireText: true,
        requireLink: false,
        textMaxLength: 300,
        points: 30,
        createdBy: admin.id
      },
      {
        name: '课堂积极发言',
        typeId: createdTypes[0].id, // Web开发
        standardId: createdStandards[1].id, // 课堂表现
        requireImage: false,
        requireText: true,
        requireLink: false,
        textMaxLength: 200,
        points: 10,
        createdBy: admin.id
      },
      {
        name: '数学竞赛获奖',
        typeId: createdTypes[2].id, // 数学竞赛
        standardId: createdStandards[2].id, // 考试成绩
        requireImage: true,
        requireText: true,
        requireLink: false,
        textMaxLength: 500,
        points: 100,
        createdBy: admin.id
      },
      {
        name: '帮助同学解题',
        typeId: createdTypes[2].id, // 数学竞赛
        standardId: createdStandards[3].id, // 帮助他人
        requireImage: false,
        requireText: true,
        requireLink: false,
        textMaxLength: 300,
        points: 20,
        createdBy: admin.id
      },
      {
        name: '英语口语展示',
        typeId: createdTypes[3].id, // 英语学习
        standardId: createdStandards[0].id, // 完成作品
        requireImage: false,
        requireText: true,
        requireLink: true,
        textMaxLength: 400,
        points: 40,
        createdBy: admin.id
      },
      {
        name: '优秀作文',
        typeId: createdTypes[4].id, // 阅读写作
        standardId: createdStandards[2].id, // 考试成绩
        requireImage: true,
        requireText: true,
        requireLink: false,
        textMaxLength: 600,
        points: 60,
        createdBy: admin.id
      },
      {
        name: '迟到早退',
        typeId: createdTypes[0].id, // Web开发
        standardId: createdStandards[4].id, // 违反纪律
        requireImage: false,
        requireText: true,
        requireLink: false,
        textMaxLength: 200,
        points: -10,
        createdBy: admin.id
      },
      {
        name: '作业未完成',
        typeId: createdTypes[0].id, // Web开发
        standardId: createdStandards[4].id, // 违反纪律
        requireImage: false,
        requireText: true,
        requireLink: false,
        textMaxLength: 200,
        points: -20,
        createdBy: admin.id
      }
    ];

    for (const template of templates) {
      const existing = await prisma.ruleTemplate.findFirst({
        where: {
          name: template.name,
          typeId: template.typeId,
          standardId: template.standardId
        }
      });

      if (existing) {
        console.log(`  ✓ 规则模板 "${template.name}" 已存在`);
      } else {
        const created = await prisma.ruleTemplate.create({
          data: template,
          include: {
            type: true,
            standard: true
          }
        });
        console.log(`  ✓ 创建规则模板: ${created.name} (${created.points > 0 ? '+' : ''}${created.points}分)`);
      }
    }

    console.log('\n✅ 奖罚系统测试数据创建完成！');
    console.log('\n📊 数据统计:');
    console.log(`  - 技术类型: ${createdTypes.length} 个`);
    console.log(`  - 展示标准: ${createdStandards.length} 个`);
    console.log(`  - 规则模板: ${templates.length} 个`);

  } catch (error) {
    console.error('\n❌ 创建测试数据失败:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
