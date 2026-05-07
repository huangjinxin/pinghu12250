/**
 * 好友动态流 API
 * 聚合好友的日记、作品、成就等活动
 */

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

/**
 * GET /api/feed?page=1&limit=20
 * 获取好友动态流
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // 获取好友ID列表
    const friendships = await prisma.friendship.findMany({
      where: { OR: [{ userId1: userId }, { userId2: userId }] },
      select: { userId1: true, userId2: true }
    });
    const friendIds = friendships.map(f => f.userId1 === userId ? f.userId2 : f.userId1);

    if (friendIds.length === 0) {
      return res.json({ success: true, data: { items: [], hasMore: false } });
    }

    // 并行查询多种动态
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 最近30天
    const userSelect = { id: true, username: true, avatar: true, profile: { select: { nickname: true } } };

    const [diaries, creativeWorks, poetryWorks, calligraphyWorks, achievements] = await Promise.all([
      prisma.diary.findMany({
        where: { authorId: { in: friendIds }, createdAt: { gte: since }, deletedAt: null },
        select: { id: true, title: true, content: true, createdAt: true, wordCount: true, author: { select: userSelect } },
        orderBy: { createdAt: 'desc' }, take: 50
      }),
      prisma.creativeWork.findMany({
        where: { authorId: { in: friendIds }, createdAt: { gte: since }, status: 'APPROVED' },
        select: { id: true, title: true, createdAt: true, author: { select: userSelect }, category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }, take: 50
      }),
      prisma.poetryWork.findMany({
        where: { authorId: { in: friendIds }, createdAt: { gte: since }, status: 'APPROVED' },
        select: { id: true, title: true, createdAt: true, author: { select: userSelect } },
        orderBy: { createdAt: 'desc' }, take: 50
      }),
      prisma.calligraphyWork.findMany({
        where: { authorId: { in: friendIds }, createdAt: { gte: since } },
        select: { id: true, title: true, createdAt: true, author: { select: userSelect } },
        orderBy: { createdAt: 'desc' }, take: 50
      }),
      prisma.userAchievement.findMany({
        where: { userId: { in: friendIds }, unlockedAt: { gte: since } },
        select: { id: true, userId: true, unlockedAt: true, achievement: { select: { name: true, icon: true, description: true } } },
        orderBy: { unlockedAt: 'desc' }, take: 50
      }),
    ]);

    // 查询成就用户信息
    const achievementUserIds = [...new Set(achievements.map(a => a.userId))];
    const achievementUsers = achievementUserIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: achievementUserIds } }, select: userSelect })
      : [];
    const userMap = Object.fromEntries(achievementUsers.map(u => [u.id, u]));

    // 统一格式化
    const items = [
      ...diaries.map(d => ({
        type: 'diary', id: d.id, content: d.title || d.content?.slice(0, 80),
        meta: { wordCount: d.wordCount }, user: d.author, createdAt: d.createdAt, link: `/diary/${d.id}`
      })),
      ...creativeWorks.map(g => ({
        type: 'creative', id: g.id, content: g.title,
        meta: { category: g.category?.name }, user: g.author, createdAt: g.createdAt, link: `/works`
      })),
      ...poetryWorks.map(p => ({
        type: 'poetry', id: p.id, content: p.title,
        meta: {}, user: p.author, createdAt: p.createdAt, link: `/poetry/${p.id}`
      })),
      ...calligraphyWorks.map(c => ({
        type: 'calligraphy', id: c.id, content: c.title,
        meta: {}, user: c.author, createdAt: c.createdAt, link: `/works`
      })),
      ...achievements.map(a => ({
        type: 'achievement', id: a.id, content: a.achievement.name,
        meta: { icon: a.achievement.icon, description: a.achievement.description },
        user: userMap[a.userId] || null, createdAt: a.unlockedAt, link: `/achievements`
      })),
    ];

    // 按时间排序并分页
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const paged = items.slice(skip, skip + take);

    res.json({ success: true, data: { items: paged, hasMore: skip + take < items.length } });
  } catch (error) {
    console.error('[Feed] 获取动态流失败:', error);
    res.status(500).json({ success: false, error: '获取动态流失败' });
  }
});

/**
 * GET /api/feed/leaderboard?dimension=points&period=weekly&limit=20
 * 多维度排行榜
 */
