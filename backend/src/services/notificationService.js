/**
 * 系统消息推送服务
 * 用于向用户发送系统通知（成就解锁、作品购买、关注好友等）
 */

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

// 延迟获取io和onlineUsers，避免循环依赖
let io = null;
let onlineUsers = null;

function getSocketIO() {
  if (!io) {
    try {
      const indexModule = require('../index');
      io = indexModule.io;
      onlineUsers = indexModule.onlineUsers;
    } catch (err) {
      // Socket.io可能还未初始化
    }
  }
  return { io, onlineUsers };
}

/**
 * 发送系统消息
 * @param {string} toUserId - 接收者用户ID
 * @param {string} type - 消息类型（SYSTEM_ACHIEVEMENT/SYSTEM_TASK/SYSTEM_PURCHASE/SYSTEM_FOLLOW/SYSTEM_FRIEND）
 * @param {string} content - 消息内容
 * @param {object} metadata - 额外信息（链接、ID等）
 * @returns {Promise<object>} 创建的消息对象
 */
async function sendSystemMessage(toUserId, type, content, metadata = {}) {
  try {
    // 验证消息类型
    const validTypes = [
      'SYSTEM_ACHIEVEMENT',
      'SYSTEM_TASK',
      'SYSTEM_PURCHASE',
      'SYSTEM_FOLLOW',
      'SYSTEM_FRIEND',
      'SYSTEM_COMMENT'
    ];

    if (!validTypes.includes(type)) {
      throw new Error(`无效的消息类型: ${type}`);
    }

    // 验证用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, status: true }
    });

    if (!user) {
      throw new Error(`用户不存在: ${toUserId}`);
    }

    // 存入数据库
    const message = await prisma.message.create({
      data: {
        fromUserId: null, // 系统消息
        toUserId,
        messageType: type,
        content,
        metadata: JSON.stringify(metadata),
        isRead: false
      }
    });

    console.log(`[Notification] 系统消息已创建: ${type} -> ${toUserId}`);

    // 如果用户在线，立即推送
    const { io: socketIO, onlineUsers: users } = getSocketIO();
    if (socketIO && users) {
      const socketId = users.get(toUserId);
      if (socketId) {
        socketIO.to(socketId).emit('system_message', message);
        console.log(`[Notification] 系统消息已推送: ${type} -> ${toUserId}`);
      }
    }

    return message;
  } catch (error) {
    console.error('[Notification] 发送系统消息失败:', error);
    throw error;
  }
}

/**
 * 发送成就解锁通知
 * @param {string} toUserId - 接收者ID
 * @param {object} achievement - 成就对象
 */
async function sendAchievementNotification(toUserId, achievement) {
  const content = `🎉 恭喜解锁成就【${achievement.name}】！获得 ${achievement.rewardPoints} 积分${achievement.rewardCoins ? ` + ${achievement.rewardCoins} 金币` : ''}`;
  const metadata = {
    achievementId: achievement.id,
    achievementCode: achievement.code,
    link: `/achievements/${achievement.id}`
  };

  return sendSystemMessage(toUserId, 'SYSTEM_ACHIEVEMENT', content, metadata);
}

/**
 * 发送作品购买通知（通知卖家）
 * @param {string} sellerId - 卖家ID
 * @param {string} buyerName - 买家姓名
 * @param {object} work - 作品对象
 * @param {number} price - 价格
 */
async function sendPurchaseNotification(sellerId, buyerName, work, price) {
  const content = price === 0
    ? `📦 你的作品《${work.title}》被 ${buyerName} 免费获取了`
    : `💰 你的作品《${work.title}》被 ${buyerName} 购买了，获得 ${price} 金币`;

  const metadata = {
    workId: work.id,
    link: `/works/${work.id}`,
    price
  };

  return sendSystemMessage(sellerId, 'SYSTEM_PURCHASE', content, metadata);
}

/**
 * 发送关注通知
 * @param {string} toUserId - 被关注者ID
 * @param {object} follower - 关注者对象
 */
async function sendFollowNotification(toUserId, follower) {
  const content = `👤 ${follower.username} 关注了你`;
  const metadata = {
    userId: follower.id,
    link: `/users/${follower.id}`
  };

  return sendSystemMessage(toUserId, 'SYSTEM_FOLLOW', content, metadata);
}

/**
 * 发送好友通知（互相关注成为好友）
 * @param {string} toUserId - 接收者ID
 * @param {object} friend - 好友对象
 */
async function sendFriendNotification(toUserId, friend) {
  const content = `🤝 你和 ${friend.username} 成为了好友`;
  const metadata = {
    userId: friend.id,
    link: `/users/${friend.id}`
  };

  return sendSystemMessage(toUserId, 'SYSTEM_FRIEND', content, metadata);
}

/**
 * 发送任务相关通知
 * @param {string} toUserId - 接收者ID
 * @param {string} content - 通知内容
 * @param {object} metadata - 额外信息
 */
async function sendTaskNotification(toUserId, content, metadata = {}) {
  return sendSystemMessage(toUserId, 'SYSTEM_TASK', content, metadata);
}

/**
 * 发送评论通知
 * @param {string} toUserId - 接收者ID（日记作者）
 * @param {object} commenter - 评论者对象
 * @param {object} diary - 日记对象
 */
async function sendCommentNotification(toUserId, commenter, diary) {
  // 不给自己发通知
  if (toUserId === commenter.id) return null;

  const content = `💬 ${commenter.username} 评论了你的日记《${diary.title}》`;
  const metadata = {
    diaryId: diary.id,
    commenterId: commenter.id,
    link: `/diary/${diary.id}`
  };

  return sendSystemMessage(toUserId, 'SYSTEM_COMMENT', content, metadata);
}

/**
 * 批量发送系统消息
 * @param {string[]} userIds - 用户ID数组
 * @param {string} type - 消息类型
 * @param {string} content - 消息内容
 * @param {object} metadata - 额外信息
 * @returns {Promise<object[]>} 创建的消息数组
 */
async function sendBulkSystemMessages(userIds, type, content, metadata = {}) {
  const promises = userIds.map(userId =>
    sendSystemMessage(userId, type, content, metadata).catch(err => {
      console.error(`[Notification] 批量发送失败 (${userId}):`, err.message);
      return null;
    })
  );

  const results = await Promise.all(promises);
  return results.filter(r => r !== null);
}

module.exports = {
  sendSystemMessage,
  sendAchievementNotification,
  sendPurchaseNotification,
  sendFollowNotification,
  sendFriendNotification,
  sendTaskNotification,
  sendCommentNotification,
  sendBulkSystemMessages
};
