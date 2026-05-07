/**
 * 积分服务类 - 统一管理所有积分逻辑
 * 严格按照 POINT_SYSTEM.md 文档实现
 */

// 使用 Prisma 单例
const prisma = require('../lib/prisma');
const creditService = require('./creditService');

class PointService {
  /**
   * 添加积分（推荐使用）
   * @param {string} ruleId - 规则ID（如 D001, R001）
   * @param {string} userId - 用户ID
   * @param {object} options - 选项
   * @param {string} options.targetType - 关联对象类型
   * @param {string} options.targetId - 关联对象ID
   * @param {string} options.description - 自定义描述
   * @returns {Promise<{success: boolean, log: object, totalPoints: number, message?: string}>}
   */
  async addPoints(ruleId, userId, options = {}) {
    try {
      const { targetType, targetId, description } = options;

      // 1. 查询规则
      const rule = await prisma.pointRule.findUnique({
        where: { id: ruleId },
      });

      if (!rule) {
        return { success: false, message: `规则 ${ruleId} 不存在` };
      }

      if (!rule.isEnabled) {
        return { success: false, message: `规则 ${ruleId} 未启用` };
      }

      // 2. 检查单规则每日上限（如果规则设置了上限）
      if (rule.dailyLimit > 0) {
        const canAdd = await this.checkDailyLimit(userId, ruleId, rule.dailyLimit);
        if (!canAdd) {
          return { success: false, message: '已达到今日上限' };
        }
      }

      // 3. 创建积分日志
      const pointLog = await prisma.pointLog.create({
        data: {
          userId,
          ruleId,
          points: rule.points,
          description: description || rule.description,
          targetType,
          targetId,
        },
      });

      // 4. 更新用户积分
      const totalPoints = await this._updateUserPoints(userId, rule.points);

      // 5. 触发信用评分底层行为 (Task 4)
      await creditService.recordBehavior(userId, 'SYSTEM', 'EARN_POINTS', {
        description: `获得积分: ${description || rule.description}`,
        sourceId: pointLog.id
      }).catch(err => console.error('Credit rule error:', err));

      return {
        success: true,
        log: pointLog,
        totalPoints,
      };
    } catch (error) {
      console.error('添加积分失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 内部方法：添加限制后的积分
   * @private
   */
  async _addPointsWithLimit(userId, points, description, targetType, targetId, ruleId) {
    const pointLog = await prisma.pointLog.create({
      data: {
        userId,
        ruleId,
        points,
        description: `${description}（部分发放）`,
        targetType,
        targetId,
      },
    });

    const totalPoints = await this._updateUserPoints(userId, points);
    await this._updateDailyLimit(userId, points);

    const limitStatus = await this.checkDailyPointsLimit(userId);

    // 触发信用评分底层行为
    await creditService.recordBehavior(userId, 'SYSTEM', 'EARN_POINTS', {
      description: `获得积分: ${description}`,
      sourceId: pointLog.id
    }).catch(err => console.error('Credit rule error:', err));

    return {
      success: true,
      limited: true,
      message: `今日积分接近上限，实际获得${points}积分`,
      log: pointLog,
      totalPoints,
      limitStatus
    };
  }

  /**
   * 更新每日限制记录
   * @private
   */
  async _updateDailyLimit(userId, points) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyPointsLimit.upsert({
      where: {
        userId_date: { userId, date: today }
      },
      create: {
        userId,
        date: today,
        earnedPoints: points
      },
      update: {
        earnedPoints: { increment: points }
      }
    });
  }

  /**
   * 扣除积分
   * @param {string} userId - 用户ID
   * @param {number} points - 扣除的积分
   * @param {string} targetType - 关联对象类型
   * @param {string} targetId - 关联对象ID
   * @param {string} description - 描述
   * @returns {Promise<{success: boolean, log: object, totalPoints: number}>}
   */
  async deductPoints(userId, points, targetType, targetId, description) {
    try {
      // 创建负数积分日志
      const pointLog = await prisma.pointLog.create({
        data: {
          userId,
          points: -Math.abs(points),
          description,
          targetType,
          targetId,
        },
      });

      // 更新用户积分
      const totalPoints = await this._updateUserPoints(userId, -Math.abs(points));

      return {
        success: true,
        log: pointLog,
        totalPoints,
      };
    } catch (error) {
      console.error('扣除积分失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 删除内容时扣除所有相关积分
   * @param {string} targetType - 对象类型
   * @param {string} targetId - 对象ID
   * @returns {Promise<{success: boolean, deductedPoints: number}>}
   */
  async deductPointsOnDelete(targetType, targetId) {
    try {
      // 查询该内容的所有积分记录
      const logs = await prisma.pointLog.findMany({
        where: {
          targetType,
          targetId,
          points: { gt: 0 }, // 只查询获得积分的记录（正数）
        },
      });

      if (logs.length === 0) {
        return { success: true, deductedPoints: 0 };
      }

      // 按用户分组计算总积分
      const userPointsMap = {};
      logs.forEach(log => {
        if (!userPointsMap[log.userId]) {
          userPointsMap[log.userId] = 0;
        }
        userPointsMap[log.userId] += log.points;
      });

      // 为每个用户创建扣除记录
      for (const [userId, points] of Object.entries(userPointsMap)) {
        await this.deductPoints(
          userId,
          points,
          targetType,
          targetId,
          `删除${targetType}扣除积分`
        );
      }

      const totalDeducted = Object.values(userPointsMap).reduce((sum, p) => sum + p, 0);
      return { success: true, deductedPoints: totalDeducted };
    } catch (error) {
      console.error('删除内容时扣除积分失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 检查每日上限
   * @param {string} userId - 用户ID
   * @param {string} ruleId - 规则ID
   * @param {number} dailyLimit - 每日上限
   * @returns {Promise<boolean>}
   */
  async checkDailyLimit(userId, ruleId, dailyLimit) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayPoints = await prisma.pointLog.aggregate({
        where: {
          userId,
          ruleId,
          createdAt: {
            gte: today,
          },
          points: { gt: 0 }, // 只计算正数积分
        },
        _sum: {
          points: true,
        },
      });

      const earned = todayPoints._sum.points || 0;
      return earned < dailyLimit;
    } catch (error) {
      console.error('检查每日上限失败:', error);
      return false;
    }
  }

  /**
   * 计算日记字数对应的积分规则ID
   * @param {number} wordCount - 字数
   * @returns {string} 规则ID
   */
  calculateDiaryRuleId(wordCount) {
    if (wordCount >= 2000) return 'D005'; // +30分
    if (wordCount >= 1500) return 'D004'; // +20分
    if (wordCount >= 1200) return 'D003'; // +15分
    if (wordCount >= 1000) return 'D002'; // +10分
    if (wordCount >= 800) return 'D001';  // +5分
    return 'D006'; // <800 扣2分
  }

  /**
   * 更新用户积分
   * @private
   * @param {string} userId - 用户ID
   * @param {number} points - 积分变化量
   * @returns {Promise<number>} 更新后的总积分
   */
  async _updateUserPoints(userId, points) {
    // 确保 UserPoints 记录存在
    let userPoints = await prisma.userPoints.findUnique({
      where: { userId },
    });

    if (!userPoints) {
      userPoints = await prisma.userPoints.create({
        data: {
          userId,
          totalPoints: 0,
          todayPoints: 0,
        },
      });
    }

    // 更新积分
    const updated = await prisma.userPoints.update({
      where: { userId },
      data: {
        totalPoints: {
          increment: points,
        },
        todayPoints: {
          increment: points,
        },
      },
    });

    // 同时更新 User 表的 totalPoints（保持兼容）
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalPoints: {
          increment: points,
        },
      },
    });

    return updated.totalPoints;
  }

  /**
   * 重置所有用户的今日积分（用于定时任务，每日0点执行）
   */
  async resetTodayPoints() {
    try {
      await prisma.userPoints.updateMany({
        data: {
          todayPoints: 0,
        },
      });
      console.log('今日积分已重置');
    } catch (error) {
      console.error('重置今日积分失败:', error);
    }
  }

  /**
   * 获取用户积分信息
   * @param {string} userId - 用户ID
   * @returns {Promise<object>}
   */
  async getUserPoints(userId) {
    let userPoints = await prisma.userPoints.findUnique({
      where: { userId },
    });

    if (!userPoints) {
      userPoints = await prisma.userPoints.create({
        data: {
          userId,
          totalPoints: 0,
          todayPoints: 0,
        },
      });
    }

    return userPoints;
  }

  /**
   * 获取用户积分日志
   * @param {string} userId - 用户ID
   * @param {object} options - 选项
   * @returns {Promise<Array>}
   */
  async getUserPointLogs(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    try {
      const logs = await prisma.pointLog.findMany({
        where: { userId },
        include: {
          rule: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      });

      return logs;
    } catch (error) {
      console.error('[PointService] getUserPointLogs error:', error);
      return [];
    }
  }

  /**
   * 初始化积分规则（迁移自 pointServiceFull）
   */
  async initializePointRules() {
    const rules = [
      { actionKey: 'POST_CREATE', description: '发布动态', points: 1 },
      { actionKey: 'DIARY_CREATE', description: '写日记', points: 1 },
      { actionKey: 'HOMEWORK_CREATE', description: '提交作业', points: 1 },
      { actionKey: 'NOTE_CREATE', description: '写笔记', points: 1 },
      { actionKey: 'READING_NOTE_CREATE', description: '写读书笔记', points: 1 },
      { actionKey: 'HTML_WORK_CREATE', description: '发布HTML作品', points: 1 },
      { actionKey: 'COMMENT_CREATE', description: '发表评论', points: 1 },
      { actionKey: 'TASK_COMPLETE', description: '完成任务', points: 2 },
      { actionKey: 'DAILY_LOGIN', description: '每日登录', points: 1 },
      { actionKey: 'CONTINUOUS_LOGIN', description: '连续登录奖励', points: 0 },
      { actionKey: 'ADMIN_REWARD', description: '管理员奖励', points: 0 },
      { actionKey: 'ADMIN_DEDUCT', description: '管理员扣分', points: 0 },
    ];

    for (const rule of rules) {
      await prisma.pointRule.upsert({
        where: { actionKey: rule.actionKey },
        update: {},
        create: rule,
      });
    }
  }

  /**
   * 应用登录积分（每日登录 + 连续登录奖励）
   * （迁移自 pointServiceFull）
   */
  async applyLoginPoints(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { lastLoginDate: true },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastLogin = user?.lastLoginDate ? new Date(user.lastLoginDate) : null;
      if (lastLogin) {
        lastLogin.setHours(0, 0, 0, 0);
      }

      // 判断是否今天已登录
      if (lastLogin && lastLogin.getTime() === today.getTime()) {
        return { success: true, message: '今日已登录过' };
      }

      // 更新最后登录日期
      await prisma.user.update({
        where: { id: userId },
        data: { lastLoginDate: new Date() },
      });

      // 查找登录规则
      const dailyLoginRule = await prisma.pointRule.findFirst({
        where: { id: { contains: 'LOGIN' } }
      });

      if (dailyLoginRule) {
        await this.addPoints(dailyLoginRule.id, userId, {
          description: '每日登录',
        });
      }

      // 判断连续登录
      if (lastLogin) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (lastLogin.getTime() === yesterday.getTime()) {
          // 连续登录，额外奖励
          await this.adjustPointsByAdmin(userId, 2, 'system', '连续登录奖励');
        }
      }

      return { success: true, message: '登录积分已发放' };
    } catch (error) {
      console.error('[PointService] applyLoginPoints error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 管理员手动调整积分
   * （迁移自 pointServiceFull）
   */
  async adjustPointsByAdmin(targetUserId, points, adminId, remark, targetType = null, targetId = null) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        const log = await tx.pointLog.create({
          data: {
            userId: targetUserId,
            points: points,
            description: `${remark} (by ${adminId})`,
            targetType,
            targetId,
          },
        });

        const user = await tx.user.update({
          where: { id: targetUserId },
          data: {
            totalPoints: {
              increment: points,
            },
          },
          select: {
            totalPoints: true,
          },
        });

        // 同时更新 UserPoints 表
        await tx.userPoints.upsert({
          where: { userId: targetUserId },
          create: {
            userId: targetUserId,
            totalPoints: points,
            todayPoints: 0,
          },
          update: {
            totalPoints: {
              increment: points,
            },
          },
        });

        return { log, totalPoints: user.totalPoints };
      });

      return { success: true, ...result };
    } catch (error) {
      console.error('[PointService] adjustPointsByAdmin error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 兼容旧版 pointServiceFull 的 getPointLogs 方法
   */
  async getPointLogs(userId, options = {}) {
    const { page = 1, limit = 20 } = options;
    try {
      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        prisma.pointLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            rule: true,
          },
        }),
        prisma.pointLog.count({ where: { userId } }),
      ]);

      return {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('[PointService] getPointLogs error:', error);
      return { logs: [], pagination: { page, limit, total: 0, totalPages: 0 } };
    }
  }

