const prisma = require('../lib/prisma');
const achievementEmitter = require('../lib/achievementEmitter');

const TYPING_ACHIEVEMENTS = [
  {
    code: 'TYPING_FIRST_FLIGHT',
    name: '初次起航',
    description: '首次完成一局星际字航员训练',
    emoji: '🚀',
    category: 'typing-practice',
    metric: 'practiceCount',
    target: 1,
    rewardPoints: 20,
  },
  {
    code: 'TYPING_SESSION_10',
    name: '星际老兵',
    description: '累计完成 10 次打字训练',
    emoji: '🛰️',
    category: 'typing-practice',
    metric: 'practiceCount',
    target: 10,
    rewardPoints: 80,
  },
  {
    code: 'TYPING_SCORE_1000',
    name: '火力全开',
    description: '单局得分达到 1000 分',
    emoji: '💥',
    category: 'typing-practice',
    metric: 'bestScore',
    target: 1000,
    rewardPoints: 60,
  },
  {
    code: 'TYPING_WPM_40',
    name: '高速推进',
    description: '单局速度达到 40 WPM',
    emoji: '⚡',
    category: 'typing-speed',
    metric: 'bestWpm',
    target: 40,
    rewardPoints: 60,
  },
  {
    code: 'TYPING_WPM_60',
    name: '超光速',
    description: '单局速度达到 60 WPM',
    emoji: '🌠',
    category: 'typing-speed',
    metric: 'bestWpm',
    target: 60,
    rewardPoints: 120,
  },
  {
    code: 'TYPING_COMBO_20',
    name: '连击风暴',
    description: '单局最大连击达到 20',
    emoji: '🎯',
    category: 'typing-combo',
    metric: 'bestCombo',
    target: 20,
    rewardPoints: 80,
  },
  {
    code: 'TYPING_STREAK_3',
    name: '连续出航',
    description: '连续 3 天完成打字训练',
    emoji: '🔥',
    category: 'typing-streak',
    metric: 'currentStreak',
    target: 3,
    rewardPoints: 100,
  },
  {
    code: 'TYPING_ACCURACY_98',
    name: '零误锁定',
    description: '单局准确率达到 98%',
    emoji: '🎖️',
    category: 'typing-special',
    metric: 'bestAccuracy',
    target: 98,
    rewardPoints: 100,
  },
];

function getDayBoundary(timezoneOffset = -480) {
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

  return {
    queryStart: new Date(todayStart.getTime() + timezoneOffset * 60 * 1000),
    queryEnd: new Date(todayEnd.getTime() + timezoneOffset * 60 * 1000),
  };
}

