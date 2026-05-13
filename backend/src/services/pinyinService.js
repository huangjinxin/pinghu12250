/**
 * 拼音打字练习服务
 */

const prisma = require('../lib/prisma');
const achievementEmitter = require('../lib/achievementEmitter');
const { pinyin } = require('pinyin-pro');

/**
 * 将汉字文本转换为拼音数据
 * 过滤标点、空格，只保留汉字，上限50个
 */
function convertToPinyin(text) {
  // 提取汉字（过滤标点、空格、数字等）
  const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
  const limitedChars = chineseChars.slice(0, 50);

  if (limitedChars.length === 0) {
    return { chars: [], total: 0 };
  }

  const result = limitedChars.map(char => {
    const pinyinWithTone = pinyin(char, { toneType: 'symbol', type: 'array' })[0] || '';
    const pinyinLetters = pinyin(char, { toneType: 'none', type: 'array' })[0] || '';
    const toneNum = pinyin(char, { toneType: 'num', type: 'array' })[0] || '';
    const initial = pinyin(char, { pattern: 'initial', type: 'array' })[0] || '';
    const final = pinyin(char, { pattern: 'final', toneType: 'none', type: 'array' })[0] || '';
    const toneMatch = toneNum.match(/(\d)$/);
    const tone = toneMatch ? parseInt(toneMatch[1]) : 0;

    return {
      char,
      pinyin: pinyinWithTone,
      pinyinLetters: pinyinLetters.toLowerCase(),
      initial: initial.toLowerCase(),
      final: final.toLowerCase(),
      tone,
    };
  });

  return { chars: result, total: result.length };
}

/**
 * 创建练习记录
 */
async function createPractice(authorId, data) {
  const { title, charCount, content, totalKeys, correctKeys, accuracy, duration } = data;

  const practice = await prisma.pinyinPractice.create({
    data: {
      authorId,
      title,
      charCount,
      content,
      totalKeys,
      correctKeys,
      accuracy,
      duration,
    },
  });

  achievementEmitter.emit('task:completed', {
    userId: authorId,
    taskType: 'pinyin',
    data: { charCount, accuracy, duration },
  });

  return practice;
}

/**
 * 获取个人练习列表
 */
async function getMyPractices(authorId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [practices, total] = await Promise.all([
    prisma.pinyinPractice.findMany({
      where: { authorId },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.pinyinPractice.count({ where: { authorId } }),
  ]);

  return {
    practices,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 获取个人统计（今日/本周/本月）
 */
async function getMyStats(authorId) {
  const now = new Date();

  // 今日开始
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 本周开始（周一）
  const dayOfWeek = now.getDay() || 7;
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - (dayOfWeek - 1));

  // 本月开始
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, week, month, allTime] = await Promise.all([
    aggregateStats(authorId, todayStart),
    aggregateStats(authorId, weekStart),
    aggregateStats(authorId, monthStart),
    aggregateStats(authorId, null),
  ]);

  return { today, week, month, allTime };
}

/**
 * 聚合统计数据
 */
async function aggregateStats(authorId, since) {
  const where = { authorId };
  if (since) {
    where.createdAt = { gte: since };
  }

  const result = await prisma.pinyinPractice.aggregate({
    where,
    _sum: { charCount: true, totalKeys: true, correctKeys: true },
    _avg: { accuracy: true },
    _count: true,
  });

  return {
    practiceCount: result._count,
    charCount: result._sum.charCount || 0,
    totalKeys: result._sum.totalKeys || 0,
    correctKeys: result._sum.correctKeys || 0,
    avgAccuracy: result._avg.accuracy ? Math.round(result._avg.accuracy * 10) / 10 : 0,
  };
}

/**
 * 排行榜（按时间段聚合 charCount 排序）
 */
async function getLeaderboard(period = 'week', page = 1, limit = 20) {
  const now = new Date();
  let since;

  if (period === 'today') {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === 'week') {
    const dayOfWeek = now.getDay() || 7;
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dayOfWeek - 1));
  } else if (period === 'month') {
    since = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    since = new Date(0);
  }

  // 获取所有学生用户
  const allUsers = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      role: 'STUDENT'
    },
    select: {
      id: true,
      username: true,
      avatar: true,
      profile: { select: { nickname: true } },
    },
  });

  // 获取有练习记录的用户数据
  const grouped = await prisma.pinyinPractice.groupBy({
    by: ['authorId'],
    where: { createdAt: { gte: since } },
    _sum: { charCount: true },
    _avg: { accuracy: true },
    _count: true,
  });

  const statsMap = {};
  grouped.forEach(g => {
    statsMap[g.authorId] = {
      charCount: g._sum.charCount || 0,
      practiceCount: g._count,
      avgAccuracy: g._avg.accuracy ? Math.round(g._avg.accuracy * 10) / 10 : 0,
    };
  });

  // 合并所有用户数据
  const allLeaderboard = allUsers.map(user => ({
    user,
    charCount: statsMap[user.id]?.charCount || 0,
    practiceCount: statsMap[user.id]?.practiceCount || 0,
    avgAccuracy: statsMap[user.id]?.avgAccuracy || 0,
  }));

  // 按字数排序
  allLeaderboard.sort((a, b) => b.charCount - a.charCount);

  // 添加排名
  allLeaderboard.forEach((item, index) => {
    item.rank = index + 1;
  });

  // 分页
  const start = (page - 1) * limit;
  const leaderboard = allLeaderboard.slice(start, start + limit);

  return {
    leaderboard,
    total: allUsers.length,
    page,
    limit,
    totalPages: Math.ceil(allUsers.length / limit),
  };
}

