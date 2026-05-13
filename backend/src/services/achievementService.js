/**
 * 成就徽章服务
 * 管理成就的检查、解锁、进度追踪
 */

const pointService = require('./pointService');
const { sendAchievementNotification } = require('./notificationService');
const achievementEmitter = require('../lib/achievementEmitter');

const prisma = require('../lib/prisma');

// 任务类型 -> 成就触发动作映射
const TASK_ACTIONS = {
  diary: 'task_diary',
  math: 'task_math',
  poetry: 'task_poetry',
  calligraphy: 'task_calligraphy',
  moments: 'task_moments',
  questions: 'task_questions',
  typing: 'task_typing',
  pinyin: 'task_pinyin',
};

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

  // ===== 8 大任务成就 =====
  // 数学
  task_math: ['MATH_FIRST', 'MATH_10', 'MATH_50', 'MATH_100', 'MATH_STREAK_7', 'MATH_STREAK_30'],
  // 背诗
  task_poetry: ['POEM_FIRST', 'POEM_10', 'POEM_50', 'POEM_100', 'POEM_STREAK_7', 'POEM_STREAK_30'],
  // 书写
  task_calligraphy: ['CALLI_FIRST', 'CALLI_10', 'CALLI_50', 'CALLI_100', 'CALLI_STREAK_7', 'CALLI_STREAK_30', 'CALLI_APPROVED_10', 'CALLI_APPROVED_50'],
  // 分享生活
  task_moments: ['MOMENT_FIRST', 'MOMENT_10', 'MOMENT_50', 'MOMENT_100', 'MOMENT_STREAK_7'],
  // 勤学好问
  task_questions: ['ASK_FIRST', 'ASK_10', 'ASK_50', 'ASK_200', 'ASK_STREAK_7', 'ASK_STREAK_30'],
  // 打字训练
  task_typing: ['TYPING_FIRST', 'TYPING_30', 'TYPING_100', 'TYPING_STREAK_7', 'TYPING_STREAK_30',
    'TYPING_SCORE_3000', 'TYPING_SCORE_5000', 'TYPING_WPM_50', 'TYPING_WPM_75',
    'TYPING_ACCURACY_99', 'TYPING_COMBO_50'],
  // 拼音练习
  task_pinyin: ['PINYIN_FIRST', 'PINYIN_20', 'PINYIN_50', 'PINYIN_100', 'PINYIN_STREAK_7', 'PINYIN_STREAK_30'],
  // 全能类
  task_all_8: ['ALL_8_FIRST', 'ALL_8_WEEK', 'ALL_8_STREAK_7', 'ALL_8_STREAK_30'],
};

class AchievementService {
  constructor() {
    this._initEventListeners();
  }

  /**
   * 初始化事件监听
   * @private
   */
  _initEventListeners() {
    achievementEmitter.on('task:completed', async ({ userId, taskType, data }) => {
      try {
        await this.updateTaskProgress(userId, taskType, data);
      } catch (error) {
        console.error(`[Achievement] 更新任务进度失败 userId=${userId} taskType=${taskType}:`, error);
      }
    });
  }

  /**
   * 原子更新任务进度（count + streak）
   */
  async updateTaskProgress(userId, taskType, data = {}) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const prev = await prisma.userTaskProgress.findUnique({
      where: { userId_taskType: { userId, taskType } },
    });

