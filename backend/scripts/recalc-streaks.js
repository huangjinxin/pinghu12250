/**
 * 一次性脚本：重算所有用户的日记连续天数
 * 1. 补填旧日记缺失的 logicalDate
 * 2. 为所有写过日记的用户创建/重算 DiaryStats
 */
const prisma = require('../src/lib/prisma');
const { getLogicalDate, getLogicalDateTime } = require('../src/services/diaryDateService');

async function run() {
  // 1. 补填缺失的 logicalDate
  const noLogical = await prisma.diary.findMany({
    where: { logicalDate: null, deletedAt: null },
    select: { id: true, createdAt: true }
  });
  console.log(`[1/3] 补填 logicalDate: ${noLogical.length} 篇日记`);
  for (const d of noLogical) {
    const ld = getLogicalDateTime(d.createdAt);
    await prisma.diary.update({ where: { id: d.id }, data: { logicalDate: ld } });
  }

  // 2. 获取所有写过日记的用户
  const authors = await prisma.diary.findMany({
    where: { deletedAt: null },
    select: { authorId: true },
    distinct: ['authorId']
  });
  console.log(`[2/3] 需要重算的用户: ${authors.length}`);

  // 3. 逐用户重算
  for (const { authorId } of authors) {
    const diaries = await prisma.diary.findMany({
      where: { authorId, deletedAt: null, isBackfill: { not: true } },
      select: { logicalDate: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    // 提取去重的逻辑日期（升序）
    const dates = [...new Set(
      diaries.map(d => {
        const ld = d.logicalDate || getLogicalDateTime(d.createdAt);
        return (ld instanceof Date ? ld : new Date(ld)).toISOString().split('T')[0];
      })
    )].sort();

    if (dates.length === 0) continue;

    // 计算连续天数
    let currentStreak = 1;
    let maxStreak = 1;
    let streak = 1;

    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i]) - new Date(dates[i - 1])) / 86400000;
      if (diff === 1) {
        streak++;
      } else {
        streak = 1;
      }
      if (streak > maxStreak) maxStreak = streak;
    }

    // 检查最后日期到今天是否还连续
    const today = getLogicalDate(new Date());
    const lastDate = dates[dates.length - 1];
    const daysFromLast = (new Date(today) - new Date(lastDate)) / 86400000;

    if (daysFromLast <= 1) {
      currentStreak = streak; // 还在连续中
    } else {
      currentStreak = 0; // 已断连
    }

    // 总日记数和字数
    const allDiaries = await prisma.diary.aggregate({
      where: { authorId, deletedAt: null },
      _count: true,
      _sum: { wordCount: true }
    });

    const data = {
      currentStreak,
      maxStreak,
      lastDiaryDate: new Date(lastDate + 'T00:00:00.000Z'),
      totalDiaries: allDiaries._count,
      totalWords: allDiaries._sum.wordCount || 0,
    };

    await prisma.diaryStats.upsert({
      where: { userId: authorId },
      create: { userId: authorId, ...data, rank: 'bronze' },
      update: data
    });

    console.log(`  用户 ${authorId.slice(0, 8)}: streak=${currentStreak} max=${maxStreak} last=${lastDate} 日记=${allDiaries._count}篇`);
  }

  console.log('[3/3] 完成!');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
