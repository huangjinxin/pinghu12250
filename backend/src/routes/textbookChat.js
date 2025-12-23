/**
 * 教材阅读聊天记录路由
 * 权限：已登录
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// 获取教材的聊天记录
router.get('/:textbookId', authenticate, async (req, res) => {
  try {
    const { textbookId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.id;

    const [messages, total] = await Promise.all([
      prisma.textbookChatMessage.findMany({
        where: {
          userId,
          textbookId
        },
        orderBy: { createdAt: 'asc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.textbookChatMessage.count({
        where: { userId, textbookId }
      })
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取聊天记录失败:', error);
    res.status(500).json({ success: false, error: '获取记录失败' });
  }
});

// 添加聊天消息
router.post('/:textbookId', authenticate, async (req, res) => {
  try {
    const { textbookId } = req.params;
    const { role, content, page, sourceType, metadata } = req.body;
    const userId = req.user.id;

    if (!role || !content) {
      return res.status(400).json({ success: false, error: 'role 和 content 必填' });
    }

    const message = await prisma.textbookChatMessage.create({
      data: {
        userId,
        textbookId,
        role,
        content,
        page: page || null,
        sourceType: sourceType || null,
        metadata: metadata || null
      }
    });

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error('添加聊天消息失败:', error);
    res.status(500).json({ success: false, error: '添加失败' });
  }
});

// 删除单条消息
router.delete('/:textbookId/:messageId', authenticate, async (req, res) => {
  try {
    const { textbookId, messageId } = req.params;
    const userId = req.user.id;

    // 验证消息属于当前用户
    const message = await prisma.textbookChatMessage.findFirst({
      where: {
        id: messageId,
        userId,
        textbookId
      }
    });

    if (!message) {
      return res.status(404).json({ success: false, error: '消息不存在' });
    }

    await prisma.textbookChatMessage.delete({
      where: { id: messageId }
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除消息失败:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

// 清空教材的所有聊天记录
router.delete('/:textbookId/clear', authenticate, async (req, res) => {
  try {
    const { textbookId } = req.params;
    const userId = req.user.id;

    const result = await prisma.textbookChatMessage.deleteMany({
      where: {
        userId,
        textbookId
      }
    });

    res.json({
      success: true,
      message: `已清空 ${result.count} 条记录`
    });
  } catch (error) {
    console.error('清空聊天记录失败:', error);
    res.status(500).json({ success: false, error: '清空失败' });
  }
});

module.exports = router;
