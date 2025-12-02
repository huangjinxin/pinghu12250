/**
 * 积分系统路由 - 完整版
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth');
const pointService = require('../services/pointService');

const prisma = new PrismaClient();

/**
 * POST /api/points/apply
 * 应用积分（内部调用，需认证）
 */
router.post('/apply', authenticate, async (req, res, next) => {
  try {
    const { actionKey, userId, ruleOverridePoints, remark, relatedType, relatedId } = req.body;

    if (!actionKey) {
      return res.status(400).json({ error: 'actionKey 为必填项' });
    }

    const targetUserId = userId || req.user.id;

    const result = await pointService.addPoints(actionKey, targetUserId, {
      ruleOverridePoints,
      remark,
      relatedType,
      relatedId,
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      message: '积分应用成功',
      pointsChanged: result.pointsChanged || result.log.points,
      totalPoints: result.totalPoints,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/points/my
 * GET /api/points/me
 * 获取当前用户积分统计和明细
 */
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { period } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // 获取总积分
    const userPoints = await pointService.getUserPoints(userId);
    const totalPoints = userPoints.totalPoints;

    // 计算时间范围
    let startDate = null;
    if (period === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    // 获取积分明细
    const logsResult = await pointService.getPointLogs(userId, { page, limit });

    // 过滤时间范围
    let filteredLogs = logsResult.logs;
    if (startDate) {
      filteredLogs = logsResult.logs.filter(log => new Date(log.createdAt) >= startDate);
    }

    // 计算周积分和月积分
    const weekDate = new Date();
    weekDate.setDate(weekDate.getDate() - 7);
    const monthDate = new Date();
    monthDate.setDate(monthDate.getDate() - 30);

    const weekPoints = logsResult.logs
      .filter(log => new Date(log.createdAt) >= weekDate)
      .reduce((sum, log) => sum + log.points, 0);

    const monthPoints = logsResult.logs
      .filter(log => new Date(log.createdAt) >= monthDate)
      .reduce((sum, log) => sum + log.points, 0);

    res.json({
      totalPoints,
      weekPoints,
      monthPoints,
      records: filteredLogs.map(log => ({
        id: log.id,
        actionKey: log.targetType || 'other',
        points: log.points,
        description: log.description || log.rule?.description || '',
        createdAt: log.createdAt,
      })),
      pagination: logsResult.pagination,
    });
  } catch (error) {
    next(error);
  }
});

// 别名路由
router.get('/me', authenticate, async (req, res, next) => {
  req.url = '/my';
  return router.handle(req, res, next);
});

/**
 * GET /api/points/stats
 * 获取详细统计数据
 */
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 获取所有积分日志
    const allLogs = await prisma.pointLog.findMany({
      where: { userId },
      select: {
        points: true,
        description: true,
        targetType: true,
      },
    });

    // 按 targetType 分组统计
    const actionStats = {};
    allLogs.forEach(log => {
      const key = log.targetType || 'other';
      if (!actionStats[key]) {
        actionStats[key] = {
          action: key,
          totalPoints: 0,
          count: 0,
        };
      }
      actionStats[key].totalPoints += log.points;
      actionStats[key].count += 1;
    });

    res.json({
      actionStats: Object.values(actionStats),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/points/records
 * 获取积分明细（支持分页和筛选）
 */
router.get('/records', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await pointService.getPointLogs(userId, { page, limit });

    res.json({
      records: result.logs.map(log => ({
        id: log.id,
        actionKey: log.targetType || 'other',
        points: log.points,
        description: log.description || log.rule?.description || '',
        createdAt: log.createdAt,
      })),
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/points/leaderboard
 * 获取积分排行榜
 */
router.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          status: 'ACTIVE',
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
          totalPoints: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.user.count({
        where: {
          status: 'ACTIVE',
        },
      }),
    ]);

    // 添加排名
    const leaderboard = users.map((user, index) => ({
      id: user.id,
      username: user.username,
      displayName: user.profile?.nickname || user.username,
      avatar: user.avatar,
      totalPoints: user.totalPoints,
      rank: skip + index + 1,
    }));

    // 查找当前用户排名
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { totalPoints: true },
    });

    const currentUserRank = await prisma.user.count({
      where: {
        status: 'ACTIVE',
        totalPoints: {
          gt: currentUser.totalPoints,
        },
      },
    }) + 1;

    res.json({
      leaderboard,
      currentUserRank,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/points/admin/logs
 * 管理员查询所有用户积分日志（分页、筛选）
 */
router.get('/admin/logs', authenticate, isAdmin, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const { userId, targetType } = req.query;

    const where = {};
    if (userId) where.userId = userId;
    if (targetType) where.targetType = targetType;

    const [logs, total] = await Promise.all([
      prisma.pointLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          rule: true,
        },
      }),
      prisma.pointLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/points/admin/rules
 * 列出所有积分规则
 */
router.get('/admin/rules', authenticate, async (req, res, next) => {
  try {
    const rules = await prisma.pointRule.findMany({
      orderBy: { createdAt: 'asc' },
    });

    res.json({ rules });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/points/admin/rules
 * 管理员创建积分规则
 */
router.post('/admin/rules', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { actionKey, description, points, active } = req.body;

    if (!actionKey || !description || points === undefined) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const rule = await prisma.pointRule.create({
      data: {
        actionKey,
        description,
        points,
        active: active !== undefined ? active : true,
      },
    });

    res.json({
      message: '规则创建成功',
      rule,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '该积分类型已存在' });
    }
    next(error);
  }
});

/**
 * PUT /api/points/admin/rules/:id
 * 管理员编辑积分规则
 */
router.put('/admin/rules/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { description, points, isEnabled } = req.body;

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (points !== undefined) updateData.points = points;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

    const rule = await prisma.pointRule.update({
      where: { id },
      data: updateData,
    });

    res.json({
      message: '规则更新成功',
      rule,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '规则不存在' });
    }
    next(error);
  }
});

/**
 * POST /api/points/admin/adjust
 * 管理员手动调整用户积分
 */
router.post('/admin/adjust', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { targetUserId, points, remark } = req.body;

    if (!targetUserId || points === undefined) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const result = await pointService.adjustPointsByAdmin(
      targetUserId,
      points,
      req.user.id,
      remark || '管理员调整'
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      message: '积分调整成功',
      totalPoints: result.totalPoints,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/points/admin/init
 * 初始化积分规则（管理员操作）
 */
router.post('/admin/init', authenticate, isAdmin, async (req, res, next) => {
  try {
    await pointService.initializePointRules();
    res.json({ message: '积分规则初始化成功' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/points/exchange/config
 * 获取积分兑换配置
 */
router.get('/exchange/config', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 获取兑换比例配置
    const rateSetting = await prisma.systemSetting.findUnique({
      where: { key: 'point_exchange_rate' },
    });

    // 获取每日上限配置
    const limitSetting = await prisma.systemSetting.findUnique({
      where: { key: 'daily_exchange_limit' },
    });

    const rate = rateSetting ? JSON.parse(rateSetting.value) : { points: 100, coins: 10 };
    const dailyLimit = limitSetting ? parseInt(limitSetting.value) : 500;

    // 计算今日已使用额度
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayExchanges = await prisma.pointExchange.findMany({
      where: {
        userId,
        createdAt: {
          gte: today,
        },
      },
    });

    const todayUsed = todayExchanges.reduce((sum, ex) => sum + ex.pointsSpent, 0);
    const remainingLimit = Math.max(0, dailyLimit - todayUsed);

    res.json({
      rate,
      dailyLimit,
      todayUsed,
      remainingLimit,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/points/exchange
 * 积分兑换学习币
 */
router.post('/exchange', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ error: '兑换积分必须大于0' });
    }

    // 获取兑换比例
    const rateSetting = await prisma.systemSetting.findUnique({
      where: { key: 'point_exchange_rate' },
    });
    const rate = rateSetting ? JSON.parse(rateSetting.value) : { points: 100, coins: 10 };

    // 获取每日上限
    const limitSetting = await prisma.systemSetting.findUnique({
      where: { key: 'daily_exchange_limit' },
    });
    const dailyLimit = limitSetting ? parseInt(limitSetting.value) : 500;

    // 检查今日额度
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayExchanges = await prisma.pointExchange.findMany({
      where: {
        userId,
        createdAt: {
          gte: today,
        },
      },
    });

    const todayUsed = todayExchanges.reduce((sum, ex) => sum + ex.pointsSpent, 0);

    if (todayUsed + points > dailyLimit) {
      return res.status(400).json({
        error: '超过每日兑换上限',
        remainingLimit: dailyLimit - todayUsed,
      });
    }

    // 检查用户积分余额
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });

    if (user.totalPoints < points) {
      return res.status(400).json({ error: '积分余额不足' });
    }

    // 计算兑换的学习币
    const coins = Math.floor((points / rate.points) * rate.coins);

    if (coins <= 0) {
      return res.status(400).json({ error: `至少需要 ${rate.points} 积分才能兑换` });
    }

    // 执行兑换事务
    const result = await prisma.$transaction(async (tx) => {
      // 1. 扣除积分
      await pointService.deductPoints(
        userId,
        points,
        'point_exchange',
        null,
        `积分兑换学习币 (${points}积分 → ${coins}学习币)`
      );

      // 2. 获取或创建钱包
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId,
            balance: 0,
          },
        });
      }

      // 3. 增加学习币
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: coins,
          },
        },
      });

      // 4. 创建钱包交易记录
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: coins,
          type: 'point_exchange',
          description: `积分兑换 (${points}积分)`,
          relatedType: 'point_exchange',
        },
      });

      // 5. 创建兑换记录
      const exchange = await tx.pointExchange.create({
        data: {
          userId,
          pointsSpent: points,
          coinsGained: coins,
          exchangeRate: `${rate.points}:${rate.coins}`,
        },
      });

      return { exchange, coins };
    });

    res.json({
      message: '兑换成功',
      pointsSpent: points,
      coinsGained: result.coins,
      exchangeRate: `${rate.points}:${rate.coins}`,
    });
  } catch (error) {
    console.error('积分兑换失败:', error);
    next(error);
  }
});

/**
 * GET /api/points/exchange/history
 * 获取兑换历史
 */
router.get('/exchange/history', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [exchanges, total] = await Promise.all([
      prisma.pointExchange.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pointExchange.count({
        where: { userId },
      }),
    ]);

    res.json({
      exchanges: exchanges.map(ex => ({
        id: ex.id,
        pointsSpent: ex.pointsSpent,
        coinsGained: ex.coinsGained,
        exchangeRate: ex.exchangeRate,
        createdAt: ex.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
