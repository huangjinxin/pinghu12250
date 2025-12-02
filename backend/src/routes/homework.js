/**
 * 作业记录路由
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const pointService = require('../services/pointService');

const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.query;
    const where = userId ? { authorId: userId } : { authorId: req.user.id };

    const homeworks = await prisma.homework.findMany({
      where,
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ homeworks });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, subject, content, images, difficulty, timeSpent, tags = [] } = req.body;

    const homework = await prisma.homework.create({
      data: {
        authorId: req.user.id,
        title,
        subject,
        content,
        images: images || [],
        difficulty,
        timeSpent,
        tags: { create: tags.map(tagId => ({ tagId })) },
      },
    });

    // 奖励积分 (H001: 提交作业 +5分)
    try {
      const pointResult = await pointService.addPoints('H001', req.user.id, {
        targetType: 'homework',
        targetId: homework.id,
      });
      if (pointResult.success) {
        homework.earnedPoints = pointResult.log.points;
        homework.newTotalPoints = pointResult.totalPoints;
      }
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.status(201).json({ message: '作业记录成功', homework });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const homework = await prisma.homework.findUnique({ where: { id } });

    if (!homework) return res.status(404).json({ error: '作业不存在' });
    if (homework.authorId !== req.user.id) return res.status(403).json({ error: '无权删除' });

    await prisma.homework.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
