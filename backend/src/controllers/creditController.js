const creditService = require('../services/creditService');
const prisma = require('../lib/prisma');

/**
 * 获取当前用户的信用概况（含各维度分数、总分及近期动态）
 */
exports.getMyCreditProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // 获取/初始化用户信用数据
    const { profile, recentImpacts } = await creditService.getCreditProfile(userId);

    // 计算信用趋势 (简单按天聚合近30天)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const impactsLast30Days = await prisma.creditImpact.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        rawPoints: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const trend = {};
    impactsLast30Days.forEach(impact => {
      const date = impact.createdAt.toISOString().split('T')[0];
      if (!trend[date]) {
        trend[date] = 0;
      }
      trend[date] += impact.rawPoints;
    });

    res.json({
      success: true,
      profile,
      recentImpacts,
      trend
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 用户主动提交线下活动
 */
exports.submitOfflineActivity = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { title, category, duration, description, images } = req.body;

    if (!title || !duration) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    const activity = await prisma.offlineActivity.create({
      data: {
        userId,
        title,
        category,
        duration: parseInt(duration),
        description,
        images: images || []
      }
    });

    // 触发规则引擎
    await creditService.recordBehavior(userId, 'OFFLINE', 'OFFLINE_ACTIVITY', {
      duration: parseInt(duration),
      description: `线下活动: ${title}`,
      sourceId: activity.id
    });

    res.json({
      success: true,
      activity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前用户的信用周度历史记录
 */
exports.getMyCreditHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const history = await prisma.userCreditHistory.findMany({
      where: { userId },
      orderBy: [
        { year: 'desc' },
        { week: 'desc' }
      ],
      take: 52 // 默认获取最近一年的历史
    });
    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};
