/**
 * 日记游戏化 API 路由
 * 处理统计、成就、补签卡等功能
 */

const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth')
const diaryStatsService = require('../services/diaryStatsService')
const diaryAchievementService = require('../services/diaryAchievementService')
const diaryMakeupCardService = require('../services/diaryMakeupCardService')
const { DIARY_LEVELS } = require('../config/diaryLevels')
const { DIARY_RANKS } = require('../config/diaryRanks')

// ========== 统计相关 ==========

/**
 * 获取当前用户的日记统计
 * GET /api/diary-game/stats
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await diaryStatsService.getStatsWithDetails(req.user.id)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('[DiaryGame] 获取统计失败:', error)
    res.status(500).json({
      success: false,
      error: '获取统计失败'
    })
  }
})

/**
 * 获取配置信息（字数级别、段位定义）
 * GET /api/diary-game/config
 */
router.get('/config', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        levels: DIARY_LEVELS,
        ranks: DIARY_RANKS,
      }
    })
  } catch (error) {
    console.error('[DiaryGame] 获取配置失败:', error)
    res.status(500).json({
      success: false,
      error: '获取配置失败'
    })
  }
})

// ========== 成就相关 ==========

/**
 * 获取用户成就列表
 * GET /api/diary-game/achievements
 */
router.get('/achievements', authenticate, async (req, res) => {
  try {
    const achievements = await diaryAchievementService.getUserAchievements(req.user.id)

    res.json({
      success: true,
      data: achievements
    })
  } catch (error) {
    console.error('[DiaryGame] 获取成就失败:', error)
    res.status(500).json({
      success: false,
      error: '获取成就失败'
    })
  }
})

/**
 * 获取成就统计
 * GET /api/diary-game/achievements/stats
 */
router.get('/achievements/stats', authenticate, async (req, res) => {
  try {
    const stats = await diaryAchievementService.getAchievementStats(req.user.id)

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('[DiaryGame] 获取成就统计失败:', error)
    res.status(500).json({
      success: false,
      error: '获取成就统计失败'
    })
  }
})

// ========== 补签卡相关 ==========

/**
 * 获取补签卡列表
 * GET /api/diary-game/makeup-cards
 */
router.get('/makeup-cards', authenticate, async (req, res) => {
  try {
    const cards = await diaryMakeupCardService.getUserCards(req.user.id)

    res.json({
      success: true,
      data: cards
    })
  } catch (error) {
    console.error('[DiaryGame] 获取补签卡失败:', error)
    res.status(500).json({
      success: false,
      error: '获取补签卡失败'
    })
  }
})

/**
 * 检查是否可以购买补签卡
 * GET /api/diary-game/makeup-cards/can-purchase
 */
router.get('/makeup-cards/can-purchase', authenticate, async (req, res) => {
  try {
    const result = await diaryMakeupCardService.checkCanPurchase(req.user.id)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('[DiaryGame] 检查购买失败:', error)
    res.status(500).json({
      success: false,
      error: '检查购买失败'
    })
  }
})

/**
 * 购买补签卡
 * POST /api/diary-game/makeup-cards/purchase
 */
router.post('/makeup-cards/purchase', authenticate, async (req, res) => {
  try {
    const card = await diaryMakeupCardService.purchaseCard(req.user.id)

    res.json({
      success: true,
      data: card,
      message: '购买成功'
    })
  } catch (error) {
    console.error('[DiaryGame] 购买补签卡失败:', error)
    res.status(400).json({
      success: false,
      error: error.message || '购买失败'
    })
  }
})

/**
 * 检查补签机会
 * GET /api/diary-game/makeup-cards/opportunity
 */
router.get('/makeup-cards/opportunity', authenticate, async (req, res) => {
  try {
    const result = await diaryMakeupCardService.checkMakeupOpportunity(req.user.id)

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('[DiaryGame] 检查补签机会失败:', error)
    res.status(500).json({
      success: false,
      error: '检查补签机会失败'
    })
  }
})

/**
 * 使用补签卡
 * POST /api/diary-game/makeup-cards/:cardId/use
 */
router.post('/makeup-cards/:cardId/use', authenticate, async (req, res) => {
  try {
    const { cardId } = req.params
    const { diaryId } = req.body

    if (!diaryId) {
      return res.status(400).json({
        success: false,
        error: '请指定要补签的日记'
      })
    }

    const result = await diaryMakeupCardService.useCard(req.user.id, cardId, diaryId)

    res.json({
      success: true,
      data: result,
      message: '补签成功'
    })
  } catch (error) {
    console.error('[DiaryGame] 使用补签卡失败:', error)
    res.status(400).json({
      success: false,
      error: error.message || '使用补签卡失败'
    })
  }
})

// ========== 综合数据 ==========

/**
 * 获取首页展示用的综合数据
 * GET /api/diary-game/overview
 */
router.get('/overview', authenticate, async (req, res) => {
  try {
    const [stats, achievementStats] = await Promise.all([
      diaryStatsService.getStatsWithDetails(req.user.id),
      diaryAchievementService.getAchievementStats(req.user.id),
    ])

    res.json({
      success: true,
      data: {
        stats,
        achievements: achievementStats,
      }
    })
  } catch (error) {
    console.error('[DiaryGame] 获取综合数据失败:', error)
    res.status(500).json({
      success: false,
      error: '获取数据失败'
    })
  }
})

module.exports = router
