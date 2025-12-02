/**
 * 初始化系统配置脚本
 * 创建默认的系统配置，如积分兑换比例、每日兑换上限等
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initSystemSettings() {
  try {
    console.log('开始初始化系统配置...');

    // 系统配置列表
    const settings = [
      {
        key: 'point_exchange_rate',
        value: JSON.stringify({ points: 100, coins: 10 }),
        type: 'json',
        description: '积分兑换学习币比例（100积分=10学习币）',
      },
      {
        key: 'daily_exchange_limit',
        value: '500',
        type: 'number',
        description: '每日积分兑换上限（积分）',
      },
    ];

    // 使用 upsert 插入或更新配置
    for (const setting of settings) {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: {
          value: setting.value,
          type: setting.type,
          description: setting.description,
        },
        create: setting,
      });
      console.log(`✅ 配置 ${setting.key} 已创建/更新`);
    }

    console.log('\n系统配置初始化完成！');
  } catch (error) {
    console.error('初始化系统配置失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行初始化
initSystemSettings()
  .then(() => {
    console.log('脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
