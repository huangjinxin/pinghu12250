const prisma = require('../lib/prisma');

// Bot CRUD
async function listBots(onlyActive = false) {
  const where = onlyActive ? { isActive: true } : {};
  return prisma.bot.findMany({ where, orderBy: { sortOrder: 'asc' } });
}

async function getBotById(id) {
  return prisma.bot.findUnique({ where: { id } });
}

async function createBot(data) {
  return prisma.bot.create({ data });
}

async function updateBot(id, data) {
  return prisma.bot.update({ where: { id }, data });
}

async function deleteBot(id) {
  return prisma.bot.delete({ where: { id } });
}

// 关键词匹配引擎
function matchKeyword(bot, text) {
  const keywords = Array.isArray(bot.keywords) ? bot.keywords : [];
  const input = text.trim().toLowerCase();

  // 精确匹配优先
  for (const kw of keywords) {
    if (input === kw.keyword.toLowerCase()) return kw;
  }
  // 包含匹配
  for (const kw of keywords) {
    if (input.includes(kw.keyword.toLowerCase())) return kw;
  }
  return null;
}

// 处理用户消息，返回Bot自动回复
async function handleUserMessage(bot, userId, text) {
  const matched = matchKeyword(bot, text);
  if (matched) {
    return {
      senderType: 'BOT',
      msgType: matched.cardType || 'text',
      content: matched.reply || null,
      cardData: matched.cardData || null,
    };
  }
  // 无匹配时的默认回复
  return {
    senderType: 'BOT',
    msgType: 'text',
    content: `我还不太理解"${text}"，试试发送关键词吧~`,
  };
}

module.exports = {
  listBots, getBotById, createBot, updateBot, deleteBot,
  matchKeyword, handleUserMessage,
};
