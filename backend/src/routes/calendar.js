/**
 * 日历路由
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const where = { userId: req.user.id };

    if (startDate && endDate) {
      where.startDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { startDate: 'asc' },
    });

    res.json({ events });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, startDate, endDate, color } = req.body;

    const event = await prisma.calendarEvent.create({
      data: {
        userId: req.user.id,
        title,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        color,
      },
    });

    res.status(201).json({ message: '事件创建成功', event });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const event = await prisma.calendarEvent.findUnique({ where: { id } });

    if (!event) return res.status(404).json({ error: '事件不存在' });
    if (event.userId !== req.user.id) return res.status(403).json({ error: '无权删除' });

    await prisma.calendarEvent.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
