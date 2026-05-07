/**
 * 积分路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getPointRules, getUserPointStats } = require('../services/pointService');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

// GET /api/points/rules - 获取积分规则
router.get('/rules', authenticate, async (req, res, next) => {
  try {
    const rules = getPointRules();
    res.json({ rules });
  } catch (error) {
    next(error);
  }
});

// GET /api/points/my - 获取我的积分信息
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        totalPoints: true,
      },
    });

    res.json({
      totalPoints: user.totalPoints || 0,
      availablePoints: user.totalPoints || 0, // 可用积分（目前和总积分一致）
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/points/logs - 获取积分日志
router.get('/logs', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      prisma.pointLog.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          rule: {
            select: {
              id: true,
              description: true,
              actionKey: true,
            },
          },
        },
      }),
      prisma.pointLog.count({ where: { userId: req.user.id } }),
    ]);

    // 获取用户总积分
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { totalPoints: true },
    });

    res.json({
      totalPoints: user?.totalPoints || 0,
      availablePoints: user?.totalPoints || 0,
      logs: logs.map(log => ({
        id: log.id,
        points: log.points,
        description: log.description || log.rule?.description || '积分变动',
        targetType: log.targetType,
        targetId: log.targetId,
        createdAt: log.createdAt,
        ruleId: log.ruleId,
        ruleName: log.rule?.description,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('获取积分日志失败:', error);
    next(error);
  }
});

// GET /api/points/records - 获取积分明细
router.get('/records', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, period } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = { userId: req.user.id };

    // 根据周期筛选
    if (period) {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'today':
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
      }

      if (startDate) {
        where.createdAt = { gte: startDate };
      }
    }

    const [records, total] = await Promise.all([
      prisma.pointRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.pointRecord.count({ where }),
    ]);

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/points/stats - 获取积分统计
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { totalPoints: true },
    });

    // 获取今日积分
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayPoints = await prisma.pointRecord.aggregate({
      where: {
        userId: req.user.id,
        createdAt: { gte: todayStart },
      },
      _sum: { points: true },
    });

    // 获取周积分
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekPoints = await prisma.pointRecord.aggregate({
      where: {
        userId: req.user.id,
        createdAt: { gte: weekStart },
      },
      _sum: { points: true },
    });

    // 获取月积分
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    const monthPoints = await prisma.pointRecord.aggregate({
      where: {
        userId: req.user.id,
        createdAt: { gte: monthStart },
      },
      _sum: { points: true },
    });

    // 获取积分明细按类型统计
    const actionStats = await prisma.pointRecord.groupBy({
      by: ['action'],
      where: { userId: req.user.id },
      _sum: { points: true },
      _count: { action: true },
    });

    res.json({
      totalPoints: user.totalPoints,
      todayPoints: todayPoints._sum.points || 0,
      weekPoints: weekPoints._sum.points || 0,
      monthPoints: monthPoints._sum.points || 0,
      actionStats: actionStats.map(stat => ({
        action: stat.action,
        totalPoints: stat._sum.points,
        count: stat._count.action,
      })),
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/points/admin/reward - 管理员奖励积分
router.post('/admin/reward', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    const { userId, points, description } = req.body;

    if (!userId || !points) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const { addPoints } = require('../services/pointService');
    const result = await addPoints(userId, 'ADMIN_REWARD', {
      points: parseInt(points),
      description: description || `管理员奖励 ${points} 积分`,
    });

    res.json({
      message: '奖励成功',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/points/admin/deduct - 管理员扣除积分
router.post('/admin/deduct', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    const { userId, points, description } = req.body;

    if (!userId || !points) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const { addPoints } = require('../services/pointService');
    const result = await addPoints(userId, 'ADMIN_DEDUCT', {
      points: -Math.abs(parseInt(points)), // 确保是负数
      description: description || `管理员扣除 ${points} 积分`,
    });

    res.json({
      message: '扣除成功',
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/points/leaderboard - 获取积分排行榜
router.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, period, order = 'desc' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 支持正序(desc)或倒序(asc)排列
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    // 获取学生用户按积分排序（排行榜只显示学生）
    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE', // 只显示激活的用户
        role: 'STUDENT',  // 只显示学生
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        totalPoints: true,
        profile: {
          select: {
            nickname: true,
          },
        },
      },
      orderBy: {
        totalPoints: sortOrder,
      },
      skip,
      take: parseInt(limit),
    });

    // 获取学生总数
    const total = await prisma.user.count({
      where: { status: 'ACTIVE', role: 'STUDENT' },
    });

    // 添加排名信息
    const leaderboard = users.map((user, index) => ({
      ...user,
      rank: skip + index + 1,
      displayName: user.profile?.nickname || user.username,
    }));

    // 查找当前用户的排名（只在学生中排名）
    const currentUserRank = await prisma.user.count({
      where: {
        status: 'ACTIVE',
        role: 'STUDENT',
        totalPoints: {
          gt: (await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { totalPoints: true },
          })).totalPoints,
        },
      },
    });

    res.json({
      leaderboard,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
      currentUserRank: currentUserRank + 1,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/points/exchange/config - 获取兑换配置
router.get('/exchange/config', authenticate, async (req, res, next) => {
  try {
    const [rateConfig, limitConfig] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'point_exchange_rate' } }),
      prisma.systemSetting.findUnique({ where: { key: 'daily_exchange_limit' } }),
    ]);

    const rate = rateConfig ? JSON.parse(rateConfig.value) : { points: 100, coins: 10 };
    const dailyLimit = limitConfig ? parseInt(limitConfig.value) : 5000;

    // 获取今日已兑换的积分
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayExchanges = await prisma.pointExchange.aggregate({
      where: {
        userId: req.user.id,
        createdAt: { gte: today },
      },
      _sum: {
        pointsSpent: true,
      },
    });

    const todayUsed = todayExchanges._sum.pointsSpent || 0;
    const remainingLimit = Math.max(0, dailyLimit - todayUsed);

    res.json({
      rate, // { points: 100, coins: 10 }
      dailyLimit,
      todayUsed,
      remainingLimit,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/points/exchange - 积分兑换学习币
router.post('/exchange', authenticate, async (req, res, next) => {
  try {
    const { points } = req.body;
    const userId = req.user.id;

    if (!points || points <= 0) {
      return res.status(400).json({ error: '兑换积分必须大于0' });
    }

    const pointsToExchange = parseInt(points);

    const rateConfig = await prisma.systemSetting.findUnique({ where: { key: 'point_exchange_rate' } });
    const rate = rateConfig ? JSON.parse(rateConfig.value) : { points: 100, coins: 10 };

    const coinsToGain = Math.floor((pointsToExchange / rate.points) * rate.coins);

    if (coinsToGain <= 0) {
      return res.status(400).json({
        error: `兑换积分太少，至少需要 ${rate.points} 积分才能兑换 ${rate.coins} 学习币`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true },
      });

      if (!user || user.totalPoints < pointsToExchange) {
        throw new Error('积分余额不足');
      }

      await tx.pointLog.create({
        data: {
          userId,
          points: -pointsToExchange,
          description: `兑换${coinsToGain}学习币`,
          targetType: 'point_exchange',
        },
      });

      await tx.user.update({
        where: { id: userId },
        data: { totalPoints: { decrement: pointsToExchange } },
      });

      await tx.userPoints.update({
        where: { userId },
        data: {
          totalPoints: { decrement: pointsToExchange },
          todayPoints: { decrement: pointsToExchange },
        },
      });

      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId, balance: 0 } });
      }

      await tx.wallet.update({
        where: { userId },
        data: { balance: { increment: coinsToGain } },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          amount: coinsToGain,
          type: 'exchange_from_points',
          description: `积分兑换获得${coinsToGain}学习币`,
        },
      });

      const exchange = await tx.pointExchange.create({
        data: {
          userId,
          pointsSpent: pointsToExchange,
          coinsGained: coinsToGain,
          exchangeRate: `${rate.points}:${rate.coins}`,
        },
      });

      return exchange;
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });

    const wallet = await prisma.wallet.findUnique({ where: { userId } });

    res.json({
      success: true,
      message: `兑换成功，获得${coinsToGain}学习币`,
      pointsSpent: pointsToExchange,
      coinsGained: coinsToGain,
      newPointsBalance: updatedUser.totalPoints,
      newCoinsBalance: wallet.balance,
    });
  } catch (error) {
    if (error.message === '积分余额不足') {
      return res.status(400).json({ error: '积分余额不足' });
    }
    next(error);
  }
});

// GET /api/points/exchange/history - 获取兑换历史
router.get('/exchange/history', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [exchanges, total] = await Promise.all([
      prisma.pointExchange.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.pointExchange.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      exchanges,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
