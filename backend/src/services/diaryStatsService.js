/**
 * 日记统计服务
 * 处理连续天数、段位、累计统计等
 */

const prisma = require('../lib/prisma')
const { DIARY_LEVELS, getDiaryLevel, calculateWordCount } = require('../config/diaryLevels')
const { DIARY_RANKS, getRankByStreak, getRankByCode, getRankDowngrade, checkRankUpgrade } = require('../config/diaryRanks')
const { getLogicalDate, getLogicalDateTime, isBackfill, isConsecutive, getToday, getWeekStart, isSameWeek, getDaysDiff } = require('./diaryDateService')

/**
 * 获取或创建用户的日记统计记录
 * @param {string} userId - 用户ID
 * @returns {object} DiaryStats 记录
 */
async function getOrCreateStats(userId) {
  let stats = await prisma.diaryStats.findUnique({
    where: { userId }
  })

  if (!stats) {
    stats = await prisma.diaryStats.create({
      data: {
        userId,
        rank: 'bronze',
        currentStreak: 0,
        maxStreak: 0,
        totalDiaries: 0,
        totalWords: 0,
        totalAnalyses: 0,
      }
    })
  }

  return stats
}

/**
 * 获取用户统计信息（带段位详情）
 * @param {string} userId - 用户ID
 * @returns {object} 完整的统计信息
 */
async function getStatsWithDetails(userId) {
  const stats = await getOrCreateStats(userId)
  const rankInfo = getRankByCode(stats.rank)

  // 计算距离下一段位的天数
  const nextRankIdx = DIARY_RANKS.findIndex(r => r.rank === stats.rank) + 1
  const nextRank = nextRankIdx < DIARY_RANKS.length ? DIARY_RANKS[nextRankIdx] : null
  const daysToNextRank = nextRank ? Math.max(0, nextRank.minStreak - stats.currentStreak) : null

  // 计算段位进度
  let rankProgress = 100
  if (nextRank) {
    const range = nextRank.minStreak - rankInfo.minStreak
    const progress = stats.currentStreak - rankInfo.minStreak
    rankProgress = Math.min(100, Math.round((progress / range) * 100))
  }

  // 获取本周日记日期
  const weekDays = await getWeekDaysWithDiaryStatus(userId)

  // 下一段位信息
  let nextRankInfo = null
  if (nextRank) {
    nextRankInfo = {
      ...nextRank,
      daysNeeded: daysToNextRank
    }
  }

  return {
    ...stats,
    rankInfo,
    nextRankInfo,
    daysToNextRank,
    rankProgress,
    weekDays,
    longestStreak: stats.maxStreak,
  }
}

/**
 * 获取本周每天的日记状态
 * @param {string} userId - 用户ID
 * @returns {array} 一周的日期状态
 */
async function getWeekDaysWithDiaryStatus(userId) {
  const today = getToday()
  const weekStart = getWeekStart()

  // 获取本周的日记
  const startDate = new Date(weekStart + 'T00:00:00.000Z')
  const endDate = new Date(today + 'T23:59:59.999Z')

  const diaries = await prisma.diary.findMany({
    where: {
      authorId: userId,
      logicalDate: {
        gte: startDate,
        lte: endDate
      },
      deletedAt: null,
    },
    select: {
      logicalDate: true
    }
  })

  // 获取有日记的日期集合
  const diaryDates = new Set(
    diaries.map(d => d.logicalDate ? getLogicalDate(d.logicalDate) : null).filter(Boolean)
  )

  // 生成一周的日期状态
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日']
  const weekDays = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    weekDays.push({
      date: dateStr,
      short: dayLabels[i],
      label: `周${dayLabels[i]}`,
      hasDiary: diaryDates.has(dateStr),
      isToday: dateStr === today,
      isFuture: dateStr > today
    })
  }

  return weekDays
}

/**
 * 日记创建后更新统计
 * @param {string} userId - 用户ID
 * @param {object} diary - 日记对象
 * @returns {object} 更新结果（包含成就触发信息）
 */
