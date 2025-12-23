/**
 * 初始化每日积分上限配置
 */

// 使用 Prisma 单例
const prisma = require('../src/lib/prisma');

async function initDailyLimitConfig() {
  try {
    console.log('正在初始化每日积分上限配置...');

    // 检查是否已存在配置
    const existing = await prisma.systemSetting.findUnique({
      where: { key: 'daily_points_limit' }
    });

    if (existing) {
      console.log(`配置已存在，当前值: ${existing.value}`);
      return;
    }

    // 创建默认配置：每日上限 100 分
    await prisma.systemSetting.create({
      data: {
        key: 'daily_points_limit',
        value: '100',
        type: 'number',
        description: '每日积分获取上限（不含奖罚模块）'
      }
    });

    console.log('✓ 每日积分上限配置初始化成功，默认值: 100');
  } catch (error) {
    console.error('初始化配置失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行初始化
initDailyLimitConfig()
  .then(() => {
    console.log('初始化完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('初始化失败:', error);
    process.exit(1);
  });
