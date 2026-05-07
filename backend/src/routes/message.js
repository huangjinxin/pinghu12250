/**
 * 消息相关API路由
 */

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { sendMessagePush } = require('../services/apnsService');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');
const echoBotService = require('../services/echoBotService');

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
      return res.json({ success: true, data: [] });
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
          name: friend.profile?.nickname || friend.username,
          avatar: friend.avatar,
          nickname: friend.profile?.nickname,
          lastMessage: lastMessage?.content || null,
          timestamp: lastMessage?.createdAt || null,
          lastMessageTime: lastMessage?.createdAt || null,
          unreadCount
        };
      })
    );

    // 附加勤学好问机器人会话入口
    if (echoBotService.botUserId && !conversations.some(c => c.id === echoBotService.botUserId)) {
      const bot = await prisma.user.findUnique({
        where: { id: echoBotService.botUserId },
        select: {
          id: true,
          username: true,
          avatar: true,
          profile: { select: { nickname: true } }
        }
      });
      if (bot) {
        const lastBotMessage = await prisma.message.findFirst({
          where: {
            messageType: 'CHAT',
            deletedAt: null,
            OR: [
              { fromUserId: userId, toUserId: bot.id },
              { fromUserId: bot.id, toUserId: userId }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });
        const unreadCount = await prisma.message.count({
          where: {
            fromUserId: bot.id,
            toUserId: userId,
            messageType: 'CHAT',
            isRead: false,
            deletedAt: null
          }
        });
        conversations.unshift({
          id: bot.id,
          username: bot.username,
          name: bot.profile?.nickname || bot.username,
          avatar: bot.avatar,
          nickname: bot.profile?.nickname,
          lastMessage: lastBotMessage?.content || '你好，我是勤学好问，有问题尽管来问我。',
          timestamp: lastBotMessage?.createdAt || null,
          lastMessageTime: lastBotMessage?.createdAt || null,
          unreadCount,
          isBot: true,
        });
      }
    }

    // 按最后消息时间排序
    conversations.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });

    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error('[API] 获取会话列表失败:', error);
    res.status(500).json({ error: '获取会话列表失败' });
  }
});

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
      success: true,
      data: {
        messages: reversedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: messages.length
        }
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
      return res.json({ success: true, data: [] });
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
          name: friend.profile?.nickname || friend.username,
          avatar: friend.avatar,
          nickname: friend.profile?.nickname,
          lastMessage: lastMessage?.content || null,
          timestamp: lastMessage?.createdAt || null,
          lastMessageTime: lastMessage?.createdAt || null,
          unreadCount
        };
      })
    );

    // 附加勤学好问机器人会话入口
    if (echoBotService.botUserId && !conversations.some(c => c.id === echoBotService.botUserId)) {
      const bot = await prisma.user.findUnique({
        where: { id: echoBotService.botUserId },
        select: {
          id: true,
          username: true,
          avatar: true,
          profile: { select: { nickname: true } }
        }
      });
      if (bot) {
        const lastBotMessage = await prisma.message.findFirst({
          where: {
            messageType: 'CHAT',
            deletedAt: null,
            OR: [
              { fromUserId: userId, toUserId: bot.id },
              { fromUserId: bot.id, toUserId: userId }
            ]
          },
          orderBy: { createdAt: 'desc' }
        });
        const unreadCount = await prisma.message.count({
          where: {
            fromUserId: bot.id,
            toUserId: userId,
            messageType: 'CHAT',
            isRead: false,
            deletedAt: null
          }
        });
        conversations.unshift({
          id: bot.id,
          username: bot.username,
          name: bot.profile?.nickname || bot.username,
          avatar: bot.avatar,
          nickname: bot.profile?.nickname,
          lastMessage: lastBotMessage?.content || '你好，我是勤学好问，有问题尽管来问我。',
          timestamp: lastBotMessage?.createdAt || null,
          lastMessageTime: lastBotMessage?.createdAt || null,
          unreadCount,
          isBot: true,
        });
      }
    }

    // 按最后消息时间排序
    conversations.sort((a, b) => {
      if (!a.lastMessageTime) return 1;
      if (!b.lastMessageTime) return -1;
      return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
    });

    res.json({ success: true, data: conversations });
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
        messageType: 'CHAT',
        isRead: false,
        deletedAt: null
      }
    });

    res.json({ success: true, data: { unreadCount: count } });
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

