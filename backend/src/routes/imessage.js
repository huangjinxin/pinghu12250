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
    const { analysisType = 'comprehensive', includeDiaries = false } = req.body;

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

    let diaryContent = '';
    if (includeDiaries) {
      // 通过 sender mapping 找到 userId
      const mapping = await prisma.imessageSenderMapping.findUnique({ where: { sender } });
      if (mapping) {
        const diaries = await prisma.diary.findMany({
          where: { authorId: mapping.userId },
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: { title: true, content: true, createdAt: true },
        });
        if (diaries.length > 0) {
          diaryContent = '\n\n【用户日记记录】\n' + diaries.map(d =>
            `[${d.createdAt.toISOString().split('T')[0]}] ${d.title || '无标题'}\n${d.content}`
          ).join('\n---\n');
        }
      }
    }

    const totalMsgLength = chatSummary.length;
    const maxContextChars = (apiConfig.maxTokens || 128000) * 3;
    const availableForDiary = maxContextChars - totalMsgLength;
    if (diaryContent.length > availableForDiary && availableForDiary > 1000) {
      diaryContent = diaryContent.slice(0, availableForDiary) + '\n\n【日记内容已截断】';
    } else if (availableForDiary <= 1000 && diaryContent.length > 0) {
      diaryContent = '\n\n【日记内容因上下文长度限制已省略】';
    }

    const prompts = getAnalysisPrompts(senderName, messages.length, chatSummary, analysisType, diaryContent);
    const timeout = includeDiaries ? 600000 : 120000;
    const maxOutputTokens = Math.min(apiConfig.maxTokens || 2000, 16384);
    const result = await aiService.callApi({ ...apiConfig, maxTokens: maxOutputTokens }, prompts.system, prompts.user, null, timeout);

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error || 'AI 分析失败' });
    }

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

    res.json({ success: true, data: { ...evaluation, analysisType, includeDiaries } });
  } catch (error) {
    console.error('iMessage evaluate-by-sender error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

function getAnalysisPrompts(sender, msgCount, chatSummary, type, diaryContent = '') {
  const abuseWarning = msgCount < 3 ? `

## ⚠️ 数据量严重不足
该用户仅有 ${msgCount} 条消息记录，样本量极小，以下分析仅供参考，结论可能不准确。建议积累更多有效记录后再进行深度分析。

> 🔔 **警示**：记录才代表存在。一个账号如果长期不产生有价值的对话记录，或者反复发送无意义内容，那么这个账号本质上就是一个"数字空壳"。系统会对恶意刷内容、发送垃圾信息的账号进行封号处理。请珍惜每一次对话的机会，用真实的交流证明自己的存在价值。` : '';

  const baseSystem = `你是一位资深的儿童教育心理分析师。请根据聊天记录对用户「${sender}」进行专业分析。

## 📐 输出格式要求
- 使用规范的 **Markdown** 格式，层次分明
- 用二级标题(##)分隔各个维度，每个标题前加合适的 emoji 图标
- 用三级标题(###)细分子维度
- 重点词汇用 **加粗** 标注
- 使用引用块(>)突出关键发现和警示
- 用有序/无序列表组织要点
- 关键数据用 \`行内代码\` 标记
- 适当用表格汇总对比数据
- 语气温暖、专业，适合给家长或老师展示

## ⚠️ 核心评价原则
- **记录才代表存在**：衡量一个孩子的成长和发展，唯一可靠的依据是 TA 留下的真实记录——包括有深度的对话、认真的思考、持续的探索。
- 如果用户发送的是**刷屏、重复、无意义的内容**，请在报告中明确指出这是"无效记录"，并对这种行为提出严厉批评。
- **零容忍态度**：对于恶意刷内容、发送垃圾信息、反复测试系统的行为，需要在分析中明确警告：**此类行为属于违规，系统将视情节严重程度采取限制功能、封号等处理措施**。无价值的记录等同于不存在，一个只产生垃圾数据的账号不配享有系统资源。
- 如果用户的数据真实有效，请给予充分的鼓励和肯定。`;

  let chatContext = `以下是用户「${sender}」与 AI 助手的完整聊天记录（共 ${msgCount} 条消息）：\n\n${chatSummary}`;
  if (diaryContent) {
    chatContext += `\n\n此外，该用户还有以下日记内容可供参考（日记能反映其内心世界、日常观察和情感表达）：${diaryContent}`;
  }

  if (type === 'psychology') {
    return {
      system: baseSystem,
      user: `${chatContext}${abuseWarning}

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
      user: `${chatContext}${abuseWarning}

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

## 📐 输出格式要求
- 使用规范的 **Markdown** 格式
- 用二级标题(##)分隔各个维度，每个标题前加合适的 emoji 图标
- 重点词汇用 **加粗** 标注
- 使用引用块(>)突出关键发现
- 用有序/无序列表组织要点
- 对于发现的问题，明确标注严重程度：🟢 正常 / 🟡 需关注 / 🔴 需干预
- 语气客观、专业，适合给家长或老师作为参考

## ⚠️ 核心评价原则
- **记录才代表存在**：没有真实的交流记录，就无法评估一个人的状态。如果数据量极低或内容无意义，本报告将标注为"不可评估"。
- 对于刷屏、重复、无意义的内容，直接判定为 **🔴 恶意行为**，并明确警告用户：此类行为将被记录，累计达到阈值将触发自动封号。
- **零容忍**：系统对破坏性行为采取零容忍态度，无价值的记录等同于不存在。`,
      user: `${chatContext}${abuseWarning}

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

  if (type === 'values') {
    return {
      system: `你是一位资深的儿童教育专家和品德发展评估师。请根据聊天记录对用户「${sender}」进行三观（世界观、人生观、价值观）发展分析。

## 📐 输出格式要求
- 使用规范的 **Markdown** 格式，层次分明
- 用二级标题(##)分隔各个维度，每个标题前加合适的 emoji 图标
- 重点词汇用 **加粗** 标注
- 使用引用块(>)突出关键发现
- 用有序/无序列表组织要点

## ⚠️ 核心评价原则
- **记录才代表存在**：一个人的三观体现在 TA 的每一次选择、每一句表达中。没有真实表达，就无法判断三观。
- 如果用户反复发送无意义、低俗、恶意内容，需要在报告中明确批判：**这种行为反映了极不端正的价值观，系统将严肃处理**。
- 对于真实、积极的内容，给予充分肯定和鼓励。`,
      user: `${chatContext}${abuseWarning}

请从三观发展角度进行深度分析，按以下结构输出：

## 🌍 世界观（对世界的认知）
分析该用户对周围世界（自然、社会、科技等）的认知方式和态度：
- 对事物的好奇心和探索态度
- 对科学、自然、社会现象的理解深度
- 是否有独立思考能力，还是人云亦云
- 对多元文化的包容性和开放度

## 🎯 人生观（对人生的态度）
分析该用户对自身成长和未来的看法：
- 是否有明确的兴趣爱好和追求目标
- 面对困难的态度（积极应对/消极回避）
- 对学习的认知（被动任务/主动探索）
- 对未来的期待和憧憬程度

## ⚖️ 价值观（价值判断标准）
分析该用户在对话中体现的价值取向：
- 对善恶、美丑、对错的判断标准
- 对规则、权威、他人的态度
- 是否尊重他人、有同理心
- 对诚信、责任、公平等核心价值的认知

## 📊 三观健康度评估
| 维度 | 评分(1-5) | 说明 |
|------|----------|------|
| 世界观 | | |
| 人生观 | | |
| 价值观 | | |

## 💬 综合评语
用一段话概括该用户的三观发展状况。

## 📝 引导建议
根据分析结果，给出 2-3 条帮助该用户三观健康发展的具体引导建议。`
    };
  }

  if (type === 'teaching') {
    return {
      system: `你是一位资深的教学设计师和学科教育专家。请根据聊天记录对用户「${sender}」进行教学建议分析。

## 📐 输出格式要求
- 使用规范的 **Markdown** 格式，层次分明
- 用二级标题(##)分隔各个维度，每个标题前加合适的 emoji 图标
- 重点词汇用 **加粗** 标注
- 使用引用块(>)突出关键发现
- 用有序/无序列表组织要点

## ⚠️ 核心评价原则
- **记录才代表存在**：有效的教学建议来源于真实的学习数据。如果用户没有留下足够的学习记录，教学建议将无法精准定制。
- 对于刷屏或无意义内容，报告需明确指出这些数据对教学分析毫无价值，用户需要端正学习态度。
- **零容忍**：系统资源只为真正愿意学习的孩子服务，恶意刷内容的行为将导致账号受限。`,
      user: `${chatContext}${abuseWarning}

请从教学和学习发展角度进行深度分析，按以下结构输出：

## 📚 学习能力评估
基于对话分析该用户的：
- 理解能力（快速把握概念/需要反复讲解/理解困难）
- 表达能力（清晰有条理/能举一反三/表达模糊）
- 逻辑思维（推理严谨/跳跃性强/缺乏逻辑）
- 知识迁移能力（能跨领域关联/孤立记忆/无法应用）
> 每项给出具体例证

## 🎓 学科优势分析
识别该用户在以下方面的表现：
- 擅长的学科或知识领域
- 相对薄弱的环节
- 值得重点发展的方向

## 🧠 认知发展阶段
根据皮亚杰认知发展理论，判断该用户当前的认知发展水平，并分析是否符合其年龄阶段。

## 📖 学习习惯诊断
分析该用户的学习行为模式：
- 学习主动性（主动提问/被动应答/抗拒学习）
- 学习持续性（专注力时长、是否能深入探究）
- 学习方法（善于总结归纳/死记硬背/缺乏方法）

## 🏫 教学策略建议
针对该用户的特点，给出具体的教学方案：
1. **推荐的教学方法**（如：项目式学习/探究式学习/游戏化学习）
2. **适合的学习资源**（具体到学科和难度级别）
3. **家长/老师的辅导重点**
4. **学习节奏建议**（加速/巩固/补基）

## 📈 学习进步跟踪建议
设计一个简单的学习进步跟踪方案：
- 建议关注的 3 个核心指标
- 合理的阶段性目标
- 评估周期和方式`
    };
  }

  // comprehensive - 默认综合分析
  return {
    system: baseSystem,
    user: `${chatContext}${abuseWarning}

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

// GET /api/imessage/admin/linked-users-stats - 所有已关联用户的统计（按用户合并，消息数跨 sender 汇总）
router.get('/admin/linked-users-stats', authenticate, isAdmin, async (req, res) => {
  try {
    const mappings = await prisma.imessageSenderMapping.findMany({
      include: { user: { include: { profile: true } } },
    });

    // 按 userId 分组
    const groups = {};
    for (const m of mappings) {
      const uid = m.userId;
      if (!groups[uid]) {
        groups[uid] = {
          userId: uid,
          senders: [],
          username: m.user.username,
          nickname: m.user.profile?.nickname || null,
          avatar: m.user.avatar,
        };
      }
      groups[uid].senders.push(m.sender);
    }

    const result = await Promise.all(Object.values(groups).map(async (g) => {
      const [totalQuestions, diaryStats] = await Promise.all([
        prisma.imessageChatLog.count({ where: { sender: { in: g.senders }, role: 'user' } }),
        prisma.diaryStats.findUnique({ where: { userId: g.userId } }).catch(() => null),
      ]);

      return {
        userId: g.userId,
        sender: g.senders[0], // 用于 AI 分析的主 sender
        allSenders: g.senders,
        username: g.username,
        nickname: g.nickname,
        avatar: g.avatar,
        totalQuestions,
        diaryCount: diaryStats?.totalDiaries || 0,
        diaryTotalWords: diaryStats?.totalWords || 0,
      };
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
