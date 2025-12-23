/**
 * 教材阅读笔记路由
 * 用于保存用户在阅读PDF教材时的查字/搜索结果
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// 所有路由都需要登录
router.use(authenticate);

// 创建阅读笔记
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { textbookId, sessionId, sourceType, query, content, snippet, page } = req.body;

    // 参数验证
    if (!textbookId || !sessionId || !sourceType || !query || !snippet) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    // 创建笔记
    const note = await prisma.readingNote.create({
      data: {
        userId,
        textbookId,
        sessionId,
        sourceType,
        query,
        content: content || {},
        snippet,
        page: page || 1
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: note.id,
        createdAt: note.createdAt
      }
    });
  } catch (error) {
    console.error('创建阅读笔记失败:', error);
    res.status(500).json({
      success: false,
      error: '创建笔记失败'
    });
  }
});

// 删除阅读笔记
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // 检查笔记是否存在且属于当前用户
    const note = await prisma.readingNote.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        error: '笔记不存在'
      });
    }

    // 删除笔记
    await prisma.readingNote.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除阅读笔记失败:', error);
    res.status(500).json({
      success: false,
      error: '删除失败'
    });
  }
});

// 获取用户的阅读笔记列表
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { textbookId, sessionId, page = 1, limit = 20 } = req.query;

    const where = { userId };

    if (textbookId) {
      where.textbookId = textbookId;
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    const [notes, total] = await Promise.all([
      prisma.readingNote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.readingNote.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        notes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取阅读笔记列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取列表失败'
    });
  }
});

module.exports = router;
