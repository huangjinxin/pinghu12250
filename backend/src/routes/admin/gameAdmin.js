/**
 * 管理员 - 游戏管理
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../../middleware/auth');

const prisma = new PrismaClient();

// 所有路由都需要管理员权限
router.use(authenticate);
router.use(authorize('ADMIN', 'TEACHER'));

// GET /api/admin/games/records - 获取所有游戏记录
router.get('/records', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20, visibility, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const where = {};
    if (visibility) {
      where.visibility = visibility;
    }
    if (userId) {
      where.userId = userId;
    }

    const records = await prisma.gameRecord.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, email: true, avatar: true },
        },
        game: {
          select: { id: true, name: true, coverImage: true },
        },
        screenshots: true,
        _count: {
          select: { comments: true, likes: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(pageSize),
    });

    const total = await prisma.gameRecord.count({ where });

    res.json({ records, total });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/games/records/:id - 删除游戏记录
router.delete('/records/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const record = await prisma.gameRecord.findUnique({
      where: { id },
    });

    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }

    await prisma.gameRecord.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/games/:id/block - 屏蔽/取消屏蔽游戏
router.put('/:id/block', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const game = await prisma.game.update({
      where: { id },
      data: { isBlocked },
    });

    res.json(game);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/games/stats - 游戏统计
router.get('/stats', async (req, res, next) => {
  try {
    const totalGames = await prisma.game.count();
    const totalRecords = await prisma.gameRecord.count();
    const totalScreenshots = await prisma.gameScreenshot.count();
    const totalComments = await prisma.gameRecordComment.count();

    const topGames = await prisma.game.findMany({
      include: {
        _count: {
          select: { records: true, favorites: true },
        },
      },
      orderBy: {
        records: { _count: 'desc' },
      },
      take: 10,
    });

    res.json({
      totalGames,
      totalRecords,
      totalScreenshots,
      totalComments,
      topGames,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
