/**
 * 游戏系统路由 - 全新设计
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const pointService = require('../services/pointService');

const prisma = new PrismaClient();

// ========== 游戏大厅 - 最新记录 ==========

// GET /api/games/feed - 获取最新的短评和长评混合列表
router.get('/feed', authenticate, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    // 获取短评
    const shortReviews = await prisma.gameShortReview.findMany({
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        game: {
          select: { id: true, name: true, coverUrl: true, gameType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(pageSize),
      skip,
    });

    // 获取长评
    const longReviews = await prisma.gameLongReview.findMany({
      where: { isPublic: true },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        game: {
          select: { id: true, name: true, coverUrl: true, gameType: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(pageSize),
      skip,
    });

    // 合并并按时间排序
    const allReviews = [
      ...shortReviews.map(r => ({ ...r, type: 'short' })),
      ...longReviews.map(r => ({ ...r, type: 'long' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(pageSize));

    res.json({ reviews: allReviews });
  } catch (error) {
    next(error);
  }
});

// ========== 游戏大厅 - 热门游戏 ==========

// GET /api/games/hot - 获取热门游戏（按记录人数排序）
router.get('/hot', authenticate, async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const games = await prisma.game.findMany({
      where: { isBlocked: false },
      orderBy: [
        { recordCount: 'desc' },
        { avgScore: 'desc' },
      ],
      skip,
      take: parseInt(pageSize),
    });

    const total = await prisma.game.count({
      where: { isBlocked: false },
    });

    res.json({ games, total });
  } catch (error) {
    next(error);
  }
});

// ========== 游戏搜索 ==========

// GET /api/games/search - 搜索游戏
router.get('/search', authenticate, async (req, res, next) => {
  try {
    const { q, gameType, page = 1, pageSize = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const where = { isBlocked: false };

    if (q) {
      where.OR = [
        { name: { contains: q } },
        { description: { contains: q } },
      ];
    }

    if (gameType) {
      where.gameType = gameType;
    }

    const games = await prisma.game.findMany({
      where,
      orderBy: { recordCount: 'desc' },
      skip,
      take: parseInt(pageSize),
    });

    const total = await prisma.game.count({ where });

    res.json({ games, total });
  } catch (error) {
    next(error);
  }
});

// GET /api/games/types - 获取所有游戏类型（用于筛选）
router.get('/types', authenticate, async (req, res, next) => {
  try {
    const games = await prisma.game.findMany({
      where: { isBlocked: false },
      select: { gameType: true },
      distinct: ['gameType'],
    });

    const types = games.map(g => g.gameType).filter(Boolean);
    res.json({ types });
  } catch (error) {
    next(error);
  }
});

// ========== 游戏详情 ==========

// GET /api/games/:id - 获取游戏详情
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const game = await prisma.game.findUnique({
      where: { id },
    });

    if (!game || game.isBlocked) {
      return res.status(404).json({ error: '游戏不存在' });
    }

    // 检查当前用户的游戏记录
    const userRecord = await prisma.userGameRecord.findUnique({
      where: {
        userId_gameId: {
          userId: req.user.id,
          gameId: id,
        },
      },
    });

    // 统计评测数
    const shortReviewCount = await prisma.gameShortReview.count({
      where: { gameId: id },
    });
    const longReviewCount = await prisma.gameLongReview.count({
      where: { gameId: id, isPublic: true },
    });

    res.json({
      ...game,
      userRecord,
      reviewCount: shortReviewCount + longReviewCount,
      shortReviewCount,
      longReviewCount,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/games/:id/short-reviews - 获取游戏的短评列表
router.get('/:id/short-reviews', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const reviews = await prisma.gameShortReview.findMany({
      where: { gameId: id },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(pageSize),
    });

    const total = await prisma.gameShortReview.count({
      where: { gameId: id },
    });

    res.json({ reviews, total });
  } catch (error) {
    next(error);
  }
});

// GET /api/games/:id/long-reviews - 获取游戏的长评列表
router.get('/:id/long-reviews', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const reviews = await prisma.gameLongReview.findMany({
      where: { gameId: id, isPublic: true },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
      orderBy: [
        { likesCount: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: parseInt(pageSize),
    });

    const total = await prisma.gameLongReview.count({
      where: { gameId: id, isPublic: true },
    });

    res.json({ reviews, total });
  } catch (error) {
    next(error);
  }
});

// ========== 我的游戏库 ==========

// GET /api/games/my/library - 获取我的游戏库
router.get('/my/library', authenticate, async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = { userId: req.user.id };
    if (status) {
      where.status = status;
    }

    const records = await prisma.userGameRecord.findMany({
      where,
      include: {
        game: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: parseInt(pageSize),
    });

    // 为每个记录添加评测数统计
    const recordsWithStats = await Promise.all(
      records.map(async (record) => {
        const shortReviewCount = await prisma.gameShortReview.count({
          where: {
            userId: req.user.id,
            gameId: record.gameId,
          },
        });
        const longReviewCount = await prisma.gameLongReview.count({
          where: {
            userId: req.user.id,
            gameId: record.gameId,
          },
        });

        return {
          ...record,
          myReviewCount: shortReviewCount + longReviewCount,
        };
      })
    );

    const total = await prisma.userGameRecord.count({ where });

    res.json({ records: recordsWithStats, total });
  } catch (error) {
    next(error);
  }
});

// POST /api/games/:id/add-to-library - 添加游戏到库
router.post('/:id/add-to-library', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status = 'WANT_TO_PLAY' } = req.body;

    // 检查游戏是否存在
    const game = await prisma.game.findUnique({ where: { id } });
    if (!game || game.isBlocked) {
      return res.status(404).json({ error: '游戏不存在' });
    }

    // 检查是否已存在
    const existing = await prisma.userGameRecord.findUnique({
      where: {
        userId_gameId: {
          userId: req.user.id,
          gameId: id,
        },
      },
    });

    if (existing) {
      // 更新状态
      const updated = await prisma.userGameRecord.update({
        where: { id: existing.id },
        data: { status },
      });
      return res.json({ record: updated, message: '状态已更新' });
    }

    // 创建新记录
    const record = await prisma.userGameRecord.create({
      data: {
        userId: req.user.id,
        gameId: id,
        status,
      },
    });

    // 更新游戏的recordCount
    await prisma.game.update({
      where: { id },
      data: { recordCount: { increment: 1 } },
    });

    res.status(201).json({ record, message: '已添加到游戏库' });
  } catch (error) {
    next(error);
  }
});

// ========== 短评 ==========

// POST /api/games/:id/short-review - 写短评
router.post('/:id/short-review', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, score, playTime } = req.body;

    // 验证
    if (!content || !score || playTime === undefined) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    if (content.length > 100) {
      return res.status(400).json({ error: '短评内容不能超过100字' });
    }

    if (score < 1 || score > 10) {
      return res.status(400).json({ error: '评分必须在1-10之间' });
    }

    // 创建短评
    const review = await prisma.gameShortReview.create({
      data: {
        userId: req.user.id,
        gameId: id,
        content,
        score,
        playTime: parseInt(playTime),
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        game: true,
      },
    });

    // 更新或创建用户游戏记录
    await updateUserGameRecord(req.user.id, id, parseInt(playTime));

    // 更新游戏平均分
    await updateGameAvgScore(id);

    // 奖励积分 (G001: 发布游戏短评 +3分)
    try {
      const pointResult = await pointService.addPoints('G001', req.user.id, {
        targetType: 'gameShortReview',
        targetId: review.id,
      });
      if (pointResult.success) {
        review.earnedPoints = pointResult.log.points;
        review.newTotalPoints = pointResult.totalPoints;
      }
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.status(201).json({ review, message: '短评发布成功' });
  } catch (error) {
    next(error);
  }
});

// ========== 长评 ==========

// POST /api/games/:id/long-review - 写长评
router.post('/:id/long-review', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, score, playTime, isPublic = true } = req.body;

    // 验证
    if (!title || !content || !score || playTime === undefined) {
      return res.status(400).json({ error: '请填写完整信息' });
    }

    if (score < 1 || score > 10) {
      return res.status(400).json({ error: '评分必须在1-10之间' });
    }

    // 创建长评
    const review = await prisma.gameLongReview.create({
      data: {
        userId: req.user.id,
        gameId: id,
        title,
        content,
        score,
        playTime: parseInt(playTime),
        isPublic,
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        game: true,
      },
    });

    // 更新或创建用户游戏记录
    await updateUserGameRecord(req.user.id, id, parseInt(playTime));

    // 更新游戏平均分
    await updateGameAvgScore(id);

    // 奖励积分 (G002: 发布游戏长评 +10分)
    try {
      const pointResult = await pointService.addPoints('G002', req.user.id, {
        targetType: 'gameLongReview',
        targetId: review.id,
      });
      if (pointResult.success) {
        review.earnedPoints = pointResult.log.points;
        review.newTotalPoints = pointResult.totalPoints;
      }
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.status(201).json({ review, message: '长评发布成功' });
  } catch (error) {
    next(error);
  }
});

// GET /api/games/long-review/:id - 获取长评详情
router.get('/long-review/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await prisma.gameLongReview.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
        game: true,
        comments: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!review) {
      return res.status(404).json({ error: '长评不存在' });
    }

    if (!review.isPublic && review.userId !== req.user.id) {
      return res.status(403).json({ error: '无权查看此长评' });
    }

    // 检查当前用户是否已点赞
    const liked = await prisma.gameLongReviewLike.findUnique({
      where: {
        reviewId_userId: {
          reviewId: id,
          userId: req.user.id,
        },
      },
    });

    res.json({ ...review, isLiked: !!liked });
  } catch (error) {
    next(error);
  }
});

// POST /api/games/long-review/:id/like - 点赞长评
router.post('/long-review/:id/like', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 获取长评信息（需要知道作者是谁）
    const review = await prisma.gameLongReview.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!review) {
      return res.status(404).json({ error: '长评不存在' });
    }

    const existing = await prisma.gameLongReviewLike.findUnique({
      where: {
        reviewId_userId: {
          reviewId: id,
          userId: req.user.id,
        },
      },
    });

    if (existing) {
      // 取消点赞
      await prisma.gameLongReviewLike.delete({ where: { id: existing.id } });
      await prisma.gameLongReview.update({
        where: { id },
        data: { likesCount: { decrement: 1 } },
      });

      // 扣除作者积分 (G003: 长评被点赞 -1分)
      if (review.userId !== req.user.id) {
        try {
          await pointService.deductPoints(
            review.userId,
            1,
            'gameLongReview',
            id,
            '长评被取消点赞'
          );
        } catch (error) {
          console.error('积分扣除失败:', error);
        }
      }

      return res.json({ isLiked: false, message: '已取消点赞' });
    }

    // 点赞
    await prisma.gameLongReviewLike.create({
      data: {
        reviewId: id,
        userId: req.user.id,
      },
    });
    await prisma.gameLongReview.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
    });

    // 奖励作者积分 (G003: 长评被点赞 +1分)
    if (review.userId !== req.user.id) {
      try {
        await pointService.addPoints('G003', review.userId, {
          targetType: 'gameLongReview',
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

// POST /api/games/long-review/:id/comment - 评论长评
router.post('/long-review/:id/comment', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    const comment = await prisma.gameReviewComment.create({
      data: {
        reviewId: id,
        userId: req.user.id,
        content,
      },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    // 更新评论数
    await prisma.gameLongReview.update({
      where: { id },
      data: { commentsCount: { increment: 1 } },
    });

    res.status(201).json({ comment, message: '评论成功' });
  } catch (error) {
    next(error);
  }
});

// ========== 添加游戏到游戏库 ==========

// POST /api/games - 添加游戏到游戏库（任何用户都可以添加）
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, coverUrl, gameType, platform, description } = req.body;

    if (!name || !gameType || !platform) {
      return res.status(400).json({ error: '请填写必要信息' });
    }

    // 检查是否已存在
    const existing = await prisma.game.findFirst({
      where: { name },
    });

    if (existing) {
      return res.status(400).json({ error: '游戏已存在' });
    }

    const game = await prisma.game.create({
      data: {
        name,
        coverUrl,
        gameType,
        platform,
        description,
        createdBy: req.user.id,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // 奖励积分 (G004: 添加游戏到游戏库 +2分)
    try {
      const pointResult = await pointService.addPoints('G004', req.user.id, {
        targetType: 'game',
        targetId: game.id,
      });
      if (pointResult.success) {
        game.earnedPoints = pointResult.log.points;
        game.newTotalPoints = pointResult.totalPoints;
      }
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.status(201).json({ game, message: '游戏添加成功' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/games/:id - 更新游戏（创建者或管理员可编辑）
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, coverUrl, gameType, platform, description } = req.body;

    // 查找游戏
    const existingGame = await prisma.game.findUnique({
      where: { id },
    });

    if (!existingGame) {
      return res.status(404).json({ error: '游戏不存在' });
    }

    // 检查权限：管理员或创建者可以编辑
    if (req.user.role !== 'ADMIN' && existingGame.createdBy !== req.user.id) {
      return res.status(403).json({ error: '无权限编辑此游戏' });
    }

    const game = await prisma.game.update({
      where: { id },
      data: {
        name,
        coverUrl,
        gameType,
        platform,
        description,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    res.json({ game, message: '更新成功' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/games/:id - 删除游戏（创建者或管理员可删除）
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    // 查找游戏
    const existingGame = await prisma.game.findUnique({
      where: { id },
    });

    if (!existingGame) {
      return res.status(404).json({ error: '游戏不存在' });
    }

    // 检查权限：管理员或创建者可以删除
    if (req.user.role !== 'ADMIN' && existingGame.createdBy !== req.user.id) {
      return res.status(403).json({ error: '无权限删除此游戏' });
    }

    // 软删除
    await prisma.game.update({
      where: { id },
      data: { isBlocked: true },
    });

    res.json({ message: '游戏已删除' });
  } catch (error) {
    next(error);
  }
});

// ========== 辅助函数 ==========

// 更新或创建用户游戏记录（累加游戏时长）
async function updateUserGameRecord(userId, gameId, playTime) {
  const existing = await prisma.userGameRecord.findUnique({
    where: {
      userId_gameId: {
        userId,
        gameId,
      },
    },
  });

  if (existing) {
    // 累加游戏时长
    await prisma.userGameRecord.update({
      where: { id: existing.id },
      data: {
        totalPlayTime: { increment: playTime },
      },
    });
  } else {
    // 创建新记录
    await prisma.userGameRecord.create({
      data: {
        userId,
        gameId,
        status: 'PLAYING',
        totalPlayTime: playTime,
      },
    });

    // 更新游戏recordCount
    await prisma.game.update({
      where: { id: gameId },
      data: { recordCount: { increment: 1 } },
    });
  }
}

// 更新游戏平均分
async function updateGameAvgScore(gameId) {
  // 获取所有短评
  const shortReviews = await prisma.gameShortReview.findMany({
    where: { gameId },
    select: { score: true },
  });

  // 获取所有长评
  const longReviews = await prisma.gameLongReview.findMany({
    where: { gameId },
    select: { score: true },
  });

  const allScores = [
    ...shortReviews.map(r => r.score),
    ...longReviews.map(r => r.score),
  ];

  if (allScores.length > 0) {
    const avgScore = allScores.reduce((a, b) => a + b, 0) / allScores.length;
    await prisma.game.update({
      where: { id: gameId },
      data: {
        avgScore: Math.round(avgScore * 10) / 10, // 保留一位小数
      },
    });
  }
}

module.exports = router;
