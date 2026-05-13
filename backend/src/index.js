/**
 * 后端主入口文件
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// 使用 Prisma 单例
const prisma = require('./lib/prisma');

// 导入服务
const { initAPNs, sendMessagePush } = require('./services/apnsService');
const echoBotService = require('./services/echoBotService');

// 导入路由
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const postRoutes = require('./routes/post');
const diaryRoutes = require('./routes/diary');
const homeworkRoutes = require('./routes/homework');
const noteRoutes = require('./routes/note');
const readingNoteRoutes = require('./routes/readingNote');
const bookRoutes = require('./routes/book');
const musicRoutes = require('./routes/music');
const movieRoutes = require('./routes/movie');
const htmlWorkRoutes = require('./routes/htmlWork');
const taskRoutes = require('./routes/task');
const tagRoutes = require('./routes/tag');
const calendarRoutes = require('./routes/calendar');
const statsRoutes = require('./routes/stats');
const campusRoutes = require('./routes/campus');
const classRoutes = require('./routes/class');
const recordRoutes = require('./routes/record');
const searchRoutes = require('./routes/search');
const adminRoutes = require('./routes/admin');
const boardRoutes = require('./routes/board');
const pointRoutes = require('./routes/pointFull');
const gameRoutes = require('./routes/game');
const gameAdminRoutes = require('./routes/admin/gameAdmin');
const learningRoutes = require('./routes/learning');
const challengeRoutes = require('./routes/challenge');
const achievementRoutes = require('./routes/achievements');
const followsRoutes = require('./routes/follows');
const messageRoutes = require('./routes/message');
const rewardRoutes = require('./routes/reward');
const questionRoutes = require('./routes/question');
const walletRoutes = require('./routes/wallet');
const payRoutes = require('./routes/pay');
const ruleRoutes = require('./routes/rules');
const submissionsRoutes = require('./routes/submissions');
const galleryRoutes = require('./routes/gallery');
const poetryWorkRoutes = require('./routes/poetryWork');
const categoryRoutes = require('./routes/category');
const creativeWorkRoutes = require('./routes/creativeWork');
const textbookRoutes = require('./routes/textbook');
const dictRoutes = require('./routes/dict');
const textbookNoteRoutes = require('./routes/textbookNote');
const aiConfigRoutes = require('./routes/aiConfig');
const aiPromptRoutes = require('./routes/aiPrompt');
const aiAnalysisRoutes = require('./routes/aiAnalysis');
const textbookChatRoutes = require('./routes/textbookChat');
const syncRoutes = require('./routes/sync');
const parentRoutes = require('./routes/parent');
const twoFactorRoutes = require('./routes/twoFactor');
const publicRoutes = require('./routes/public');
const diaryGameRoutes = require('./routes/diaryGame');
const diaryTemplateRoutes = require('./routes/diaryTemplate');
const photoRoutes = require('./routes/photo');
const writingEvaluationRoutes = require('./routes/writingEvaluation');
const fontRoutes = require('./routes/font');
const calligraphyRoutes = require('./routes/calligraphy');
const analyticsRoutes = require('./routes/analytics');
const paymentPlanRoutes = require('./routes/paymentPlan');
const feedbackRoutes = require('./routes/feedback');
const imessageRoutes = require('./routes/imessage');
const feedRoutes = require('./routes/feed');
const botRoutes = require('./routes/bot');
const chatMessageRoutes = require('./routes/chatMessage');
const scanRoutes = require('./routes/scan');
const pinyinRoutes = require('./routes/pinyin');
const typingRoutes = require('./routes/typing');
const inviteCodeRoutes = require('./routes/inviteCode');
const friendRequestRoutes = require('./routes/friendRequest');
const reviewRoutes = require('./routes/review');
const creditRoutes = require('./routes/credit');
const conversationRoutes = require('./routes/conversation');
const pushTokenRoutes = require('./routes/pushTokens');
const imgProxyRoutes = require('./routes/imgProxy');
const teacherRoutes = require('./routes/teacher');
const delegatedReviewRoutes = require('./routes/delegatedReviews');
const rosterRoutes = require('./routes/roster');

// 导入服务
const challengeService = require('./services/challengeService');
const diaryAchievementService = require('./services/diaryAchievementService');
const { initAchievements: initTaskAchievements } = require('../prisma/seed_achievements');
const { startQueueConsumer: startEmbeddingQueue } = require('./services/embeddingQueueService');
const { startAutomationTaskConsumer } = require('./services/aiAutomationService');

// 初始化成就事件监听
const achievementService = require('./services/achievementService');

// 导入中间件
const { errorHandler } = require('./middleware/errorHandler');
const upload = require('./middleware/upload');
const { authenticate } = require('./middleware/auth');

// 导入定时任务库
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
// CORS配置：允许所有来源访问
app.use(cors({
  origin: true, // 动态允许来源以支持 credentials
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
}));

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务（上传的文件）
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// PDF静态文件服务（外部磁盘）
const pdfStorageDir = process.env.PDF_STORAGE_DIR || '/Volumes/2TB-BC01/pinghu/books-ai';
app.use('/pdfs', express.static(pdfStorageDir));

// 照片静态文件服务（外部磁盘）
const photoStorageDir = process.env.PHOTO_STORAGE_DIR || '/Volumes/2TB-BC01/pinghu/photos';
app.use('/photos-static', express.static(photoStorageDir));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 通用文件上传接口（支持图片和音频）
app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' });
    }

    // 根据文件类型返回相对路径
    let folder = 'images';
    if (req.file.fieldname === 'avatar') {
      folder = 'avatars';
    } else if (req.file.mimetype.startsWith('audio/')) {
      folder = 'audios';
    }

    const fileUrl = `/uploads/${folder}/${req.file.filename}`;
    res.json({ url: fileUrl });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/diaries', diaryRoutes);
app.use('/api/diary-templates', diaryTemplateRoutes);
app.use('/api/homeworks', homeworkRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/reading-notes', readingNoteRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/movies', movieRoutes);
app.use('/api/html-works', htmlWorkRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/campuses', campusRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/admin/games', gameAdminRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/follows', followsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reward', rewardRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/pay', payRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/poetry-works', poetryWorkRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/creative-works', creativeWorkRoutes);
app.use('/api/textbooks', textbookRoutes);
app.use('/api/dict', dictRoutes);
app.use('/api/textbook-notes', textbookNoteRoutes);
app.use('/api/ai-config', aiConfigRoutes);
app.use('/api/ai-prompts', aiPromptRoutes);
app.use('/api/ai-analysis', aiAnalysisRoutes);
app.use('/api/textbook-chat', textbookChatRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/diary-game', diaryGameRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/writing-evaluation', writingEvaluationRoutes);
app.use('/api/fonts', fontRoutes);
app.use('/api/calligraphy', calligraphyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payment-plans', paymentPlanRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/imessage', imessageRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/bot', botRoutes);
app.use('/api/chat-message', chatMessageRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/pinyin', pinyinRoutes);
app.use('/api/typing', typingRoutes);
app.use('/api/invite-codes', inviteCodeRoutes);
app.use('/api/friend-requests', friendRequestRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/push-tokens', pushTokenRoutes);
app.use('/api/img-proxy', imgProxyRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/delegated-reviews', delegatedReviewRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/backup', require('./routes/backup'));

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// 错误处理中间件
app.use(errorHandler);

// ========== Socket.io 集成 ==========

// 创建HTTP服务器
const httpServer = http.createServer(app);

// 初始化Socket.io - 支持局域网WebSocket连接
const io = new Server(httpServer, {
  cors: {
    origin: "*", // 允许所有来源
    credentials: true,
    methods: ['GET', 'POST'],
  },
  // 传输方式：优先轮询，成功后升级到WebSocket
  transports: ['polling', 'websocket'],
  // 允许跨域升级请求（WebSocket握手）
  allowEIO3: true,
  // 允许从任何来源升级连接
  allowUpgrades: true,
  // Ping超时时间
  pingTimeout: 60000,
  pingInterval: 25000,
});

// 在线用户Map: userId -> socketId
const onlineUsers = new Map();

// 打字游戏实时排行榜数据
const typingLeaderboard = new Map(); // userId -> { username, score, wpm, bestRank }
// 打字游戏在线用户
const typingOnlineUsers = new Set();

// 获取打字排行榜
function getTypingRanking() {
  const entries = Array.from(typingLeaderboard.entries());
  entries.sort((a, b) => b[1].score - a[1].score);
  return entries.map(([userId, data], index) => ({
    userId,
    username: data.username,
    score: data.score,
    wpm: data.wpm,
    rank: index + 1,
    online: true,
  }));
}

// Socket认证错误计数（防止日志刷屏）
let socketAuthErrorCount = 0;
const MAX_SOCKET_AUTH_ERRORS = 5;

// JWT认证中间件
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('认证失败：未提供token'));
    }

    // 验证JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 查询用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, avatar: true, status: true }
    });

    if (!user) {
      return next(new Error('认证失败：用户不存在'));
    }

    if (user.status !== 'ACTIVE') {
      return next(new Error('认证失败：用户未激活'));
    }

    // 将用户信息附加到socket对象
    socket.userId = user.id;
    socket.username = user.username;
    socket.userAvatar = user.avatar;

    next();
  } catch (err) {
    socketAuthErrorCount++;
    if (socketAuthErrorCount <= MAX_SOCKET_AUTH_ERRORS) {
      console.error('[Socket] 认证失败:', err.message);
      if (socketAuthErrorCount === MAX_SOCKET_AUTH_ERRORS) {
        console.warn('[Socket] 后续认证错误将不再显示');
      }
    }
    next(new Error('认证失败：' + err.message));
  }
});

// Socket连接处理
io.on('connection', (socket) => {
  console.log(`[Socket] 用户 ${socket.username}(${socket.userId}) 已连接`);

  // 用户上线
  onlineUsers.set(socket.userId, socket.id);

  // 广播用户上线事件（通知所有其他用户）
  socket.broadcast.emit('user_online', {
    userId: socket.userId,
    username: socket.username
  });

  // 监听：发送聊天消息
  socket.on('send_message', async (data) => {
    try {
      const { toUserId, content, tempId } = data;

      if (!content || !content.trim()) {
        socket.emit('message_error', { tempId, error: '消息内容不能为空' });
        return;
      }

      if (!toUserId) {
        socket.emit('message_error', { tempId, error: '接收者ID不能为空' });
        return;
      }

      // 检查是否为好友
      const friendship = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId1: socket.userId, userId2: toUserId },
            { userId1: toUserId, userId2: socket.userId }
          ]
        },
        include: { conversation: true }
      });

      if (!friendship) {
        socket.emit('message_error', {
          tempId,
          code: 'NOT_FRIEND',
          error: '只能向好友发送消息'
        });
        return;
      }

      if (!friendship.conversation) {
        socket.emit('message_error', { tempId, error: '会话不存在' });
        return;
      }

      // 存入数据库
      const message = await prisma.message.create({
        data: {
          fromUserId: socket.userId,
          toUserId,
          conversationId: friendship.conversation.id,
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
      const isUser1 = friendship.userId1 === socket.userId;
      await prisma.conversation.update({
        where: { id: friendship.conversation.id },
        data: {
          lastMessageId: message.id,
          lastMessageTime: message.createdAt,
          [isUser1 ? 'user2Unread' : 'user1Unread']: { increment: 1 }
        }
      });

      // 返回发送者确认
      socket.emit('message_sent', { tempId, message });

      // 推送给接收者（如果在线）
      const receiverSocketId = onlineUsers.get(toUserId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', message);
      } else {
        // 接收者离线，发送APNs推送
        await sendMessagePush(toUserId, message);
      }

      console.log(`[Socket] 消息发送成功: ${socket.username} -> ${toUserId}`);

      // Echo bot 自动回复改为异步触发，不阻塞当前发送确认
      if (toUserId === echoBotService.botUserId) {
        Promise.resolve()
          .then(async () => {
            const botReply = await echoBotService.handleMessage(message);
            if (!botReply) return;
            const senderSocketId = onlineUsers.get(message.fromUserId);
            if (senderSocketId) {
              io.to(senderSocketId).emit('new_message', botReply);
            }
          })
          .catch((error) => {
            console.error('[Socket][Bot] 异步回复失败:', error);
          });
      }
    } catch (error) {
      console.error('[Socket] 发送消息失败:', error);
      socket.emit('message_error', {
        tempId: data.tempId,
        error: '发送消息失败：' + error.message
      });
    }
  });

  // 监听：标记消息已读
  socket.on('mark_read', async (data) => {
    try {
      const { messageIds } = data;

      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return;
      }

      // 批量更新消息为已读
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          toUserId: socket.userId,
          isRead: false
        },
        data: { isRead: true }
      });

      console.log(`[Socket] 用户 ${socket.username} 标记了 ${messageIds.length} 条消息为已读`);
    } catch (error) {
      console.error('[Socket] 标记已读失败:', error);
    }
  });

  // 监听：同步消息
  socket.on('sync_messages', async (data) => {
    try {
      const { lastMessageId = '0' } = data;

      const messages = await prisma.message.findMany({
        where: {
          id: { gt: lastMessageId },
          OR: [
            { fromUserId: socket.userId },
            { toUserId: socket.userId }
          ],
          deletedAt: null
        },
        include: {
          fromUser: {
            select: { id: true, username: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'asc' },
        take: 100
      });

      socket.emit('sync_result', { messages });
      console.log(`[Socket] 用户 ${socket.username} 同步了 ${messages.length} 条消息`);
    } catch (error) {
      console.error('[Socket] 同步消息失败:', error);
      socket.emit('sync_error', { error: '同步消息失败' });
    }
  });

  // 打字游戏：加入游戏
  socket.on('join_typist', (data) => {
    const { user_id, username } = data;
    const name = username || socket.username || '访客';
    const uid = user_id || socket.userId || `guest_${Math.floor(Math.random() * 10000)}`;
    
    typingLeaderboard.set(uid, { 
      username: name, 
      score: 0, 
      wpm: 0,
      bestRank: null 
    });
    typingOnlineUsers.add(uid);
    
    // 广播当前排行榜给新加入者
    const ranking = getTypingRanking();
    socket.emit('leaderboard_update', ranking);
    
    // 广播给所有人更新
    io.emit('leaderboard_update', ranking);
    
    console.log(`[Typist] 用户 ${name}(${uid}) 加入打字游戏，在线: ${typingOnlineUsers.size}`);
  });

  // 打字游戏：更新分数
  socket.on('update_score', (data) => {
    const { score, wpm } = data;
    const uid = socket.userId || 'guest';
    const name = socket.username || '访客';
    
    if (typingLeaderboard.has(uid)) {
      const player = typingLeaderboard.get(uid);
      player.score = score;
      player.wpm = wpm;
    } else {
      typingLeaderboard.set(uid, { 
        username: name, 
        score, 
        wpm,
        bestRank: null 
      });
      typingOnlineUsers.add(uid);
    }
    
    // 广播给所有人
    const ranking = getTypingRanking();
    io.emit('leaderboard_update', ranking);
  });

  // 打字游戏：重置分数
  socket.on('reset_score', () => {
    const uid = socket.userId || 'guest';
    if (typingLeaderboard.has(uid)) {
      const player = typingLeaderboard.get(uid);
      player.score = 0;
      player.wpm = 0;
    }
    const ranking = getTypingRanking();
    io.emit('leaderboard_update', ranking);
  });

  // 打字游戏：离开游戏
  socket.on('leave_typist', () => {
    const uid = socket.userId || 'guest';
    typingLeaderboard.delete(uid);
    typingOnlineUsers.delete(uid);
    const ranking = getTypingRanking();
    io.emit('leaderboard_update', ranking);
  });

  // 用户下线
  socket.on('disconnect', () => {
    console.log(`[Socket] 用户 ${socket.username}(${socket.userId}) 已断开`);
    onlineUsers.delete(socket.userId);

    // 广播用户下线事件
    socket.broadcast.emit('user_offline', {
      userId: socket.userId,
      username: socket.username
    });
  });

  // 错误处理
  socket.on('error', (error) => {
    console.error(`[Socket] 错误:`, error);
  });
});

// 定时任务：每天0点生成今日挑战
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ 开始生成今日挑战...');
  try {
    const result = await challengeService.generateTodaysChallenges();
    if (result.success) {
      console.log('✓ 今日挑战生成成功');
    } else {
      console.error('✗ 今日挑战生成失败:', result.message);
    }
  } catch (error) {
    console.error('✗ 今日挑战生成异常:', error);
  }
});

// 定时任务：每天东八区09:30检查连续天数断连（UTC 01:30）
const diaryStatsService = require('./services/diaryStatsService');
cron.schedule('30 1 * * *', async () => {
  console.log('⏰ 开始检查日记连续天数断连...');
  try {
    const allStats = await prisma.diaryStats.findMany({
      where: { currentStreak: { gt: 0 } },
      select: { userId: true }
    });
    for (const s of allStats) {
      await diaryStatsService.checkAndHandleStreakBreak(s.userId);
    }
    console.log(`✓ 连续天数检查完成，检查了 ${allStats.length} 个用户`);
  } catch (error) {
    console.error('✗ 连续天数检查异常:', error);
  }
});

// 启动信用分定时任务
const creditCron = require('./cron/creditCron');
creditCron.startCreditCron();

// 启动服务器
httpServer.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`💬 WebSocket服务已启动`);
  console.log(`📝 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ 定时任务已启动: 每天0点生成挑战`);

  // 初始化APNs推送服务
  initAPNs();

  // 初始化 Echo Bot 服务
  echoBotService.init();

  // 启动时检查今日挑战是否已生成
  challengeService.generateTodaysChallenges()
    .then(result => {
      if (result.success) {
        console.log('✓ 今日挑战已就绪');
      }
    })
    .catch(err => {
      console.error('✗ 检查今日挑战失败:', err);
    });

  // 初始化日记成就定义
  diaryAchievementService.initializeAchievements()
    .then(() => {
      console.log('✓ 日记成就定义已初始化');
    })
    .catch(err => {
      console.warn('⚠️ 日记成就初始化失败:', err.message);
    });

  // 初始化8大任务成就定义 + 成就事件监听
  initTaskAchievements()
    .then(() => {
      console.log('✓ 任务成就定义已初始化');
    })
    .catch(err => {
      console.warn('⚠️ 任务成就初始化失败:', err.message);
    });

  // 启动 Embedding 队列消费者（RAG 功能）
  // startEmbeddingQueue();
  // console.log('✓ Embedding 队列消费者已启动');

  // 启动 AI 自动化任务消费者
  // startAutomationTaskConsumer();
  // console.log('✓ AI 自动化任务消费者已启动');
});

// 导出供其他模块使用
global.io = io;
global.onlineUsers = onlineUsers;
module.exports = { app, io, onlineUsers, prisma };
