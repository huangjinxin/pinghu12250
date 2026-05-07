const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const chatMessageService = require('../services/chatMessageService');

// ===== 固定路径优先 =====

// GET /api/chat-message/conversations - 会话列表
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const list = await chatMessageService.listConversations(req.user.id);
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/chat-message/admin/stats
router.get('/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const stats = await chatMessageService.adminStats();
    res.json({ success: true, data: stats });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/chat-message/admin/bot/:botId
router.get('/admin/bot/:botId', authenticate, isAdmin, async (req, res) => {
  try {
    const list = await chatMessageService.adminBotConversations(req.params.botId);
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/chat-message/admin/conversation/:id
router.get('/admin/conversation/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const messages = await chatMessageService.adminConversationMessages(req.params.id);
    res.json({ success: true, data: messages });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ===== 参数路由 =====

// GET /api/chat-message/:botId/messages
router.get('/:botId/messages', authenticate, async (req, res) => {
  try {
    const conv = await chatMessageService.getOrCreateConversation(req.user.id, req.params.botId);
    const messages = await chatMessageService.getMessages(conv.id, {
      cursor: req.query.cursor,
      limit: parseInt(req.query.limit) || 30,
    });
    res.json({ success: true, data: messages });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/chat-message/:botId/send
router.post('/:botId/send', authenticate, async (req, res) => {
  try {
    const { msgType, content, cardData } = req.body;
    const result = await chatMessageService.sendMessage(req.user.id, req.params.botId, {
      msgType, content, cardData,
    });
    res.json({ success: true, data: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/chat-message/:conversationId/read
router.post('/:conversationId/read', authenticate, async (req, res) => {
  try {
    await chatMessageService.markRead(req.params.conversationId, req.user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
