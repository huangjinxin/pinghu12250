/**
 * 成就徽章系统路由
 */

const express = require('express');
const router = express.Router();
const achievementService = require('../services/achievementService');
const { authenticate } = require('../middleware/auth');

// ========== 公开接口 ==========

/**
 * GET /api/achievements
 * 获取所有成就列表（包括用户解锁状态，如果已登录）
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const achievements = await achievementService.getAllAchievements(userId);

    // 如果用户未登录，过滤掉隐藏成就
    const filteredAchievements = userId
      ? achievements
      : achievements.filter(a => !a.isHidden);

    res.json({
      success: true,
      achievements: filteredAchievements,
    });
  } catch (error) {
    console.error('获取成就列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取成就列表失败',
    });
  }
});

/**
 * GET /api/achievements/recent
 * 获取最近解锁的成就（全局）
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const recentUnlocks = await prisma.userAchievement.findMany({
      include: {
        achievement: true,
        // 需要在schema中添加user relation或者单独查询
      },
      orderBy: {
        unlockedAt: 'desc',
      },
      take: limit,
    });

    res.json({
      success: true,
      recentUnlocks,
    });
  } catch (error) {
    console.error('获取最近解锁失败:', error);
    res.status(500).json({
      success: false,
      error: '获取最近解锁失败',
    });
  }
});

// ========== 需要认证的接口 ==========

/**
 * GET /api/achievements/my
 * 获取当前用户的成就
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const { showcased } = req.query;
    const showcasedOnly = showcased === 'true';

    const userAchievements = await achievementService.getUserAchievements(
      req.user.id,
      { showcasedOnly }
    );

    res.json({
      success: true,
      achievements: userAchievements,
    });
  } catch (error) {
    console.error('获取用户成就失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户成就失败',
    });
  }
});

/**
 * GET /api/achievements/stats
 * 获取当前用户的成就统计
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await achievementService.getAchievementStats(req.user.id);

    if (!stats) {
      return res.status(500).json({
        success: false,
        error: '获取成就统计失败',
      });
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('获取成就统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取成就统计失败',
    });
  }
});

/**
 * PUT /api/achievements/:achievementId/showcase
 * 设置成就展示状态
 */
router.put('/:achievementId/showcase', authenticate, async (req, res) => {
  try {
    const { achievementId } = req.params;
    const { isShowcased } = req.body;

    if (typeof isShowcased !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isShowcased 必须是布尔值',
      });
    }

    const result = await achievementService.setShowcase(
      req.user.id,
      achievementId,
      isShowcased
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      message: isShowcased ? '已设置展示' : '已取消展示',
    });
  } catch (error) {
    console.error('设置展示失败:', error);
    res.status(500).json({
      success: false,
      error: '设置展示失败',
    });
  }
});

/**
 * GET /api/achievements/users/:userId
 * 查看其他用户的成就
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 获取用户基本信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatar: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      });
    }

    // 获取用户成就
    const userAchievements = await achievementService.getUserAchievements(userId);
    const stats = await achievementService.getAchievementStats(userId);

    res.json({
      success: true,
      user,
      achievements: userAchievements,
      stats,
    });
  } catch (error) {
    console.error('获取用户成就失败:', error);
    res.status(500).json({
      success: false,
      error: '获取用户成就失败',
    });
  }
});

/**
 * POST /api/achievements/check
 * 手动触发成就检查（开发/测试用）
 */
router.post('/check', authenticate, async (req, res) => {
  try {
    const { action, data } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: '缺少 action 参数',
      });
    }

    const result = await achievementService.checkAchievements(
      req.user.id,
      action,
      data || {}
    );

    res.json({
      success: true,
      message: `检查完成，解锁了 ${result.unlockedAchievements.length} 个成就`,
      unlockedAchievements: result.unlockedAchievements,
    });
  } catch (error) {
    console.error('检查成就失败:', error);
    res.status(500).json({
      success: false,
      error: '检查成就失败',
    });
  }
});

/**
 * GET /api/achievements/categories
 * 获取成就分类统计
 */
router.get('/categories', authenticate, async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const achievements = await prisma.achievement.groupBy({
      by: ['category', 'rarity'],
      _count: {
        id: true,
      },
    });

    // 获取用户在每个分类中的解锁数量
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: req.user.id },
      include: {
        achievement: {
          select: {
            category: true,
            rarity: true,
          },
        },
      },
    });

    // 按分类统计
    const categoryStats = {};
    const rarityStats = {
      COMMON: { total: 0, unlocked: 0 },
      RARE: { total: 0, unlocked: 0 },
      EPIC: { total: 0, unlocked: 0 },
      LEGENDARY: { total: 0, unlocked: 0 },
    };

    for (const item of achievements) {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { total: 0, unlocked: 0 };
      }
      categoryStats[item.category].total += item._count.id;
      rarityStats[item.rarity].total += item._count.id;
    }

    for (const ua of userAchievements) {
      categoryStats[ua.achievement.category].unlocked++;
      rarityStats[ua.achievement.rarity].unlocked++;
    }

    res.json({
      success: true,
      categoryStats,
      rarityStats,
    });
  } catch (error) {
    console.error('获取分类统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取分类统计失败',
    });
  }
});

module.exports = router;
