/**
 * AI 分析路由
 * 权限：已登录（分析）/ TEACHER / ADMIN（日志）
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const aiService = require('../services/aiService');

// 存储活跃的 SSE 连接（用于中断）
const activeConnections = new Map();

// 执行 AI 分析（普通模式）
router.post('/analyze', authenticate, async (req, res) => {
  try {
    const {
      textbookId,
      sessionId,
      currentPage,
      pageRange,
      pdfTextContent,
      promptId,
      textbookPromptId,
      subject
    } = req.body;

    if (!textbookId || !sessionId || !pdfTextContent) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：textbookId, sessionId, pdfTextContent'
      });
    }

    const result = await aiService.analyze(
      req.user.id,
      textbookId,
      sessionId,
      {
        pdfTextContent,
        currentPage: currentPage || 1,
        pageRange: pageRange || 1,
        promptId,
        textbookPromptId,
        subject
      }
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('AI 分析失败:', error);
    res.status(500).json({ success: false, error: 'AI 分析失败' });
  }
});

// AI 聊天（流式输出 - SSE）
router.get('/chat/stream', authenticate, async (req, res) => {
  const {
    textbookId,
    sessionId,
    message,
    context,
    subject
  } = req.query;

  if (!textbookId || !sessionId || !message) {
    return res.status(400).json({
      success: false,
      error: '缺少必要参数：textbookId, sessionId, message'
    });
  }

  // 生成连接 ID
  const connectionId = `${req.user.id}-${sessionId}-${Date.now()}`;

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Connection-Id', connectionId);
  res.flushHeaders();

  // 创建 AbortController
  const controller = new AbortController();
  activeConnections.set(connectionId, controller);

  // 发送 SSE 事件
  const sendEvent = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // 发送开始事件
  sendEvent('start', { connectionId });

  try {
    const result = await aiService.chat(
      req.user.id,
      textbookId,
      sessionId,
      decodeURIComponent(message),
      {
        subject: subject || 'CHINESE',
        context: context ? decodeURIComponent(context) : ''
      },
      // 流式回调
      (chunk) => {
        sendEvent('chunk', { content: chunk });
      },
      controller.signal
    );

    if (result.success) {
      sendEvent('done', {
        content: result.content,
        responseTime: result.responseTime
      });
    } else if (result.aborted) {
      sendEvent('aborted', { message: '用户中断' });
    } else {
      sendEvent('error', { message: result.error || 'AI 请求失败' });
    }
  } catch (error) {
    console.error('AI 聊天失败:', error);
    sendEvent('error', { message: error.message });
  } finally {
    activeConnections.delete(connectionId);
    res.end();
  }
});

// AI 聊天（普通模式 - POST）
router.post('/chat', authenticate, async (req, res) => {
  try {
    const {
      textbookId,
      sessionId,
      message,
      context,
      subject
    } = req.body;

    if (!textbookId || !sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：textbookId, sessionId, message'
      });
    }

    const result = await aiService.chat(
      req.user.id,
      textbookId,
      sessionId,
      message,
      {
        subject: subject || 'CHINESE',
        context: context || ''
      }
    );

    if (result.success) {
      res.json({
        success: true,
        data: {
          content: result.content,
          responseTime: result.responseTime
        }
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('AI 聊天失败:', error);
    res.status(500).json({ success: false, error: 'AI 聊天失败' });
  }
});

// 中断 AI 请求
router.post('/abort/:connectionId', authenticate, (req, res) => {
  const { connectionId } = req.params;

  const controller = activeConnections.get(connectionId);
  if (controller) {
    controller.abort();
    activeConnections.delete(connectionId);
    res.json({ success: true, message: '请求已中断' });
  } else {
    res.status(404).json({ success: false, error: '连接不存在或已结束' });
  }
});

// 获取分析日志列表（管理员）
router.get('/logs', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { page = 1, limit = 20, textbookId, userId, status } = req.query;

    const where = {};
    if (textbookId) where.textbookId = textbookId;
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.aiAnalysisLog.findMany({
        where,
        include: {
          apiConfig: {
            select: { id: true, name: true }
          },
          prompt: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.aiAnalysisLog.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取分析日志失败:', error);
    res.status(500).json({ success: false, error: '获取日志失败' });
  }
});

// 获取单条日志详情
router.get('/logs/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.aiAnalysisLog.findUnique({
      where: { id },
      include: {
        apiConfig: {
          select: { id: true, name: true, baseUrl: true, model: true }
        },
        prompt: {
          select: { id: true, name: true, promptText: true }
        }
      }
    });

    if (!log) {
      return res.status(404).json({ success: false, error: '日志不存在' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    console.error('获取日志详情失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

module.exports = router;
