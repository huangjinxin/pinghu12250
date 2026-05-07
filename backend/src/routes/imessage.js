/**
 * iMessage 聊天记录路由
 * - 外部推送接口（API Key 认证）
 * - 管理员查看接口（JWT 认证）
 */
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, isAdmin } = require('../middleware/auth');
const aiService = require('../services/aiService');

// API Key 验证中间件
const IMESSAGE_API_KEY = process.env.IMESSAGE_API_KEY || 'imsg-default-key-change-me';

function verifyApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== IMESSAGE_API_KEY) {
    return res.status(401).json({ success: false, error: '无效的 API Key' });
  }
  next();
}

// ========== 外部推送接口 ==========

// POST /api/imessage/sync - 推送单轮对话
router.post('/sync', verifyApiKey, async (req, res) => {
  try {
    const { chatId, sender, senderName, isGroup, modelName, messages } = req.body;
    if (!chatId || !sender || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, error: '缺少必要字段' });
    }

    const records = messages.map(msg => ({
      chatId,
      sender,
      senderName: senderName || null,
      role: msg.role,
      content: msg.content,
      isGroup: isGroup || false,
      modelName: modelName || null,
    }));

    await prisma.imessageChatLog.createMany({ data: records });
    res.json({ success: true, data: { count: records.length } });
  } catch (error) {
    console.error('iMessage sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/imessage/batch-sync - 批量推送历史记录
router.post('/batch-sync', verifyApiKey, async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 records 数组' });
    }

    const data = records.map(r => ({
      chatId: r.chatId,
      sender: r.sender,
      senderName: r.senderName || null,
      role: r.role,
      content: r.content,
      isGroup: r.isGroup || false,
      modelName: r.modelName || null,
      createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
    }));

    await prisma.imessageChatLog.createMany({ data });
    res.json({ success: true, data: { count: data.length } });
  } catch (error) {
    console.error('iMessage batch-sync error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 管理员查看接口 ==========

// GET /api/imessage/admin/stats - 统计概览
router.get('/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, chatGroups, latest] = await Promise.all([
      prisma.imessageChatLog.count(),
      prisma.imessageChatLog.count({ where: { createdAt: { gte: today } } }),
      prisma.$queryRaw`SELECT COUNT(DISTINCT "chatId")::int as cnt FROM "ImessageChatLog"`,
      prisma.imessageChatLog.findFirst({ orderBy: { createdAt: 'desc' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalMessages: total,
        todayMessages: todayCount,
        activeChats: chatGroups[0]?.cnt || 0,
        lastActiveAt: latest?.createdAt || null,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/imessage/admin/analytics - 图表分析数据（仅关联用户）
router.get('/admin/analytics', authenticate, isAdmin, async (req, res) => {
  try {
    // 先获取关联映射 sender -> 系统用户名
    const mappings = await prisma.imessageSenderMapping.findMany({
      include: { user: { include: { profile: { select: { nickname: true } } } } },
    });
    const senderNames = {};
    const linkedSenders = mappings.map(m => {
      senderNames[m.sender] = m.user?.profile?.nickname || m.user?.username || m.sender;
      return m.sender;
    });

    if (!linkedSenders.length) {
      return res.json({ success: true, data: { dailyTrend: [], hourlyDist: [], senderRank: [], avgLength: [], convDepth: [], questionRate: [] } });
    }

    const resolveName = (rows) => rows.map(r => ({ ...r, name: senderNames[r.sender] || r.sender }));

    const [dailyTrend, hourlyDist, senderRank, avgLength, convDepth, questionRate] = await Promise.all([
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date,
               COUNT(*)::int as total,
               COUNT(*) FILTER (WHERE role = 'user')::int as "userCount",
               COUNT(*) FILTER (WHERE role = 'assistant')::int as "aiCount"
        FROM "ImessageChatLog"
        WHERE "createdAt" >= NOW() - INTERVAL '14 days'
          AND "sender" = ANY(${linkedSenders})
        GROUP BY DATE("createdAt") ORDER BY date
      `,
      prisma.$queryRaw`
        SELECT EXTRACT(HOUR FROM "createdAt")::int as hour, COUNT(*)::int as count
        FROM "ImessageChatLog"
        WHERE "sender" = ANY(${linkedSenders})
        GROUP BY hour ORDER BY hour
      `,
      prisma.$queryRaw`
        SELECT "sender", COUNT(*)::int as count
        FROM "ImessageChatLog"
        WHERE role = 'user' AND "sender" = ANY(${linkedSenders})
        GROUP BY "sender" ORDER BY count DESC LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT "sender", ROUND(AVG(LENGTH(content)))::int as "avgLen"
        FROM "ImessageChatLog"
        WHERE role = 'user' AND "sender" = ANY(${linkedSenders})
        GROUP BY "sender" ORDER BY "avgLen" DESC LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT sub."sender", ROUND(AVG(sub.cnt))::int as "avgDepth"
        FROM (
          SELECT "sender", "chatId", COUNT(*)::int as cnt
          FROM "ImessageChatLog"
          WHERE "sender" = ANY(${linkedSenders})
          GROUP BY "sender", "chatId"
        ) sub
        GROUP BY sub."sender" ORDER BY "avgDepth" DESC LIMIT 10
      `,
      prisma.$queryRaw`
        SELECT "sender",
               ROUND(COUNT(*)::numeric / GREATEST(COUNT(DISTINCT DATE("createdAt")), 1), 1)::float as "dailyAvg"
        FROM "ImessageChatLog"
        WHERE role = 'user' AND "createdAt" >= NOW() - INTERVAL '14 days'
          AND "sender" = ANY(${linkedSenders})
        GROUP BY "sender" ORDER BY "dailyAvg" DESC LIMIT 10
      `,
    ]);

    res.json({
      success: true,
      data: {
        dailyTrend,
        hourlyDist,
        senderRank: resolveName(senderRank),
        avgLength: resolveName(avgLength),
        convDepth: resolveName(convDepth),
        questionRate: resolveName(questionRate),
      },
    });
  } catch (error) {
    console.error('iMessage analytics error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/imessage/admin/logs - 分页查看记录
router.get('/admin/logs', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, sender, chatId, role, keyword, startDate, endDate, source } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const where = {};
    if (sender) where.sender = { contains: sender };
    if (chatId) where.chatId = chatId;
    if (role) where.role = role;
    if (source) where.source = source;
    if (keyword) where.content = { contains: keyword };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.imessageChatLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.imessageChatLog.count({ where }),
    ]);

    res.json({ success: true, data: { logs, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/imessage/admin/chats - 按会话分组
router.get('/admin/chats', authenticate, isAdmin, async (req, res) => {
  try {
    const chats = await prisma.$queryRaw`
      SELECT "chatId", "sender", "senderName", "isGroup",
             COALESCE("source", 'imessage') as "source",
             COUNT(*)::int as "messageCount",
             MAX("createdAt") as "lastActiveAt",
             MIN("createdAt") as "firstMessageAt"
      FROM "ImessageChatLog"
      GROUP BY "chatId", "sender", "senderName", "isGroup", "source"
      ORDER BY MAX("createdAt") DESC
    `;
    res.json({ success: true, data: chats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/imessage/admin/chat/:chatId - 查看某个会话的完整对话
router.get('/admin/chat/:chatId', authenticate, isAdmin, async (req, res) => {
  try {
    const { chatId } = req.params;
    const messages = await prisma.imessageChatLog.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/imessage/admin/chat-by-sender/:sender - 查看某个 sender 的所有会话消息（合并视图）
router.get('/admin/chat-by-sender/:sender', authenticate, isAdmin, async (req, res) => {
  try {
    const { sender } = req.params;
    const messages = await prisma.imessageChatLog.findMany({
      where: { sender },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/imessage/admin/chat-batch - 按多个 chatId / sender 查看完整对话（合并视图）
router.get('/admin/chat-batch', authenticate, isAdmin, async (req, res) => {
  try {
    const rawChatIds = req.query.chatIds;
    const rawSenders = req.query.senders;
    const chatIds = Array.isArray(rawChatIds)
      ? rawChatIds.flatMap(v => String(v).split(',')).map(v => v.trim()).filter(Boolean)
      : String(rawChatIds || '').split(',').map(v => v.trim()).filter(Boolean);
    const senders = Array.isArray(rawSenders)
      ? rawSenders.flatMap(v => String(v).split(',')).map(v => v.trim()).filter(Boolean)
      : String(rawSenders || '').split(',').map(v => v.trim()).filter(Boolean);

    if (!chatIds.length && !senders.length) {
      return res.status(400).json({ success: false, error: '缺少 chatIds 或 senders' });
    }

    const where = { OR: [] };
    if (chatIds.length) where.OR.push({ chatId: { in: chatIds } });
    if (senders.length) where.OR.push({ sender: { in: senders } });

    const messages = await prisma.imessageChatLog.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/imessage/admin/evaluate/:chatId - AI 分析用户聊天记录
router.post('/admin/evaluate/:chatId', authenticate, isAdmin, async (req, res) => {
  try {
    const { chatId } = req.params;
    const { analysisType = 'comprehensive' } = req.body;

    // 获取该会话所有消息
    const messages = await prisma.imessageChatLog.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });

    if (messages.length === 0) {
      return res.status(400).json({ success: false, error: '该会话没有消息记录' });
    }

    // 获取 AI 配置
    const apiConfig = await aiService.getDefaultConfig('llm');
    if (!apiConfig) {
      return res.status(400).json({ success: false, error: '未配置 AI API，请先在 AI 配置中设置默认模型' });
    }

    // 构建对话摘要
    const sender = messages[0].senderName || messages[0].sender;
    const chatSummary = messages.map(m => {
      const role = m.role === 'user' ? sender : 'AI助手';
      return `[${role}]: ${m.content}`;
    }).join('\n');

    // 根据分析类型选择提示词
    const prompts = getAnalysisPrompts(sender, messages.length, chatSummary, analysisType);

    const result = await aiService.callApi(apiConfig, prompts.system, prompts.user, null, 120000);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error || 'AI 分析失败' });
    }

    // 保存评价记录
    const evaluation = await prisma.imessageChatEvaluation.create({
      data: {
        chatId,
        sender: messages[0].sender,
        senderName: messages[0].senderName,
        analysis: result.content,
        messageCount: messages.length,
        modelName: apiConfig.model || apiConfig.llmModel,
        tokensUsed: result.tokensUsed,
        responseTime: result.responseTime,
        createdBy: req.user.id,
      },
    });

    res.json({ success: true, data: { ...evaluation, analysisType } });
  } catch (error) {
    console.error('iMessage evaluate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/imessage/admin/evaluate-by-sender/:sender - AI 分析某个 sender 的所有聊天记录（合并视图）
router.post('/admin/evaluate-by-sender/:sender', authenticate, isAdmin, async (req, res) => {
  try {
    const { sender } = req.params;
    const { analysisType = 'comprehensive' } = req.body;

    const messages = await prisma.imessageChatLog.findMany({
      where: { sender },
      orderBy: { createdAt: 'asc' },
    });

    if (messages.length === 0) {
      return res.status(400).json({ success: false, error: '该用户没有消息记录' });
    }

    const apiConfig = await aiService.getDefaultConfig('llm');
    if (!apiConfig) {
      return res.status(400).json({ success: false, error: '未配置 AI API，请先在 AI 配置中设置默认模型' });
    }

    const senderName = messages[0].senderName || sender;
    const chatSummary = messages.map(m => {
      const role = m.role === 'user' ? senderName : 'AI助手';
      return `[${role}]: ${m.content}`;
    }).join('\n');

    const prompts = getAnalysisPrompts(senderName, messages.length, chatSummary, analysisType);
    const result = await aiService.callApi(apiConfig, prompts.system, prompts.user, null, 120000);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error || 'AI 分析失败' });
    }

    // 用第一个 chatId 保存记录
    const evaluation = await prisma.imessageChatEvaluation.create({
      data: {
        chatId: messages[0].chatId,
        sender,
        senderName: messages[0].senderName,
        analysis: result.content,
        messageCount: messages.length,
        modelName: apiConfig.model || apiConfig.llmModel,
        tokensUsed: result.tokensUsed,
        responseTime: result.responseTime,
        createdBy: req.user.id,
      },
    });

    res.json({ success: true, data: { ...evaluation, analysisType } });
  } catch (error) {
    console.error('iMessage evaluate-by-sender error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function getAnalysisPrompts(sender, msgCount, chatSummary, type) {
  const baseSystem = `你是一位资深的儿童教育心理分析师。请根据聊天记录对用户「${sender}」进行专业分析。
输出要求：
- 使用规范的 Markdown 格式
- 用二级标题(##)分隔各个维度，每个标题前加合适的 emoji 图标
- 重点词汇用 **加粗** 标注
- 适当使用引用块(>)来突出关键发现
- 用有序/无序列表组织要点
- 语气温暖、专业，适合给家长或老师展示`;

  const chatContext = `以下是用户「${sender}」与 AI 助手的完整聊天记录（共 ${msgCount} 条消息）：\n\n${chatSummary}`;

  if (type === 'psychology') {
    return {
      system: baseSystem,
      user: `${chatContext}

请从心理健康角度进行深度分析，按以下结构输出：

## 🧠 心理状态总览
用 2-3 句话概括该孩子当前的整体心理状态和情绪基调。

## 💖 情绪表达特征
分析对话中体现的情绪模式：
- 主要情绪倾向（积极/消极/中性）
- 情绪稳定性和波动情况
- 情绪表达方式（直接/含蓄/压抑）
引用具体对话作为例证。

## 🤝 社交与依恋特征
从对话互动模式分析：
- 人际交往倾向（主动/被动）
- 信任感和安全感表现
- 对权威（AI）的态度和互动方式

## 🌱 自我认知与自信心
分析对话中反映的：
- 自我评价倾向
- 面对困难时的心理韧性
- 好奇心与探索欲望的强度

## 🔍 需要关注的信号
列出对话中可能需要家长/老师关注的心理信号（如有），包括：
- 焦虑或压力迹象
- 自我否定倾向
- 社交回避表现
> 如果没有明显负面信号，请明确说明"未发现明显需要关注的心理信号"。

## 💡 心理健康建议
给出 3-4 条针对性的心理健康培养建议，每条包含：
1. 具体建议内容
2. 实施方法
3. 预期效果`
    };
  }

  if (type === 'interest') {
    return {
      system: baseSystem,
      user: `${chatContext}

请从兴趣发展角度进行深度分析，按以下结构输出：

## 🎯 兴趣画像概览
用 2-3 句话勾勒该孩子的兴趣全貌，给出一个生动的印象。

## 🔬 核心兴趣领域
按兴趣强度排序，逐一分析：
- 每个兴趣领域的名称和具体表现
- 兴趣深度（浅尝辄止/持续探索/深度钻研）
- 引用具体对话内容作为证据

## 🧩 兴趣关联图谱
分析各兴趣之间的关联性：
- 是否有跨领域的兴趣连接
- 兴趣背后的共同驱动力
- 潜在的兴趣发展方向

## 📊 学习风格分析
从提问和互动方式推断：
- 偏好的学习方式（视觉/听觉/动手/阅读）
- 信息获取习惯（主动搜索/被动接收/互动探讨）
- 知识消化模式（快速浏览/深度理解/反复确认）

## 🌟 天赋潜能识别
基于兴趣表现，识别可能的天赋方向：
- 突出的能力倾向
- 值得重点培养的领域
- 与同龄人相比的独特之处

## 📋 兴趣培养方案
给出 3-4 条个性化的兴趣培养建议：
1. 推荐的学习资源或活动
2. 适合的拓展方向
3. 家长可以提供的支持方式`
    };
  }

  if (type === 'negative') {
    return {
      system: `你是一位资深的儿童教育心理分析师和安全评估专家。请根据聊天记录对用户「${sender}」进行负面情况专项排查。
输出要求：
- 使用规范的 Markdown 格式
- 用二级标题(##)分隔各个维度，每个标题前加合适的 emoji 图标
- 重点词汇用 **加粗** 标注
- 使用引用块(>)突出关键发现
- 用有序/无序列表组织要点
- 对于发现的问题，明确标注严重程度：🟢 正常 / 🟡 需关注 / 🔴 需干预
- 语气客观、专业，适合给家长或老师作为参考`,
      user: `${chatContext}

请从安全和负面情况角度进行专项排查，按以下结构输出：

## 📋 排查总结
用 2-3 句话给出整体评估结论，明确标注总体风险等级（🟢/🟡/🔴）。

## 😟 情绪异常检测
排查以下情绪信号：
- 持续性负面情绪（悲伤、愤怒、恐惧）
- 情绪剧烈波动
- 无助感或绝望感表达
- 异常的情绪压抑或回避
> 每项标注检测结果和严重程度

## 🚫 不良行为倾向
排查以下行为信号：
- 攻击性语言或暴力倾向
- 自我伤害相关表述
- 对规则和权威的极端抵触
- 欺凌或被欺凌迹象
> 每项标注检测结果和严重程度

## 👥 社交问题排查
排查以下社交信号：
- 社交孤立或退缩表现
- 同伴关系困扰
- 家庭关系问题暗示
- 过度依赖或信任缺失
> 每项标注检测结果和严重程度

## 📱 网络安全意识
排查以下安全信号：
- 隐私信息泄露风险
- 不当内容接触迹象
- 网络沉迷倾向
> 每项标注检测结果和严重程度

## 📊 综合风险评估
以表格形式汇总各维度的风险等级：
| 维度 | 风险等级 | 关键发现 |
|------|---------|---------|

## 🛡️ 应对建议
针对发现的问题（如有），给出分级建议：
- 🟢 正常：继续保持的做法
- 🟡 需关注：预防性措施
- 🔴 需干预：建议的具体行动步骤`
    };
  }

  // comprehensive - 默认综合分析（原有逻辑）
  return {
    system: baseSystem,
    user: `${chatContext}

请按以下结构输出综合分析报告：

## 🎯 综合画像
用 2-3 句话概括这个孩子的整体特点，给出一个生动的印象描述。

## 💡 兴趣偏好
分析主要关注的话题领域和兴趣方向，列举具体表现。

## 🧠 思维特点
从提问方式分析思维模式（好奇心、逻辑性、创造力、发散性等），引用具体对话作为例证。

## 📚 知识水平
推测大致的知识储备和认知发展阶段，指出优势领域。

## 💬 沟通风格
分析表达方式、语气特点、互动模式。

## 📈 学习态度
评估主动学习意愿、探究深度、面对困难的态度。

## 🌟 成长建议
给出 2-3 条具体的、可操作的个性化建议，帮助进一步发展。`
  };
}

// GET /api/imessage/admin/evaluations/:chatId - 获取评价历史
router.get('/admin/evaluations/:chatId', authenticate, isAdmin, async (req, res) => {
  try {
    const { chatId } = req.params;
    const evaluations = await prisma.imessageChatEvaluation.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: evaluations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/imessage/admin/evaluations-by-sender/:sender - 获取某 sender 的所有评价历史
router.get('/admin/evaluations-by-sender/:sender', authenticate, isAdmin, async (req, res) => {
  try {
    const { sender } = req.params;
    const evaluations = await prisma.imessageChatEvaluation.findMany({
      where: { sender },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: evaluations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/imessage/admin/all-evaluations - 获取所有 AI 分析记录
router.get('/admin/all-evaluations', authenticate, isAdmin, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const [evaluations, total] = await Promise.all([
      prisma.imessageChatEvaluation.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
      }),
      prisma.imessageChatEvaluation.count(),
    ]);
    res.json({ success: true, data: { evaluations, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 发送者-用户关联 ==========

// GET /api/imessage/admin/sender-mappings - 获取所有关联
router.get('/admin/sender-mappings', authenticate, isAdmin, async (req, res) => {
  try {
    const mappings = await prisma.imessageSenderMapping.findMany({
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: mappings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/imessage/admin/sender-mappings - 创建关联
router.post('/admin/sender-mappings', authenticate, isAdmin, async (req, res) => {
  try {
    const { sender, userId } = req.body;
    if (!sender || !userId) {
      return res.status(400).json({ success: false, error: '缺少 sender 或 userId' });
    }
    const mapping = await prisma.imessageSenderMapping.upsert({
      where: { sender },
      update: { userId },
      create: { sender, userId },
      include: { user: { include: { profile: true } } },
    });
    res.json({ success: true, data: mapping });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/imessage/admin/sender-mappings/:sender - 删除关联
router.delete('/admin/sender-mappings/:sender', authenticate, isAdmin, async (req, res) => {
  try {
    await prisma.imessageSenderMapping.delete({ where: { sender: req.params.sender } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/imessage/admin/search-users - 搜索系统用户（用于关联选择）
router.get('/admin/search-users', authenticate, isAdmin, async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) return res.json({ success: true, data: [] });
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: keyword, mode: 'insensitive' } },
          { profile: { nickname: { contains: keyword, mode: 'insensitive' } } },
        ],
      },
      select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } },
      take: 10,
    });
    res.json({ success: true, data: users.map(u => ({ id: u.id, username: u.username, nickname: u.profile?.nickname, avatar: u.avatar })) });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/imessage/user/:userId/summary - 用户提问摘要（公开）
router.get('/user/:userId/summary', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    const mappings = await prisma.imessageSenderMapping.findMany({ where: { userId } });
    if (!mappings.length) return res.json({ success: true, data: { linked: false } });

    const senders = mappings.map(m => m.sender);
    const [totalQuestions, chatCount, recentMessages] = await Promise.all([
      prisma.imessageChatLog.count({ where: { sender: { in: senders }, role: 'user' } }),
      prisma.$queryRaw`SELECT COUNT(DISTINCT "chatId")::int as cnt FROM "ImessageChatLog" WHERE "sender" = ANY(${senders})`,
      prisma.imessageChatLog.findMany({
        where: { sender: { in: senders }, role: 'user' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { content: true, createdAt: true, chatId: true },
      }),
    ]);

    res.json({
      success: true,
      data: { linked: true, totalQuestions, chatCount: chatCount[0]?.cnt || 0, recentMessages },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
