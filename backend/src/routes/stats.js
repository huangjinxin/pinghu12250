/**
 * 统计数据路由
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/stats/heatmap - 获取学习热力图数据
router.get('/heatmap', authenticate, async (req, res, next) => {
  try {
    const { userId, year } = req.query;
    const targetUserId = userId || req.user.id;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    const startDate = new Date(`${targetYear}-01-01`);
    const endDate = new Date(`${targetYear}-12-31`);

    // 获取所有学习活动的创建日期
    const [diaries, homeworks, readingLogs, htmlWorks, gameShortReviews, gameLongReviews] = await Promise.all([
      prisma.diary.findMany({
        where: {
          authorId: targetUserId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true },
      }),
      prisma.homework.findMany({
        where: {
          authorId: targetUserId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true },
      }),
      prisma.readingLog.findMany({
        where: {
          userId: targetUserId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true },
      }),
      prisma.hTMLWork.findMany({
        where: {
          authorId: targetUserId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true },
      }),
      prisma.gameShortReview.findMany({
        where: {
          userId: targetUserId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true },
      }),
      prisma.gameLongReview.findMany({
        where: {
          userId: targetUserId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true },
      }),
    ]);

    // 统计每天的活动数量
    const heatmapData = {};
    [...diaries, ...homeworks, ...readingLogs, ...htmlWorks, ...gameShortReviews, ...gameLongReviews].forEach(item => {
      const date = item.createdAt.toISOString().split('T')[0];
      heatmapData[date] = (heatmapData[date] || 0) + 1;
    });

    res.json({ heatmapData });
  } catch (error) {
    next(error);
  }
});

// GET /api/stats/overview - 获取概览统计
router.get('/overview', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.query;
    const targetUserId = userId || req.user.id;

    const [
      diaryCount,
      homeworkCount,
      booksCount,
      gamesCount,
      readingLogCount,
      htmlWorkCount,
      gameShortReviewCount,
      gameLongReviewCount,
      htmlWorkLikes,
      readingLogLikes,
      gameLongReviewLikes,
      commentsCount,
      totalPoints,
    ] = await Promise.all([
      prisma.diary.count({ where: { authorId: targetUserId } }),
      prisma.homework.count({ where: { authorId: targetUserId } }),
      prisma.userBookshelf.count({ where: { userId: targetUserId } }),
      prisma.userGameRecord.count({ where: { userId: targetUserId } }),
      prisma.readingLog.count({ where: { userId: targetUserId } }),
      prisma.hTMLWork.count({ where: { authorId: targetUserId } }),
      prisma.gameShortReview.count({ where: { userId: targetUserId } }),
      prisma.gameLongReview.count({ where: { userId: targetUserId } }),
      // 统计HTML作品点赞数
      prisma.like.count({
        where: {
          work: {
            is: {
              authorId: targetUserId,
            },
          },
        },
      }),
      // 统计阅读记录点赞数
      prisma.readingLogLike.count({
        where: {
          readingLog: {
            is: {
              userId: targetUserId,
            },
          },
          isLike: true,
        },
      }),
      // 统计游戏长评点赞数
      prisma.gameLongReviewLike.count({
        where: {
          review: {
            is: {
              userId: targetUserId,
            },
          },
        },
      }),
      // 统计评论数（HTML作品评论 + 游戏评测评论）
      prisma.comment.count({ where: { authorId: targetUserId } }),
      // 获取总积分
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: { totalPoints: true },
      }).then(user => user?.totalPoints || 0),
    ]);

    // 计算总点赞数
    const totalLikes = htmlWorkLikes + readingLogLikes + gameLongReviewLikes;

    res.json({
      diaryCount,
      homeworkCount,
      booksCount,
      gamesCount,
      readingLogCount,
      htmlWorkCount,
      gameShortReviewCount,
      gameLongReviewCount,
      totalLikes,
      htmlWorkLikes,
      readingLogLikes,
      gameLongReviewLikes,
      commentsCount,
      totalPoints,
      totalActivities: diaryCount + homeworkCount + readingLogCount + htmlWorkCount + gameShortReviewCount + gameLongReviewCount,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
