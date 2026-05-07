const cron = require('node-cron');
const prisma = require('../lib/prisma');

// 辅助函数：获取当前 ISO 周数
function getISOWeekInfo(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  return { year: d.getUTCFullYear(), week };
}

/**
 * 启动信用分定时任务
 */
function startCreditCron() {
  // 每周一凌晨 00:01 执行
  cron.schedule('1 0 * * 1', async () => {
    console.log('[CRON] 开始执行每周信用分快照任务...');
    try {
      // 获取现在的上周时间信息
      const lastWeekDate = new Date();
      lastWeekDate.setDate(lastWeekDate.getDate() - 3); // 往前推3天肯定是在上周
      const { year, week } = getISOWeekInfo(lastWeekDate);

      // 批量获取所有当前的 UserCreditProfile
      const profiles = await prisma.userCreditProfile.findMany();
      let snapshotCount = 0;

      for (const profile of profiles) {
        // 创建历史快照
        await prisma.userCreditHistory.upsert({
          where: {
            userId_year_week: {
              userId: profile.userId,
              year,
              week
            }
          },
          update: {
            moralityScore: profile.moralityScore,
            intelligenceScore: profile.intelligenceScore,
            physiqueScore: profile.physiqueScore,
            aestheticsScore: profile.aestheticsScore,
            laborScore: profile.laborScore,
            societyScore: profile.societyScore,
            totalScore: profile.totalScore
          },
          create: {
            userId: profile.userId,
            year,
            week,
            moralityScore: profile.moralityScore,
            intelligenceScore: profile.intelligenceScore,
            physiqueScore: profile.physiqueScore,
            aestheticsScore: profile.aestheticsScore,
            laborScore: profile.laborScore,
            societyScore: profile.societyScore,
            totalScore: profile.totalScore
          }
        });
        snapshotCount++;
      }

      console.log(`[CRON] 信用分周快照完成，共处理 ${snapshotCount} 名用户，年份: ${year}, 周数: ${week}`);
    } catch (error) {
      console.error('[CRON] 信用分周快照任务失败:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Shanghai"
  });
}

module.exports = {
  startCreditCron
};
