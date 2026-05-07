const prisma = require('../lib/prisma');

/**
 * 获取所有信用规则
 */
exports.getRules = async (req, res, next) => {
  try {
    const rules = await prisma.creditRule.findMany({
      orderBy: { behaviorType: 'asc' }
    });
    res.json({ success: true, rules });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建新规则
 */
exports.createRule = async (req, res, next) => {
  try {
    const { behaviorType, action, dimension, points, conditions, isEnabled, description } = req.body;
    
    const rule = await prisma.creditRule.create({
      data: {
        behaviorType,
        action,
        dimension,
        points: parseFloat(points),
        conditions,
        isEnabled,
        description
      }
    });
    
    res.json({ success: true, rule });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新规则
 */
exports.updateRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { behaviorType, action, dimension, points, conditions, isEnabled, description } = req.body;
    
    const rule = await prisma.creditRule.update({
      where: { id },
      data: {
        behaviorType,
        action,
        dimension,
        points: parseFloat(points),
        conditions,
        isEnabled,
        description
      }
    });
    
    res.json({ success: true, rule });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除规则
 */
exports.deleteRule = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.creditRule.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有用户的信用评分列表
 */
exports.getAllUserProfiles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, keyword } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (keyword) {
      where.user = {
        OR: [
          { username: { contains: keyword } },
          { profile: { is: { nickname: { contains: keyword } } } }
        ]
      };
    }

    const [profiles, total] = await Promise.all([
      prisma.userCreditProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              profile: { select: { nickname: true } }
            }
          }
        },
        orderBy: { totalScore: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.userCreditProfile.count({ where })
    ]);

    res.json({
      success: true,
      profiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取特定用户的信用明细
 */
exports.getUserCreditDetail = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const profile = await prisma.userCreditProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: { select: { nickname: true } }
          }
        }
      }
    });

    if (!profile) {
      return res.status(404).json({ success: false, error: '未找到该用户的信用记录' });
    }

    const recentImpacts = await prisma.creditImpact.findMany({
      where: { userId },
      include: {
        BehaviorLog: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // 管理员查看更多明细
    });

    res.json({ success: true, profile, recentImpacts });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取特定用户的信用历史记录
 */
exports.getUserCreditHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const history = await prisma.userCreditHistory.findMany({
      where: { userId },
      orderBy: [
        { year: 'desc' },
        { week: 'desc' }
      ],
      take: 52
    });
    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};

