/**
 * 标签路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, color } = req.body;
    const tag = await prisma.tag.create({
      data: { name, color },
    });
    res.status(201).json({ message: '标签创建成功', tag });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