router.get('/leaderboard', authenticate, async (req, res) => {
  try {
    const { dimension = 'points', period = 'weekly', limit = 20 } = req.query;
    const take = Math.min(parseInt(limit), 50);

    // 计算时间范围
    const periodMap = { daily: 1, weekly: 7, monthly: 30 };
    const days = periodMap[period] || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const userSelect = { id: true, username: true, avatar: true, profile: { select: { nickname: true } } };
    let leaderboard = [];

    if (dimension === 'points') {
      const users = await prisma.user.findMany({
        where: { status: 'ACTIVE', role: 'STUDENT' },
        select: { ...userSelect, totalPoints: true },
        orderBy: { totalPoints: 'desc' },
        take
      });
      leaderboard = users.map((u, i) => ({ rank: i + 1, user: u, value: u.totalPoints, label: '积分' }));

    } else if (dimension === 'diary') {
      const results = await prisma.diary.groupBy({
        by: ['authorId'],
        where: { createdAt: { gte: since }, deletedAt: null },
        _sum: { wordCount: true },
        _count: true,
        orderBy: { _sum: { wordCount: 'desc' } },
        take
      });
      const userIds = results.map(r => r.authorId);
      const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: userSelect });
      const uMap = Object.fromEntries(users.map(u => [u.id, u]));
      leaderboard = results.map((r, i) => ({
        rank: i + 1, user: uMap[r.authorId], value: r._sum.wordCount || 0,
        label: '字', extra: `${r._count._all}篇`
      }));

    } else if (dimension === 'streak') {
      const stats = await prisma.diaryStats.findMany({
        where: { maxStreak: { gt: 0 } },
        select: { userId: true, currentStreak: true, maxStreak: true, user: { select: userSelect } },
        orderBy: { maxStreak: 'desc' },
        take
      });
      leaderboard = stats.map((s, i) => ({
        rank: i + 1, user: s.user, value: s.maxStreak, label: '天',
        extra: s.currentStreak > 0 ? `当前${s.currentStreak}天` : null
      }));

    } else if (dimension === 'learning') {
      // 背诗(朗读背诵) + 数学(数学竞赛) submissions + 练字(CalligraphyWork)
      const reciteTypeId = (await prisma.ruleType.findUnique({ where: { name: '朗读背诵' } }))?.id;
      const mathTypeId = (await prisma.ruleType.findUnique({ where: { name: '数学竞赛' } }))?.id;

      const [reciteSubs, mathSubs, calligraphy] = await Promise.all([
        reciteTypeId ? prisma.$queryRaw`
          SELECT s."userId", COUNT(*)::int as cnt FROM "RuleSubmission" s
          JOIN "RuleTemplate" t ON s."templateId" = t.id
          WHERE t."typeId" = ${reciteTypeId} AND s."createdAt" >= ${since} AND s.status = 'APPROVED'
          GROUP BY s."userId"` : [],
        mathTypeId ? prisma.$queryRaw`
          SELECT s."userId", COUNT(*)::int as cnt FROM "RuleSubmission" s
          JOIN "RuleTemplate" t ON s."templateId" = t.id
          WHERE t."typeId" = ${mathTypeId} AND s."createdAt" >= ${since} AND s.status = 'APPROVED'
          GROUP BY s."userId"` : [],
        prisma.calligraphyWork.groupBy({
          by: ['authorId'], where: { createdAt: { gte: since } }, _count: true
        }),
      ]);

      // 合并统计
      const userTotals = {};
      for (const r of reciteSubs) { userTotals[r.userId] = { recite: r.cnt, math: 0, calli: 0 }; }
      for (const r of mathSubs) { userTotals[r.userId] = { ...userTotals[r.userId] || { recite: 0, math: 0, calli: 0 }, math: r.cnt }; }
      for (const r of calligraphy) { userTotals[r.authorId] = { ...userTotals[r.authorId] || { recite: 0, math: 0, calli: 0 }, calli: r._count._all }; }

      const sorted = Object.entries(userTotals)
        .map(([uid, v]) => ({ uid, total: v.recite + v.math + v.calli, ...v }))
        .sort((a, b) => b.total - a.total).slice(0, take);

      const uIds = sorted.map(s => s.uid);
      const users = uIds.length ? await prisma.user.findMany({ where: { id: { in: uIds } }, select: userSelect }) : [];
      const uMap = Object.fromEntries(users.map(u => [u.id, u]));

      leaderboard = sorted.map((s, i) => {
        const parts = [s.recite && `背诗${s.recite}`, s.math && `数学${s.math}`, s.calli && `练字${s.calli}`].filter(Boolean);
        return { rank: i + 1, user: uMap[s.uid], value: s.total, label: '次', extra: parts.join(' ') };
      });

    } else if (dimension === 'works') {
      // HTMLWork + PoetryWork + CreativeWork
      const [html, poetry, creative] = await Promise.all([
        prisma.hTMLWork.groupBy({ by: ['authorId'], where: { createdAt: { gte: since } }, _count: true }),
        prisma.poetryWork.groupBy({ by: ['authorId'], where: { createdAt: { gte: since }, status: 'APPROVED' }, _count: true }),
        prisma.creativeWork.groupBy({ by: ['authorId'], where: { createdAt: { gte: since }, status: 'APPROVED' }, _count: true }),
      ]);

      const userTotals = {};
      for (const r of html) { userTotals[r.authorId] = { html: r._count._all, poetry: 0, creative: 0 }; }
      for (const r of poetry) { userTotals[r.authorId] = { ...userTotals[r.authorId] || { html: 0, poetry: 0, creative: 0 }, poetry: r._count._all }; }
      for (const r of creative) { userTotals[r.authorId] = { ...userTotals[r.authorId] || { html: 0, poetry: 0, creative: 0 }, creative: r._count._all }; }

      const sorted = Object.entries(userTotals)
        .map(([uid, v]) => ({ uid, total: v.html + v.poetry + v.creative, ...v }))
        .sort((a, b) => b.total - a.total).slice(0, take);

      const uIds = sorted.map(s => s.uid);
      const users = uIds.length ? await prisma.user.findMany({ where: { id: { in: uIds } }, select: userSelect }) : [];
      const uMap = Object.fromEntries(users.map(u => [u.id, u]));

      leaderboard = sorted.map((s, i) => {
        const parts = [s.html && `网页${s.html}`, s.poetry && `诗词${s.poetry}`, s.creative && `创作${s.creative}`].filter(Boolean);
        return { rank: i + 1, user: uMap[s.uid], value: s.total, label: '件', extra: parts.join(' ') };
      });
    } else if (dimension === 'questions') {
      // 勤学好问：仅关联用户的提问数
      const mappings = await prisma.imessageSenderMapping.findMany({
        include: { user: { select: userSelect } },
      });
      if (!mappings.length) {
        return res.json({ success: true, data: { leaderboard: [] } });
      }
      const senderMap = {};
      mappings.forEach(m => { senderMap[m.sender] = m; });
      const senders = mappings.map(m => m.sender);

      const results = await prisma.$queryRaw`
        SELECT "sender", COUNT(*)::int as count
        FROM "ImessageChatLog"
        WHERE role = 'user' AND "sender" = ANY(${senders}) AND "createdAt" >= ${since}
        GROUP BY "sender" ORDER BY count DESC LIMIT ${take}
      `;

      leaderboard = results.map((r, i) => ({
        rank: i + 1,
        user: senderMap[r.sender]?.user || null,
        value: r.count,
        label: '次提问',
      }));

    } else if (dimension === 'typing') {
      // 打字训练：历史最高单次得分排行
      const results = await prisma.typingPractice.groupBy({
        by: ['authorId'],
        where: { isValid: true },
        _max: { score: true },
        orderBy: { _max: { score: 'desc' } },
        take,
      });
      const userIds = results.map(r => r.authorId);
      const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: userSelect }) : [];
      const uMap = Object.fromEntries(users.map(u => [u.id, u]));
      leaderboard = results.map((r, i) => ({
        rank: i + 1, user: uMap[r.authorId], value: r._max.score || 0, label: '分',
      }));

    } else if (dimension === 'pinyin') {
      // 拼音练习：累计练习字数排行
      const results = await prisma.pinyinPractice.groupBy({
        by: ['authorId'],
        where: { createdAt: { gte: since } },
        _sum: { charCount: true },
        _count: true,
        orderBy: { _sum: { charCount: 'desc' } },
        take,
      });
      const userIds = results.map(r => r.authorId);
      const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: userSelect }) : [];
      const uMap = Object.fromEntries(users.map(u => [u.id, u]));
      leaderboard = results.map((r, i) => ({
        rank: i + 1, user: uMap[r.authorId], value: r._sum.charCount || 0, label: '字',
        extra: `${r._count}次`,
      }));
    }

    res.json({ success: true, data: { leaderboard } });
  } catch (error) {
    console.error('[Feed] 排行榜查询失败:', error);
    res.status(500).json({ success: false, error: '排行榜查询失败' });
  }
});

