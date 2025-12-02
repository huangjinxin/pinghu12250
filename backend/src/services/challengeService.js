/**
 * 每日挑战服务 - 管理每日挑战系统
 */

const { PrismaClient } = require('@prisma/client');
const pointService = require('./pointService');

const prisma = new PrismaClient();

class ChallengeService {
  /**
   * 生成今日挑战
   * @returns {Promise<{success: boolean, dailyChallenge: object}>}
   */
  async generateTodaysChallenges() {
    try {
      const today = this._getTodayString();

      // 检查今日挑战是否已存在
      const existing = await prisma.dailyChallenge.findUnique({
        where: { challengeDate: today },
      });

      if (existing) {
        return { success: true, dailyChallenge: existing, message: '今日挑战已存在' };
      }

      // 从每个难度中随机选择一个挑战模板
      const easyChallenge = await this._selectRandomChallenge('EASY');
      const mediumChallenge = await this._selectRandomChallenge('MEDIUM');
      const hardChallenge = await this._selectRandomChallenge('HARD');

      if (!easyChallenge || !mediumChallenge || !hardChallenge) {
        throw new Error('挑战模板不足，无法生成今日挑战');
      }

      // 创建今日挑战
      const dailyChallenge = await prisma.dailyChallenge.create({
        data: {
          challengeDate: today,
          easyChallengeId: easyChallenge.id,
          mediumChallengeId: mediumChallenge.id,
          hardChallengeId: hardChallenge.id,
        },
        include: {
          easyChallenge: true,
          mediumChallenge: true,
          hardChallenge: true,
        },
      });

      console.log(`✓ 生成今日挑战: ${today}`);

      // 为所有活跃用户创建挑战记录
      await this._createUserRecordsForAllUsers(dailyChallenge);

      return { success: true, dailyChallenge };
    } catch (error) {
      console.error('生成今日挑战失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取用户今日挑战
   * @param {string} userId - 用户ID
   * @returns {Promise<object>}
   */
  async getTodaysChallenges(userId) {
    try {
      const today = this._getTodayString();

      // 获取今日挑战
      let dailyChallenge = await prisma.dailyChallenge.findUnique({
        where: { challengeDate: today },
        include: {
          easyChallenge: true,
          mediumChallenge: true,
          hardChallenge: true,
        },
      });

      // 如果不存在，生成今日挑战
      if (!dailyChallenge) {
        const result = await this.generateTodaysChallenges();
        if (!result.success) {
          throw new Error(result.message);
        }
        dailyChallenge = result.dailyChallenge;
      }

      // 获取用户的挑战记录
      let userRecords = await prisma.userChallengeRecord.findMany({
        where: {
          userId,
          dailyChallengeId: dailyChallenge.id,
        },
      });

      // 如果用户记录不存在，创建
      if (userRecords.length === 0) {
        userRecords = await this._createUserRecords(userId, dailyChallenge);
      }

      // 组装数据
      const challenges = [
        {
          difficulty: 'EASY',
          template: dailyChallenge.easyChallenge,
          record: userRecords.find(r => r.difficulty === 'EASY'),
        },
        {
          difficulty: 'MEDIUM',
          template: dailyChallenge.mediumChallenge,
          record: userRecords.find(r => r.difficulty === 'MEDIUM'),
        },
        {
          difficulty: 'HARD',
          template: dailyChallenge.hardChallenge,
          record: userRecords.find(r => r.difficulty === 'HARD'),
        },
      ];

      // 获取用户统计
      const stats = await this.getUserStats(userId);

      return {
        success: true,
        challenges,
        stats,
        challengeDate: today,
      };
    } catch (error) {
      console.error('获取今日挑战失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 检查并更新用户挑战进度
   * @param {string} userId - 用户ID
   * @param {string} action - 行为类型
   * @param {object} data - 行为数据
   */
  async checkAndUpdateProgress(userId, action, data = {}) {
    try {
      const today = this._getTodayString();

      // 获取今日挑战
      const dailyChallenge = await prisma.dailyChallenge.findUnique({
        where: { challengeDate: today },
        include: {
          easyChallenge: true,
          mediumChallenge: true,
          hardChallenge: true,
        },
      });

      if (!dailyChallenge) {
        return; // 今日挑战还未生成
      }

      // 获取用户的挑战记录
      const userRecords = await prisma.userChallengeRecord.findMany({
        where: {
          userId,
          dailyChallengeId: dailyChallenge.id,
          status: 'IN_PROGRESS',
        },
      });

      // 检查每个挑战
      for (const record of userRecords) {
        const template = await prisma.challengeTemplate.findUnique({
          where: { id: record.challengeId },
        });

        if (!template) continue;

        // 根据挑战类型和条件类型更新进度
        const shouldUpdate = this._shouldUpdateChallenge(template, action, data);
        if (!shouldUpdate) continue;

        const newProgress = this._calculateProgress(template, action, data, record.progress);

        // 更新进度
        await prisma.userChallengeRecord.update({
          where: { id: record.id },
          data: {
            progress: newProgress,
            status: newProgress >= record.target ? 'COMPLETED' : 'IN_PROGRESS',
            completedAt: newProgress >= record.target ? new Date() : null,
          },
        });

        console.log(`✓ 更新挑战进度: ${template.title} - ${newProgress}/${record.target}`);
      }
    } catch (error) {
      console.error('更新挑战进度失败:', error);
    }
  }

  /**
   * 领取挑战奖励
   * @param {string} userId - 用户ID
   * @param {string} recordId - 挑战记录ID
   * @returns {Promise<{success: boolean}>}
   */
  async claimReward(userId, recordId) {
    try {
      // 获取挑战记录
      const record = await prisma.userChallengeRecord.findUnique({
        where: { id: recordId },
        include: {
          dailyChallenge: true,
        },
      });

      if (!record) {
        return { success: false, message: '挑战记录不存在' };
      }

      if (record.userId !== userId) {
        return { success: false, message: '无权领取此奖励' };
      }

      if (record.status !== 'COMPLETED') {
        return { success: false, message: '挑战未完成' };
      }

      if (record.rewardClaimed) {
        return { success: false, message: '奖励已领取' };
      }

      // 获取挑战模板
      const template = await prisma.challengeTemplate.findUnique({
        where: { id: record.challengeId },
      });

      if (!template) {
        return { success: false, message: '挑战模板不存在' };
      }

      // 确定规则ID
      let ruleId;
      if (record.difficulty === 'EASY') ruleId = 'C001';
      else if (record.difficulty === 'MEDIUM') ruleId = 'C002';
      else if (record.difficulty === 'HARD') ruleId = 'C003';

      // 发放积分（统一使用积分，不奖励学习币）
      const pointResult = await pointService.addPoints(ruleId, userId, {
        targetType: 'daily_challenge',
        targetId: record.id,
        description: `完成挑战: ${template.title}`,
      });

      if (!pointResult.success) {
        return { success: false, message: '积分发放失败' };
      }

      // 标记奖励已领取
      await prisma.userChallengeRecord.update({
        where: { id: recordId },
        data: {
          rewardClaimed: true,
        },
      });

      // 检查连续完成奖励
      const streakReward = await this._checkStreakReward(userId);

      return {
        success: true,
        points: template.rewardPoints,
        totalPoints: pointResult.totalPoints,
        streakReward,
      };
    } catch (error) {
      console.error('领取奖励失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取用户统计
   * @param {string} userId - 用户ID
   * @returns {Promise<object>}
   */
  async getUserStats(userId) {
    try {
      // 本周完成数
      const weekStart = this._getWeekStartString();
      const weekCompleted = await prisma.userChallengeRecord.count({
        where: {
          userId,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(weekStart),
          },
        },
      });

      // 计算连续天数
      const streakDays = await this._calculateStreakDays(userId);

      return {
        weekCompleted,
        streakDays,
      };
    } catch (error) {
      console.error('获取用户统计失败:', error);
      return {
        weekCompleted: 0,
        streakDays: 0,
      };
    }
  }

  /**
   * 获取用户历史挑战记录
   * @param {string} userId - 用户ID
   * @param {object} options - 选项
   * @returns {Promise<Array>}
   */
  async getUserHistory(userId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const records = await prisma.userChallengeRecord.findMany({
        where: { userId },
        include: {
          dailyChallenge: {
            include: {
              easyChallenge: true,
              mediumChallenge: true,
              hardChallenge: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      const total = await prisma.userChallengeRecord.count({
        where: { userId },
      });

      // 按日期分组
      const groupedByDate = {};
      for (const record of records) {
        const date = record.dailyChallenge.challengeDate;
        if (!groupedByDate[date]) {
          groupedByDate[date] = {
            date,
            challenges: [],
          };
        }

        const template = await prisma.challengeTemplate.findUnique({
          where: { id: record.challengeId },
        });

        groupedByDate[date].challenges.push({
          ...record,
          template,
        });
      }

      const history = Object.values(groupedByDate);

      return {
        success: true,
        history,
        pagination: {
          page,
          limit,
          total: Math.ceil(total / 3), // 每天3个挑战
          totalPages: Math.ceil(total / (limit * 3)),
        },
      };
    } catch (error) {
      console.error('获取历史记录失败:', error);
      return {
        success: false,
        history: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };
    }
  }

  // ========== 私有方法 ==========

  /**
   * 获取今日日期字符串 (YYYY-MM-DD)
   * @private
   */
  _getTodayString() {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  /**
   * 获取本周开始日期字符串
   * @private
   */
  _getWeekStartString() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  /**
   * 按权重随机选择挑战模板
   * @private
   */
  async _selectRandomChallenge(difficulty) {
    try {
      const templates = await prisma.challengeTemplate.findMany({
        where: {
          difficulty,
          isActive: true,
        },
      });

      if (templates.length === 0) {
        return null;
      }

      // 计算总权重
      const totalWeight = templates.reduce((sum, t) => sum + t.weight, 0);

      // 随机选择
      let random = Math.random() * totalWeight;
      for (const template of templates) {
        random -= template.weight;
        if (random <= 0) {
          return template;
        }
      }

      return templates[0];
    } catch (error) {
      console.error('选择挑战模板失败:', error);
      return null;
    }
  }

  /**
   * 为所有活跃用户创建挑战记录
   * @private
   */
  async _createUserRecordsForAllUsers(dailyChallenge) {
    try {
      const users = await prisma.user.findMany({
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      });

      for (const user of users) {
        await this._createUserRecords(user.id, dailyChallenge);
      }

      console.log(`✓ 为 ${users.length} 个用户创建挑战记录`);
    } catch (error) {
      console.error('创建用户挑战记录失败:', error);
    }
  }

  /**
   * 为单个用户创建挑战记录
   * @private
   */
  async _createUserRecords(userId, dailyChallenge) {
    try {
      const records = [];

      const challenges = [
        { difficulty: 'EASY', challengeId: dailyChallenge.easyChallengeId },
        { difficulty: 'MEDIUM', challengeId: dailyChallenge.mediumChallengeId },
        { difficulty: 'HARD', challengeId: dailyChallenge.hardChallengeId },
      ];

      for (const { difficulty, challengeId } of challenges) {
        const template = await prisma.challengeTemplate.findUnique({
          where: { id: challengeId },
        });

        if (!template) continue;

        const record = await prisma.userChallengeRecord.create({
          data: {
            userId,
            dailyChallengeId: dailyChallenge.id,
            challengeId,
            difficulty,
            status: 'IN_PROGRESS',
            progress: 0,
            target: template.conditionValue,
          },
        });

        records.push(record);
      }

      return records;
    } catch (error) {
      console.error('创建用户挑战记录失败:', error);
      return [];
    }
  }

  /**
   * 判断是否应该更新此挑战
   * @private
   */
  _shouldUpdateChallenge(template, action, data) {
    const typeActionMap = {
      DIARY: ['diary_create'],
      STUDY: ['learning_start', 'learning_stop', 'learning_session'],
      WORK: ['work_create', 'work_like'],
      READING: ['reading_create'],
      SOCIAL: ['like', 'comment'],
    };

    const validActions = typeActionMap[template.type] || [];
    return validActions.includes(action);
  }

  /**
   * 计算新的进度值
   * @private
   */
  _calculateProgress(template, action, data, currentProgress) {
    if (template.conditionType === 'WORD_COUNT') {
      // 字数类型：取最大值
      return Math.max(currentProgress, data.wordCount || 0);
    } else if (template.conditionType === 'DURATION') {
      // 时长类型：累加
      return currentProgress + (data.duration || 0);
    } else if (template.conditionType === 'COUNT') {
      // 次数类型：累加
      return currentProgress + (data.count || 1);
    } else if (template.conditionType === 'ACTION') {
      // 单次行为：完成即可
      return template.conditionValue;
    }

    return currentProgress;
  }

  /**
   * 计算连续完成天数
   * @private
   */
  async _calculateStreakDays(userId) {
    try {
      let streakDays = 0;
      let currentDate = new Date();

      while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];

        // 检查这一天是否完成了所有挑战
        const dailyChallenge = await prisma.dailyChallenge.findUnique({
          where: { challengeDate: dateStr },
        });

        if (!dailyChallenge) {
          break;
        }

        const completedCount = await prisma.userChallengeRecord.count({
          where: {
            userId,
            dailyChallengeId: dailyChallenge.id,
            status: 'COMPLETED',
            rewardClaimed: true,
          },
        });

        if (completedCount === 3) {
          streakDays++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }

      return streakDays;
    } catch (error) {
      console.error('计算连续天数失败:', error);
      return 0;
    }
  }

  /**
   * 检查并发放连续完成奖励
   * @private
   */
  async _checkStreakReward(userId) {
    try {
      const streakDays = await this._calculateStreakDays(userId);

      const rewards = [];

      // 检查3天连续
      if (streakDays === 3) {
        await pointService.addPoints('C004', userId, {
          targetType: 'daily_challenge_streak',
          targetId: 'streak_3',
          description: '连续完成3天挑战',
        });
        await walletService.addCoins(userId, 50, 'challenge_streak', '连续完成3天挑战');
        rewards.push({ days: 3, points: 50, coins: 50 });
      }

      // 检查7天连续
      if (streakDays === 7) {
        await pointService.addPoints('C005', userId, {
          targetType: 'daily_challenge_streak',
          targetId: 'streak_7',
          description: '连续完成7天挑战',
        });
        await walletService.addCoins(userId, 100, 'challenge_streak', '连续完成7天挑战');
        rewards.push({ days: 7, points: 100, coins: 100 });
      }

      return rewards.length > 0 ? rewards : null;
    } catch (error) {
      console.error('检查连续奖励失败:', error);
      return null;
    }
  }
}

// 导出单例
const challengeService = new ChallengeService();
module.exports = challengeService;
