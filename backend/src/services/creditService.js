const prisma = require('../lib/prisma');

/**
 * 记录用户行为，触发信用评分规则引擎
 * 
 * @param {string} userId - 用户ID
 * @param {string} behaviorType - 行为分类 (LEARNING, SOCIAL, OFFLINE, SYSTEM)
 * @param {string} action - 具体行为动作 (例如 LIKE, OFFLINE_RUNNING)
 * @param {object} payload - 附加数据
 * @param {number} payload.duration - 时长（秒）
 * @param {string} payload.description - 行为描述
 * @param {string} payload.sourceId - 关联的来源业务ID
 */
async function recordBehavior(userId, behaviorType, action, payload = {}) {
  const { duration, description, sourceId } = payload;

  // 1. 创建通用行为记录
  const behaviorLog = await prisma.behaviorLog.create({
    data: {
      userId,
      behaviorType,
      action,
      duration,
      description,
      sourceId
    }
  });

  // 2. 匹配规则引擎 (寻找匹配此类型且已启用的规则)
  const rules = await prisma.creditRule.findMany({
    where: {
      behaviorType,
      action,
      isEnabled: true
    }
  });

  if (rules.length === 0) {
    // 无匹配规则，仅记录行为，不产生信用影响
    return behaviorLog;
  }

  // 3. 应用规则并生成影响
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  for (const rule of rules) {
    let shouldApply = true;
    // 应用基础权重
    let finalPoints = rule.points * (rule.weight !== undefined ? rule.weight : 1.0);

    // 解析条件限制
    if (rule.conditions) {
      // 检查时长条件
      if (rule.conditions.minDuration && (duration || 0) < rule.conditions.minDuration) {
        shouldApply = false;
      }
    }

    if (!shouldApply) continue;

    // --- 防刷机制 1：重复行为衰减 ---
    const todaySameActions = await prisma.behaviorLog.count({
      where: {
        userId,
        action: rule.action,
        createdAt: { gte: todayStart }
      }
    });

    // todaySameActions 包括了刚才插入的那条记录本身，所以如果是1代表首次
    if (todaySameActions === 2) {
      finalPoints = finalPoints * 0.5; // 第二次收益减半
    } else if (todaySameActions >= 3) {
      finalPoints = finalPoints * 0.1; // 第三次及以上收益极低
    }

    // --- 防刷机制 2：按维度控制每日上限 ---
    // 默认每个维度每日最高加 50 分，如果规则里有自定义则使用自定义，否则默认 50
    const dimensionDailyLimit = rule.conditions?.dimensionDailyLimit || 50;

    if (finalPoints > 0) {
      const todayDimensionImpacts = await prisma.creditImpact.aggregate({
        _sum: { rawPoints: true },
        where: {
          userId,
          dimension: rule.dimension,
          rawPoints: { gt: 0 }, // 只统计正向加分
          createdAt: { gte: todayStart }
        }
      });

      const sumToday = todayDimensionImpacts._sum.rawPoints || 0;
      if (sumToday >= dimensionDailyLimit) {
        shouldApply = false; // 该维度今日已达上限
      } else if (sumToday + finalPoints > dimensionDailyLimit) {
        finalPoints = dimensionDailyLimit - sumToday; // 截断给分
      }
    }

    if (shouldApply && finalPoints !== 0) {
      // 创建信用影响记录
      await prisma.creditImpact.create({
        data: {
          userId,
          behaviorId: behaviorLog.id,
          dimension: rule.dimension,
          rawPoints: finalPoints,
          finalPoints: finalPoints // 初始影响等同于原始分数，后续由定时任务应用时间衰减
        }
      });
    }
  }

  // 4. 重新计算该用户的六维度及总分
  await updateUserCreditProfile(userId);

  return behaviorLog;
}

/**
 * 全量重新计算用户信用分分布 (聚合所有有效 CreditImpact 并映射至满分1000分体系)
 */
