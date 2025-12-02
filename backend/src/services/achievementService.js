/**
 * 成就徽章服务
 * 管理成就的检查、解锁、进度追踪
 */

const { PrismaClient } = require('@prisma/client');
const pointService = require('./pointService');
const { sendAchievementNotification } = require('./notificationService');

const prisma = new PrismaClient();

// 成就触发映射表
const ACHIEVEMENT_TRIGGERS = {
  // 创作类
  work_published: ['FIRST_WORK', 'WORK_CREATOR_10', 'WORK_CREATOR_50'],
  work_likes: ['POPULAR_WORK', 'VIRAL_WORK'],
  diary_published: ['FIRST_DIARY', 'DIARY_WRITER_50', 'DIARY_WRITER_200'],

  // 学习类
  learning_duration: ['STUDY_10H', 'STUDY_100H', 'STUDY_500H', 'QUICK_LEARNER', 'SUPER_LEARNER'],
  learning_early: ['EARLY_BIRD'],
  learning_late: ['NIGHT_OWL'],
  pomodoro_complete: ['FOCUS_MASTER'],
  book_finished: ['BOOK_WORM', 'BOOK_LOVER_50'],
  reading_log_published: ['READING_LOG_100'],

  // 坚持类
  diary_streak: ['DIARY_STREAK_7', 'DIARY_STREAK_30', 'DIARY_STREAK_100'],
  study_streak: ['STUDY_STREAK_7', 'STUDY_STREAK_30'],
  login_streak: ['LOGIN_STREAK_30', 'LOGIN_STREAK_100'],
  challenge_streak: ['CHALLENGE_STREAK_7', 'PERFECT'],

  // 社交类
  total_likes_received: ['SOCIAL_EXPERT', 'POPULAR', 'INFLUENCER'],
  comments_sent: ['COMMENTER', 'ACTIVE_COMMENTER'],
  likes_sent: ['FIRST_LIKE'],

  // 特殊类
  total_points: ['POINT_TYCOON'],
  all_types: ['ALL_ROUNDER'],
  all_achievements: ['LEGEND'],
};

class AchievementService {
  /**
   * 检查并更新成就进度
   * @param {string} userId - 用户ID
   * @param {string} action - 触发动作
   * @param {object} data - 相关数据
   */
  async checkAchievements(userId, action, data = {}) {
    try {
      const achievementCodes = ACHIEVEMENT_TRIGGERS[action];
      if (!achievementCodes || achievementCodes.length === 0) {
        return { success: true, unlockedAchievements: [] };
      }

      const unlockedAchievements = [];

      // 获取相关成就定义
      const achievements = await prisma.achievement.findMany({
        where: {
          code: {
            in: achievementCodes,
          },
        },
      });

      for (const achievement of achievements) {
        // 检查是否已解锁
        const existingUnlock = await prisma.userAchievement.findFirst({
          where: {
            userId,
            achievementId: achievement.id,
          },
        });

        if (existingUnlock) {
          continue; // 已解锁，跳过
        }

        // 计算当前值
        const currentValue = await this._calculateCurrentValue(userId, achievement, data);

        // 更新进度
        await this._updateProgress(userId, achievement.id, currentValue, achievement.conditionValue);

        // 检查是否达成
        if (currentValue >= achievement.conditionValue) {
          const unlocked = await this._unlockAchievement(userId, achievement);
          if (unlocked) {
            unlockedAchievements.push(achievement);
          }
        }
      }

      return { success: true, unlockedAchievements };
    } catch (error) {
      console.error('检查成就失败:', error);
      return { success: false, error: error.message, unlockedAchievements: [] };
    }
  }