/**
 * 删除练习记录（仅作者可删）
 */
async function deletePractice(id, authorId) {
  const practice = await prisma.pinyinPractice.findUnique({ where: { id } });
  if (!practice) throw new Error('记录不存在');
  if (practice.authorId !== authorId) throw new Error('无权限删除');

  return prisma.pinyinPractice.delete({ where: { id } });
}

/**
 * 获取今日拼音练习完成状态
 * 完成条件：当天至少一篇字数>=20且正确率>=80%
 */
async function getTodayStatus(authorId, timezoneOffset = -480) {
  const DAY_START_HOUR = 9;
  const now = new Date();
  const localNow = new Date(now.getTime() - timezoneOffset * 60 * 1000);
  const todayStart = new Date(localNow);
  todayStart.setUTCHours(DAY_START_HOUR, 0, 0, 0);

  if (localNow.getUTCHours() < DAY_START_HOUR) {
    todayStart.setUTCDate(todayStart.getUTCDate() - 1);
  }

  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  const queryStart = new Date(todayStart.getTime() + timezoneOffset * 60 * 1000);
  const queryEnd = new Date(todayEnd.getTime() + timezoneOffset * 60 * 1000);

  const validPractice = await prisma.pinyinPractice.findFirst({
    where: {
      authorId,
      charCount: { gte: 20 },
      accuracy: { gte: 80 },
      createdAt: {
        gte: queryStart,
        lt: queryEnd,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    completed: Boolean(validPractice),
    practiceId: validPractice?.id || null,
    createdAt: validPractice?.createdAt || null,
  };
}

/**
 * 获取错误拼音频次分析
 */
async function getErrorAnalysis(authorId) {
  // 获取用户所有练习记录
  const practices = await prisma.pinyinPractice.findMany({
    where: { authorId },
    orderBy: { createdAt: 'desc' },
    take: 100, // 最近100条记录
  });

  // 统计错误拼音
  const errorMap = {}; // { pinyin: { count, chars: [] } }
  const charErrorMap = {}; // { char: { errors, total } }
  const toneErrorMap = { 1: 0, 2: 0, 3: 0, 4: 0 }; // 声调错误统计
  const initialErrorMap = {}; // 声母错误统计
  const finalErrorMap = {}; // 韵母错误统计
  const dailyStats = {}; // 每日统计

  let totalPractices = practices.length;
  let totalErrors = 0;
  let totalChars = 0;

  practices.forEach(practice => {
    const date = new Date(practice.createdAt).toISOString().split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { practices: 0, chars: 0, errors: 0, accuracy: [] };
    }
    dailyStats[date].practices++;
    dailyStats[date].chars += practice.charCount;
    dailyStats[date].accuracy.push(practice.accuracy);

    if (Array.isArray(practice.content)) {
      practice.content.forEach(item => {
        totalChars++;
        const errors = item.errors || 0;
        if (errors > 0) {
          totalErrors += errors;
          dailyStats[date].errors += errors;

          // 拼音错误统计
          const pinyin = item.pinyin || '';
          if (!errorMap[pinyin]) {
            errorMap[pinyin] = { count: 0, chars: [] };
          }
          errorMap[pinyin].count += errors;
          if (!errorMap[pinyin].chars.includes(item.char)) {
            errorMap[pinyin].chars.push(item.char);
          }

          // 汉字错误统计
          if (!charErrorMap[item.char]) {
            charErrorMap[item.char] = { errors: 0, total: 0, pinyin };
          }
          charErrorMap[item.char].errors += errors;

          // 声调错误统计
          if (item.tone && item.tone >= 1 && item.tone <= 4) {
            toneErrorMap[item.tone] += errors;
          }

          // 声母错误统计
          if (item.initial) {
            if (!initialErrorMap[item.initial]) {
              initialErrorMap[item.initial] = 0;
            }
            initialErrorMap[item.initial] += errors;
          }

          // 韵母错误统计
          if (item.final) {
            if (!finalErrorMap[item.final]) {
              finalErrorMap[item.final] = 0;
            }
            finalErrorMap[item.final] += errors;
          }
        }

        // 汉字总次数
        if (!charErrorMap[item.char]) {
          charErrorMap[item.char] = { errors: 0, total: 0, pinyin: item.pinyin };
        }
        charErrorMap[item.char].total++;
      });
    }
  });

  // 排序错误拼音（按错误次数降序）
  const errorPinyins = Object.entries(errorMap)
    .map(([pinyin, data]) => ({ pinyin, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // 排序错误汉字（按错误率降序）
  const errorChars = Object.entries(charErrorMap)
    .map(([char, data]) => ({
      char,
      ...data,
      errorRate: data.total > 0 ? Math.round((data.errors / data.total) * 100) : 0,
    }))
    .filter(item => item.errors > 0)
    .sort((a, b) => b.errors - a.errors)
    .slice(0, 20);

  // 声母错误排序
  const initialErrors = Object.entries(initialErrorMap)
    .map(([initial, count]) => ({ initial, count }))
    .sort((a, b) => b.count - a.count);

  // 韵母错误排序
  const finalErrors = Object.entries(finalErrorMap)
    .map(([final, count]) => ({ final, count }))
    .sort((a, b) => b.count - a.count);

  // 每日统计处理
  const dailyArray = Object.entries(dailyStats)
    .map(([date, data]) => ({
      date,
      practices: data.practices,
      chars: data.chars,
      errors: data.errors,
      avgAccuracy: data.accuracy.length > 0
        ? Math.round(data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length * 10) / 10
        : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30); // 最近30天

  return {
    overview: {
      totalPractices,
      totalChars,
      totalErrors,
      avgErrorRate: totalChars > 0 ? Math.round((totalErrors / totalChars) * 100) / 100 : 0,
    },
    errorPinyins,
    errorChars,
    toneErrors: toneErrorMap,
    initialErrors,
    finalErrors,
    dailyTrend: dailyArray,
  };
}

module.exports = {
  convertToPinyin,
  createPractice,
  getMyPractices,
  getMyStats,
  getLeaderboard,
  deletePractice,
  getTodayStatus,
  getErrorAnalysis,
};
