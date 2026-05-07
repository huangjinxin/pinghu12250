/**
 * 日记成就服务
 */

const prisma = require('../lib/prisma')
const { DIARY_ACHIEVEMENTS, getGradeByScore } = require('../config/diaryAchievements')
const { addPointsDirect } = require('./pointService')

/**
 * 初始化成就定义到数据库
 * 应用启动时调用
 */
async function initializeAchievements() {
  for (const achievement of DIARY_ACHIEVEMENTS) {
    await prisma.diaryAchievement.upsert({
      where: { code: achievement.code },
      create: {
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        emoji: achievement.emoji,
        category: achievement.category,
        conditionType: achievement.conditionType,
        conditionValue: String(achievement.conditionValue),
        rewardPoints: achievement.rewardPoints,
        sortOrder: DIARY_ACHIEVEMENTS.indexOf(achievement),
        isActive: true,
      },
      update: {
        name: achievement.name,
        description: achievement.description,
        emoji: achievement.emoji,
        category: achievement.category,
        conditionType: achievement.conditionType,
        conditionValue: String(achievement.conditionValue),
        rewardPoints: achievement.rewardPoints,
        sortOrder: DIARY_ACHIEVEMENTS.indexOf(achievement),
      }
    })
  }
  console.log(`[DiaryAchievement] 已同步 ${DIARY_ACHIEVEMENTS.length} 个成就定义`)
}

/**
 * 获取所有成就定义
 * @returns {array} 成就列表
 */
async function getAllAchievements() {
  return await prisma.diaryAchievement.findMany({
    where: { isActive: true },
    orderBy: [
      { category: 'asc' },
      { sortOrder: 'asc' }
    ]
  })
}

/**
 * 获取用户的成就列表（包含解锁状态）
 * @param {string} userId - 用户ID
 * @returns {array} 成就列表带解锁状态
 */
async function getUserAchievements(userId) {
  const achievements = await getAllAchievements()
  const unlocked = await prisma.userDiaryAchievement.findMany({
    where: { userId }
  })

  const unlockedMap = new Map(unlocked.map(u => [u.achievementId, u]))

  return achievements.map(a => ({
    ...a,
    unlocked: unlockedMap.has(a.id),
    unlockedAt: unlockedMap.get(a.id)?.unlockedAt || null,
    triggerDiaryId: unlockedMap.get(a.id)?.triggerDiaryId || null,
  }))
}

/**
 * 检查并解锁成就
 * @param {string} userId - 用户ID
 * @param {object} context - 上下文数据
 * @returns {array} 新解锁的成就列表
 */
async function checkAndUnlockAchievements(userId, context) {
  const {
    currentStreak = 0,
    wordLevel = 0,
    totalScore = null,
    totalWords = 0,
    totalDiaries = 0,
    rank = 'bronze',
    diaryId = null,
  } = context

  const achievements = await getAllAchievements()
  const unlocked = await prisma.userDiaryAchievement.findMany({
    where: { userId }
  })
  const unlockedCodes = new Set(unlocked.map(u => u.achievementId))

  const newlyUnlocked = []

  for (const achievement of achievements) {
    // 已解锁的跳过
    const isAlreadyUnlocked = [...unlockedCodes].some(id => {
      const a = achievements.find(x => x.id === id)
      return a && a.code === achievement.code
    })
    if (isAlreadyUnlocked) continue

    let shouldUnlock = false
    const value = parseInt(achievement.conditionValue) || achievement.conditionValue

    switch (achievement.conditionType) {
      case 'streak':
        shouldUnlock = currentStreak >= value
        break

      case 'single_level':
        shouldUnlock = wordLevel >= value
        break

      case 'grade_min':
        if (totalScore !== null) {
          shouldUnlock = totalScore >= value
        }
        break

      case 'total_words':
        shouldUnlock = totalWords >= value
        break

      case 'count':
        shouldUnlock = totalDiaries >= value
        break

      case 'rank':
        shouldUnlock = rank === value
        break
    }

    if (shouldUnlock) {
      // 解锁成就
      await prisma.userDiaryAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
          triggerDiaryId: diaryId,
        }
      })

      // 发放奖励积分
      if (achievement.rewardPoints > 0) {
        await addPointsDirect(
          userId,
          achievement.rewardPoints,
          'diary_achievement',
          { description: `解锁日记成就【${achievement.name}】` }
        )
      }

      newlyUnlocked.push(achievement)
    }
  }

  return newlyUnlocked
}

/**
 * 日记创建后检查成就
 * @param {string} userId - 用户ID
 * @param {object} diary - 日记对象
 * @param {object} stats - 用户统计对象
 * @returns {array} 新解锁的成就
 */
async function checkAchievementsOnDiaryCreate(userId, diary, stats) {
  return await checkAndUnlockAchievements(userId, {
    currentStreak: stats.currentStreak,
    wordLevel: diary.wordLevel,
    totalWords: stats.totalWords,
    totalDiaries: stats.totalDiaries,
    rank: stats.rank,
    diaryId: diary.id,
  })
}

/**
 * AI分析后检查成就
 * @param {string} userId - 用户ID
 * @param {number} totalScore - 评分
 * @param {object} stats - 用户统计对象
 * @param {string} diaryId - 日记ID
 * @returns {array} 新解锁的成就
 */
async function checkAchievementsOnAnalysis(userId, totalScore, stats, diaryId = null) {
  return await checkAndUnlockAchievements(userId, {
    currentStreak: stats.currentStreak,
    totalScore,
    totalWords: stats.totalWords,
    totalDiaries: stats.totalDiaries,
    rank: stats.rank,
    diaryId,
  })
}

/**
 * 段位升级后检查成就
 * @param {string} userId - 用户ID
 * @param {string} newRank - 新段位
 * @param {object} stats - 用户统计对象
 * @returns {array} 新解锁的成就
 */
async function checkAchievementsOnRankUp(userId, newRank, stats) {
  return await checkAndUnlockAchievements(userId, {
    currentStreak: stats.currentStreak,
    totalWords: stats.totalWords,
    totalDiaries: stats.totalDiaries,
    rank: newRank,
  })
}

/**
 * 获取用户的成就统计
 * @param {string} userId - 用户ID
 * @returns {object} 统计信息
 */
async function getAchievementStats(userId) {
  const total = await prisma.diaryAchievement.count({
    where: { isActive: true }
  })

  const unlocked = await prisma.userDiaryAchievement.count({
    where: { userId }
  })

  const recentUnlocks = await prisma.userDiaryAchievement.findMany({
    where: { userId },
    include: { achievement: true },
    orderBy: { unlockedAt: 'desc' },
    take: 5
  })

  return {
    total,
    unlocked,
    remaining: total - unlocked,
    progress: Math.round((unlocked / total) * 100),
    recentUnlocks: recentUnlocks.map(u => ({
      ...u.achievement,
      unlockedAt: u.unlockedAt,
    }))
  }
}

module.exports = {
  initializeAchievements,
  getAllAchievements,
  getUserAchievements,
  checkAndUnlockAchievements,
  checkAchievementsOnDiaryCreate,
  checkAchievementsOnAnalysis,
  checkAchievementsOnRankUp,
  getAchievementStats,
}