async function updateUserCreditProfile(userId) {
  // 获取用户所有有效的影响分值
  const impacts = await prisma.creditImpact.findMany({
    where: { userId }
  });

  const rawScores = {
    MORALITY: 0,
    INTELLIGENCE: 0,
    PHYSIQUE: 0,
    AESTHETICS: 0,
    LABOR: 0,
    SOCIETY: 0
  };

  // 衰减算法：
  // 近 30 天：1.0
  // 30 - 90 天：0.8
  // 90天以上：0.5
  const now = new Date();
  
  impacts.forEach(impact => {
    const daysDiff = (now - new Date(impact.createdAt)) / (1000 * 60 * 60 * 24);
    let weight = 1.0;
    
    if (daysDiff > 90) {
      weight = 0.5;
    } else if (daysDiff > 30) {
      weight = 0.8;
    }

    const decayedPoint = impact.rawPoints * weight;
    rawScores[impact.dimension] += decayedPoint;
  });

  // 分值映射算法（渐进逼近法）
  // 每个维度满分 1000 / 6 = 166.666...
  // 公式： Score = 166.66 * (1 - exp(-rawScore / K))
  // 我们设定基础参数 K = 200，意味着原始分拿到约 200 分时，可以达到该维度满分的 63% (105分)
  const MAX_DIMENSION_SCORE = 166.66;
  const K = 200;

  const finalScores = {
    MORALITY: 0,
    INTELLIGENCE: 0,
    PHYSIQUE: 0,
    AESTHETICS: 0,
    LABOR: 0,
    SOCIETY: 0
  };

  let totalScore = 0;

  for (const dim in rawScores) {
    if (rawScores[dim] > 0) {
      finalScores[dim] = MAX_DIMENSION_SCORE * (1 - Math.exp(-rawScores[dim] / K));
    } else if (rawScores[dim] < 0) {
      // 如果原始分是负的（例如严重扣分），可以通过特定算法扣除，
      // 信用分设计通常最低分为0。如果负分过多，映射为0即可。
      finalScores[dim] = 0;
    }
    totalScore += finalScores[dim];
  }

  // 更新或创建 Profile
  await prisma.userCreditProfile.upsert({
    where: { userId },
    update: {
      moralityScore: Number(finalScores.MORALITY.toFixed(2)),
      intelligenceScore: Number(finalScores.INTELLIGENCE.toFixed(2)),
      physiqueScore: Number(finalScores.PHYSIQUE.toFixed(2)),
      aestheticsScore: Number(finalScores.AESTHETICS.toFixed(2)),
      laborScore: Number(finalScores.LABOR.toFixed(2)),
      societyScore: Number(finalScores.SOCIETY.toFixed(2)),
      totalScore: Number(totalScore.toFixed(2))
    },
    create: {
      userId,
      moralityScore: Number(finalScores.MORALITY.toFixed(2)),
      intelligenceScore: Number(finalScores.INTELLIGENCE.toFixed(2)),
      physiqueScore: Number(finalScores.PHYSIQUE.toFixed(2)),
      aestheticsScore: Number(finalScores.AESTHETICS.toFixed(2)),
      laborScore: Number(finalScores.LABOR.toFixed(2)),
      societyScore: Number(finalScores.SOCIETY.toFixed(2)),
      totalScore: Number(totalScore.toFixed(2))
    }
  });
}

/**
 * 获取信用概况
 */
async function getCreditProfile(userId) {
  let profile = await prisma.userCreditProfile.findUnique({
    where: { userId }
  });

  if (!profile) {
    // 初始化空面板
    profile = await prisma.userCreditProfile.create({
      data: { userId }
    });
  }

  // 获取近期动态
  const recentImpacts = await prisma.creditImpact.findMany({
    where: { userId },
    include: {
      behavior: true
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  return {
    profile,
    recentImpacts
  };
}

module.exports = {
  recordBehavior,
  updateUserCreditProfile,
  getCreditProfile
};