async function updateStatsOnDiaryCreate(userId, diary) {
  const stats = await getOrCreateStats(userId)
  const today = getToday()
  const logicalDate = getLogicalDate(diary.submittedAt || diary.createdAt)

  // 检查是否补交
  const isBackfillDiary = diary.isBackfill

  const updates = {
    totalDiaries: stats.totalDiaries + 1,
    totalWords: stats.totalWords + (diary.wordCount || 0),
  }

  // 只有非补交日记才更新连续天数
  if (!isBackfillDiary) {
    // lastDiaryDate 已存为 UTC 午夜，直接取日期字符串，不能再过 getLogicalDate（会偏移一天）
    const lastDate = stats.lastDiaryDate ? stats.lastDiaryDate.toISOString().split('T')[0] : null

    // 检查是否同一天已有日记
    if (lastDate === logicalDate) {
      // 同一天，不增加连续天数，但更新字数统计
    } else if (lastDate && isConsecutive(lastDate, logicalDate)) {
      // 连续日期，增加连续天数
      updates.currentStreak = stats.currentStreak + 1
      updates.lastDiaryDate = getLogicalDateTime(logicalDate)
    } else if (!lastDate) {
      // 第一篇日记
      updates.currentStreak = 1
      updates.lastDiaryDate = getLogicalDateTime(logicalDate)
    } else {
      // 断连了，重置连续天数
      updates.currentStreak = 1
      updates.lastDiaryDate = getLogicalDateTime(logicalDate)

      // 触发掉段
      const newRank = getRankDowngrade(stats.rank)
      if (newRank.rank !== stats.rank) {
        updates.rank = newRank.rank
        updates.rankUpdatedAt = new Date()
      }
    }

    // 更新最大连续天数
    if (updates.currentStreak && updates.currentStreak > stats.maxStreak) {
      updates.maxStreak = updates.currentStreak
    }

    // 检查段位升级
    const currentStreak = updates.currentStreak || stats.currentStreak
    const upgradeResult = checkRankUpgrade(updates.rank || stats.rank, currentStreak)
    if (upgradeResult) {
      updates.rank = upgradeResult.rank
      updates.rankUpdatedAt = new Date()
    }
  }

  // 更新周统计
  const weekStart = getWeekStart()
  if (!stats.weekStartDate || !isSameWeek(getLogicalDate(stats.weekStartDate), today)) {
    // 新的一周，重置周统计
    updates.weekStartDate = new Date(weekStart)
    updates.weeklyDiaries = 1
    updates.weeklyWords = diary.wordCount || 0
    updates.weeklyBestScore = null
    updates.weeklyBestGrade = null
  } else {
    updates.weeklyDiaries = stats.weeklyDiaries + 1
    updates.weeklyWords = stats.weeklyWords + (diary.wordCount || 0)
  }

  // 执行更新
  const updatedStats = await prisma.diaryStats.update({
    where: { userId },
    data: updates
  })

  return {
    stats: updatedStats,
    streakIncreased: !isBackfillDiary && updates.currentStreak > stats.currentStreak,
    rankChanged: updates.rank && updates.rank !== stats.rank,
    oldRank: stats.rank,
    newRank: updates.rank || stats.rank,
  }
}

/**
 * 日记删除后更新统计
 * @param {string} userId - 用户ID
 * @param {object} diary - 被删除的日记
 */
async function updateStatsOnDiaryDelete(userId, diary) {
  const stats = await getOrCreateStats(userId)

  const updates = {
    totalDiaries: Math.max(0, stats.totalDiaries - 1),
    totalWords: Math.max(0, stats.totalWords - (diary.wordCount || 0)),
  }

  // 更新周统计
  const today = getToday()
  const diaryDate = getLogicalDate(diary.createdAt)
  if (stats.weekStartDate && isSameWeek(getLogicalDate(stats.weekStartDate), diaryDate)) {
    updates.weeklyDiaries = Math.max(0, stats.weeklyDiaries - 1)
    updates.weeklyWords = Math.max(0, stats.weeklyWords - (diary.wordCount || 0))
  }

  await prisma.diaryStats.update({
    where: { userId },
    data: updates
  })
}

/**
 * 检查并处理断连（定时任务调用）
 * 每天东八区09:00后检查，如果昨天没有日记则断连
 * @param {string} userId - 用户ID
 */
