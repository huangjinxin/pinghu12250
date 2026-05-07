/**
 * 会话管理控制器
 */

const prisma = require('../lib/prisma');

/**
 * 获取会话列表
 */
exports.getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }]
      },
      include: {
        Conversation: true,
        user1: {
          select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } }
        },
        user2: {
          select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } }
        }
      }
    });

    // 获取最后一条消息内容
    const lastMessages = await prisma.message.findMany({
      where: {
        id: {
          in: friendships.filter(f => f.Conversation?.lastMessageId).map(f => f.Conversation.lastMessageId)
        }
      },
      select: { id: true, content: true }
    });
    const messageMap = new Map(lastMessages.map(m => [m.id, m.content]));

    const conversations = friendships
      .filter(f => f.Conversation)
      .map(f => {
        const friend = f.userId1 === userId ? f.user2 : f.user1;
        const unreadCount = f.userId1 === userId ? f.Conversation.user1Unread : f.Conversation.user2Unread;
        const lastMessage = f.Conversation.lastMessageId ? messageMap.get(f.Conversation.lastMessageId) : null;

        return {
          id: friend.id,
          username: friend.username,
          name: friend.profile?.nickname || friend.username,
          avatar: friend.avatar,
          lastMessage,
          lastMessageTime: f.Conversation.lastMessageTime,
          unreadCount
        };
      })
      .sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime) - new Date(a.lastMessageTime);
      });

    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取会话消息
 */
exports.getMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { Friendship: true }
    });

    if (!conversation) {
      return res.status(404).json({ error: '会话不存在' });
    }

    const { userId1, userId2 } = conversation.Friendship;
    if (userId !== userId1 && userId !== userId2) {
      return res.status(403).json({ error: '无权访问此会话' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
      include: {
        fromUser: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    next(error);
  }
};

/**
 * 标记会话已读
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { Friendship: true }
    });

    if (!conversation) {
      return res.status(404).json({ error: '会话不存在' });
    }

    const { userId1, userId2 } = conversation.Friendship;
    if (userId !== userId1 && userId !== userId2) {
      return res.status(403).json({ error: '无权操作此会话' });
    }

    const friendId = userId === userId1 ? userId2 : userId1;
    const updateData = userId === userId1 ? { user1Unread: 0 } : { user2Unread: 0 };

    const result = await prisma.$transaction(async (tx) => {
      await tx.message.updateMany({
        where: {
          conversationId,
          toUserId: userId,
          messageType: 'CHAT',
          isRead: false,
          deletedAt: null
        },
        data: { isRead: true }
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: updateData
      });

      const unreadCount = await tx.message.count({
        where: {
          toUserId: userId,
          messageType: 'CHAT',
          isRead: false,
          deletedAt: null
        }
      });

      return { conversationId, friendId, unreadCount };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建或获取会话
 */
exports.createOrGet = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.body;

    if (!friendId) {
      return res.status(400).json({ error: '缺少 friendId' });
    }

    // 检查是否是好友
    const friendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId1: userId, userId2: friendId },
          { userId1: friendId, userId2: friendId === userId ? friendId : userId }
        ]
      },
      include: {
        Conversation: true,
        user1: { select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } } },
        user2: { select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } } }
      }
    });

    if (!friendship) {
      return res.status(400).json({
        code: 'NOT_FRIEND',
        error: '不是好友关系'
      });
    }

    // 确定对方信息
    const peer = friendship.userId1 === userId ? friendship.user2 : friendship.user1;

    // 如果已有会话，直接返回
    if (friendship.Conversation) {
      return res.json({
        success: true,
        data: {
          conversationId: friendship.Conversation.id,
          peerUserId: peer.id,
          peerName: peer.profile?.nickname || peer.username,
          peerAvatar: peer.avatar,
          created: false
        }
      });
    }

    // 创建新会话
    const conversation = await prisma.conversation.create({
      data: {
        friendshipId: friendship.id,
        user1Unread: 0,
        user2Unread: 0
      }
    });

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        peerUserId: peer.id,
        peerName: peer.profile?.nickname || peer.username,
        peerAvatar: peer.avatar,
        created: true
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
