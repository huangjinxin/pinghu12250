/**
 * 会话管理路由
 */

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const conversationController = require('../controllers/conversationController');

// GET /api/conversations - 获取会话列表
router.get('/', authenticate, conversationController.getConversations);
router.get('/list', authenticate, conversationController.getConversations);

// POST /api/conversations/create-or-get - 创建或获取会话
router.post('/create-or-get', authenticate, conversationController.createOrGet);

// GET /api/conversations/:conversationId/messages - 获取会话消息
router.get('/:conversationId/messages', authenticate, conversationController.getMessages);

// POST /api/conversations/:conversationId/read - 标记会话已读
router.post('/:conversationId/read', authenticate, conversationController.markAsRead);

module.exports = router;
