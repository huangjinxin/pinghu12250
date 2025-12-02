/**
 * 学习时间追踪系统路由
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const pointService = require('../services/pointService');
const challengeService = require('../services/challengeService');
const achievementService = require('../services/achievementService');

const prisma = new PrismaClient();

// ========== 学习项目管理 ==========

// GET /api/learning/projects - 获取我的学习项目列表
router.get('/projects', authenticate, async (req, res, next) => {
  try {
    const projects = await prisma.learningProject.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ projects });
  } catch (error) {
    next(error);
  }
});

// POST /api/learning/projects - 创建学习项目
router.post('/projects', authenticate, async (req, res, next) => {
  try {
    const { name, category, color } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: '请填写项目名称和分类' });
    }

    const project = await prisma.learningProject.create({
      data: {
        userId: req.user.id,
        name,
        category,
        color: color || '#3B82F6',
      },
    });

    res.status(201).json({ project, message: '项目创建成功' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/learning/projects/:id - 更新学习项目
router.put('/projects/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, category, color } = req.body;

    const project = await prisma.learningProject.findUnique({
      where: { id },
    });

    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: '项目不存在' });
    }

    const updated = await prisma.learningProject.update({
      where: { id },
      data: { name, category, color },
    });

    res.json({ project: updated, message: '项目更新成功' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/learning/projects/:id - 删除学习项目
router.delete('/projects/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await prisma.learningProject.findUnique({
      where: { id },
    });

    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ error: '项目不存在' });
    }

    await prisma.learningProject.delete({ where: { id } });

    res.json({ message: '项目删除成功' });
  } catch (error) {
    next(error);
  }
});

// ========== 计时器管理 ==========

// POST /api/learning/start - 开始学习
router.post('/start', authenticate, async (req, res, next) => {
  try {
    const { projectId, mode } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: '请选择学习项目' });
    }

    // 检查是否已有进行中的计时器
    const existing = await prisma.activeTimer.findFirst({
      where: { userId: req.user.id },
    });

    if (existing) {
      return res.status(400).json({ error: '您已有进行中的学习计时' });
    }

    // 创建计时器
    const timer = await prisma.activeTimer.create({
      data: {
        userId: req.user.id,
        projectId,
        mode: mode || 'FREE',
      },
      include: {
        project: true,
      },
    });

    res.status(201).json({ timer, message: '开始学习计时' });
  } catch (error) {
    next(error);
  }
});

// GET /api/learning/active-timer - 获取当前活动的计时器
router.get('/active-timer', authenticate, async (req, res, next) => {
  try {
    const timer = await prisma.activeTimer.findFirst({
      where: { userId: req.user.id },
      include: {
        project: true,
      },
    });

    res.json({ timer });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/learning/active-timer - 删除当前活动的计时器（放弃学习）
router.delete('/active-timer', authenticate, async (req, res, next) => {
  try {
    const timer = await prisma.activeTimer.findFirst({
      where: { userId: req.user.id },
    });

    if (!timer) {
      return res.status(404).json({ error: '没有进行中的计时器' });
    }

    await prisma.activeTimer.delete({
      where: { id: timer.id },
    });

    res.json({ message: '已放弃本次学习' });
  } catch (error) {
    next(error);
  }
});

// POST /api/learning/stop - 停止学习
router.post('/stop', authenticate, async (req, res, next) => {
  try {
    const { timerId, content, progress, tags } = req.body;

    if (!timerId) {
      return res.status(400).json({ error: '缺少计时器ID' });
    }

    if (!content || content.length < 20) {
      return res.status(400).json({ error: '学习感受至少需要20字' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: '学习感受不能超过500字' });
    }

    // 获取计时器
    const timer = await prisma.activeTimer.findUnique({
      where: { id: timerId },
      include: { project: true },
    });

    if (!timer || timer.userId !== req.user.id) {
      return res.status(404).json({ error: '计时器不存在' });
    }

    // 计算时长（分钟）
    const endTime = new Date();
    const duration = Math.floor((endTime - timer.startTime) / 60000);

    // 防作弊：单次学习超过180分钟
    if (duration > 180) {
      return res.status(400).json({ error: '单次学习时长不能超过3小时' });
    }

    if (duration < 1) {
      return res.status(400).json({ error: '学习时长至少需要1分钟' });
    }

    // 创建学习记录
    const session = await prisma.learningSession.create({
      data: {
        userId: req.user.id,
        projectId: timer.projectId,
        startTime: timer.startTime,
        endTime,
        duration,
        mode: timer.mode,
        content,
        progress: progress || null,
        tags: tags || [],
        isPublic: true,
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        project: true,
      },
    });

    // 更新项目统计
    await prisma.learningProject.update({
      where: { id: timer.projectId },
      data: {
        totalDuration: { increment: duration },
        sessionCount: { increment: 1 },
      },
    });

    // 删除计时器
    await prisma.activeTimer.delete({ where: { id: timerId } });

    // 计算并奖励积分
    try {
      const pointResult = await calculateLearningPoints(duration, req.user.id, session.id);
      if (pointResult.success) {
        session.earnedPoints = pointResult.points;
        session.newTotalPoints = pointResult.totalPoints;
      }

      // 更新每日挑战进度
      challengeService.checkAndUpdateProgress(req.user.id, 'learning_stop', {
        duration,
        count: 1,
      });

      // 检查成就
      // 1. 学习时长成就
      achievementService.checkAchievements(req.user.id, 'learning_duration', { duration });

      // 2. 检查早起/晚睡成就
      const startHour = timer.startTime.getHours();
      if (startHour < 6) {
        achievementService.checkAchievements(req.user.id, 'learning_early', {});
      }
      if (startHour >= 22) {
        achievementService.checkAchievements(req.user.id, 'learning_late', {});
      }

      // 3. 检查番茄钟成就
      if (timer.mode === 'POMODORO') {
        achievementService.checkAchievements(req.user.id, 'pomodoro_complete', {});
      }

      // 4. 检查学习连续天数成就
      achievementService.checkAchievements(req.user.id, 'study_streak', {});
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.status(201).json({ session, message: '学习记录保存成功' });
  } catch (error) {
    next(error);
  }
});

// ========== 学习记录 ==========

// GET /api/learning/sessions - 获取学习记录（支持筛选）
router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const { projectId, page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = { userId: req.user.id };
    if (projectId) {
      where.projectId = projectId;
    }

    const sessions = await prisma.learningSession.findMany({
      where,
      include: {
        project: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(pageSize),
    });

    const total = await prisma.learningSession.count({ where });

    res.json({ sessions, total });
  } catch (error) {
    next(error);
  }
});

// GET /api/learning/feed - 获取学习动态时间轴（所有人）
router.get('/feed', authenticate, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const sessions = await prisma.learningSession.findMany({
      where: { isPublic: true },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        project: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(pageSize),
    });

    const total = await prisma.learningSession.count({
      where: { isPublic: true },
    });

    res.json({ sessions, total });
  } catch (error) {
    next(error);
  }
});

// GET /api/learning/sessions/:id - 获取学习记录详情
router.get('/sessions/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.learningSession.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        project: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: '学习记录不存在' });
    }

    // 检查当前用户是否已点赞
    const liked = await prisma.learningSessionLike.findUnique({
      where: {
        sessionId_userId: {
          sessionId: id,
          userId: req.user.id,
        },
      },
    });

    res.json({ ...session, isLiked: !!liked });
  } catch (error) {
    next(error);
  }
});

// POST /api/learning/sessions/:id/like - 点赞学习记录
router.post('/sessions/:id/like', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.learningSession.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!session) {
      return res.status(404).json({ error: '学习记录不存在' });
    }

    const existing = await prisma.learningSessionLike.findUnique({
      where: {
        sessionId_userId: {
          sessionId: id,
          userId: req.user.id,
        },
      },
    });

    if (existing) {
      // 取消点赞
      await prisma.learningSessionLike.delete({ where: { id: existing.id } });
      await prisma.learningSession.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      });

      // 扣除作者积分
      if (session.userId !== req.user.id) {
        try {
          await pointService.deductPoints(
            session.userId,
            1,
            'learningSession',
            id,
            '学习记录被取消点赞'
          );
        } catch (error) {
          console.error('积分扣除失败:', error);
        }
      }

      return res.json({ isLiked: false, message: '已取消点赞' });
    }

    // 点赞
    await prisma.learningSessionLike.create({
      data: {
        sessionId: id,
        userId: req.user.id,
      },
    });
    await prisma.learningSession.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
    });

    // 奖励作者积分 (L106: 学习记录被点赞 +1)
    if (session.userId !== req.user.id) {
      try {
        await pointService.addPoints('L106', session.userId, {
          targetType: 'learningSession',
          targetId: id,
        });
      } catch (error) {
        console.error('积分奖励失败:', error);
      }
    }

    res.json({ isLiked: true, message: '点赞成功' });
  } catch (error) {
    next(error);
  }
});

// ========== 学习统计 ==========

// GET /api/learning/stats - 获取学习统计数据
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 今日学习时长
    const todaySessions = await prisma.learningSession.findMany({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
      select: { duration: true },
    });
    const todayDuration = todaySessions.reduce((sum, s) => sum + s.duration, 0);

    // 本周学习时长
    const weekSessions = await prisma.learningSession.findMany({
      where: {
        userId,
        createdAt: { gte: weekStart },
      },
      select: { duration: true },
    });
    const weekDuration = weekSessions.reduce((sum, s) => sum + s.duration, 0);

    // 总学习时长
    const totalSessions = await prisma.learningSession.findMany({
      where: { userId },
      select: { duration: true },
    });
    const totalDuration = totalSessions.reduce((sum, s) => sum + s.duration, 0);

    // 各项目时长占比
    const projectStats = await prisma.learningProject.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        category: true,
        color: true,
        totalDuration: true,
      },
      orderBy: { totalDuration: 'desc' },
    });

    res.json({
      todayDuration,
      weekDuration,
      totalDuration,
      sessionCount: totalSessions.length,
      projectStats,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/learning/heatmap - 获取学习热力图数据
router.get('/heatmap', authenticate, async (req, res, next) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

    const sessions = await prisma.learningSession.findMany({
      where: {
        userId: req.user.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        duration: true,
      },
    });

    // 按日期聚合
    const heatmapData = {};
    sessions.forEach((session) => {
      const date = session.createdAt.toISOString().split('T')[0];
      if (!heatmapData[date]) {
        heatmapData[date] = 0;
      }
      heatmapData[date] += session.duration;
    });

    res.json({ heatmapData });
  } catch (error) {
    next(error);
  }
});

// GET /api/learning/leaderboard - 获取学习时长排行榜
router.get('/leaderboard', authenticate, async (req, res, next) => {
  try {
    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 获取所有用户本周的学习时长
    const sessions = await prisma.learningSession.findMany({
      where: {
        createdAt: { gte: weekStart },
      },
      select: {
        userId: true,
        duration: true,
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // 按用户聚合
    const userDurations = {};
    sessions.forEach((session) => {
      if (!userDurations[session.userId]) {
        userDurations[session.userId] = {
          user: session.user,
          totalDuration: 0,
        };
      }
      userDurations[session.userId].totalDuration += session.duration;
    });

    // 转换为数组并排序
    const leaderboard = Object.values(userDurations)
      .sort((a, b) => b.totalDuration - a.totalDuration)
      .slice(0, 10);

    res.json({ leaderboard });
  } catch (error) {
    next(error);
  }
});

// ========== 辅助函数 ==========

/**
 * 计算学习积分并奖励
 * @param {number} duration - 学习时长（分钟）
 * @param {string} userId - 用户ID
 * @param {string} sessionId - 学习记录ID
 */
async function calculateLearningPoints(duration, userId, sessionId) {
  // 根据时长匹配最高积分规则（不累加）
  let ruleId = null;

  if (duration >= 120) {
    ruleId = 'L104'; // +20分
  } else if (duration >= 60) {
    ruleId = 'L103'; // +10分
  } else if (duration >= 30) {
    ruleId = 'L102'; // +5分
  } else if (duration >= 10) {
    ruleId = 'L101'; // +2分
  }

  if (ruleId) {
    const result = await pointService.addPoints(ruleId, userId, {
      targetType: 'learningSession',
      targetId: sessionId,
    });
    return {
      success: result.success,
      points: result.log?.points || 0,
      totalPoints: result.totalPoints || 0,
    };
  }

  return { success: false, points: 0, totalPoints: 0 };
}

module.exports = router;