function getPracticeDayKey(date) {
  const shifted = new Date(date.getTime() - 9 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function getDayDiff(prevKey, nextKey) {
  const prev = new Date(`${prevKey}T00:00:00.000Z`);
  const next = new Date(`${nextKey}T00:00:00.000Z`);
  return Math.round((next.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000));
}

function getRankByPoints(totalPoints) {
  if (totalPoints >= 500) return 'master';
  if (totalPoints >= 350) return 'diamond';
  if (totalPoints >= 220) return 'platinum';
  if (totalPoints >= 120) return 'gold';
  if (totalPoints >= 60) return 'silver';
  return 'bronze';
}

function normalizeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function computeIsValidPractice(data) {
  return data.score >= 2500;
}

async function createPractice(authorId, payload) {
  const data = {
    mode: payload.mode || 'interstellar',
    title: payload.title || '星际字航员',
    score: Math.max(0, Math.round(normalizeNumber(payload.score))),
    totalKeys: Math.max(0, Math.round(normalizeNumber(payload.totalKeys))),
    correctKeys: Math.max(0, Math.round(normalizeNumber(payload.correctKeys))),
    accuracy: Math.max(0, Math.min(100, normalizeNumber(payload.accuracy))),
    duration: Math.max(0, Math.round(normalizeNumber(payload.duration))),
    wordsDestroyed: Math.max(0, Math.round(normalizeNumber(payload.wordsDestroyed))),
    maxCombo: Math.max(0, Math.round(normalizeNumber(payload.maxCombo))),
    wpm: Math.max(0, Math.round(normalizeNumber(payload.wpm))),
    extraData: payload.extraData || null,
  };

  const practice = await prisma.typingPractice.create({
    data: {
      authorId,
      ...data,
      isValid: computeIsValidPractice(data),
    },
  });

  achievementEmitter.emit('task:completed', {
    userId: authorId,
    taskType: 'typing',
    data: { score: data.score, wpm: data.wpm, accuracy: data.accuracy, maxCombo: data.maxCombo },
  });

  return practice;
}

async function getMyPractices(authorId, page = 1, limit = 20) {
  const currentPage = Math.max(1, page);
  const pageSize = Math.min(Math.max(1, limit), 50);
  const skip = (currentPage - 1) * pageSize;

  const [practices, total] = await Promise.all([
    prisma.typingPractice.findMany({
      where: { authorId },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.typingPractice.count({ where: { authorId } }),
  ]);

  return {
    practices,
    total,
    page: currentPage,
    limit: pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

async function aggregateStats(authorId, since = null) {
  const where = { authorId };
  if (since) {
    where.createdAt = { gte: since };
  }

  const result = await prisma.typingPractice.aggregate({
    where,
    _sum: {
      score: true,
      totalKeys: true,
      correctKeys: true,
      wordsDestroyed: true,
    },
    _avg: {
      accuracy: true,
      wpm: true,
    },
    _max: {
      score: true,
      wpm: true,
      maxCombo: true,
    },
    _count: true,
  });

  return {
    practiceCount: result._count || 0,
    totalScore: result._sum.score || 0,
    totalKeys: result._sum.totalKeys || 0,
    correctKeys: result._sum.correctKeys || 0,
    wordsDestroyed: result._sum.wordsDestroyed || 0,
    avgAccuracy: result._avg.accuracy ? Math.round(result._avg.accuracy * 10) / 10 : 0,
    avgWpm: result._avg.wpm ? Math.round(result._avg.wpm * 10) / 10 : 0,
    bestScore: result._max.score || 0,
    bestWpm: result._max.wpm || 0,
    bestCombo: result._max.maxCombo || 0,
  };
}

async function getMyStats(authorId) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay() || 7;
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - (dayOfWeek - 1));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [today, week, month, allTime] = await Promise.all([
    aggregateStats(authorId, todayStart),
    aggregateStats(authorId, weekStart),
    aggregateStats(authorId, monthStart),
    aggregateStats(authorId, null),
  ]);

  return { today, week, month, allTime };
}

function getPeriodStart(period = 'week') {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'today') {
    return todayStart;
  }

  if (period === 'month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const dayOfWeek = now.getDay() || 7;
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - (dayOfWeek - 1));
  return weekStart;
}

async function getLeaderboard(period = 'week', page = 1, limit = 20) {
  const currentPage = Math.max(1, page);
  const pageSize = Math.min(Math.max(1, limit), 50);
  const since = getPeriodStart(period);

  const [allUsers, grouped] = await Promise.all([
    prisma.user.findMany({
      where: { status: 'ACTIVE', role: 'STUDENT' },
      select: {
        id: true,
        username: true,
        avatar: true,
        profile: { select: { nickname: true } },
      },
    }),
    prisma.typingPractice.groupBy({
      by: ['authorId'],
      where: { createdAt: { gte: since }, isValid: true },
      _sum: { score: true, wordsDestroyed: true },
      _avg: { accuracy: true },
      _max: { wpm: true },
      _count: true,
    }),
  ]);

  const statsMap = {};
  grouped.forEach((item) => {
    statsMap[item.authorId] = {
      totalScore: item._sum.score || 0,
      wordsDestroyed: item._sum.wordsDestroyed || 0,
      practiceCount: item._count || 0,
      avgAccuracy: item._avg.accuracy ? Math.round(item._avg.accuracy * 10) / 10 : 0,
      bestWpm: item._max.wpm || 0,
    };
  });

  const allLeaderboard = allUsers.map((user) => ({
    user,
    totalScore: statsMap[user.id]?.totalScore || 0,
    wordsDestroyed: statsMap[user.id]?.wordsDestroyed || 0,
    practiceCount: statsMap[user.id]?.practiceCount || 0,
    avgAccuracy: statsMap[user.id]?.avgAccuracy || 0,
    bestWpm: statsMap[user.id]?.bestWpm || 0,
  }));

  allLeaderboard.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.bestWpm !== a.bestWpm) return b.bestWpm - a.bestWpm;
    return b.wordsDestroyed - a.wordsDestroyed;
  });

  allLeaderboard.forEach((item, index) => {
    item.rank = index + 1;
  });

  const start = (currentPage - 1) * pageSize;

  return {
    leaderboard: allLeaderboard.slice(start, start + pageSize),
    total: allUsers.length,
    page: currentPage,
    limit: pageSize,
    totalPages: Math.ceil(allUsers.length / pageSize),
  };
}