  /**
   * 兼容旧版 pointServiceFull 的 reducePoints 方法
   */
  async reducePoints(actionKey, userId, opts = {}) {
    const { reason, remark } = opts;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const rule = await tx.pointRule.findUnique({
          where: { actionKey },
        });

        if (!rule) {
          throw new Error(`积分规则 ${actionKey} 不存在`);
        }

        const log = await tx.pointLog.create({
          data: {
            userId,
            ruleId: rule.id,
            points: -Math.abs(rule.points),
            description: remark || reason || rule.description,
          },
        });

        const user = await tx.user.update({
          where: { id: userId },
          data: {
            totalPoints: {
              decrement: Math.abs(rule.points),
            },
          },
          select: {
            totalPoints: true,
          },
        });

        return { log, totalPoints: user.totalPoints };
      });

      return { success: true, ...result };
    } catch (error) {
      console.error('[PointService] reducePoints error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 兼容旧版 pointServiceFull 的 addPoints 方法（基于 actionKey）
   * 这是为了向后兼容旧代码
   */
  async addPointsByActionKey(actionKey, userId, opts = {}) {
    const { ruleOverridePoints, remark, relatedType, relatedId } = opts;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 通过 actionKey 获取规则
        const rule = await tx.pointRule.findUnique({
          where: { actionKey },
        });

        if (!rule || (rule.hasOwnProperty('active') && !rule.active)) {
          throw new Error(`积分规则 ${actionKey} 不存在或未启用`);
        }

        const pointsToAdd = ruleOverridePoints !== undefined ? ruleOverridePoints : rule.points;

        if (pointsToAdd === 0) {
          throw new Error(`积分规则 ${actionKey} 积分为0,请使用动态积分`);
        }

        // 创建积分日志
        const log = await tx.pointLog.create({
          data: {
            userId,
            ruleId: rule.id,
            points: pointsToAdd,
            description: remark || rule.description,
            targetType: relatedType,
            targetId: relatedId,
          },
        });

        // 更新用户总积分
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            totalPoints: {
              increment: pointsToAdd,
            },
          },
          select: {
            totalPoints: true,
          },
        });

        return { log, totalPoints: user.totalPoints, pointsChanged: pointsToAdd };
      });

      return { success: true, ...result };
    } catch (error) {
      console.error('[PointService] addPointsByActionKey error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取每日积分上限配置
   */
  async getDailyPointsLimit() {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'daily_points_limit' }
      });
      return setting ? parseInt(setting.value) : 100; // 默认100
    } catch (error) {
      console.error('[PointService] getDailyPointsLimit error:', error);
      return 100;
    }
  }

  /**
   * 获取用户今日已获得积分（不含奖罚模块）
   */
  async getTodayEarnedPoints(userId) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const record = await prisma.dailyPointsLimit.findUnique({
        where: {
          userId_date: {
            userId,
            date: today
          }
        }
      });

      return record ? record.earnedPoints : 0;
    } catch (error) {
      console.error('[PointService] getTodayEarnedPoints error:', error);
      return 0;
    }
  }

  /**
   * 检查是否达到每日积分上限（不含奖罚模块）
   */
  async checkDailyPointsLimit(userId) {
    try {
      const dailyLimit = await this.getDailyPointsLimit();
      const todayEarned = await this.getTodayEarnedPoints(userId);

      return {
        limit: dailyLimit,
        earned: todayEarned,
        remaining: Math.max(0, dailyLimit - todayEarned),
        isMaxed: todayEarned >= dailyLimit
      };
    } catch (error) {
      console.error('[PointService] checkDailyPointsLimit error:', error);
      return { limit: 100, earned: 0, remaining: 100, isMaxed: false };
    }
  }

  /**
   * 添加积分（带每日限制检查，奖罚模块除外）
   * @param {string} userId - 用户ID
   * @param {number} points - 积分数
   * @param {string} description - 描述
   * @param {string} targetType - 目标类型
   * @param {string} targetId - 目标ID
   * @param {boolean} isRewardPunishment - 是否为奖罚模块（默认false）
   */
  async addPointsWithDailyLimit(userId, points, description, targetType = null, targetId = null, isRewardPunishment = false) {
    try {
      // 奖罚模块不受限制
      if (isRewardPunishment) {
        return await this.addPointsByActionKey(null, userId, {
          points,
          description,
          targetType,
          targetId
        });
      }

      // 检查每日限制
      const limitStatus = await this.checkDailyPointsLimit(userId);

      // 如果已达上限，不发放积分但返回成功（允许继续提交内容）
      if (limitStatus.isMaxed) {
        return {
          success: true,
          limited: true,
          message: '已达到今日积分上限，不再获得积分',
          totalPoints: 0,
          pointsChanged: 0,
          limitStatus
        };
      }

      // 计算实际可发放的积分（不超过剩余额度）
      const actualPoints = Math.min(points, limitStatus.remaining);

      // 发放积分
      const result = await prisma.$transaction(async (tx) => {
        // 创建积分日志
        const log = await tx.pointLog.create({
          data: {
            userId,
            points: actualPoints,
            description,
            targetType,
            targetId
          }
        });

        // 更新用户总积分和UserPoints
        const [user, _] = await Promise.all([
          tx.user.update({
            where: { id: userId },
            data: { totalPoints: { increment: actualPoints } },
            select: { totalPoints: true }
          }),
          tx.userPoints.upsert({
            where: { userId },
            create: { userId, totalPoints: actualPoints, todayPoints: actualPoints },
            update: { totalPoints: { increment: actualPoints }, todayPoints: { increment: actualPoints } }
          })
        ]);

        // 更新每日积分限制记录
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        await tx.dailyPointsLimit.upsert({
          where: {
            userId_date: { userId, date: today }
          },
          create: {
            userId,
            date: today,
            earnedPoints: actualPoints
          },
          update: {
            earnedPoints: { increment: actualPoints }
          }
        });

        return { log, totalPoints: user.totalPoints, pointsChanged: actualPoints };
      });

      // 触发信用评分底层行为
      await creditService.recordBehavior(userId, 'SYSTEM', 'EARN_POINTS', {
        description: `获得积分: ${description}`,
        sourceId: result.log.id
      }).catch(err => console.error('Credit rule error:', err));

      // 如果实际发放积分少于请求积分，提示已接近上限
      const wasLimited = actualPoints < points;

      return {
        success: true,
        limited: wasLimited,
        message: wasLimited ? `今日积分接近上限，实际获得${actualPoints}积分` : undefined,
        ...result,
        limitStatus: await this.checkDailyPointsLimit(userId)
      };
    } catch (error) {
      console.error('[PointService] addPointsWithDailyLimit error:', error);
      return { success: false, error: error.message };
    }
  }
}

