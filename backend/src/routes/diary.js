/**
 * 日记路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const pointService = require('../services/pointService');
const challengeService = require('../services/challengeService');
const achievementService = require('../services/achievementService');
const { sendCommentNotification } = require('../services/notificationService');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

// GET /api/diaries - 获取日记列表
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = userId ? { authorId: userId } : { authorId: req.user.id };

    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where,
        include: {
          author: {
            select: { id: true, username: true, avatar: true },
          },
          tags: {
            include: { tag: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.diary.count({ where }),
    ]);

    res.json({ diaries, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    next(error);
  }
});

// POST /api/diaries - 创建日记
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, content, mood, weather, tags = [], price, diaryDate, isPublic = true } = req.body;

    // 准备创建数据
    const createData = {
      authorId: req.user.id,
      title,
      content,
      mood,
      weather,
      isPublic,
      tags: {
        create: tags.map(tagId => ({ tagId })),
      },
    };

    // 如果提供了自定义日期，使用它；否则使用默认的now()
    if (diaryDate) {
      createData.createdAt = new Date(diaryDate);
    }

    const diary = await prisma.diary.create({
      data: createData,
    });

    // 如果设置了价格，创建付费内容记录
    if (price !== undefined && price !== null) {
      const priceValue = parseInt(price);
      if (priceValue >= 0 && priceValue <= 100) {
        await prisma.paidContent.create({
          data: {
            contentType: 'diary',
            contentId: diary.id,
            userId: req.user.id,
            price: priceValue,
          },
        });
      }
    }

    // 根据字数奖励积分 (D001-D006)
    try {
      // 计算字数（去除HTML标签）
      const plainText = content.replace(/<[^>]*>/g, '');
      const wordCount = plainText.length;

      // 根据字数获取对应规则ID
      const ruleId = pointService.calculateDiaryRuleId(wordCount);

      const pointResult = await pointService.addPoints(ruleId, req.user.id, {
        targetType: 'diary',
        targetId: diary.id,
        description: `发布${wordCount}字日记`,
      });

      if (pointResult.success) {
        diary.earnedPoints = pointResult.log.points;
        diary.newTotalPoints = pointResult.totalPoints;
        diary.wordCount = wordCount;
      }

      // 更新每日挑战进度
      challengeService.checkAndUpdateProgress(req.user.id, 'diary_create', {
        wordCount,
        count: 1,
      });

      // 检查成就
      achievementService.checkAchievements(req.user.id, 'diary_published', {
        count: 1,
      });
      achievementService.checkAchievements(req.user.id, 'diary_streak', {});
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.status(201).json({ message: '日记创建成功', diary });
  } catch (error) {
    next(error);
  }
});

// PUT /api/diaries/:id - 更新日记
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, mood, weather, isPublic } = req.body;

    const diary = await prisma.diary.findUnique({ where: { id } });

    if (!diary) return res.status(404).json({ error: '日记不存在' });
    if (diary.authorId !== req.user.id) return res.status(403).json({ error: '无权修改' });

    const updateData = { title, content, mood, weather };
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
    }

    const updated = await prisma.diary.update({
      where: { id },
      data: updateData,
    });

    res.json({ message: '更新成功', diary: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/diaries/:id - 删除日记
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const diary = await prisma.diary.findUnique({ where: { id } });

    if (!diary) return res.status(404).json({ error: '日记不存在' });
    if (diary.authorId !== req.user.id) return res.status(403).json({ error: '无权删除' });

    // 扣除该日记相关的所有积分 (D009)
    try {
      await pointService.deductPointsOnDelete('diary', id);
    } catch (error) {
      console.error('扣除积分失败:', error);
    }

    await prisma.diary.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

// GET /api/diaries/:id/public - 公开访问日记详情（无需登录）
router.get('/:id/public', async (req, res, next) => {
  try {
    const { id } = req.params;

    const diary = await prisma.diary.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    // 获取匿名评论
    const comments = await prisma.diaryComment.findMany({
      where: { diaryId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ diary, comments });
  } catch (error) {
    next(error);
  }
});

// POST /api/diaries/:id/comments - 匿名评论（无需登录）
router.post('/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, nickname } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    // 检查日记是否存在
    const diary = await prisma.diary.findUnique({
      where: { id },
    });

    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    // 创建匿名评论
    const comment = await prisma.diaryComment.create({
      data: {
        diaryId: id,
        content: content.trim().slice(0, 500),
        nickname: (nickname || '匿名用户').slice(0, 20),
      },
    });

    // 发送通知给日记作者
    try {
      await sendCommentNotification(diary.authorId, { username: comment.nickname }, diary);
    } catch (error) {
      console.error('发送评论通知失败:', error);
    }

    res.status(201).json({ message: '评论成功', comment });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