async function checkAndHandleStreakBreak(userId) {
  const stats = await prisma.diaryStats.findUnique({
    where: { userId }
  })

  if (!stats || stats.currentStreak === 0) return

  const today = getToday()
  const lastDate = stats.lastDiaryDate ? stats.lastDiaryDate.toISOString().split('T')[0] : null

  if (!lastDate) return

  const daysDiff = getDaysDiff(lastDate, today)

  // 如果超过1天没写日记，断连
  if (daysDiff > 1) {
    const newRank = getRankDowngrade(stats.rank)

    await prisma.diaryStats.update({
      where: { userId },
      data: {
        currentStreak: 0,
        rank: newRank.rank,
        rankUpdatedAt: new Date(),
      }
    })
  }
}

/**
 * AI分析完成后更新统计
 * @param {string} userId - 用户ID
 * @param {number} score - 评分（可选）
 * @param {string} grade - 等级（可选）
 * @param {string} diaryId - 日记ID（可选，用于单条分析）
 */
async function updateStatsOnAnalysis(userId, score = null, grade = null, diaryId = null) {
  const stats = await getOrCreateStats(userId)

  const updates = {
    totalAnalyses: stats.totalAnalyses + 1,
  }

  // 如果有评分，更新平均分
  if (score !== null) {
    if (stats.avgScore === null) {
      updates.avgScore = score
    } else {
      // 计算新的平均分
      updates.avgScore = ((stats.avgScore * (stats.totalAnalyses)) + score) / (stats.totalAnalyses + 1)
    }
  }

  // 更新周最高分
  if (score !== null && stats.weekStartDate) {
    const today = getToday()
    if (isSameWeek(getLogicalDate(stats.weekStartDate), today)) {
      if (stats.weeklyBestScore === null || score > stats.weeklyBestScore) {
        updates.weeklyBestScore = score
        updates.weeklyBestGrade = grade
      }
    }
  }

  await prisma.diaryStats.update({
    where: { userId },
    data: updates
  })
}

/**
 * 使用补签卡恢复连续
 * @param {string} userId - 用户ID
 * @param {string} makeupDate - 补签日期 YYYY-MM-DD
 * @returns {object} 更新后的统计
 */
async function restoreStreakWithMakeupCard(userId, makeupDate) {
  const stats = await getOrCreateStats(userId)
  const today = getToday()

  // 补签日期应该是昨天
  const daysDiff = getDaysDiff(makeupDate, today)
  if (daysDiff !== 1) {
    throw new Error('只能补签昨天的日记')
  }

  // 恢复连续天数
  const updates = {
    currentStreak: stats.currentStreak + 1,
    lastDiaryDate: getLogicalDateTime(makeupDate),
  }

  // 更新最大连续
  if (updates.currentStreak > stats.maxStreak) {
    updates.maxStreak = updates.currentStreak
  }

  // 检查段位升级
  const upgradeResult = checkRankUpgrade(stats.rank, updates.currentStreak)
  if (upgradeResult) {
    updates.rank = upgradeResult.rank
    updates.rankUpdatedAt = new Date()
  }

  return await prisma.diaryStats.update({
    where: { userId },
    data: updates
  })
}

/**
 * 获取今天某逻辑日期字数最多的日记
 * @param {string} userId - 用户ID
 * @param {string} logicalDate - 逻辑日期 YYYY-MM-DD
 * @returns {object|null} 日记对象
 */
async function getBestDiaryOfDay(userId, logicalDate) {
  const startDate = new Date(logicalDate + 'T00:00:00.000Z')
  const endDate = new Date(logicalDate + 'T23:59:59.999Z')

  const diaries = await prisma.diary.findMany({
    where: {
      authorId: userId,
      logicalDate: {
        gte: startDate,
        lte: endDate
      },
      deletedAt: null,
    },
    orderBy: {
      wordCount: 'desc'
    },
    take: 1
  })

  return diaries[0] || null
}

module.exports = {
  getOrCreateStats,
  getStatsWithDetails,
  updateStatsOnDiaryCreate,
  updateStatsOnDiaryDelete,
  checkAndHandleStreakBreak,
  updateStatsOnAnalysis,
  restoreStreakWithMakeupCard,
  getBestDiaryOfDay,
}
