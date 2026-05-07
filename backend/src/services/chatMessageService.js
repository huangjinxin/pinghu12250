const prisma = require('../lib/prisma');
const botService = require('./botService');

// 获取或创建会话
async function getOrCreateConversation(userId, botId) {
  let conv = await prisma.botConversation.findUnique({
    where: { userId_botId: { userId, botId } },
  });
  if (!conv) {
    conv = await prisma.botConversation.create({
      data: { userId, botId },
    });
    // 发送欢迎语
    const bot = await botService.getBotById(botId);
    if (bot?.welcome) {
      await prisma.botMessage.create({
        data: {
          conversationId: conv.id, botId, userId,
          senderType: 'BOT', msgType: 'text', content: bot.welcome,
        },
      });
    }
  }
  return conv;
}

// 获取用户的所有会话列表
async function listConversations(userId) {
  return prisma.botConversation.findMany({
    where: { userId },
    include: {
      bot: { select: { id: true, name: true, avatar: true, type: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { lastMessageAt: 'desc' },
  });
}

// 获取会话消息（分页）
async function getMessages(conversationId, { cursor, limit = 30 }) {
  const where = { conversationId };
  const query = {
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  };
  if (cursor) {
    query.cursor = { id: cursor };
    query.skip = 1;
  }
  const messages = await prisma.botMessage.findMany(query);
  return messages.reverse();
}

// 发送消息并获取Bot回复
async function sendMessage(userId, botId, { msgType = 'text', content, cardData }) {
  const conv = await getOrCreateConversation(userId, botId);

  // 保存用户消息
  const userMsg = await prisma.botMessage.create({
    data: {
      conversationId: conv.id, botId, userId,
      senderType: 'USER', msgType, content, cardData,
    },
  });

  // Bot自动回复
  let botReply = null;
  if (msgType === 'text' && content) {
    const bot = await botService.getBotById(botId);
    const replyData = await botService.handleUserMessage(bot, userId, content);
    botReply = await prisma.botMessage.create({
      data: {
        conversationId: conv.id, botId, userId,
        ...replyData,
      },
    });
  }

  // 更新会话时间
  await prisma.botConversation.update({
    where: { id: conv.id },
    data: { lastMessageAt: new Date() },
  });

  return { userMsg, botReply };
}

// 标记已读
async function markRead(conversationId, userId) {
  return prisma.botConversation.updateMany({
    where: { id: conversationId, userId },
    data: { unreadCount: 0 },
  });
}

// ===== Admin 方法 =====

// 全局统计
async function adminStats() {
  const bots = await prisma.bot.findMany({ where: { isActive: true } });
  const stats = await Promise.all(bots.map(async (bot) => {
    const [convCount, msgCount, todayActive] = await Promise.all([
      prisma.botConversation.count({ where: { botId: bot.id } }),
      prisma.botMessage.count({ where: { botId: bot.id } }),
      prisma.botConversation.count({
        where: { botId: bot.id, lastMessageAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
      }),
    ]);
    return { botId: bot.id, botName: bot.name, botAvatar: bot.avatar, convCount, msgCount, todayActive };
  }));
  return stats;
}

// 某bot下所有学生会话
async function adminBotConversations(botId) {
  return prisma.botConversation.findMany({
    where: { botId },
    include: {
      user: { select: { id: true, username: true, profile: { select: { nickname: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { lastMessageAt: 'desc' },
  });
}

// 某会话完整消息
async function adminConversationMessages(conversationId) {
  return prisma.botMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
  });
}

module.exports = {
  getOrCreateConversation, listConversations,
  getMessages, sendMessage, markRead,
  adminStats, adminBotConversations, adminConversationMessages,
};
