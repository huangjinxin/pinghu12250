/**
 * 消息相关API路由
 */

const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

/**
 * 获取与某个用户的聊天历史
 * GET /api/messages/:userId?page=1&limit=50
 */
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // 查询与该用户的聊天记录
    const messages = await prisma.message.findMany({
      where: {
        messageType: 'CHAT',
        deletedAt: null,
        OR: [
          { fromUserId: currentUserId, toUserId: userId },
          { fromUserId: userId, toUserId: currentUserId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    // 反转顺序（从旧到新）
    const reversedMessages = messages.reverse();

    res.json({
      messages: reversedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length
      }
    });
  } catch (error) {
    console.error('[API] 获取聊天历史失败:', error);
    res.status(500).json({ error: '获取聊天历史失败' });
  }
});

/**
 * 获取所有聊天会话列表
 * GET /api/conversations
 */
router.get('/conversations/list', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // 查询所有好友
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId1: userId },
          { userId2: userId }
        ]
      }
    });

    // 提取好友ID
    const friendIds = friendships.map(f =>
      f.userId1 === userId ? f.userId2 : f.userId1
    );

    if (friendIds.length === 0) {
      return res.json([]);
    }

    // 查询所有好友的基本信息和最后一条消息
    const conversations = await Promise.all(
      friendIds.map(async (friendId) => {
        // 获取好友信息
        const friend = await prisma.user.findUnique({
          where: { id: friendId },
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: {
              select: { nickname: true }
            }
          }
        });

        // 获取最后一条消息
        const lastMessage = await prisma.message.findFirst({
          where: {
            messageType: 'CHAT',
            deletedAt: null,
            OR: [
              { fromUserId: userId, toUserId: friendId },
              { fromUserId: friendId, toUserId: userId }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });

        // 获取未读消息数
        const unreadCount = await prisma.message.count({
          where: {
            fromUserId: friendId,
            toUserId: userId,
            messageType: 'CHAT',
            isRead: false,
            deletedAt: null
          }
        });

        return {
          id: friend.id,
          username: friend.username,
          avatar: friend.avatar,
          nickname: friend.profile?.nickname,
          lastMessage: lastMessage?.content || null,
          lastMessageTime: lastMessage?.createdAt || null,
          unreadCount
        };
      })
    );

    // 按最后消息时间排序
    conversations.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });

    res.json(conversations);
  } catch (error) {
    console.error('[API] 获取会话列表失败:', error);
    res.status(500).json({ error: '获取会话列表失败' });
  }
});

/**
 * 获取未读消息总数
 * GET /api/unread-count
 */
router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.message.count({
      where: {
        toUserId: userId,
        isRead: false,
        deletedAt: null
      }
    });

    res.json({ unreadCount: count });
  } catch (error) {
    console.error('[API] 获取未读消息数失败:', error);
    res.status(500).json({ error: '获取未读消息数失败' });
  }
});

/**
 * 获取系统消息列表
 * GET /api/system-messages?page=1&limit=20
 */
router.get('/system/list', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const messages = await prisma.message.findMany({
      where: {
        toUserId: userId,
        fromUserId: null,
        messageType: { in: [
          'SYSTEM_ACHIEVEMENT',
          'SYSTEM_TASK',
          'SYSTEM_PURCHASE',
          'SYSTEM_FOLLOW',
          'SYSTEM_FRIEND'
        ]},
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take
    });

    // 解析metadata为JSON
    const parsedMessages = messages.map(msg => ({
      ...msg,
      metadata: msg.metadata ? JSON.parse(msg.metadata) : null
    }));

    // 获取总数
    const total = await prisma.message.count({
      where: {
        toUserId: userId,
        fromUserId: null,
        messageType: { in: [
          'SYSTEM_ACHIEVEMENT',
          'SYSTEM_TASK',
          'SYSTEM_PURCHASE',
          'SYSTEM_FOLLOW',
          'SYSTEM_FRIEND'
        ]},
        deletedAt: null
      }
    });

    res.json({
      messages: parsedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total
      }
    });
  } catch (error) {
    console.error('[API] 获取系统消息失败:', error);
    res.status(500).json({ error: '获取系统消息失败' });
  }
});

/**
 * 标记系统消息为已读
 * POST /api/system-messages/mark-read
 * Body: { messageIds: string[] }
 */
router.post('/system/mark-read', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: '消息ID列表不能为空' });
    }

    await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        toUserId: userId,
        fromUserId: null,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[API] 标记系统消息已读失败:', error);
    res.status(500).json({ error: '标记已读失败' });
  }
});

/**
 * 删除消息（软删除）
 * DELETE /api/messages/:messageId
 */
router.delete('/:messageId', authenticate, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    // 检查消息是否属于当前用户
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: '消息不存在' });
    }

    if (message.toUserId !== userId && message.fromUserId !== userId) {
      return res.status(403).json({ error: '无权删除此消息' });
    }

    // 软删除
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[API] 删除消息失败:', error);
    res.status(500).json({ error: '删除消息失败' });
  }
});

module.exports = router;
