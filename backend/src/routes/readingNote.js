/**
 * 读书笔记路由
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const pointService = require('../services/pointService');

const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const readingNotes = await prisma.readingNote.findMany({
      where: { authorId: req.user.id },
      include: { tags: { include: { tag: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ readingNotes });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { bookTitle, bookAuthor, content, rating, tags = [] } = req.body;
    const readingNote = await prisma.readingNote.create({
      data: {
        authorId: req.user.id,
        bookTitle,
        bookAuthor,
        content,
        rating,
        tags: { create: tags.map(tagId => ({ tagId })) },
      },
    });

    // 奖励积分
    try {
      const pointResult = await addPoints('READING_NOTE_CREATE', req.user.id, {
        relatedType: 'readingNote',
        relatedId: readingNote.id,
      });
      if (pointResult.success) {
        readingNote.earnedPoints = pointResult.log.pointsChanged;
        readingNote.newTotalPoints = pointResult.totalPoints;
      }
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.status(201).json({ message: '读书笔记创建成功', readingNote });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { bookTitle, bookAuthor, content, rating, tags = [] } = req.body;

    const readingNote = await prisma.readingNote.findUnique({ where: { id } });
    if (!readingNote) return res.status(404).json({ error: '读书笔记不存在' });
    if (readingNote.authorId !== req.user.id) return res.status(403).json({ error: '无权修改' });

    // 删除旧标签关联
    await prisma.tagOnRecord.deleteMany({ where: { readingNoteId: id } });

    const updated = await prisma.readingNote.update({
      where: { id },
      data: {
        bookTitle,
        bookAuthor,
        content,
        rating,
        tags: { create: tags.map(tagId => ({ tagId })) },
      },
      include: { tags: { include: { tag: true } } },
    });

    res.json({ message: '更新成功', readingNote: updated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const readingNote = await prisma.readingNote.findUnique({ where: { id } });
    if (!readingNote) return res.status(404).json({ error: '读书笔记不存在' });
    if (readingNote.authorId !== req.user.id) return res.status(403).json({ error: '无权删除' });

    await prisma.readingNote.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
