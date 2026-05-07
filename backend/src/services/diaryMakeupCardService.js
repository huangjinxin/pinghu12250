/**
 * 日记补签卡服务
 */

const prisma = require('../lib/prisma')
const { getCurrentWeek, isYesterday, getLogicalDate, getToday } = require('./diaryDateService')
const { restoreStreakWithMakeupCard } = require('./diaryStatsService')
const { deductPointsDirect } = require('./pointService')

const MAKEUP_CARD_COST = 250 // 补签卡价格

/**
 * 购买补签卡
 * @param {string} userId - 用户ID
 * @returns {object} 补签卡记录
 */
async function purchaseCard(userId) {
  const currentWeek = getCurrentWeek()

  // 检查本周是否已购买
  const existingCard = await prisma.diaryMakeupCard.findFirst({
    where: {
      userId,
      purchaseWeek: currentWeek,
    }
  })

  if (existingCard) {
    throw new Error('本周已购买过补签卡，每周只能购买一次')
  }

  // 检查用户积分是否足够
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalPoints: true }
  })

  if (!user || user.totalPoints < MAKEUP_CARD_COST) {
    throw new Error(`积分不足，补签卡需要 ${MAKEUP_CARD_COST} 积分`)
  }

  // 扣除积分
  await deductPointsDirect(userId, MAKEUP_CARD_COST, 'makeup_card_purchase', {
    description: '购买日记补签卡'
  })

  // 创建补签卡
  const card = await prisma.diaryMakeupCard.create({
    data: {
      userId,
      purchaseWeek: currentWeek,
      pointsCost: MAKEUP_CARD_COST,
      status: 'unused',
    }
  })

  return card
}

/**
 * 获取用户的补签卡列表
 * @param {string} userId - 用户ID
 * @returns {array} 补签卡列表
 */
async function getUserCards(userId) {
  return await prisma.diaryMakeupCard.findMany({
    where: { userId },
    orderBy: { purchasedAt: 'desc' }
  })
}

/**
 * 获取用户可用的补签卡
 * @param {string} userId - 用户ID
 * @returns {object|null} 可用的补签卡
 */
async function getAvailableCard(userId) {
  return await prisma.diaryMakeupCard.findFirst({
    where: {
      userId,
      status: 'unused',
    },
    orderBy: { purchasedAt: 'asc' } // 先用最早购买的
  })
}

/**
 * 使用补签卡
 * @param {string} userId - 用户ID
 * @param {string} cardId - 补签卡ID
 * @param {string} diaryId - 补交日记的ID
 * @returns {object} 使用结果
 */
async function useCard(userId, cardId, diaryId) {
  // 获取补签卡
  const card = await prisma.diaryMakeupCard.findUnique({
    where: { id: cardId }
  })

  if (!card) {
    throw new Error('补签卡不存在')
  }

  if (card.userId !== userId) {
    throw new Error('无权使用此补签卡')
  }

  if (card.status !== 'unused') {
    throw new Error('补签卡已使用或已过期')
  }

  // 获取日记
  const diary = await prisma.diary.findUnique({
    where: { id: diaryId }
  })

  if (!diary) {
    throw new Error('日记不存在')
  }

  if (diary.authorId !== userId) {
    throw new Error('无权操作此日记')
  }

  if (!diary.isBackfill) {
    throw new Error('只能对补交日记使用补签卡')
  }

  // 检查是否是最近一天（昨天）
  const diaryLogicalDate = getLogicalDate(diary.logicalDate || diary.createdAt)
  const today = getToday()

  if (!isYesterday(diaryLogicalDate, today)) {
    throw new Error('只能补签最近一天的日记')
  }

  // 使用事务处理
  const result = await prisma.$transaction(async (tx) => {
    // 1. 更新补签卡状态
    await tx.diaryMakeupCard.update({
      where: { id: cardId },
      data: {
        status: 'used',
        usedAt: new Date(),
        usedForDate: diary.logicalDate,
        usedForDiaryId: diaryId,
      }
    })

    // 2. 更新日记的 isMadeUp 状态
    await tx.diary.update({
      where: { id: diaryId },
      data: { isMadeUp: true }
    })

    // 3. 恢复连续天数（这个函数需要在事务外调用，因为它有自己的数据库操作）
    return { cardId, diaryId, makeupDate: diaryLogicalDate }
  })

  // 恢复连续天数
  const stats = await restoreStreakWithMakeupCard(userId, result.makeupDate)

  return {
    success: true,
    message: '补签成功，连续天数已恢复',
    stats,
  }
}

/**
 * 检查本周是否可以购买补签卡
 * @param {string} userId - 用户ID
 * @returns {object} { canPurchase, reason }
 */
async function checkCanPurchase(userId) {
  const currentWeek = getCurrentWeek()

  const existingCard = await prisma.diaryMakeupCard.findFirst({
    where: {
      userId,
      purchaseWeek: currentWeek,
    }
  })

  if (existingCard) {
    return {
      canPurchase: false,
      reason: '本周已购买过补签卡',
      existingCard,
    }
  }

  // 检查积分
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalPoints: true }
  })

  if (!user || user.totalPoints < MAKEUP_CARD_COST) {
    return {
      canPurchase: false,
      reason: `积分不足，需要 ${MAKEUP_CARD_COST} 积分`,
      currentPoints: user?.totalPoints || 0,
    }
  }

  return {
    canPurchase: true,
    cost: MAKEUP_CARD_COST,
    currentPoints: user.totalPoints,
  }
}

/**
 * 检查是否有可用的补签机会
 * @param {string} userId - 用户ID
 * @returns {object} { canMakeup, availableCard, eligibleDiaries }
 */
async function checkMakeupOpportunity(userId) {
  // 获取可用补签卡
  const availableCard = await getAvailableCard(userId)

  if (!availableCard) {
    return {
      canMakeup: false,
      reason: '没有可用的补签卡',
    }
  }

  // 查找昨天的补交日记
  const today = getToday()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const eligibleDiaries = await prisma.diary.findMany({
    where: {
      authorId: userId,
      isBackfill: true,
      isMadeUp: false,
      logicalDate: {
        gte: new Date(yesterdayStr + 'T00:00:00.000Z'),
        lte: new Date(yesterdayStr + 'T23:59:59.999Z'),
      },
      deletedAt: null,
    }
  })

  if (eligibleDiaries.length === 0) {
    return {
      canMakeup: false,
      reason: '没有昨天的补交日记可以补签',
      availableCard,
    }
  }

  return {
    canMakeup: true,
    availableCard,
    eligibleDiaries,
  }
}

module.exports = {
  MAKEUP_CARD_COST,
  purchaseCard,
  getUserCards,
  getAvailableCard,
  useCard,
  checkCanPurchase,
  checkMakeupOpportunity,
}