// 导出单例
const pointService = new PointService();

// 统一的包装函数，便于外部调用（直接增加积分，不走规则）
const addPointsDirectFn = async (userId, amount, type, meta = {}) => {
  const description = meta.description || `获得 ${amount} 积分`;
  const targetType = meta.targetType || type;
  const targetId = meta.targetId || null;
  const points = Math.abs(amount);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const log = await tx.pointLog.create({
        data: {
          userId,
          points,
          description,
          targetType,
          targetId,
        },
      });

      const user = await tx.user.update({
        where: { id: userId },
        data: { totalPoints: { increment: points } },
        select: { totalPoints: true },
      });

      await tx.userPoints.upsert({
        where: { userId },
        create: { userId, totalPoints: points, todayPoints: points },
        update: { totalPoints: { increment: points }, todayPoints: { increment: points } },
      });

      return { log, totalPoints: user.totalPoints };
    });

    return { success: true, ...result };
  } catch (error) {
    console.error('[PointService] addPointsDirect error:', error);
    return { success: false, error: error.message };
  }
};

const deductPointsDirectFn = async (userId, amount, type, meta = {}) => {
  const description = meta.description || `扣除 ${amount} 积分`;
  const targetType = meta.targetType || type;
  const targetId = meta.targetId || null;

  return await pointService.deductPoints(
    userId,
    Math.abs(amount),
    targetType,
    targetId,
    description
  );
};