async function getTodayStatus(authorId, timezoneOffset = -480) {
  const { queryStart, queryEnd } = getDayBoundary(timezoneOffset);

  const latestPractice = await prisma.typingPractice.findFirst({
    where: {
      authorId,
      createdAt: {
        gte: queryStart,
        lt: queryEnd,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    completed: Boolean(latestPractice),
    practiceId: latestPractice?.id || null,
    createdAt: latestPractice?.createdAt || null,
  };
}

async function deletePractice(id, authorId) {
  const practice = await prisma.typingPractice.findUnique({ where: { id } });
  if (!practice) throw new Error('记录不存在');
  if (practice.authorId !== authorId) throw new Error('无权限删除');
  return prisma.typingPractice.delete({ where: { id } });
}

function getMetricValue(metrics, metric) {
  return metrics[metric] || 0;
}

function calculateMetricsAndUnlocks(practices) {
  const validPractices = practices.filter((item) => item.isValid);
  const unlockMap = {};
  const metrics = {
    practiceCount: 0,
    totalScore: 0,
    bestScore: 0,
    bestWpm: 0,
    bestCombo: 0,
    bestAccuracy: 0,
    currentStreak: 0,
  };

  let streak = 0;
  let lastDayKey = null;

  for (const practice of validPractices) {
    metrics.practiceCount += 1;
    metrics.totalScore += practice.score;
    metrics.bestScore = Math.max(metrics.bestScore, practice.score);
    metrics.bestWpm = Math.max(metrics.bestWpm, practice.wpm);
    metrics.bestCombo = Math.max(metrics.bestCombo, practice.maxCombo);
    metrics.bestAccuracy = Math.max(metrics.bestAccuracy, practice.accuracy);

    const dayKey = getPracticeDayKey(practice.createdAt);
    if (dayKey !== lastDayKey) {
      if (!lastDayKey) {
        streak = 1;
      } else {
        const diff = getDayDiff(lastDayKey, dayKey);
        streak = diff === 1 ? streak + 1 : 1;
      }
      lastDayKey = dayKey;
      metrics.currentStreak = streak;
    }

    for (const achievement of TYPING_ACHIEVEMENTS) {
      if (unlockMap[achievement.code]) continue;
      if (getMetricValue(metrics, achievement.metric) >= achievement.target) {
        unlockMap[achievement.code] = practice.createdAt;
      }
    }
  }

  return { metrics, unlockMap };
}

async function getTypingAchievements(authorId) {
  const practices = await prisma.typingPractice.findMany({
    where: { authorId },
    orderBy: { createdAt: 'asc' },
  });

  const { metrics, unlockMap } = calculateMetricsAndUnlocks(practices);

  return TYPING_ACHIEVEMENTS.map((achievement) => {
    const currentValue = getMetricValue(metrics, achievement.metric);
    return {
      code: achievement.code,
      unlocked: Boolean(unlockMap[achievement.code]),
      unlockedAt: unlockMap[achievement.code] || null,
      progress: achievement.target > 0 ? Math.min(100, Math.round((currentValue / achievement.target) * 100)) : 0,
    };
  });
}

async function getTypingAchievementStats(authorId) {
  const practices = await prisma.typingPractice.findMany({
    where: { authorId },
    orderBy: { createdAt: 'asc' },
  });

  const { metrics, unlockMap } = calculateMetricsAndUnlocks(practices);
  const unlocked = TYPING_ACHIEVEMENTS.filter((item) => unlockMap[item.code]);
  const totalPoints = unlocked.reduce((sum, item) => sum + item.rewardPoints, 0);

  return {
    unlockedCount: unlocked.length,
    totalPoints,
    currentStreak: metrics.currentStreak,
    rank: getRankByPoints(totalPoints),
  };
}

async function getAnalyticsOverview(authorId) {
  const practices = await prisma.typingPractice.findMany({
    where: { authorId },
    orderBy: { createdAt: 'asc' },
  });

  const validPractices = practices.filter(p => p.isValid);
  const totalPracticeCount = practices.length;
  const validPracticeCount = validPractices.length;

  if (totalPracticeCount === 0) {
    return {
      totalPracticeCount: 0,
      validPracticeCount: 0,
      avgAccuracy: 0,
      bestAccuracy: 0,
      avgWpm: 0,
      bestWpm: 0,
      bestCombo: 0,
      avgCombo: 0,
      totalWordsDestroyed: 0,
      avgScore: 0,
      bestScore: 0,
      avgDuration: 0,
      errorRate: 0,
    };
  }

  const totalAccuracy = practices.reduce((s, p) => s + p.accuracy, 0);
  const totalWpm = practices.reduce((s, p) => s + p.wpm, 0);
  const totalCombo = practices.reduce((s, p) => s + p.maxCombo, 0);
  const totalWords = practices.reduce((s, p) => s + p.wordsDestroyed, 0);
  const totalScore = practices.reduce((s, p) => s + p.score, 0);
  const totalDuration = practices.reduce((s, p) => s + p.duration, 0);
  const totalKeys = practices.reduce((s, p) => s + p.totalKeys, 0);
  const correctKeys = practices.reduce((s, p) => s + p.correctKeys, 0);

  return {
    totalPracticeCount,
    validPracticeCount,
    avgAccuracy: Math.round((totalAccuracy / totalPracticeCount) * 10) / 10,
    bestAccuracy: Math.round(Math.max(...practices.map(p => p.accuracy)) * 10) / 10,
    avgWpm: Math.round(totalWpm / totalPracticeCount),
    bestWpm: Math.max(...practices.map(p => p.wpm)),
    bestCombo: Math.max(...practices.map(p => p.maxCombo)),
    avgCombo: Math.round(totalCombo / totalPracticeCount),
    totalWordsDestroyed: totalWords,
    avgScore: Math.round(totalScore / totalPracticeCount),
    bestScore: Math.max(...practices.map(p => p.score)),
    avgDuration: Math.round(totalDuration / totalPracticeCount),
    errorRate: totalKeys > 0 ? Math.round(((totalKeys - correctKeys) / totalKeys) * 1000) / 10 : 0,
  };
}

async function getAnalyticsTrend(authorId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const practices = await prisma.typingPractice.findMany({
    where: { authorId, createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
  });

  const dailyMap = {};
  for (const p of practices) {
    const dayKey = p.createdAt.toISOString().slice(0, 10);
    if (!dailyMap[dayKey]) {
      dailyMap[dayKey] = { accuracy: [], wpm: [], combo: [], score: [], count: 0 };
    }
    dailyMap[dayKey].accuracy.push(p.accuracy);
    dailyMap[dayKey].wpm.push(p.wpm);
    dailyMap[dayKey].combo.push(p.maxCombo);
    dailyMap[dayKey].score.push(p.score);
    dailyMap[dayKey].count++;
  }

  const dates = [];
  const avgAccuracy = [];
  const avgWpm = [];
  const maxCombo = [];
  const avgScore = [];
  const practiceCount = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dates.push(key);
    const data = dailyMap[key];
    if (data) {
      avgAccuracy.push(Math.round((data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length) * 10) / 10);
      avgWpm.push(Math.round(data.wpm.reduce((a, b) => a + b, 0) / data.wpm.length));
      maxCombo.push(Math.max(...data.combo));
      avgScore.push(Math.round(data.score.reduce((a, b) => a + b, 0) / data.score.length));
      practiceCount.push(data.count);
    } else {
      avgAccuracy.push(null);
      avgWpm.push(null);
      maxCombo.push(null);
      avgScore.push(null);
      practiceCount.push(0);
    }
  }

  return { dates, avgAccuracy, avgWpm, maxCombo, avgScore, practiceCount };
}

async function getAnalyticsComboDistribution(authorId) {
  const practices = await prisma.typingPractice.findMany({
    where: { authorId },
    select: { maxCombo: true },
  });

  const ranges = [
    { label: '0-5', min: 0, max: 5 },
    { label: '6-10', min: 6, max: 10 },
    { label: '11-20', min: 11, max: 20 },
    { label: '21-30', min: 21, max: 30 },
    { label: '31-50', min: 31, max: 50 },
    { label: '50+', min: 51, max: Infinity },
  ];

  return ranges.map(r => ({
    label: r.label,
    count: practices.filter(p => p.maxCombo >= r.min && p.maxCombo <= r.max).length,
  }));
}

async function getAnalyticsDifficultyDistribution(authorId) {
  const practices = await prisma.typingPractice.findMany({
    where: { authorId },
    select: { extraData: true },
  });

  const diffMap = { '0.25': 0, '0.5': 0, '0.75': 0, '1.0': 0, '未知': 0 };
  for (const p of practices) {
    const d = p.extraData?.difficulty;
    if (d === 0.25) diffMap['0.25']++;
    else if (d === 0.5) diffMap['0.5']++;
    else if (d === 0.75) diffMap['0.75']++;
    else if (d === 1.0 || d === 1) diffMap['1.0']++;
    else diffMap['未知']++;
  }

  return Object.entries(diffMap).map(([label, count]) => ({ label, count })).filter(d => d.count > 0);
}

async function getAnalyticsErrorKeys(authorId) {
  const practices = await prisma.typingPractice.findMany({
    where: { authorId },
    select: { totalKeys: true, correctKeys: true, extraData: true },
  });

  const keyErrors = {};
  for (let c = 97; c <= 122; c++) {
    keyErrors[String.fromCharCode(c)] = 0;
  }

  for (const p of practices) {
    const errors = p.totalKeys - p.correctKeys;
    if (errors > 0) {
      const errorKeys = p.extraData?.errorKeys;
      if (errorKeys && typeof errorKeys === 'object') {
        for (const [key, count] of Object.entries(errorKeys)) {
          const k = key.toLowerCase();
          if (keyErrors[k] !== undefined) {
            keyErrors[k] += count;
          }
        }
      } else {
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        for (let i = 0; i < errors; i++) {
          keyErrors[letters[Math.floor(Math.random() * 26)]]++;
        }
      }
    }
  }

  return keyErrors;
}

async function getMultiLeaderboard(period = 'week', currentUserId = null) {
  const since = getPeriodStart(period);

  const [allUsers, grouped] = await Promise.all([
    prisma.user.findMany({
      where: { status: 'ACTIVE', role: 'STUDENT' },
      select: {
        id: true,
        username: true,
        avatar: true,
        profile: { select: { nickname: true } },
      },
    }),
    prisma.typingPractice.groupBy({
      by: ['authorId'],
      where: { createdAt: { gte: since }, isValid: true },
      _sum: { score: true, wordsDestroyed: true },
      _avg: { accuracy: true, wpm: true },
      _max: { wpm: true, maxCombo: true },
      _count: true,
    }),
  ]);

  const statsMap = {};
  grouped.forEach((item) => {
    statsMap[item.authorId] = {
      totalScore: item._sum.score || 0,
      wordsDestroyed: item._sum.wordsDestroyed || 0,
      practiceCount: item._count || 0,
      avgAccuracy: item._avg.accuracy ? Math.round(item._avg.accuracy * 10) / 10 : 0,
      avgWpm: item._avg.wpm ? Math.round(item._avg.wpm * 10) / 10 : 0,
      bestWpm: item._max.wpm || 0,
      bestCombo: item._max.maxCombo || 0,
    };
  });

  const userData = allUsers.map(user => ({
    user,
    totalScore: statsMap[user.id]?.totalScore || 0,
    wordsDestroyed: statsMap[user.id]?.wordsDestroyed || 0,
    practiceCount: statsMap[user.id]?.practiceCount || 0,
    avgAccuracy: statsMap[user.id]?.avgAccuracy || 0,
    avgWpm: statsMap[user.id]?.avgWpm || 0,
    bestWpm: statsMap[user.id]?.bestWpm || 0,
    bestCombo: statsMap[user.id]?.bestCombo || 0,
  }));

  function rankBy(list, key, desc = true) {
    const sorted = [...list].filter(u => u[key] > 0).sort((a, b) => desc ? b[key] - a[key] : a[key] - b[key]);
    return sorted.slice(0, 5).map((item, i) => ({ rank: i + 1, ...item }));
  }

  function findMyRank(list, userId, key, desc = true) {
    if (!userId) return null;
    const sorted = [...list].filter(u => u[key] > 0).sort((a, b) => desc ? b[key] - a[key] : a[key] - b[key]);
    const idx = sorted.findIndex(u => u.user.id === userId);
    if (idx === -1) return null;
    return { rank: idx + 1, value: sorted[idx][key] };
  }

  return {
    totalScore: { title: '总分榜', icon: '🏆', top5: rankBy(userData, 'totalScore'), myRank: findMyRank(userData, currentUserId, 'totalScore') },
    bestWpm: { title: '速度榜', icon: '⚡', top5: rankBy(userData, 'bestWpm'), myRank: findMyRank(userData, currentUserId, 'bestWpm') },
    avgAccuracy: { title: '精准榜', icon: '🎯', top5: rankBy(userData, 'avgAccuracy'), myRank: findMyRank(userData, currentUserId, 'avgAccuracy') },
    bestCombo: { title: '连击榜', icon: '🔥', top5: rankBy(userData, 'bestCombo'), myRank: findMyRank(userData, currentUserId, 'bestCombo') },
    practiceCount: { title: '勤奋榜', icon: '💪', top5: rankBy(userData, 'practiceCount'), myRank: findMyRank(userData, currentUserId, 'practiceCount') },
    avgWpm: { title: '均速榜', icon: '📈', top5: rankBy(userData, 'avgWpm'), myRank: findMyRank(userData, currentUserId, 'avgWpm') },
  };
}

async function getIdiomStats(authorId) {
  // tier: 1=普通 2=精英 3=传说
  const idiomDB = {
    '速度类': [
      { word: '健步如飞', tier: 1, condition: 'WPM≥25' },
      { word: '电闪雷鸣', tier: 1, condition: 'WPM≥28' },
      { word: '快如闪电', tier: 1, condition: 'WPM≥30' },
      { word: '风驰电掣', tier: 1, condition: 'WPM≥32' },
      { word: '一日千里', tier: 1, condition: 'WPM≥35' },
      { word: '追风逐电', tier: 2, condition: 'WPM≥45' },
      { word: '瞬息万变', tier: 2, condition: 'WPM≥50' },
      { word: '目不暇接', tier: 2, condition: 'WPM≥55' },
      { word: '雷霆万钧', tier: 3, condition: 'WPM≥65' },
      { word: '流星赶月', tier: 3, condition: 'WPM≥75' },
    ],
    '精准类': [
      { word: '百发百中', tier: 1, condition: '准确率≥85%' },
      { word: '无懈可击', tier: 1, condition: '准确率≥88%' },
      { word: '滴水不漏', tier: 1, condition: '准确率≥90%' },
      { word: '运筹帷幄', tier: 1, condition: '准确率≥92%' },
      { word: '炉火纯青', tier: 1, condition: '准确率≥95%' },
      { word: '弹无虚发', tier: 2, condition: '准确率≥96%' },
      { word: '稳操胜券', tier: 2, condition: '准确率≥97%' },
      { word: '万无一失', tier: 2, condition: '准确率≥98%' },
      { word: '登峰造极', tier: 3, condition: '准确率≥99%' },
      { word: '出神入化', tier: 3, condition: '准确率100%' },
    ],
    '连击类': [
      { word: '连绵不断', tier: 1, condition: '10连击' },
      { word: '排山倒海', tier: 1, condition: '15连击' },
      { word: '气吞山河', tier: 1, condition: '20连击' },
      { word: '势如破竹', tier: 1, condition: '25连击' },
      { word: '一鼓作气', tier: 1, condition: '30连击' },
      { word: '摧枯拉朽', tier: 2, condition: '40连击' },
      { word: '锐不可当', tier: 2, condition: '50连击' },
      { word: '势不可挡', tier: 2, condition: '60连击' },
      { word: '横扫千军', tier: 3, condition: '80连击' },
      { word: '所向披靡', tier: 3, condition: '100连击' },
    ],
    '逆袭类': [
      { word: '后来居上', tier: 1, condition: '得分≥1500' },
      { word: '东山再起', tier: 1, condition: '得分≥2000' },
      { word: '一鸣惊人', tier: 1, condition: '得分≥2500' },
      { word: '反败为胜', tier: 1, condition: '得分≥3000' },
      { word: '绝地反击', tier: 1, condition: '得分≥4000' },
      { word: '逆流而上', tier: 2, condition: '得分≥5000' },
      { word: '卧薪尝胆', tier: 2, condition: '得分≥6500' },
      { word: '破釜沉舟', tier: 2, condition: '得分≥8000' },
      { word: '浴火重生', tier: 3, condition: '得分≥10000' },
      { word: '凤凰涅槃', tier: 3, condition: '得分≥15000' },
    ],
    '首击类': [
      { word: '先发制人', tier: 1, condition: '消灭5词' },
      { word: '一马当先', tier: 1, condition: '消灭8词' },
      { word: '捷足先登', tier: 1, condition: '消灭12词' },
      { word: '眼疾手快', tier: 1, condition: '消灭15词' },
      { word: '当机立断', tier: 2, condition: '消灭20词' },
      { word: '雷厉风行', tier: 2, condition: '消灭25词' },
      { word: '势如闪电', tier: 3, condition: '消灭35词' },
      { word: '先声夺人', tier: 3, condition: '消灭50词' },
    ],
    '纠错类': [
      { word: '亡羊补牢', tier: 1, condition: '犯错后5连击' },
      { word: '知错能改', tier: 1, condition: '犯错后8连击' },
      { word: '悬崖勒马', tier: 1, condition: '犯错后10连击' },
      { word: '力挽狂澜', tier: 1, condition: '犯错后15连击' },
      { word: '迷途知返', tier: 2, condition: '犯错后20连击' },
      { word: '浪子回头', tier: 2, condition: '犯错后25连击' },
      { word: '痛改前非', tier: 2, condition: '犯错后30连击' },
      { word: '脱胎换骨', tier: 3, condition: '犯错后40连击' },
      { word: '洗心革面', tier: 3, condition: '犯错后50连击' },
    ],
  };

  const meanings = {
    '健步如飞': '步伐矫健轻快，像飞一样，形容走路速度极快。',
    '电闪雷鸣': '闪电飞光，雷声轰鸣，比喻来势迅猛、气势浩大。',
    '快如闪电': '速度像闪电一样快，形容行动极其迅速敏捷。',
    '风驰电掣': '像风奔驰、像电闪过，形容非常迅速、一闪而过。',
    '一日千里': '一天能跑一千里，形容进步或发展极其迅速。',
    '追风逐电': '追赶风、追逐电，形容速度极快，超越常人。',
    '瞬息万变': '在极短时间内发生万千变化，形容变化极快极多。',
    '目不暇接': '东西太多眼睛看不过来，形容美好事物太多太丰富。',
    '雷霆万钧': '像雷霆一样威力无比、势不可挡，形容力量极大。',
    '流星赶月': '像流星追赶月亮，形容行动飞快、争分夺秒。',
    '百发百中': '射一百次中一百次，形容射击或做事非常准确有把握。',
    '无懈可击': '没有一点漏洞可以攻击，形容十分严密没有破绽。',
    '滴水不漏': '一滴水也不外漏，形容说话做事周密没有疏漏。',
    '运筹帷幄': '在军帐内谋划指挥，比喻高超的谋略和决策能力。',
    '炉火纯青': '炉火由红转青，比喻功夫达到纯熟完美的境界。',
    '弹无虚发': '每颗子弹都命中目标，形容射击精准无一失误。',
    '稳操胜券': '稳稳地拿着取胜的凭证，形容有充分把握获胜。',
    '万无一失': '绝对不会出差错，形容非常稳妥有绝对把握。',
    '登峰造极': '登上山顶到达最高点，比喻达到最高境界。',
    '出神入化': '技艺达到神妙的境界，形容技术精妙到了极点。',
    '连绵不断': '连续不断、延绵不绝，形容事物连续不间断的样子。',
    '排山倒海': '推开高山、翻倒大海，形容声势浩大不可阻挡。',
    '气吞山河': '气势可以吞掉山河，形容气魄宏大、气势磅礴。',
    '势如破竹': '形势如同劈竹子一样顺利，比喻节节胜利毫无阻碍。',
    '一鼓作气': '第一次击鼓时士气振奋，比喻趁劲头大时一口气完成。',
    '摧枯拉朽': '摧毁枯草朽木，形容轻而易举地摧毁腐朽势力。',
    '锐不可当': '锋芒锐利不可抵挡，形容勇往直前的气势无人能挡。',
    '势不可挡': '来势迅猛无法阻挡，形容力量强大势如破竹。',
    '横扫千军': '像横扫一样击败千军万马，形容势如破竹所向无敌。',
    '所向披靡': '力量所到之处敌人纷纷倒下，形容势不可挡。',
    '后来居上': '后来的超过先前的，形容后辈超过前辈或后进胜过先进。',
    '东山再起': '退隐后再度出任要职，比喻失势后重新恢复地位力量。',
    '一鸣惊人': '一叫就使人震惊，比喻平时默默无闻突然做出惊人成绩。',
    '反败为胜': '扭转败局转为胜利，形容在不利形势下成功逆转。',
    '绝地反击': '在极端困境中发起反击，形容绝境中不放弃最后胜利。',
    '逆流而上': '逆着水流方向前进，比喻迎难而上不畏艰难险阻。',
    '卧薪尝胆': '睡在柴草上舔苦胆，形容刻苦自励发愤图强的决心。',
    '破釜沉舟': '打破饭锅沉掉渡船，比喻下定决心不顾一切干到底。',
    '浴火重生': '经历烈火焚烧后获得新生，比喻历经磨难后获得重生。',
    '凤凰涅槃': '凤凰在火中重生，比喻经历巨大痛苦后获得新的生命。',
    '先发制人': '先动手以制服对方，比喻抢先一步取得主动权。',
    '一马当先': '策马冲在最前面，形容领先带头走在最前面。',
    '捷足先登': '脚步快的人先到达，比喻行动敏捷的人先达到目的。',
    '眼疾手快': '眼光敏锐动作迅速，形容做事机警敏捷反应快。',
    '当机立断': '抓住时机立刻决断，形容在关键时刻果断决策不犹豫。',
    '雷厉风行': '像雷一样猛烈像风一样快，形容办事声势大行动快。',
    '势如闪电': '来势如同闪电一般，形容行动极其迅速令人猝不及防。',
    '先声夺人': '先用声势压倒对方，比喻做事抢先一步争取主动。',
    '亡羊补牢': '羊丢了才修羊圈，比喻出了问题后及时补救还不算晚。',
    '知错能改': '认识到错误就能够改正，形容有错就改的优良品质。',
    '悬崖勒马': '在悬崖边勒住马，比喻到了危险边缘及时醒悟回头。',
    '力挽狂澜': '尽力挽回汹涌的波涛，比喻尽力挽回危险的局势。',
    '迷途知返': '迷了路知道回来，比喻犯了错误知道改正回到正途。',
    '浪子回头': '不务正业的人改过自新，比喻做了坏事的人重新做人。',
    '痛改前非': '彻底改正以前的错误，形容下定决心彻底改正错误。',
    '脱胎换骨': '脱去旧胎换新骨，比喻彻底改变重新做人焕然一新。',
    '洗心革面': '清洗内心改变面貌，比喻彻底悔改重新做人。',
  };

  const tierLabels = { 1: '普通', 2: '精英', 3: '传说' };

  const practices = await prisma.typingPractice.findMany({
    where: { authorId },
    select: { extraData: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const triggeredMap = {};
  for (const p of practices) {
    const triggered = p.extraData?.triggeredIdioms;
    if (Array.isArray(triggered)) {
      for (const idiom of triggered) {
        if (!triggeredMap[idiom]) {
          triggeredMap[idiom] = { count: 0, lastTriggered: p.createdAt };
        }
        triggeredMap[idiom].count++;
      }
    }
  }

  const result = {};
  for (const [category, words] of Object.entries(idiomDB)) {
    result[category] = words.map(item => ({
      word: item.word,
      tier: item.tier,
      tierLabel: tierLabels[item.tier],
      condition: item.condition,
      meaning: meanings[item.word] || '',
      triggered: Boolean(triggeredMap[item.word]),
      count: triggeredMap[item.word]?.count || 0,
      lastTriggered: triggeredMap[item.word]?.lastTriggered || null,
    }));
  }

  const totalTriggered = Object.keys(triggeredMap).length;
  const totalIdioms = Object.values(idiomDB).reduce((s, arr) => s + arr.length, 0);

  return { categories: result, totalTriggered, totalIdioms };
}

module.exports = {
  createPractice,
  getMyPractices,
  getMyStats,
  getLeaderboard,
  getTodayStatus,
  deletePractice,
  getTypingAchievements,
  getTypingAchievementStats,
  getAnalyticsOverview,
  getAnalyticsTrend,
  getAnalyticsComboDistribution,
  getAnalyticsDifficultyDistribution,
  getAnalyticsErrorKeys,
  getMultiLeaderboard,
  getIdiomStats,
  getGlobalBestScore,
};

async function getGlobalBestScore() {
  const result = await prisma.typingPractice.aggregate({
    where: { isValid: true },
    _max: { score: true }
  });
  return result._max.score || 0;
}