/**
 * 发送聊天消息（REST API）
 * POST /api/messages/send
 * Body: { toUserId: string, content: string }
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId, content } = req.body;

    if (!toUserId) return res.status(400).json({ error: '接收者ID不能为空' });
    if (!content || !content.trim()) return res.status(400).json({ error: '消息内容不能为空' });

    // 检查是否为好友（勤学好问机器人自动放行并补齐关系）
    let friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId1: fromUserId, userId2: toUserId },
          { userId1: toUserId, userId2: fromUserId }
        ]
      },
      include: { conversation: true }
    });

    if (!friendship && toUserId === echoBotService.botUserId) {
      friendship = await echoBotService.ensureFriendshipWithUser(fromUserId);
    }

    if (!friendship) {
      return res.status(400).json({
        code: 'NOT_FRIEND',
        error: '只能向好友发送消息'
      });
    }

    // 自动创建会话（如果不存在）
    let conversationId;
    if (friendship.conversation) {
      conversationId = friendship.conversation.id;
    } else {
      const newConv = await prisma.conversation.create({
        data: { friendshipId: friendship.id, user1Unread: 0, user2Unread: 0 }
      });
      conversationId = newConv.id;
    }

    // 存入数据库
    const message = await prisma.message.create({
      data: {
        fromUserId,
        toUserId,
        conversationId,
        messageType: 'CHAT',
        content: content.trim(),
        isRead: false
      },
      include: {
        fromUser: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    // 更新会话的最后消息
    const isUser1 = friendship.userId1 === fromUserId;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageId: message.id,
        lastMessageTime: message.createdAt,
        [isUser1 ? 'user2Unread' : 'user1Unread']: { increment: 1 }
      }
    });

    // 实时推送给接收方（REST 发送也要推送，保证当前页即时刷新）
    const receiverSocketId = global.onlineUsers?.get(toUserId);
    if (receiverSocketId && global.io) {
      global.io.to(receiverSocketId).emit('new_message', message);
    } else {
      await sendMessagePush(toUserId, message);
    }

    // Bot 自动回复改为异步触发，不阻塞用户消息返回
    if (toUserId === echoBotService.botUserId) {
      Promise.resolve()
        .then(async () => {
          const botReply = await echoBotService.handleMessage(message);
          if (!botReply) return;
          const senderSocketId = global.onlineUsers?.get(fromUserId);
          if (senderSocketId && global.io) {
            global.io.to(senderSocketId).emit('new_message', botReply);
          }
        })
        .catch((error) => {
          console.error('[Bot] 异步回复失败:', error);
        });
    }

    res.json({
      success: true,
      data: {
        message,
        conversation: {
          id: toUserId,
          lastMessage: message.content,
          lastMessageTime: message.createdAt,
          unreadCount: 0
        }
      }
    });
  } catch (error) {
    console.error('[API] 发送消息失败:', error);
    res.status(500).json({ error: '发送消息失败' });
  }
});

/**
 * 标记某好友的聊天消息为已读（REST替代Socket）
 * POST /api/messages/mark-chat-read
 * Body: { friendId: string }
 */
router.post('/mark-chat-read', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ error: 'friendId必填' });

    console.log('[messages] mark-chat-read request', JSON.stringify({ userId, friendId }));

    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.message.updateMany({
        where: {
          fromUserId: friendId,
          toUserId: userId,
          messageType: 'CHAT',
          isRead: false,
          deletedAt: null
        },
        data: { isRead: true }
      });

      const friendship = await tx.friendship.findFirst({
        where: {
          OR: [
            { userId1: userId, userId2: friendId },
            { userId1: friendId, userId2: userId }
          ]
        },
        include: { conversation: true }
      });

      if (friendship?.conversation) {
        await tx.conversation.update({
          where: { id: friendship.conversation.id },
          data: friendship.userId1 === userId ? { user1Unread: 0 } : { user2Unread: 0 }
        });
      }

      const unreadCount = await tx.message.count({
        where: {
          toUserId: userId,
          messageType: 'CHAT',
          isRead: false,
          deletedAt: null
        }
      });

      return {
        count: updateResult.count,
        unreadCount,
        conversationId: friendship?.conversation?.id || null
      };
    });

    console.log('[messages] mark-chat-read result', JSON.stringify(result));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[API] 标记聊天已读失败:', error);
    res.status(500).json({ error: '标记已读失败' });
  }
});

module.exports = router;