  /**
   * 解锁成就
   * @private
   */
  async _unlockAchievement(userId, achievement) {
    try {
      // 创建解锁记录
      await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id,
          isShowcased: false,
        },
      });

      // 发放奖励（统一使用积分，不奖励学习币）
      if (achievement.rewardPoints > 0) {
        await pointService.addPointsDirect(
          userId,
          achievement.rewardPoints,
          'achievement',
          {
            description: `解锁成就：${achievement.name}`,
            targetType: 'achievement',
            targetId: achievement.id,
          }
        );
      }

      console.log(`✨ 用户 ${userId} 解锁成就: ${achievement.name} (${achievement.code})`);

      // 发送系统消息通知
      try {
        await sendAchievementNotification(userId, achievement);
      } catch (notifError) {
        console.error('发送成就通知失败:', notifError);
        // 不影响主流程
      }

      // 检查是否解锁了"传奇用户"成就
      if (achievement.code !== 'LEGEND') {
        await this._checkLegendAchievement(userId);
      }

      return true;
    } catch (error) {
      console.error('解锁成就失败:', error);
      return false;
    }
  }

  /**
   * 更新进度
   * @private
   */
  async _updateProgress(userId, achievementId, currentValue, targetValue) {
    try {
      await prisma.achievementProgress.upsert({
        where: {
          userId_achievementId: {
            userId,
            achievementId,
          },
        },
        update: {
          currentValue,
          targetValue,
        },
        create: {
          userId,
          achievementId,
          currentValue,
          targetValue,
        },
      });
    } catch (error) {
      console.error('更新进度失败:', error);
    }
  }

  /**
   * 计算当前值
   * @private
   */
  async _calculateCurrentValue(userId, achievement, data) {
    const { code, conditionType } = achievement;

    try {
      // 创作类成就
      if (code === 'FIRST_WORK' || code === 'WORK_CREATOR_10' || code === 'WORK_CREATOR_50') {
        return await prisma.hTMLWork.count({ where: { authorId: userId } });
      }

      if (code === 'POPULAR_WORK' || code === 'VIRAL_WORK') {
        const works = await prisma.hTMLWork.findMany({
          where: { authorId: userId },
          include: { likes: true },
        });
        const maxLikes = Math.max(0, ...works.map(w => w.likes.length));
        return maxLikes;
      }

      if (code === 'FIRST_DIARY' || code === 'DIARY_WRITER_50' || code === 'DIARY_WRITER_200') {
        return await prisma.diary.count({ where: { authorId: userId } });
      }

      // 学习类成就
      if (code === 'STUDY_10H' || code === 'STUDY_100H' || code === 'STUDY_500H') {
        const sessions = await prisma.learningSession.aggregate({
          where: { userId },
          _sum: { duration: true },
        });
        return sessions._sum.duration || 0;
      }

      if (code === 'QUICK_LEARNER' || code === 'SUPER_LEARNER') {
        // 检查单日学习时长（从data中获取或查询今日数据）
        if (data.dailyDuration !== undefined) {
          return data.dailyDuration;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todaySessions = await prisma.learningSession.aggregate({
          where: {
            userId,
            startTime: {
              gte: today,
              lt: tomorrow,
            },
          },
          _sum: { duration: true },
        });
        return todaySessions._sum.duration || 0;
      }

      if (code === 'EARLY_BIRD') {
        return await prisma.learningSession.count({
          where: {
            userId,
            startTime: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
              lt: new Date(new Date().setHours(6, 0, 0, 0)),
            },
          },
        });
      }

      if (code === 'NIGHT_OWL') {
        return await prisma.learningSession.count({
          where: {
            userId,
            startTime: {
              gte: new Date(new Date().setHours(22, 0, 0, 0)),
            },
          },
        });
      }

      if (code === 'FOCUS_MASTER') {
        return await prisma.learningSession.count({
          where: {
            userId,
            mode: 'POMODORO',
          },
        });
      }

      if (code === 'BOOK_WORM' || code === 'BOOK_LOVER_50') {
        return await prisma.userBookshelf.count({
          where: {
            userId,
            status: 'COMPLETED',
          },
        });
      }

      if (code === 'READING_LOG_100') {
        return await prisma.readingLog.count({ where: { userId } });
      }

      // 坚持类成就（连续天数）
      if (conditionType === 'STREAK') {
        if (code.startsWith('DIARY_STREAK')) {
          return await this._calculateDiaryStreak(userId);
        }
        if (code.startsWith('STUDY_STREAK')) {
          return await this._calculateStudyStreak(userId);
        }
        if (code.startsWith('LOGIN_STREAK')) {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { loginStreakDays: true },
          });
          return user?.loginStreakDays || 0;
        }
        if (code === 'CHALLENGE_STREAK_7') {
          return await this._calculateChallengeStreak(userId);
        }
        if (code === 'PERFECT') {
          return await this._calculatePerfectChallengeStreak(userId);
        }
      }

      // 社交类成就
      if (code === 'SOCIAL_EXPERT' || code === 'POPULAR' || code === 'INFLUENCER') {
        const [diaryLikes, workLikes, readingLikes, reviewLikes] = await Promise.all([
          prisma.like.count({
            where: {
              dynamic: {
                authorId: userId,
              },
            },
          }),
          prisma.like.count({
            where: {
              work: {
                authorId: userId,
              },
            },
          }),
          prisma.readingLogLike.count({
            where: {
              readingLog: {
                userId,
              },
            },
          }),
          prisma.gameLongReviewLike.count({
            where: {
              review: {
                userId,
              },
            },
          }),
        ]);
        return diaryLikes + workLikes + readingLikes + reviewLikes;
      }

      if (code === 'COMMENTER' || code === 'ACTIVE_COMMENTER') {
        return await prisma.comment.count({ where: { authorId: userId } });
      }

      if (code === 'FIRST_LIKE') {
        return await prisma.like.count({ where: { userId } });
      }

      // 特殊成就
      if (code === 'POINT_TYCOON') {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { totalPoints: true },
        });
        return user?.totalPoints || 0;
      }

      if (code === 'ALL_ROUNDER') {
        const counts = await Promise.all([
          prisma.diary.count({ where: { authorId: userId } }),
          prisma.hTMLWork.count({ where: { authorId: userId } }),
          prisma.homework.count({ where: { authorId: userId } }),
          prisma.readingLog.count({ where: { userId } }),
          prisma.learningSession.count({ where: { userId } }),
        ]);
        return Math.min(...counts);
      }

      if (code === 'LEGEND') {
        const unlockedCount = await prisma.userAchievement.count({
          where: { userId },
        });
        return unlockedCount;
      }

      return 0;
    } catch (error) {
      console.error(`计算成就 ${code} 当前值失败:`, error);
      return 0;
    }
  }

  /**
   * 计算日记连续天数
   * @private
   */
  async _calculateDiaryStreak(userId) {
    try {
      const diaries = await prisma.diary.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      if (diaries.length === 0) return 0;

      let streak = 1;
      let currentDate = new Date(diaries[0].createdAt);
      currentDate.setHours(0, 0, 0, 0);

      for (let i = 1; i < diaries.length; i++) {
        const diaryDate = new Date(diaries[i].createdAt);
        diaryDate.setHours(0, 0, 0, 0);

        const diffDays = Math.floor((currentDate - diaryDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak++;
          currentDate = diaryDate;
        } else if (diffDays === 0) {
          // 同一天，跳过
          continue;
        } else {
          // 中断
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('计算日记连续天数失败:', error);
      return 0;
    }
  }

  /**
   * 计算学习连续天数
   * @private
   */
  async _calculateStudyStreak(userId) {
    try {
      const sessions = await prisma.learningSession.findMany({
        where: { userId },
        orderBy: { startTime: 'desc' },
        select: { startTime: true },
      });

      if (sessions.length === 0) return 0;

      const uniqueDates = [...new Set(sessions.map(s => {
        const date = new Date(s.startTime);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      }))].sort((a, b) => b - a);

      let streak = 1;
      let currentDate = uniqueDates[0];

      for (let i = 1; i < uniqueDates.length; i++) {
        const diffDays = Math.floor((currentDate - uniqueDates[i]) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          streak++;
          currentDate = uniqueDates[i];
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('计算学习连续天数失败:', error);
      return 0;
    }
  }

  /**
   * 计算挑战连续天数（完成任意挑战）
   * @private
   */
  async _calculateChallengeStreak(userId) {
    try {
      const records = await prisma.userChallengeRecord.findMany({
        where: {
          userId,
          status: 'COMPLETED',
        },
        include: {
          dailyChallenge: true,
        },
        orderBy: {
          completedAt: 'desc',
        },
      });

      if (records.length === 0) return 0;

      const uniqueDates = [...new Set(records.map(r => r.dailyChallenge.challengeDate))].sort().reverse();

      let streak = 1;
      let expectedDate = new Date(uniqueDates[0]);

      for (let i = 1; i < uniqueDates.length; i++) {
        expectedDate.setDate(expectedDate.getDate() - 1);
        const expectedDateStr = expectedDate.toISOString().split('T')[0];

        if (uniqueDates[i] === expectedDateStr) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('计算挑战连续天数失败:', error);
      return 0;
    }
  }

  /**
   * 计算完美挑战连续天数（每天完成全部3个挑战）
   * @private
   */
  async _calculatePerfectChallengeStreak(userId) {
    try {
      // 获取所有完成的挑战记录，按日期分组
      const records = await prisma.userChallengeRecord.findMany({
        where: {
          userId,
          status: 'COMPLETED',
        },
        include: {
          dailyChallenge: true,
        },
        orderBy: {
          completedAt: 'desc',
        },
      });

      // 按日期分组
      const dateGroups = {};
      for (const record of records) {
        const date = record.dailyChallenge.challengeDate;
        if (!dateGroups[date]) {
          dateGroups[date] = [];
        }
        dateGroups[date].push(record);
      }

      // 找出完成全部3个挑战的日期
      const perfectDates = Object.keys(dateGroups)
        .filter(date => dateGroups[date].length === 3)
        .sort()
        .reverse();

      if (perfectDates.length === 0) return 0;

      let streak = 1;
      let expectedDate = new Date(perfectDates[0]);

      for (let i = 1; i < perfectDates.length; i++) {
        expectedDate.setDate(expectedDate.getDate() - 1);
        const expectedDateStr = expectedDate.toISOString().split('T')[0];

        if (perfectDates[i] === expectedDateStr) {
          streak++;
        } else {
          break;
        }
      }

      return streak;
    } catch (error) {
      console.error('计算完美挑战连续天数失败:', error);
      return 0;
    }
  }

  /**
   * 检查传奇用户成就
   * @private
   */
  async _checkLegendAchievement(userId) {
    try {
      const totalAchievements = await prisma.achievement.count({
        where: { code: { not: 'LEGEND' } },
      });

      const unlockedCount = await prisma.userAchievement.count({
        where: { userId },
      });

      if (unlockedCount >= totalAchievements) {
        const legendAchievement = await prisma.achievement.findUnique({
          where: { code: 'LEGEND' },
        });

        if (legendAchievement) {
          await this._unlockAchievement(userId, legendAchievement);
        }
      }
    } catch (error) {
      console.error('检查传奇成就失败:', error);
    }
  }

  /**
   * 获取用户已解锁的成就
   */
  async getUserAchievements(userId, options = {}) {
    try {
      const { showcasedOnly = false } = options;

      const where = { userId };
      if (showcasedOnly) {
        where.isShowcased = true;
      }

      const userAchievements = await prisma.userAchievement.findMany({
        where,
        include: {
          achievement: true,
        },
        orderBy: {
          unlockedAt: 'desc',
        },
      });

      return userAchievements;
    } catch (error) {
      console.error('获取用户成就失败:', error);
      return [];
    }
  }

  /**
   * 获取所有成就（包括用户解锁状态）
   */
  async getAllAchievements(userId = null) {
    try {
      const achievements = await prisma.achievement.findMany({
        orderBy: [
          { category: 'asc' },
          { sortOrder: 'asc' },
        ],
      });

      if (!userId) {
        return achievements;
      }

      // 获取用户解锁记录
      const userAchievements = await prisma.userAchievement.findMany({
        where: { userId },
      });

      const unlockedMap = new Map(
        userAchievements.map(ua => [ua.achievementId, ua])
      );

      // 获取用户进度
      const progressRecords = await prisma.achievementProgress.findMany({
        where: { userId },
      });

      const progressMap = new Map(
        progressRecords.map(p => [p.achievementId, p])
      );

      // 合并数据
      return achievements.map(achievement => {
        const unlocked = unlockedMap.get(achievement.id);
        const progress = progressMap.get(achievement.id);

        return {
          ...achievement,
          isUnlocked: !!unlocked,
          unlockedAt: unlocked?.unlockedAt || null,
          isShowcased: unlocked?.isShowcased || false,
          progress: progress ? {
            current: progress.currentValue,
            target: progress.targetValue,
            percentage: Math.min(100, Math.floor((progress.currentValue / progress.targetValue) * 100)),
          } : null,
        };
      });
    } catch (error) {
      console.error('获取所有成就失败:', error);
      return [];
    }
  }

  /**
   * 设置成就展示
   */
  async setShowcase(userId, achievementId, isShowcased) {
    try {
      // 如果要展示，检查当前展示数量
      if (isShowcased) {
        const showcasedCount = await prisma.userAchievement.count({
          where: {
            userId,
            isShowcased: true,
          },
        });

        if (showcasedCount >= 3) {
          return {
            success: false,
            error: '最多只能展示3个成就',
          };
        }
      }

      await prisma.userAchievement.updateMany({
        where: {
          userId,
          achievementId,
        },
        data: {
          isShowcased,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('设置成就展示失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取成就统计
   */
  async getAchievementStats(userId) {
    try {
      const [totalAchievements, unlockedCount, showcasedAchievements, recentUnlocks] = await Promise.all([
        prisma.achievement.count(),
        prisma.userAchievement.count({ where: { userId } }),
        prisma.userAchievement.findMany({
          where: { userId, isShowcased: true },
          include: { achievement: true },
        }),
        prisma.userAchievement.findMany({
          where: { userId },
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
          take: 5,
        }),
      ]);

      // 按稀有度统计
      const rarityStats = await prisma.userAchievement.findMany({
        where: { userId },
        include: { achievement: true },
      });

      const rarityCount = {
        COMMON: 0,
        RARE: 0,
        EPIC: 0,
        LEGENDARY: 0,
      };

      for (const ua of rarityStats) {
        rarityCount[ua.achievement.rarity]++;
      }

      return {
        totalAchievements,
        unlockedCount,
        unlockedPercentage: Math.floor((unlockedCount / totalAchievements) * 100),
        rarityCount,
        showcasedAchievements,
        recentUnlocks,
      };
    } catch (error) {
      console.error('获取成就统计失败:', error);
      return null;
    }
  }
}

// 导出单例
const achievementService = new AchievementService();
module.exports = achievementService;