    let newStreak = 1;
    if (prev?.lastDate) {
      const last = new Date(prev.lastDate);
      const lastNorm = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate()));
      if (lastNorm.getTime() === today.getTime()) {
        newStreak = prev.currentStreak; // 同一天，不增加连续
      } else if (lastNorm.getTime() === yesterday.getTime()) {
        newStreak = prev.currentStreak + 1;
      }
    }

    const newBestStreak = Math.max(prev?.bestStreak || 0, newStreak);

    await prisma.userTaskProgress.upsert({
      where: { userId_taskType: { userId, taskType } },
      update: {
        totalCount: { increment: 1 },
        currentStreak: newStreak,
        bestStreak: newBestStreak,
        lastDate: today,
      },
      create: {
        userId,
        taskType,
        totalCount: 1,
        currentStreak: 1,
        bestStreak: 1,
        lastDate: today,
      },
    });

    // 触发对应成就检查
    const action = TASK_ACTIONS[taskType];
    if (action) {
      await this.checkAchievements(userId, action, data);
    }

    // 特殊：检查全能类成就
    await this._checkAll8Achievements(userId);
  }
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

      // ===== 数学成就 =====
      if (['MATH_FIRST', 'MATH_10', 'MATH_50', 'MATH_100'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'math' } },
        });
        return p?.totalCount || 0;
      }
      if (['MATH_STREAK_7', 'MATH_STREAK_30'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'math' } },
        });
        return p?.currentStreak || 0;
      }

      // ===== 背诗成就 =====
      if (['POEM_FIRST', 'POEM_10', 'POEM_50', 'POEM_100'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'poetry' } },
        });
        return p?.totalCount || 0;
      }
      if (['POEM_STREAK_7', 'POEM_STREAK_30'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'poetry' } },
        });
        return p?.currentStreak || 0;
      }

      // ===== 书写成就 =====
      if (['CALLI_FIRST', 'CALLI_10', 'CALLI_50', 'CALLI_100'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'calligraphy' } },
        });
        return p?.totalCount || 0;
      }
      if (['CALLI_STREAK_7', 'CALLI_STREAK_30'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'calligraphy' } },
        });
        return p?.currentStreak || 0;
      }
      if (code === 'CALLI_APPROVED_10' || code === 'CALLI_APPROVED_50') {
        const target = code === 'CALLI_APPROVED_50' ? 50 : 10;
        const count = await prisma.calligraphyWork.count({
          where: { authorId: userId, status: 'APPROVED' },
        });
        if (data.approvedCount !== undefined) return data.approvedCount;
        return count;
      }

      // ===== 分享生活成就 =====
      if (['MOMENT_FIRST', 'MOMENT_10', 'MOMENT_50', 'MOMENT_100'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'moments' } },
        });
        return p?.totalCount || 0;
      }
      if (code === 'MOMENT_STREAK_7') {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'moments' } },
        });
        return p?.currentStreak || 0;
      }

      // ===== 勤学好问成就 =====
      if (['ASK_FIRST', 'ASK_10', 'ASK_50', 'ASK_200'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'questions' } },
        });
        return p?.totalCount || 0;
      }
      if (['ASK_STREAK_7', 'ASK_STREAK_30'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'questions' } },
        });
        return p?.currentStreak || 0;
      }

      // ===== 打字训练成就 =====
      if (['TYPING_FIRST', 'TYPING_30', 'TYPING_100'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'typing' } },
        });
        return p?.totalCount || 0;
      }
      if (['TYPING_STREAK_7', 'TYPING_STREAK_30'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'typing' } },
        });
        return p?.currentStreak || 0;
      }

      // ===== 拼音练习成就 =====
      if (['PINYIN_FIRST', 'PINYIN_20', 'PINYIN_50', 'PINYIN_100'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'pinyin' } },
        });
        return p?.totalCount || 0;
      }
      if (['PINYIN_STREAK_7', 'PINYIN_STREAK_30'].includes(code)) {
        const p = await prisma.userTaskProgress.findUnique({
          where: { userId_taskType: { userId, taskType: 'pinyin' } },
        });
        return p?.currentStreak || 0;
      }

      // ===== 打字质量成就（通过 data 传值） =====
      if (code === 'TYPING_SCORE_3000') return data.score || 0;
      if (code === 'TYPING_SCORE_5000') return data.score || 0;
      if (code === 'TYPING_WPM_50') return data.wpm || 0;
      if (code === 'TYPING_WPM_75') return data.wpm || 0;
      if (code === 'TYPING_ACCURACY_99') return data.accuracy || 0;
      if (code === 'TYPING_COMBO_50') return data.maxCombo || 0;

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
   * 检查全能类成就
   * @private
   */
  async _checkAll8Achievements(userId) {
    try {
      const progress = await prisma.userTaskProgress.findMany({
        where: { userId },
      });

      const allTaskTypes = ['diary', 'math', 'poetry', 'calligraphy', 'moments', 'questions', 'typing', 'pinyin'];

      // ALL_8_FIRST: 全部8个至少完成1次
      const doneTypes = new Set(progress.filter(p => p.totalCount > 0).map(p => p.taskType));
      if (allTaskTypes.every(t => doneTypes.has(t))) {
        await this._unlockByCode(userId, 'ALL_8_FIRST');
      }

      // ALL_8_WEEK: 本周全部完成（连续7天+每天全部）
      // ALL_8_STREAK_7: 连续7天全部完成
      // ALL_8_STREAK_30: 连续30天全部完成
      const minStreak = Math.min(...allTaskTypes.map(t => {
        const p = progress.find(x => x.taskType === t);
        return p?.currentStreak || 0;
      }));

      if (minStreak >= 30) {
        await this._unlockByCode(userId, 'ALL_8_STREAK_30');
      }
      if (minStreak >= 7) {
        await this._unlockByCode(userId, 'ALL_8_STREAK_7');
      }
      if (minStreak >= 1) {
        await this._unlockByCode(userId, 'ALL_8_WEEK');
      }
    } catch (error) {
      console.error('检查全能成就失败:', error);
    }
  }

  /**
   * 按 code 解锁成就（如果尚未解锁）
   * @private
   */
  async _unlockByCode(userId, code) {
    try {
      const achievement = await prisma.achievement.findUnique({ where: { code } });
      if (!achievement) return;
      const existing = await prisma.userAchievement.findFirst({
        where: { userId, achievementId: achievement.id },
      });
      if (existing) return;
      await this._unlockAchievement(userId, achievement);
    } catch (error) {
      console.error(`解锁成就 ${code} 失败:`, error);
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
module.exports.achievementEmitter = achievementEmitter;
