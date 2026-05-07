/**
 * 勤学好问 AI Bot 自动回复服务
 * 监听发给 echo-bot 的消息，调用全局AI配置自动回复
 * 同时将聊天记录写入 ImessageChatLog（source: web-bot）
 */

const prisma = require('../lib/prisma');
const aiService = require('./aiService');
const bcrypt = require('bcryptjs');

const BOT_USERNAME = 'echo-bot';
const BOT_NICKNAME = '勤学好问';
const BOT_BIO = 'AI学习助手，有问必答';
const BOT_EMAIL = 'echo-bot@test.com';
const BOT_DEFAULT_PASSWORD = '123456';
const BOT_PROMPT_KEY = 'echo_bot_system';

const BOT_SYSTEM_PROMPT = `你是"勤学好问"，一个友善、耐心的少儿学习助手。

请遵循以下原则：
1. 用简单易懂的语言回答，适合小学生理解
2. 鼓励孩子思考和探索，不要直接给出完整答案
3. 回答要简洁，一般不超过200字
4. 如果涉及生僻字词，需要注音和解释
5. 保持积极正面的态度，多鼓励多表扬
6. 如果问题不适合少儿，礼貌地引导到合适的话题`;

class EchoBotService {
  constructor() {
    this.botUserId = null;
    this.botUsername = null;
  }

  async getSystemPrompt() {
    const prompt = await prisma.aiPrompt.findUnique({ where: { key: BOT_PROMPT_KEY } });
    return prompt?.content || BOT_SYSTEM_PROMPT;
  }

  async ensureBotUser() {
    const password = await bcrypt.hash(BOT_DEFAULT_PASSWORD, 10);
    const bot = await prisma.user.upsert({
      where: { username: BOT_USERNAME },
      update: {
        autoAcceptFriend: true,
        avatar: '🤖',
        status: 'ACTIVE',
        needsReview: false,
      },
      create: {
        id: require('uuid').v4(),
        username: BOT_USERNAME,
        email: BOT_EMAIL,
        password,
        role: 'STUDENT',
        status: 'ACTIVE',
        autoAcceptFriend: true,
        avatar: '🤖',
        needsReview: false,
        updatedAt: new Date(),
        profile: {
          create: {
            nickname: BOT_NICKNAME,
            bio: BOT_BIO,
          },
        },
      },
    });

    await prisma.profile.updateMany({
      where: { userId: bot.id },
      data: { nickname: BOT_NICKNAME, bio: BOT_BIO },
    });

    return bot;
  }

  async ensureFriendshipWithUser(userId) {
    if (!this.botUserId || userId === this.botUserId) return null;
    const [userId1, userId2] = [userId, this.botUserId].sort();
    const existing = await prisma.friendship.findUnique({
      where: { userId1_userId2: { userId1, userId2 } },
      include: { conversation: true },
    });
    if (existing) {
      if (existing.conversation) return existing;
      const conversation = await prisma.conversation.create({
        data: { friendshipId: existing.id, user1Unread: 0, user2Unread: 0 },
      });
      return { ...existing, conversation };
    }

    const friendship = await prisma.friendship.create({
      data: { userId1, userId2 },
      include: { conversation: true },
    });
    const conversation = await prisma.conversation.create({
      data: { friendshipId: friendship.id, user1Unread: 0, user2Unread: 0 },
    });
    return { ...friendship, conversation };
  }

  async init() {
    try {
      const bot = await this.ensureBotUser();
      if (bot) {
        this.botUserId = bot.id;
        this.botUsername = bot.username;
        console.log('✅ 勤学好问 Bot 服务已启动, ID:', this.botUserId);
      }
    } catch (err) {
      console.warn('⚠️ 勤学好问 Bot 初始化失败:', err.message);
    }
  }

  validateInput(content) {
    if (!content || typeof content !== 'string') {
      return { valid: false, reason: '没有文字内容，请重新输入哦~' };
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return { valid: false, reason: '没有文字内容，请重新输入哦~' };
    }

    if (/^[\s\p{P}]+$/u.test(trimmed)) {
      return { valid: false, reason: '没有文字内容，请重新输入哦~' };
    }

    const chineseChars = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
    const hasChinese = chineseChars > 0;

    const englishOnly = /^[a-zA-Z\s]+$/.test(trimmed);
    if (englishOnly && trimmed.replace(/\s/g, '').length < 4) {
      return { valid: false, reason: '请用中文提问，让我更好地理解你的问题~' };
    }

    if (!hasChinese) {
      return { valid: false, reason: '请用中文提问，我会用中文回答你~' };
    }

    if (chineseChars < 8) {
      return { valid: false, reason: '请输入至少8个汉字，这样我能更好地帮助你~' };
    }

    if (/(.)\1{4,}/u.test(trimmed)) {
      return { valid: false, reason: '检测到重复字符，请换个方式提问~' };
    }

    return { valid: true, reason: '' };
  }

