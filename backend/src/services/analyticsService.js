/**
 * 用户行为埋点服务
 * 包含自动聚合统计的定时任务
 */

const prisma = require('../lib/prisma');
const cron = require('node-cron');

class AnalyticsService {
  constructor() {
    // 启动时初始化定时任务
    this.initScheduledTasks();
  }

  /**
   * 初始化定时任务
   */
  initScheduledTasks() {
    // 每天凌晨 1:00 执行聚合统计
    cron.schedule('0 1 * * *', async () => {
      console.log('[Analytics] 开始执行每日聚合统计...');
      try {
        await this.aggregateDailyStats();
        console.log('[Analytics] 每日聚合统计完成');
      } catch (error) {
        console.error('[Analytics] 每日聚合统计失败:', error);
      }
    });

    console.log('[Analytics] 定时任务已初始化');
  }

  /**
   * 记录用户事件
   */
  async trackEvent(data) {
    const { userId, sessionId, eventType, eventName, page, metadata } = data;

    try {
      const event = await prisma.userEvent.create({
        data: {
          userId: userId || null,
          sessionId: sessionId || 'anonymous',
          eventType: eventType || 'action',
          eventName,
          page,
          metadata: metadata || null,
        },
      });
      return { success: true, event };
    } catch (error) {
      console.error('[Analytics] 记录事件失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 批量记录事件
   */
  async trackEvents(events) {
    try {
      const result = await prisma.userEvent.createMany({
        data: events.map(e => ({
          userId: e.userId || null,
          sessionId: e.sessionId || 'anonymous',
          eventType: e.eventType || 'action',
          eventName: e.eventName,
          page: e.page,
          metadata: e.metadata || null,
        })),
      });
      return { success: true, count: result.count };
    } catch (error) {
      console.error('[Analytics] 批量记录事件失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 聚合每日统计数据
   * @param {Date} date - 要聚合的日期，默认为昨天
   */
  async aggregateDailyStats(date = null) {
    const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    try {
      // 1. 计算 DAU（日活跃用户数）
      const dauResult = await prisma.userEvent.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          userId: { not: null },
        },
      });
      const dau = dauResult.length;

      // 2. 计算新注册用户数
      const newUsers = await prisma.user.count({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      // 3. 计算总事件数
      const totalEvents = await prisma.userEvent.count({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      // 4. 计算页面浏览数
      const pageViews = await prisma.userEvent.count({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          eventType: 'page_view',
        },
      });

      // 5. 热门页面 Top10
      const topPagesRaw = await prisma.userEvent.groupBy({
        by: ['page'],
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          eventType: 'page_view',
          page: { not: null },
        },
        _count: { page: true },
        orderBy: { _count: { page: 'desc' } },
        take: 10,
      });
      const topPages = topPagesRaw.map(p => ({
        page: p.page,
        count: p._count.page,
      }));

      // 6. 热门操作 Top10
      const topActionsRaw = await prisma.userEvent.groupBy({
        by: ['eventName'],
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          eventType: 'action',
        },
        _count: { eventName: true },
        orderBy: { _count: { eventName: 'desc' } },
        take: 10,
      });
      const topActions = topActionsRaw.map(a => ({
        action: a.eventName,
        count: a._count.eventName,
      }));

      // 7. 保存或更新统计数据
      const stats = await prisma.dailyActiveStats.upsert({
        where: { date: startOfDay },
        create: {
          date: startOfDay,
          dau,
          newUsers,
          totalEvents,
          pageViews,
          topPages,
          topActions,
        },
        update: {
          dau,
          newUsers,
          totalEvents,
          pageViews,
          topPages,
          topActions,
        },
      });

      return { success: true, stats };
    } catch (error) {
      console.error('[Analytics] 聚合统计失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取统计摘要（管理员用）
   */
  async getSummary(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      // 获取历史统计数据
      const dailyStats = await prisma.dailyActiveStats.findMany({
        where: { date: { gte: startDate } },
        orderBy: { date: 'asc' },
      });

      // 获取今日实时数据
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayDauResult = await prisma.userEvent.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: today },
          userId: { not: null },
        },
      });

      const todayEvents = await prisma.userEvent.count({
        where: { createdAt: { gte: today } },
      });

      const todayPageViews = await prisma.userEvent.count({
        where: {
          createdAt: { gte: today },
          eventType: 'page_view',
        },
      });

      // 总用户数
      const totalUsers = await prisma.user.count();

      return {
        success: true,
        data: {
          today: {
            dau: todayDauResult.length,
            events: todayEvents,
            pageViews: todayPageViews,
          },
          history: dailyStats,
          totalUsers,
        },
      };
    } catch (error) {
      console.error('[Analytics] 获取统计摘要失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取功能使用统计
   */
  async getFeatureStats(days = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await prisma.userEvent.groupBy({
        by: ['eventName'],
        where: {
          createdAt: { gte: startDate },
          eventType: 'action',
        },
        _count: { eventName: true },
        orderBy: { _count: { eventName: 'desc' } },
        take: 20,
      });

      return {
        success: true,
        data: stats.map(s => ({
          feature: s.eventName,
          count: s._count.eventName,
        })),
      };
    } catch (error) {
      console.error('[Analytics] 获取功能统计失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 手动触发聚合（管理员用）
   */
  async manualAggregate(dateStr) {
    const date = dateStr ? new Date(dateStr) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    return await this.aggregateDailyStats(date);
  }

  /**
   * 获取今日开始时间
   */
  getStartOfDay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  /**
   * 获取数据看板聚合数据
   */
  async getDashboardData() {
    try {
      const [
        userStats,
        contentStats,
        activityTrend,
        pointsStats,
        realtimeEvents,
        topUsers,
        submissionStats,
        studentGrowthStats,
        ruleTypeStats,
      ] = await Promise.all([
        this.getUserStats(),
        this.getContentStats(),
        this.getActivityTrend(30),
        this.getPointsStats(),
        this.getRealtimeEvents(20),
        this.getTopUsers(10),
        this.getSubmissionStats(),
        this.getStudentGrowthStats(),
        this.getRuleTypeStats(),
      ]);

      return {
        success: true,
        data: {
          userStats,
          contentStats,
          activityTrend,
          pointsStats,
          realtimeEvents,
          topUsers,
          submissionStats,
          studentGrowthStats,
          ruleTypeStats,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('[Analytics] 获取看板数据失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用户统计
   */
  async getUserStats() {
    const today = this.getStartOfDay();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [total, todayNew, weekAgoTotal, roleDistribution, todayActiveResult] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
      prisma.user.count({ where: { createdAt: { lt: weekAgo } } }),
      prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
      prisma.userEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: today }, userId: { not: null } },
      }),
    ]);

    const roleMap = {};
    roleDistribution.forEach((r) => {
      roleMap[r.role] = r._count.role;
    });

    const growthRate = weekAgoTotal > 0 ? (((total - weekAgoTotal) / weekAgoTotal) * 100).toFixed(1) : 0;

    return {
      total,
      todayActive: todayActiveResult.length,
      todayNew,
      growthRate: parseFloat(growthRate),
      roleDistribution: {
        STUDENT: roleMap.STUDENT || 0,
        PARENT: roleMap.PARENT || 0,
        TEACHER: roleMap.TEACHER || 0,
        ADMIN: roleMap.ADMIN || 0,
      },
    };
  }

  /**
   * 获取内容统计
   */
  async getContentStats() {
    const today = this.getStartOfDay();

    // 获取背诵类模板ID
    const recitationTemplates = await prisma.ruleTemplate.findMany({
      where: {
        OR: [
          { name: { contains: '背诗' } },
          { name: { contains: '背课文' } },
          { name: { contains: '朗读' } },
        ],
      },
      select: { id: true },
    });
    const recitationTemplateIds = recitationTemplates.map((t) => t.id);

    const [
      diary,
      homework,
      note,
      htmlWork,
      poetryWork,
      creativeWork,
      calligraphyWork,
      diaryAnalysis,
      recitation,
      todayDiary,
      todayHomework,
    ] = await Promise.all([
      prisma.diary.count(),
      prisma.homework.count(),
      prisma.note.count(),
      prisma.hTMLWork.count(),
      prisma.poetryWork.count(),
      prisma.creativeWork.count(),
      prisma.calligraphyWork.count(),
      prisma.diaryAnalysis.count(),
      recitationTemplateIds.length > 0
        ? prisma.ruleSubmission.count({
            where: { templateId: { in: recitationTemplateIds }, status: 'APPROVED' },
          })
        : 0,
      prisma.diary.count({ where: { createdAt: { gte: today } } }),
      prisma.homework.count({ where: { createdAt: { gte: today } } }),
    ]);

    const total = diary + homework + note + htmlWork + poetryWork + creativeWork + calligraphyWork + diaryAnalysis + recitation;
    const todayCreated = todayDiary + todayHomework;

    return {
      total,
      todayCreated,
      distribution: {
        recitation,
        diaryAnalysis,
        calligraphyWork,
        diary,
        creativeWork,
        homework,
        note,
        htmlWork,
        poetryWork,
      },
    };
  }

  /**
   * 获取活跃趋势
   */
  async getActivityTrend(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const dailyStats = await prisma.dailyActiveStats.findMany({
      where: { date: { gte: startDate } },
      orderBy: { date: 'asc' },
      select: { date: true, dau: true, newUsers: true, totalEvents: true, pageViews: true },
    });

    return dailyStats.map((s) => ({
      date: s.date.toISOString().split('T')[0],
      dau: s.dau,
      newUsers: s.newUsers,
      events: s.totalEvents,
      pageViews: s.pageViews,
    }));
  }

  /**
   * 获取积分统计
   */
  async getPointsStats() {
    const today = this.getStartOfDay();

    const [totalResult, todayResult] = await Promise.all([
      prisma.pointLog.aggregate({ where: { points: { gt: 0 } }, _sum: { points: true } }),
      prisma.pointLog.aggregate({
        where: { points: { gt: 0 }, createdAt: { gte: today } },
        _sum: { points: true },
      }),
    ]);

    return {
      totalIssued: totalResult._sum.points || 0,
      todayIssued: todayResult._sum.points || 0,
    };
  }

  /**
   * 获取实时动态（混合 UserEvent 和 RuleSubmission）
   */
  async getRealtimeEvents(limit = 20) {
    // 获取用户操作事件
    const userEvents = await prisma.userEvent.findMany({
      where: { userId: { not: null }, eventType: 'action' },
      orderBy: { createdAt: 'desc' },
      take: Math.floor(limit / 2),
      select: {
        id: true,
        eventName: true,
        createdAt: true,
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    // 获取奖罚提交动态（最近审核的）
    const submissions = await prisma.ruleSubmission.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] } },
      orderBy: { updatedAt: 'desc' },
      take: Math.floor(limit / 2),
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, username: true, avatar: true } },
        template: { select: { name: true, points: true } },
      },
    });

    const actionNames = {
      diary_create: '创建了日记',
      diary_publish: '发布了日记',
      homework_submit: '提交了作业',
      note_create: '添加了笔记',
      work_create: '创建了作品',
      work_publish: '发布了作品',
      textbook_open: '打开了教材',
      textbook_ai_chat: '使用了AI助手',
      challenge_complete: '完成了挑战',
      login_success: '登录了系统',
    };

    // 转换用户事件
    const eventList = userEvents.map((e) => ({
      id: e.id,
      type: 'event',
      userId: e.user?.id,
      username: e.user?.username || '匿名用户',
      avatar: e.user?.avatar,
      action: actionNames[e.eventName] || e.eventName,
      timestamp: e.createdAt.toISOString(),
    }));

    // 转换提交动态
    const submissionList = submissions.map((s) => {
      const action =
        s.status === 'APPROVED'
          ? `${s.template?.name} 已通过 +${s.template?.points}分`
          : `${s.template?.name} 被退回`;
      return {
        id: `sub_${s.id}`,
        type: 'submission',
        userId: s.user?.id,
        username: s.user?.username || '匿名用户',
        avatar: s.user?.avatar,
        action,
        status: s.status,
        timestamp: s.updatedAt.toISOString(),
      };
    });

    // 合并并按时间排序
    const allEvents = [...eventList, ...submissionList]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    return allEvents;
  }

  /**
   * 获取积分排行榜
   */
  async getTopUsers(limit = 10) {
    const users = await prisma.user.findMany({
      where: { totalPoints: { gt: 0 } },
      orderBy: { totalPoints: 'desc' },
      take: limit,
      select: { id: true, username: true, avatar: true, totalPoints: true },
    });

    return users.map((u, index) => ({
      rank: index + 1,
      userId: u.id,
      username: u.username,
      avatar: u.avatar,
      totalPoints: u.totalPoints,
    }));
  }

  /**
   * 获取提交统计（RuleSubmission）
   */
  async getSubmissionStats() {
    const today = this.getStartOfDay();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      total,
      pending,
      approved,
      rejected,
      todaySubmissions,
      topTemplates,
      submissionTrend,
      topSubmitters,
      dailyChallengeStats,
    ] = await Promise.all([
      // 总提交数
      prisma.ruleSubmission.count(),
      // 待审核
      prisma.ruleSubmission.count({ where: { status: 'PENDING' } }),
      // 已通过
      prisma.ruleSubmission.count({ where: { status: 'APPROVED' } }),
      // 已拒绝
      prisma.ruleSubmission.count({ where: { status: 'REJECTED' } }),
      // 今日提交
      prisma.ruleSubmission.count({ where: { createdAt: { gte: today } } }),
      // 热门模板 Top5
      this.getTopTemplates(5),
      // 30天提交趋势
      this.getSubmissionTrend(30),
      // 活跃提交者 Top10
      this.getTopSubmitters(10),
      // 每日挑战统计
      this.getDailyChallengeStats(),
    ]);

    const approvalRate = total > 0 ? ((approved / total) * 100).toFixed(1) : 0;

    return {
      overview: {
        total,
        pending,
        approved,
        rejected,
        todaySubmissions,
        approvalRate: parseFloat(approvalRate),
      },
      topTemplates,
      submissionTrend,
      topSubmitters,
      dailyChallengeStats,
    };
  }

