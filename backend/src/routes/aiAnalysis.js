/**
 * AI 分析路由
 * 权限：已登录（分析）/ TEACHER / ADMIN（日志）
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const aiService = require('../services/aiService');
const {
  buildSingleDiaryPrompt,
  buildBatchDiaryPrompt,
  parseScoreResponse
} = require('../services/diaryScoreService');

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

// AI 聊天（流式输出 - POST 支持图片）
router.post('/chat/stream', authenticate, async (req, res) => {
  const {
    textbookId,
    sessionId,
    message,
    context,
    subject,
    imageBase64  // 图片的 base64 字符串
  } = req.body;

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
      message,
      {
        subject: subject || 'CHINESE',
        context: context || '',
        imageBase64: imageBase64 || null  // 传递图片数据
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

// AI 聊天（普通模式 - POST，支持图片）
router.post('/chat', authenticate, async (req, res) => {
  try {
    const {
      textbookId,
      sessionId,
      message,
      context,
      subject,
      imageBase64  // 图片的 base64 字符串
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
        context: context || '',
        imageBase64: imageBase64 || null  // 传递图片数据
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

// 日记 AI 分析（单条）- 带评分
router.post('/diary/analyze', authenticate, async (req, res) => {
  try {
    const { diaryId, content, title, mood, weather, createdAt } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: '缺少日记内容'
      });
    }

    // 获取 API 配置
    const apiConfig = await aiService.getDefaultConfig();
    if (!apiConfig) {
      return res.status(400).json({
        success: false,
        error: '未配置 AI API，请联系管理员'
      });
    }

    // 获取该日记的上次分析（如果有）
    let previousAnalysis = null;
    if (diaryId) {
      const lastAnalysis = await prisma.diaryAnalysis.findFirst({
        where: {
          diaryId: diaryId,
          userId: req.user.id,
          isBatch: false
        },
        orderBy: { createdAt: 'desc' }
      });
      if (lastAnalysis) {
        previousAnalysis = {
          totalScore: lastAnalysis.totalScore,
          grade: lastAnalysis.grade,
          highlights: lastAnalysis.highlights || [],
          improvements: lastAnalysis.improvements || []
        };
      }
    }

    // 构建带评分的提示词
    const diary = { title, content, mood, weather, createdAt };
    const prompt = buildSingleDiaryPrompt(diary, previousAnalysis);

    const result = await aiService.callApi(apiConfig, '', prompt);

    if (result.success) {
      // 解析评分结果
      const scoreData = parseScoreResponse(result.content);

      res.json({
        success: true,
        data: {
          // 评分数据
          totalScore: scoreData.totalScore,
          grade: scoreData.grade,
          scoreDetails: scoreData.scoreDetails,
          highlights: scoreData.highlights,
          improvements: scoreData.improvements,
          encouragement: scoreData.encouragement,
          nextGoal: scoreData.nextGoal,
          // 原始分析文本（用于 markdown 展示）
          analysis: result.content,
          // 元数据
          modelName: apiConfig.model || apiConfig.name || 'unknown',
          tokensUsed: result.tokensUsed,
          responseTime: result.responseTime,
          // 如果有上次分析，返回对比信息
          previousScore: previousAnalysis?.totalScore || null,
          previousGrade: previousAnalysis?.grade || null
        }
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('日记 AI 分析失败:', error);
    res.status(500).json({ success: false, error: '分析失败' });
  }
});

// 日记 AI 分析（批量 - 本周/上周）- 带评分和人物画像
router.post('/diary/analyze-batch', authenticate, async (req, res) => {
  try {
    const { diaries, period } = req.body; // period: 'this_week' | 'last_week'

    if (!diaries || !Array.isArray(diaries) || diaries.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有日记可分析'
      });
    }

    if (diaries.length > 7) {
      return res.status(400).json({
        success: false,
        error: '最多只能分析7天的日记'
      });
    }

    // 获取 API 配置
    const apiConfig = await aiService.getDefaultConfig();
    if (!apiConfig) {
      return res.status(400).json({
        success: false,
        error: '未配置 AI API，请联系管理员'
      });
    }

    const periodText = period === 'last_week' ? '上周' : '本周';

    // 获取上次批量分析（如果有）
    const lastBatchAnalysis = await prisma.diaryAnalysis.findFirst({
      where: {
        userId: req.user.id,
        isBatch: true
      },
      orderBy: { createdAt: 'desc' }
    });

    let previousAnalysis = null;
    if (lastBatchAnalysis) {
      previousAnalysis = {
        totalScore: lastBatchAnalysis.totalScore,
        grade: lastBatchAnalysis.grade,
        authorProfile: lastBatchAnalysis.authorProfile,
        charactersProfile: lastBatchAnalysis.charactersProfile
      };
    }

    // 构建带评分的提示词
    const prompt = buildBatchDiaryPrompt(diaries, periodText, previousAnalysis);

    const result = await aiService.callApi(apiConfig, '', prompt);

    if (result.success) {
      // 解析评分结果
      const scoreData = parseScoreResponse(result.content);

      res.json({
        success: true,
        data: {
          // 评分数据
          totalScore: scoreData.totalScore,
          grade: scoreData.grade,
          summary: scoreData.summary,
          emotionTrend: scoreData.emotionTrend,
          writingProgress: scoreData.writingProgress,
          highlights: scoreData.highlights,
          improvements: scoreData.improvements,
          nextGoal: scoreData.nextGoal,
          // 人物画像
          authorProfile: scoreData.authorProfile,
          charactersProfile: scoreData.charactersProfile,
          socialStyle: scoreData.socialStyle,
          funSummary: scoreData.funSummary,
          // 周心理摘要
          psychologySummary: scoreData.psychologySummary,
          // 原始分析文本
          analysis: result.content,
          // 元数据
          modelName: apiConfig.model || apiConfig.name || 'unknown',
          period: periodText,
          diaryCount: diaries.length,
          tokensUsed: result.tokensUsed,
          responseTime: result.responseTime
        }
      });
    } else {
      res.status(400).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('日记批量 AI 分析失败:', error);
    res.status(500).json({ success: false, error: '分析失败' });
  }
});

// ========== 日记分析记录 CRUD ==========

// 获取所有用户公开的分析记录（作品广场用）
router.get('/diary/public', async (req, res) => {
  try {
    const { page = 1, limit = 12, isBatch, search, author } = req.query;

    const where = {};
    if (isBatch !== undefined && isBatch !== '') {
      where.isBatch = isBatch === 'true';
    }
    if (author) {
      where.userId = author;
    }

    const [records, total, authors] = await Promise.all([
      prisma.diaryAnalysis.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: {
                select: {
                  nickname: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.diaryAnalysis.count({ where }),
      // 获取有分析记录的用户列表
      prisma.diaryAnalysis.findMany({
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              username: true,
              profile: {
                select: { nickname: true }
              }
            }
          }
        },
        distinct: ['userId']
      })
    ]);

    // 处理作者列表去重
    const authorList = authors.map(a => ({
      id: a.user.id,
      name: a.user.profile?.nickname || a.user.username
    }));

    res.json({
      success: true,
      data: {
        records,
        authors: authorList,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取公开分析记录失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 获取公开分析记录详情
router.get('/diary/public/:id', async (req, res) => {
  try {
    const record = await prisma.diaryAnalysis.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: {
              select: {
                nickname: true
              }
            }
          }
        }
      }
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('获取分析记录详情失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 保存分析记录
router.post('/diary/save', authenticate, async (req, res) => {
  try {
    const {
      isBatch, period, diaryId, diaryIds, diaryCount, diarySnapshot, analysis,
      modelName, tokensUsed, responseTime,
      // 评分字段
      totalScore, grade, scoreDetails, highlights, improvements, nextGoal,
      // 人物画像字段（批量分析）
      authorProfile, charactersProfile, socialStyle, funSummary,
      // 周心理摘要（批量分析）
      psychologySummary
    } = req.body;

    const record = await prisma.diaryAnalysis.create({
      data: {
        userId: req.user.id,
        isBatch: isBatch || false,
        period: period || null,
        diaryId: diaryId || null,
        diaryIds: diaryIds || [],
        diaryCount: diaryCount || 1,
        diarySnapshot: diarySnapshot,
        analysis: analysis,
        modelName: modelName || null,
        tokensUsed: tokensUsed || null,
        responseTime: responseTime || null,
        // 评分字段
        totalScore: totalScore || null,
        grade: grade || null,
        scoreDetails: scoreDetails || null,
        highlights: highlights || [],
        improvements: improvements || [],
        nextGoal: nextGoal || null,
        // 人物画像字段
        authorProfile: authorProfile || null,
        charactersProfile: charactersProfile || null,
        socialStyle: socialStyle || null,
        funSummary: funSummary || null,
        // 周心理摘要
        psychologySummary: psychologySummary || null,
      }
    });

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('保存分析记录失败:', error);
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

// 获取分析记录列表（支持按日记聚合）
router.get('/diary/history', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, isBatch, aggregateByDiary } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // 如果请求按日记聚合（仅对单条分析有效）
    if (aggregateByDiary === 'true') {
      // 获取所有单条分析，按 diaryId 分组，取最新的
      const [singleAnalyses, batchAnalyses] = await Promise.all([
        // 单条分析：按 diaryId 聚合
        prisma.$queryRaw`
          SELECT DISTINCT ON ("diaryId") *
          FROM "DiaryAnalysis"
          WHERE "userId" = ${req.user.id}
            AND "isBatch" = false
            AND "diaryId" IS NOT NULL
          ORDER BY "diaryId", "createdAt" DESC
        `,
        // 批量分析：独立返回
        prisma.diaryAnalysis.findMany({
          where: {
            userId: req.user.id,
            isBatch: true
          },
          orderBy: { createdAt: 'desc' }
        })
      ]);

      // 为每个单条分析添加版本计数
      const singleWithVersions = await Promise.all(
        singleAnalyses.map(async (record) => {
          const versionCount = await prisma.diaryAnalysis.count({
            where: {
              userId: req.user.id,
              diaryId: record.diaryId,
              isBatch: false
            }
          });
          return { ...record, versionCount };
        })
      );

      // 合并并排序
      const allRecords = [...singleWithVersions, ...batchAnalyses]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      // 分页
      const total = allRecords.length;
      const paginatedRecords = allRecords.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      return res.json({
        success: true,
        data: {
          records: paginatedRecords,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    }

    // 原有逻辑：不聚合
    const where = { userId: req.user.id };
    if (isBatch !== undefined && isBatch !== '') {
      where.isBatch = isBatch === 'true';
    }

    const [records, total] = await Promise.all([
      prisma.diaryAnalysis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum
      }),
      prisma.diaryAnalysis.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('获取分析记录失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 获取某日记的所有分析版本
router.get('/diary/history/versions/:diaryId', authenticate, async (req, res) => {
  try {
    const { diaryId } = req.params;

    const versions = await prisma.diaryAnalysis.findMany({
      where: {
        userId: req.user.id,
        diaryId: diaryId,
        isBatch: false
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        totalScore: true,
        grade: true,
        modelName: true,
        responseTime: true
      }
    });

    res.json({
      success: true,
      data: versions.map((v, index) => ({
        ...v,
        versionNumber: versions.length - index // 最新的是最大版本号
      }))
    });
  } catch (error) {
    console.error('获取分析版本列表失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 获取单条分析记录
router.get('/diary/history/:id', authenticate, async (req, res) => {
  try {
    const record = await prisma.diaryAnalysis.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('获取分析记录详情失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 删除分析记录
router.delete('/diary/history/:id', authenticate, async (req, res) => {
  try {
    const record = await prisma.diaryAnalysis.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    await prisma.diaryAnalysis.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除分析记录失败:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

// ========== 日记分析提示词 API ==========

// 获取用户日记提示词（合并默认提示词）
router.get('/diary/prompts', authenticate, async (req, res) => {
  try {
    // 获取用户自定义提示词
    const userPrompt = await prisma.userDiaryPrompt.findUnique({
      where: { userId: req.user.id }
    });

    // 获取系统默认提示词
    const defaultPrompt = await prisma.diaryDefaultPrompt.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    // 内置默认提示词
    const builtinSinglePrompt = `你是一位专业的儿童心理分析师和写作导师。请分析以下小学生的日记，从以下几个维度进行点评：

1. **情感状态**：分析日记中表达的情绪和心理状态
2. **写作技巧**：评价语言表达、叙事结构、用词准确性
3. **内容丰富度**：评价细节描写、事件完整性
4. **亮点发现**：找出日记中的精彩之处
5. **成长建议**：给出具体可行的改进建议

请用鼓励和肯定的语气，适合小学生阅读。回复请使用 markdown 格式。`;

    const builtinBatchPrompt = `你是一位专业的儿童心理分析师和写作导师。请综合分析以下小学生这一周的日记集合，从以下几个维度进行总结和点评：

1. **情绪变化轨迹**：分析这一周情绪的变化趋势，找出情绪高点和低点
2. **主题与关注点**：总结孩子这周主要关注的事物和话题
3. **写作进步**：对比各篇日记，分析写作能力的变化
4. **成长亮点**：找出这周值得表扬的成长表现
5. **综合建议**：给出下周的学习和生活建议

请用鼓励和肯定的语气，适合家长和孩子一起阅读。回复请使用 markdown 格式。`;

    res.json({
      success: true,
      data: {
        // 用户自定义提示词
        userPrompt: {
          singlePrompt: userPrompt?.singlePrompt || null,
          batchPrompt: userPrompt?.batchPrompt || null
        },
        // 系统默认提示词（管理员设置 > 内置默认）
        defaultPrompt: {
          singlePrompt: defaultPrompt?.singlePrompt || builtinSinglePrompt,
          batchPrompt: defaultPrompt?.batchPrompt || builtinBatchPrompt
        },
        // 实际生效的提示词（用户 > 默认）
        effectivePrompt: {
          singlePrompt: userPrompt?.singlePrompt || defaultPrompt?.singlePrompt || builtinSinglePrompt,
          batchPrompt: userPrompt?.batchPrompt || defaultPrompt?.batchPrompt || builtinBatchPrompt
        }
      }
    });
  } catch (error) {
    console.error('获取提示词失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 保存用户日记提示词
router.post('/diary/prompts', authenticate, async (req, res) => {
  try {
    const { singlePrompt, batchPrompt } = req.body;

    const prompt = await prisma.userDiaryPrompt.upsert({
      where: { userId: req.user.id },
      create: {
        userId: req.user.id,
        singlePrompt: singlePrompt || null,
        batchPrompt: batchPrompt || null
      },
      update: {
        singlePrompt: singlePrompt || null,
        batchPrompt: batchPrompt || null
      }
    });

    res.json({
      success: true,
      data: prompt,
      message: '提示词保存成功'
    });
  } catch (error) {
    console.error('保存提示词失败:', error);
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

// 重置用户日记提示词（恢复默认）
router.delete('/diary/prompts', authenticate, async (req, res) => {
  try {
    await prisma.userDiaryPrompt.deleteMany({
      where: { userId: req.user.id }
    });

    res.json({
      success: true,
      message: '已恢复默认提示词'
    });
  } catch (error) {
    console.error('重置提示词失败:', error);
    res.status(500).json({ success: false, error: '重置失败' });
  }
});

// ========== 管理员设置默认提示词 ==========

// 获取系统默认提示词（管理员）
router.get('/diary/default-prompts', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const defaultPrompt = await prisma.diaryDefaultPrompt.findFirst({
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: defaultPrompt
    });
  } catch (error) {
    console.error('获取默认提示词失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 设置系统默认提示词（管理员）
router.post('/diary/default-prompts', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { singlePrompt, batchPrompt } = req.body;

    if (!singlePrompt || !batchPrompt) {
      return res.status(400).json({
        success: false,
        error: '请提供单条分析和批量分析的提示词'
      });
    }

    // 删除旧的，创建新的（只保留一条）
    await prisma.diaryDefaultPrompt.deleteMany();

    const prompt = await prisma.diaryDefaultPrompt.create({
      data: {
        singlePrompt,
        batchPrompt
      }
    });

    res.json({
      success: true,
      data: prompt,
      message: '默认提示词设置成功'
    });
  } catch (error) {
    console.error('设置默认提示词失败:', error);
    res.status(500).json({ success: false, error: '设置失败' });
  }
});

// 管理端 AI 统计
router.get('/admin/stats', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const days = Math.max(parseInt(req.query.days || 7, 10), 1);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [textbookSuccess, textbookError, diaryCount, submissionCount, calligraphyCount, recentErrors] = await Promise.all([
      prisma.aiAnalysisLog.count({ where: { status: 'success' } }),
      prisma.aiAnalysisLog.count({ where: { status: 'error' } }),
      prisma.diaryAnalysis.count(),
      prisma.aiAutomationTask.count({ where: { taskType: 'submission_analysis', status: 'success' } }),
      prisma.aiAutomationTask.count({ where: { taskType: 'calligraphy_analysis', status: 'success' } }),
      prisma.aiAutomationTask.findMany({
        where: {
          status: 'error',
          updatedAt: { gte: since }
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          taskType: true,
          sourceType: true,
          errorMessage: true,
          updatedAt: true
        }
      })
    ]);

    const trendMap = new Map();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      trendMap.set(key, {
        date: key,
        textbookSuccess: 0,
        textbookError: 0,
        diaryCount: 0,
        submissionCount: 0,
        calligraphyCount: 0
      });
    }

    const [textbookLogs, diaryRecords, automationTasks] = await Promise.all([
      prisma.aiAnalysisLog.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, status: true }
      }),
      prisma.diaryAnalysis.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true }
      }),
      prisma.aiAutomationTask.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, taskType: true, status: true }
      })
    ]);

    textbookLogs.forEach(log => {
      const key = new Date(log.createdAt).toISOString().split('T')[0];
      const target = trendMap.get(key);
      if (!target) return;
      if (log.status === 'success') target.textbookSuccess += 1;
      if (log.status === 'error') target.textbookError += 1;
    });

    diaryRecords.forEach(record => {
      const key = new Date(record.createdAt).toISOString().split('T')[0];
      const target = trendMap.get(key);
      if (target) target.diaryCount += 1;
    });

    automationTasks.forEach(task => {
      if (task.status !== 'success') return;
      const key = new Date(task.createdAt).toISOString().split('T')[0];
      const target = trendMap.get(key);
      if (!target) return;
      if (task.taskType === 'submission_analysis') target.submissionCount += 1;
      if (task.taskType === 'calligraphy_analysis') target.calligraphyCount += 1;
    });

    res.json({
      success: true,
      data: {
        overview: {
          textbookSuccess,
          textbookError,
          diaryCount,
          submissionCount,
          calligraphyCount
        },
        trend: Array.from(trendMap.values()),
        recentErrors
      }
    });
  } catch (error) {
    console.error('获取 AI 管理统计失败:', error);
    res.status(500).json({ success: false, error: '获取 AI 管理统计失败' });
  }
});

module.exports = router;