module.exports = pointService;
// 注意：不要覆盖类方法！使用不同的导出名称
module.exports.addPointsDirect = addPointsDirectFn;  // 直接增加积分（不走规则）
module.exports.deductPointsDirect = deductPointsDirectFn;  // 直接扣除积分（不走规则）
module.exports.getUserPointStats = async (userId, period) => {
  // 实现获取用户统计的简单版本
  const today = new Date();
  let startDate = new Date(today);

  if (period === 'week') {
    startDate.setDate(today.getDate() - 7);
  } else if (period === 'month') {
    startDate.setMonth(today.getMonth() - 1);
  } else if (period === 'today') {
    startDate.setHours(0, 0, 0, 0);
  }

  const pointLog = await prisma.pointLog.aggregate({
    where: {
      userId,
      createdAt: { gte: startDate },
      points: { gt: 0 },
    },
    _sum: { points: true },
  });

  return { total: pointLog._sum.points || 0 };
};

module.exports.getPointRules = () => {
  return {
    daily_login: { points: 1, description: '每日登录' },
    post_create: { points: 1, description: '发布动态' },
    diary_create: { points: 1, description: '写日记' },
    homework_create: { points: 1, description: '提交作业' },
    comment_create: { points: 1, description: '发表评论' },
    task_complete: { points: 2, description: '完成任务' },
  };
};
