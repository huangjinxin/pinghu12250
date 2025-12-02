/**
 * 全局搜索路由
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// GET /api/search - 全局搜索
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { q, type, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ results: [] });
    }

    const searchTerm = q.trim();
    const limitNum = Math.min(parseInt(limit), 50);
    const results = [];

    // 搜索日记
    if (!type || type === 'diary') {
      const diaries = await prisma.diary.findMany({
        where: {
          authorId: req.user.id,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
        },
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      });

      diaries.forEach(d => {
        results.push({
          id: d.id,
          type: 'diary',
          typeName: '日记',
          title: d.title,
          excerpt: d.content?.substring(0, 100) || '',
          createdAt: d.createdAt,
          url: `/diaries`,
        });
      });
    }

    // 搜索作品
    if (!type || type === 'work') {
      const works = await prisma.hTMLWork.findMany({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { html: { contains: searchTerm, mode: 'insensitive' } },
          ],
          OR: [
            { authorId: req.user.id },
            { visibility: 'PUBLIC' },
          ],
        },
        select: {
          id: true,
          title: true,
          html: true,
          createdAt: true,
          author: {
            select: {
              username: true,
              profile: { select: { nickname: true } },
            },
          },
        },
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      });

      works.forEach(w => {
        results.push({
          id: w.id,
          type: 'work',
          typeName: '作品',
          title: w.title,
          excerpt: '',
          author: w.author?.profile?.nickname || w.author?.username,
          createdAt: w.createdAt,
          url: `/works/${w.id}`,
        });
      });
    }

    // 搜索笔记
    if (!type || type === 'note') {
      const notes = await prisma.note.findMany({
        where: {
          authorId: req.user.id,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          content: true,
          subject: true,
          createdAt: true,
        },
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      });

      notes.forEach(n => {
        results.push({
          id: n.id,
          type: 'note',
          typeName: '笔记',
          title: n.title,
          excerpt: n.content?.substring(0, 100) || '',
          createdAt: n.createdAt,
          url: `/notes`,
        });
      });
    }

    // 搜索读书笔记
    if (!type || type === 'readingNote') {
      const readingNotes = await prisma.readingNote.findMany({
        where: {
          authorId: req.user.id,
          OR: [
            { bookTitle: { contains: searchTerm, mode: 'insensitive' } },
            { bookAuthor: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          bookTitle: true,
          bookAuthor: true,
          content: true,
          createdAt: true,
        },
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      });

      readingNotes.forEach(r => {
        results.push({
          id: r.id,
          type: 'readingNote',
          typeName: '读书笔记',
          title: r.bookTitle,
          excerpt: r.content?.substring(0, 100) || '',
          author: r.bookAuthor,
          createdAt: r.createdAt,
          url: `/notes`,
        });
      });
    }

    // 搜索作业
    if (!type || type === 'homework') {
      const homeworks = await prisma.homework.findMany({
        where: {
          authorId: req.user.id,
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { content: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          title: true,
          content: true,
          subject: true,
          createdAt: true,
        },
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      });

      homeworks.forEach(h => {
        results.push({
          id: h.id,
          type: 'homework',
          typeName: '作业',
          title: h.title,
          excerpt: h.content?.substring(0, 100) || '',
          createdAt: h.createdAt,
          url: `/homeworks`,
        });
      });
    }

    // 按创建时间排序
    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      results: results.slice(0, limitNum),
      total: results.length,
      query: searchTerm,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
