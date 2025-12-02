/**
 * 每日挑战路由
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const challengeService = require('../services/challengeService');
const { authenticate, isAdmin } = require('../middleware/auth');

const prisma = new PrismaClient();

// ========== 用户接口 ==========

/**
 * GET /api/challenges/today
 * 获取今日挑战
 */
router.get('/today', authenticate, async (req, res) => {
  try {
    const result = await challengeService.getTodaysChallenges(req.user.id);

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    res.json(result);
  } catch (error) {
    console.error('获取今日挑战失败:', error);
    res.status(500).json({ error: '获取今日挑战失败' });
  }
});

/**
 * POST /api/challenges/:recordId/claim
 * 领取挑战奖励
 */
router.post('/:recordId/claim', authenticate, async (req, res) => {
  try {
    const { recordId } = req.params;

    const result = await challengeService.claimReward(req.user.id, recordId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      message: '奖励领取成功',
      ...result,
    });
  } catch (error) {
    console.error('领取奖励失败:', error);
    res.status(500).json({ error: '领取奖励失败' });
  }
});

/**
 * GET /api/challenges/history
 * 获取用户历史挑战记录
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await challengeService.getUserHistory(req.user.id, { page, limit });

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    res.json(result);
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ error: '获取历史记录失败' });
  }
});

/**
 * GET /api/challenges/stats
 * 获取用户统计
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    const stats = await challengeService.getUserStats(req.user.id);

    res.json(stats);
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

// ========== 管理员接口 ==========

/**
 * GET /api/challenges/admin/templates
 * 获取所有挑战模板
 */
router.get('/admin/templates', authenticate, isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const difficulty = req.query.difficulty;

    const where = {};
    if (difficulty) {
      where.difficulty = difficulty;
    }

    const [templates, total] = await Promise.all([
      prisma.challengeTemplate.findMany({
        where,
        orderBy: [
          { difficulty: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.challengeTemplate.count({ where }),
    ]);

    res.json({
      templates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取挑战模板失败:', error);
    res.status(500).json({ error: '获取挑战模板失败' });
  }
});

/**
 * POST /api/challenges/admin/templates
 * 创建挑战模板
 */
router.post('/admin/templates', authenticate, isAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      difficulty,
      conditionType,
      conditionValue,
      rewardPoints,
      rewardCoins,
      weight,
    } = req.body;

    // 验证必填字段
    if (!title || !description || !type || !difficulty || !conditionType) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const template = await prisma.challengeTemplate.create({
      data: {
        title,
        description,
        type,
        difficulty,
        conditionType,
        conditionValue: parseInt(conditionValue) || 1,
        rewardPoints: parseInt(rewardPoints) || 10,
        rewardCoins: 0, // 统一使用积分，不奖励学习币
        weight: parseInt(weight) || 1,
        isActive: true,
      },
    });

    res.status(201).json({
      message: '挑战模板创建成功',
      template,
    });
  } catch (error) {
    console.error('创建挑战模板失败:', error);
    res.status(500).json({ error: '创建挑战模板失败' });
  }
});

/**
 * PUT /api/challenges/admin/templates/:id
 * 更新挑战模板
 */
router.put('/admin/templates/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      type,
      difficulty,
      conditionType,
      conditionValue,
      rewardPoints,
      rewardCoins,
      weight,
      isActive,
    } = req.body;

    const template = await prisma.challengeTemplate.update({
      where: { id },
      data: {
        title,
        description,
        type,
        difficulty,
        conditionType,
        conditionValue: conditionValue ? parseInt(conditionValue) : undefined,
        rewardPoints: rewardPoints ? parseInt(rewardPoints) : undefined,
        rewardCoins: 0, // 统一使用积分，不奖励学习币
        weight: weight ? parseInt(weight) : undefined,
        isActive,
      },
    });

    res.json({
      message: '挑战模板更新成功',
      template,
    });
  } catch (error) {
    console.error('更新挑战模板失败:', error);
    res.status(500).json({ error: '更新挑战模板失败' });
  }
});

/**
 * DELETE /api/challenges/admin/templates/:id
 * 删除挑战模板
 */
router.delete('/admin/templates/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查是否有正在使用的挑战
    const usageCount = await prisma.dailyChallenge.count({
      where: {
        OR: [
          { easyChallengeId: id },
          { mediumChallengeId: id },
          { hardChallengeId: id },
        ],
      },
    });

    if (usageCount > 0) {
      // 如果正在使用，只是禁用而不删除
      await prisma.challengeTemplate.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        message: '该模板正在使用，已禁用',
      });
    }

    // 如果没有使用，直接删除
    await prisma.challengeTemplate.delete({
      where: { id },
    });

    res.json({
      message: '挑战模板删除成功',
    });
  } catch (error) {
    console.error('删除挑战模板失败:', error);
    res.status(500).json({ error: '删除挑战模板失败' });
  }
});

/**
 * POST /api/challenges/admin/generate
 * 手动生成今日挑战（测试用）
 */
router.post('/admin/generate', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await challengeService.generateTodaysChallenges();

    if (!result.success) {
      return res.status(500).json({ error: result.message });
    }

    res.json({
      message: '今日挑战生成成功',
      ...result,
    });
  } catch (error) {
    console.error('生成今日挑战失败:', error);
    res.status(500).json({ error: '生成今日挑战失败' });
  }
});

module.exports = router;