/**
 * GET /api/feed/my-rankings?period=weekly
 * 当前用户在6个维度的排名概览
 */
router.get('/my-rankings', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'weekly' } = req.query;
    const periodMap = { daily: 1, weekly: 7, monthly: 30 };
    const days = periodMap[period] || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 1. 积分 - 直接取用户总积分和排名
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true } });
    const pointsRank = await prisma.user.count({
      where: { status: 'ACTIVE', role: 'STUDENT', totalPoints: { gt: user?.totalPoints || 0 } }
    }) + 1;

    // 2. 日记字数
    const diaryAgg = await prisma.diary.aggregate({
      where: { authorId: userId, createdAt: { gte: since }, deletedAt: null },
      _sum: { wordCount: true }, _count: true
    });
    const myDiaryWords = diaryAgg._sum.wordCount || 0;
    const diaryRankCount = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM (
        SELECT "authorId" FROM "Diary" WHERE "createdAt" >= ${since} AND "deletedAt" IS NULL
        GROUP BY "authorId" HAVING SUM("wordCount") > ${myDiaryWords}
      ) t`;
    const diaryRank = (diaryRankCount[0]?.cnt || 0) + 1;

    // 3. 连续天数
    const myStats = await prisma.diaryStats.findUnique({ where: { userId }, select: { maxStreak: true, currentStreak: true } });
    const myMaxStreak = myStats?.maxStreak || 0;
    const streakRank = await prisma.diaryStats.count({ where: { maxStreak: { gt: myMaxStreak } } }) + 1;

    // 4. 学习次数 (背诗+数学+练字)
    const reciteTypeId = (await prisma.ruleType.findUnique({ where: { name: '朗读背诵' } }))?.id;
    const mathTypeId = (await prisma.ruleType.findUnique({ where: { name: '数学竞赛' } }))?.id;
    const [reciteCount, mathCount, calliCount] = await Promise.all([
      reciteTypeId ? prisma.ruleSubmission.count({
        where: { userId, status: 'APPROVED', createdAt: { gte: since }, template: { typeId: reciteTypeId } }
      }) : 0,
      mathTypeId ? prisma.ruleSubmission.count({
        where: { userId, status: 'APPROVED', createdAt: { gte: since }, template: { typeId: mathTypeId } }
      }) : 0,
      prisma.calligraphyWork.count({ where: { authorId: userId, createdAt: { gte: since } } }),
    ]);
    const myLearning = reciteCount + mathCount + calliCount;
    // 简化排名：用已有leaderboard逻辑太重，用近似值
    const learningRank = myLearning > 0 ? 1 : 0; // 后续可优化

    // 5. 作品数
    const [htmlCount, poetryCount, creativeCount] = await Promise.all([
      prisma.hTMLWork.count({ where: { authorId: userId, createdAt: { gte: since } } }),
      prisma.poetryWork.count({ where: { authorId: userId, createdAt: { gte: since }, status: 'APPROVED' } }),
      prisma.creativeWork.count({ where: { authorId: userId, createdAt: { gte: since }, status: 'APPROVED' } }),
    ]);
    const myWorks = htmlCount + poetryCount + creativeCount;
    const worksRank = myWorks > 0 ? 1 : 0;

    // 6. 勤学好问
    const mapping = await prisma.imessageSenderMapping.findFirst({ where: { userId } });
    let myQuestions = 0;
    if (mapping) {
      const qResult = await prisma.$queryRaw`
        SELECT COUNT(*)::int as count FROM "ImessageChatLog"
        WHERE role = 'user' AND "sender" = ${mapping.sender} AND "createdAt" >= ${since}`;
      myQuestions = qResult[0]?.count || 0;
    }
    const questionsRank = myQuestions > 0 ? 1 : 0;

    res.json({
      success: true,
      data: {
        period,
        rankings: [
          { dimension: 'points', label: '积分', icon: '🏆', value: user?.totalPoints || 0, unit: '分', rank: pointsRank },
          { dimension: 'diary', label: '日记', icon: '📝', value: myDiaryWords, unit: '字', rank: diaryRank, extra: `${diaryAgg._count}篇` },
          { dimension: 'streak', label: '连续', icon: '🔥', value: myMaxStreak, unit: '天', rank: streakRank, extra: myStats?.currentStreak > 0 ? `当前${myStats.currentStreak}天` : null },
          { dimension: 'learning', label: '学习', icon: '📚', value: myLearning, unit: '次', rank: learningRank, extra: [reciteCount && `背诗${reciteCount}`, mathCount && `数学${mathCount}`, calliCount && `练字${calliCount}`].filter(Boolean).join(' ') },
          { dimension: 'works', label: '作品', icon: '🎨', value: myWorks, unit: '件', rank: worksRank, extra: [htmlCount && `网页${htmlCount}`, poetryCount && `诗词${poetryCount}`, creativeCount && `创作${creativeCount}`].filter(Boolean).join(' ') },
          { dimension: 'questions', label: '好问', icon: '❓', value: myQuestions, unit: '次', rank: questionsRank },
        ]
      }
    });
  } catch (error) {
    console.error('[Feed] 我的排行概览失败:', error);
    res.status(500).json({ success: false, error: '获取排行概览失败' });
  }
});

/**
 * GET /api/feed/today-social?timezoneOffset=480
 * 今日社交任务状态（发朋友圈、勤学好问）
 */
router.get('/today-social', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const timezoneOffset = parseInt(req.query.timezoneOffset) || 480;

    // 计算用户本地今天的起止时间
    const now = new Date();
    const localNow = new Date(now.getTime() + timezoneOffset * 60 * 1000);
    const todayStart = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate()));
    const todaySince = new Date(todayStart.getTime() - timezoneOffset * 60 * 1000);

    // 1. 今日是否发过朋友圈（Dynamic）
    const dynamicCount = await prisma.dynamic.count({
      where: { authorId: userId, createdAt: { gte: todaySince } }
    });
    const hasMoment = dynamicCount > 0;

    // 2. 今日是否提过问（勤学好问echo-bot聊天 或 iMessage外部接入）
    // 检查 Message 表中与 echo-bot 的聊天记录
    const echoBot = await prisma.user.findUnique({
      where: { username: 'echo-bot' },
      select: { id: true }
    });

    let hasQuestion = false;
    if (echoBot) {
      // 2a. 用户发给 echo-bot 的消息（Web端勤学好问）
      const botMessageCount = await prisma.message.count({
        where: {
          fromUserId: userId,
          toUserId: echoBot.id,
          createdAt: { gte: todaySince }
        }
      });
      hasQuestion = botMessageCount > 0;

      // 2b. 如果没有通过 echo-bot，则检查 iMessage（外部接入）
      if (!hasQuestion) {
        const mapping = await prisma.imessageSenderMapping.findFirst({ where: { userId } });
        if (mapping) {
          const qCount = await prisma.$queryRaw`
            SELECT COUNT(*)::int as count FROM "ImessageChatLog"
            WHERE role = 'user' AND "sender" = ${mapping.sender} AND "createdAt" >= ${todaySince}`;
          hasQuestion = (qCount[0]?.count || 0) > 0;
        }
      }
    }

    res.json({
      success: true,
      data: { moments: hasMoment, questions: hasQuestion }
    });
  } catch (error) {
    console.error('[Feed] 今日社交状态失败:', error);
    res.status(500).json({ success: false, error: '获取社交状态失败' });
  }
});

module.exports = router;