  async createRejectMessage(reason, message, friendship) {
    try {
      const reply = await prisma.message.create({
        data: {
          conversationId: friendship.conversation.id,
          fromUserId: this.botUserId,
          toUserId: message.fromUserId,
          messageType: 'CHAT',
          content: reason,
          isRead: false
        },
        include: {
          fromUser: {
            select: { id: true, username: true, avatar: true }
          }
        }
      });

      const isUser1 = friendship.userId1 === this.botUserId;
      await prisma.conversation.update({
        where: { id: friendship.conversation.id },
        data: {
          lastMessageId: reply.id,
          lastMessageTime: reply.createdAt,
          [isUser1 ? 'user2Unread' : 'user1Unread']: { increment: 1 }
        }
      });

      return reply;
    } catch (error) {
      console.error('[Bot] 拒绝消息写入失败:', error.message);
      return null;
    }
  }

  /**
   * 处理收到的消息，AI自动回复
   * @param {object} message - 消息对象（含 fromUserId, toUserId, content, conversationId）
   * @returns {object|null} 回复消息对象（供调用方推送socket），失败返回null
   */
  async handleMessage(message) {
    if (!this.botUserId) return null;
    if (message.toUserId !== this.botUserId) return null;

    const friendship = await this.ensureFriendshipWithUser(message.fromUserId);
    if (!friendship?.conversation) return null;

    const userContent = message.content;
    const chatId = `web-bot-${message.fromUserId}`;

    const validation = this.validateInput(userContent);
    if (!validation.valid) {
      console.log(`[Bot] 拦截无效输入: ${validation.reason}`);
      return this.createRejectMessage(validation.reason, message, friendship);
    }

    let senderName = message.fromUser?.username || 'unknown';
    try {
      if (!message.fromUser) {
        const sender = await prisma.user.findUnique({
          where: { id: message.fromUserId },
          select: { username: true, profile: { select: { nickname: true } } }
        });
        senderName = sender?.profile?.nickname || sender?.username || 'unknown';
      } else {
        senderName = message.fromUser.profile?.nickname || message.fromUser.username;
      }
    } catch (e) {}

    try {
      await prisma.imessageChatLog.create({
        data: {
          chatId,
          sender: message.fromUserId,
          senderName,
          role: 'user',
          content: userContent,
          source: 'web-bot'
        }
      });
    } catch (e) {
      console.error('[Bot] 写入用户消息日志失败:', e.message);
    }

    let replyContent = '抱歉，我暂时无法回答，请稍后再试~';
    let modelName = null;

    try {
      const apiConfig = await aiService.getDefaultConfig('llm');
      if (apiConfig) {
        const systemPrompt = await this.getSystemPrompt();
        const result = await aiService.callApi(apiConfig, systemPrompt, userContent, null, 30000);
        if (result.success && result.content) {
          replyContent = result.content;
          modelName = apiConfig.model || apiConfig.llmModel || null;
        }
      } else {
        console.warn('[Bot] 未配置全局AI，使用默认回复');
      }
    } catch (error) {
      console.error('[Bot] AI调用失败:', error.message);
    }

    try {
      const reply = await prisma.message.create({
        data: {
          conversationId: friendship.conversation.id,
          fromUserId: this.botUserId,
          toUserId: message.fromUserId,
          messageType: 'CHAT',
          content: replyContent,
          isRead: false
        },
        include: {
          fromUser: {
            select: { id: true, username: true, avatar: true }
          }
        }
      });

      const isUser1 = friendship.userId1 === this.botUserId;
      await prisma.conversation.update({
        where: { id: friendship.conversation.id },
        data: {
          lastMessageId: reply.id,
          lastMessageTime: reply.createdAt,
          [isUser1 ? 'user2Unread' : 'user1Unread']: { increment: 1 }
        }
      });

      try {
        await prisma.imessageChatLog.create({
          data: {
            chatId,
            sender: message.fromUserId,
            senderName,
            role: 'assistant',
            content: replyContent,
            modelName,
            source: 'web-bot'
          }
        });
      } catch (e) {
        console.error('[Bot] 写入AI回复日志失败:', e.message);
      }

      console.log(`🤖 勤学好问回复: ${replyContent.substring(0, 50)}...`);
      return reply;
    } catch (error) {
      console.error('[Bot] 回复消息写入失败:', error.message);
      return null;
    }
  }
}

module.exports = new EchoBotService();
