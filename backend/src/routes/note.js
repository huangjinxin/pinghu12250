/**
 * 笔记路由
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const pointService = require('../services/pointService');

const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const where = { authorId: req.user.id };
    const notes = await prisma.note.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ notes });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, subject, content, tags = [] } = req.body;
    const note = await prisma.note.create({
      data: {
        authorId: req.user.id,
        title,
        subject,
        content,
        tags: { create: tags.map(tagId => ({ tagId })) },
      },
    });

    // 奖励积分
    try {
      const pointResult = await addPoints('NOTE_CREATE', req.user.id, {
        relatedType: 'note',
        relatedId: note.id,
      });
      if (pointResult.success) {
        note.earnedPoints = pointResult.log.pointsChanged;
        note.newTotalPoints = pointResult.totalPoints;
      }
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.status(201).json({ message: '笔记创建成功', note });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, subject, content, tags = [] } = req.body;

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) return res.status(404).json({ error: '笔记不存在' });
    if (note.authorId !== req.user.id) return res.status(403).json({ error: '无权修改' });

    // 删除旧标签关联
    await prisma.tagOnRecord.deleteMany({ where: { noteId: id } });

    const updated = await prisma.note.update({
      where: { id },
      data: {
        title,
        subject,
        content,
        tags: { create: tags.map(tagId => ({ tagId })) },
      },
      include: { tags: { include: { tag: true } } },
    });

    res.json({ message: '更新成功', note: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) return res.status(404).json({ error: '笔记不存在' });
    if (note.authorId !== req.user.id) return res.status(403).json({ error: '无权删除' });

    await prisma.note.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