  /**
   * 获取热门提交模板
   */
  async getTopTemplates(limit = 5) {
    const templates = await prisma.ruleSubmission.groupBy({
      by: ['templateId'],
      _count: { templateId: true },
      orderBy: { _count: { templateId: 'desc' } },
      take: limit,
    });

    const templateIds = templates.map((t) => t.templateId);
    const templateDetails = await prisma.ruleTemplate.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, name: true, points: true, type: { select: { name: true } } },
    });

    const detailMap = {};
    templateDetails.forEach((t) => {
      detailMap[t.id] = t;
    });

    return templates.map((t, index) => ({
      rank: index + 1,
      templateId: t.templateId,
      name: detailMap[t.templateId]?.name || '未知模板',
      typeName: detailMap[t.templateId]?.type?.name || '',
      points: detailMap[t.templateId]?.points || 0,
      count: t._count.templateId,
    }));
  }

  /**
   * 获取提交趋势
   */
  async getSubmissionTrend(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const submissions = await prisma.ruleSubmission.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true, status: true },
    });

    // 按日期分组
    const dateMap = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dateMap[key] = { date: key, total: 0, approved: 0, rejected: 0 };
    }

    submissions.forEach((s) => {
      const key = s.createdAt.toISOString().split('T')[0];
      if (dateMap[key]) {
        dateMap[key].total++;
        if (s.status === 'APPROVED') dateMap[key].approved++;
        if (s.status === 'REJECTED') dateMap[key].rejected++;
      }
    });

    return Object.values(dateMap);
  }

  /**
   * 获取活跃提交者排行
   */
  async getTopSubmitters(limit = 10) {
    const submitters = await prisma.ruleSubmission.groupBy({
      by: ['userId'],
      _count: { userId: true },
      where: { status: 'APPROVED' },
      orderBy: { _count: { userId: 'desc' } },
      take: limit,
    });

    const userIds = submitters.map((s) => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });

    const userMap = {};
    users.forEach((u) => {
      userMap[u.id] = u;
    });

    return submitters.map((s, index) => ({
      rank: index + 1,
      userId: s.userId,
      username: userMap[s.userId]?.username || '未知用户',
      avatar: userMap[s.userId]?.avatar,
      approvedCount: s._count.userId,
    }));
  }

  /**
   * 获取每日挑战统计
   */
  async getDailyChallengeStats() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const [todayCompleted, weekCompleted, totalRewards] = await Promise.all([
      prisma.dailyCompletionReward.count({ where: { date: today } }),
      prisma.dailyCompletionReward.count({ where: { date: { gte: weekAgoStr } } }),
      prisma.dailyCompletionReward.aggregate({ _sum: { totalPoints: true } }),
    ]);

    return {
      todayCompleted,
      weekCompleted,
      totalRewardsIssued: totalRewards._sum.totalPoints || 0,
    };
  }

  /**
   * 获取学生成长数据统计
   */
  async getStudentGrowthStats() {
    const [recitation, diaryAnalysis, calligraphy, gallery, math, poetry, typing, pinyin] = await Promise.all([
      this.getRecitationStats(),
      this.getDiaryAnalysisStats(),
      this.getCalligraphyStats(),
      this.getGalleryStats(),
      this.getMathStats(),
      this.getPoetryStats(),
      this.getTypingStats(),
      this.getPinyinStats(),
    ]);

    return {
      recitation,
      diaryAnalysis,
      calligraphy,
      gallery,
      math,
      poetry,
      typing,
      pinyin,
    };
  }

  /**
   * 获取数学模块统计（可汗学院数学）
   */
  async getMathStats() {
    const mathTemplates = await prisma.ruleTemplate.findMany({
      where: {
        OR: [
          { name: { contains: '可汗学院' } },
          { name: { contains: '数学' } },
          { name: { contains: 'Khan' } },
        ],
      },
      select: { id: true },
    });

    const templateIds = mathTemplates.map((t) => t.id);

    if (templateIds.length === 0) {
      return { total: 0, participants: 0, avgPerUser: 0, maxPerUser: 0 };
    }

    const submissions = await prisma.ruleSubmission.groupBy({
      by: ['userId'],
      where: { templateId: { in: templateIds }, status: 'APPROVED' },
      _count: { userId: true },
    });

    const total = submissions.reduce((sum, s) => sum + s._count.userId, 0);
    const participants = submissions.length;
    const maxPerUser = submissions.length > 0 ? Math.max(...submissions.map((s) => s._count.userId)) : 0;
    const avgPerUser = participants > 0 ? Math.round(total / participants) : 0;

    return { total, participants, avgPerUser, maxPerUser };
  }

  /**
   * 获取诗词作品统计
   */
  async getPoetryStats() {
    const works = await prisma.poetryWork.groupBy({
      by: ['authorId'],
      where: { status: 'APPROVED' },
      _count: { authorId: true },
    });

    const total = works.reduce((sum, w) => sum + w._count.authorId, 0);
    const participants = works.length;
    const maxPerUser = works.length > 0 ? Math.max(...works.map((w) => w._count.authorId)) : 0;
    const avgPerUser = participants > 0 ? Math.round(total / participants) : 0;

    return { total, participants, avgPerUser, maxPerUser };
  }

  /**
   * 获取打字训练统计
   */
  async getTypingStats() {
    const practices = await prisma.typingPractice.groupBy({
      by: ['authorId'],
      where: { isValid: true },
      _count: { authorId: true },
    });

    const total = practices.reduce((sum, p) => sum + p._count.authorId, 0);
    const participants = practices.length;
    const maxPerUser = practices.length > 0 ? Math.max(...practices.map((p) => p._count.authorId)) : 0;
    const avgPerUser = participants > 0 ? Math.round(total / participants) : 0;

    return { total, participants, avgPerUser, maxPerUser };
  }

  /**
   * 获取拼音练习统计
   */
  async getPinyinStats() {
    const practices = await prisma.pinyinPractice.groupBy({
      by: ['authorId'],
      _count: { authorId: true },
    });

    const total = practices.reduce((sum, p) => sum + p._count.authorId, 0);
    const participants = practices.length;
    const maxPerUser = practices.length > 0 ? Math.max(...practices.map((p) => p._count.authorId)) : 0;
    const avgPerUser = participants > 0 ? Math.round(total / participants) : 0;

    return { total, participants, avgPerUser, maxPerUser };
  }

  /**
   * 获取背诵模块统计
   */
  async getRecitationStats() {
    // 获取背诵类模板ID（背诗、背课文等）
    const recitationTemplates = await prisma.ruleTemplate.findMany({
      where: {
        OR: [
          { name: { contains: '背诗' } },
          { name: { contains: '背课文' } },
          { name: { contains: '朗读' } },
        ],
      },
      select: { id: true },
    });

    const templateIds = recitationTemplates.map((t) => t.id);

    if (templateIds.length === 0) {
      return { total: 0, participants: 0, avgPerUser: 0, maxPerUser: 0 };
    }

    // 统计总次数和参与人数
    const submissions = await prisma.ruleSubmission.groupBy({
      by: ['userId'],
      where: { templateId: { in: templateIds }, status: 'APPROVED' },
      _count: { userId: true },
    });

    const total = submissions.reduce((sum, s) => sum + s._count.userId, 0);
    const participants = submissions.length;
    const maxPerUser = submissions.length > 0 ? Math.max(...submissions.map((s) => s._count.userId)) : 0;
    const avgPerUser = participants > 0 ? Math.round(total / participants) : 0;

    return { total, participants, avgPerUser, maxPerUser };
  }

  /**
   * 获取日记AI分析统计
   */
  async getDiaryAnalysisStats() {
    const analyses = await prisma.diaryAnalysis.groupBy({
      by: ['userId'],
      _count: { userId: true },
    });

    const total = analyses.reduce((sum, a) => sum + a._count.userId, 0);
    const participants = analyses.length;
    const maxPerUser = analyses.length > 0 ? Math.max(...analyses.map((a) => a._count.userId)) : 0;
    const avgPerUser = participants > 0 ? Math.round(total / participants) : 0;

    return { total, participants, avgPerUser, maxPerUser };
  }

  /**
   * 获取书法作品统计
   */
  async getCalligraphyStats() {
    const works = await prisma.calligraphyWork.groupBy({
      by: ['authorId'],
      _count: { authorId: true },
    });

    const total = works.reduce((sum, w) => sum + w._count.authorId, 0);
    const participants = works.length;
    const maxPerUser = works.length > 0 ? Math.max(...works.map((w) => w._count.authorId)) : 0;
    const avgPerUser = participants > 0 ? Math.round(total / participants) : 0;

    return { total, participants, avgPerUser, maxPerUser };
  }

  /**
   * 获取少儿画廊统计
   */
  async getGalleryStats() {
    // 获取画廊分类
    const galleryCategory = await prisma.category.findFirst({
      where: { slug: 'gallery' },
      select: { id: true },
    });

    if (!galleryCategory) {
      return { total: 0, participants: 0, avgPerUser: 0, maxPerUser: 0 };
    }

    const works = await prisma.creativeWork.groupBy({
      by: ['authorId'],
      where: { categoryId: galleryCategory.id, status: 'APPROVED' },
      _count: { authorId: true },
    });

    const total = works.reduce((sum, w) => sum + w._count.authorId, 0);
    const participants = works.length;
    const maxPerUser = works.length > 0 ? Math.max(...works.map((w) => w._count.authorId)) : 0;
    const avgPerUser = participants > 0 ? Math.round(total / participants) : 0;

    return { total, participants, avgPerUser, maxPerUser };
  }

  /**
   * 获取所有奖罚类型提交统计
   */
  async getRuleTypeStats() {
    const types = await prisma.ruleType.findMany({
      include: {
        templates: {
          select: {
            id: true,
            name: true,
            points: true,
            _count: {
              select: { submissions: true },
            },
          },
        },
      },
    });

    // 过滤有提交的类型并格式化
    const result = types
      .map((type) => {
        const totalSubmissions = type.templates.reduce((sum, t) => sum + t._count.submissions, 0);
        const templates = type.templates
          .filter((t) => t._count.submissions > 0)
          .map((t) => ({
            name: t.name,
            points: t.points,
            count: t._count.submissions,
          }))
          .sort((a, b) => b.count - a.count);

        return {
          id: type.id,
          name: type.name,
          totalSubmissions,
          templates,
        };
      })
      .filter((t) => t.totalSubmissions > 0)
      .sort((a, b) => b.totalSubmissions - a.totalSubmissions);

    return result;
  }
}

// 导出单例
const analyticsService = new AnalyticsService();
module.exports = analyticsService;
