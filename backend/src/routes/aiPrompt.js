/**
 * AI 提示词模板管理路由
 * 权限：TEACHER / ADMIN（管理）/ 已登录（获取默认）
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const aiService = require('../services/aiService');

// ========== 系统提示词 API ==========

// 获取系统提示词
router.get('/system', authenticate, async (req, res) => {
  try {
    const prompt = await prisma.systemPrompt.findFirst({
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ success: true, data: prompt });
  } catch (error) {
    console.error('获取系统提示词失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 保存/更新系统提示词（管理员）
router.post('/system', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { promptText, description } = req.body;

    if (!promptText) {
      return res.status(400).json({ success: false, error: '提示词内容必填' });
    }

    // 查找现有的系统提示词
    const existing = await prisma.systemPrompt.findFirst();

    let prompt;
    if (existing) {
      // 更新现有的
      prompt = await prisma.systemPrompt.update({
        where: { id: existing.id },
        data: {
          promptText,
          description: description || null
        }
      });
    } else {
      // 创建新的
      prompt = await prisma.systemPrompt.create({
        data: {
          promptText,
          description: description || null,
          createdBy: req.user.id
        }
      });
    }

    res.json({ success: true, data: prompt });
  } catch (error) {
    console.error('保存系统提示词失败:', error);
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

// 获取勤学好问机器人提示词
router.get('/bot/echo', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const prompt = await prisma.aiPrompt.findUnique({ where: { key: 'echo_bot_system' } });
    res.json({ success: true, data: prompt });
  } catch (error) {
    console.error('获取勤学好问提示词失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 保存勤学好问机器人提示词
router.post('/bot/echo', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: '提示词内容必填' });
    }

    const prompt = await prisma.aiPrompt.upsert({
      where: { key: 'echo_bot_system' },
      update: { content, updatedBy: req.user.id, name: '勤学好问机器人提示词' },
      create: { key: 'echo_bot_system', name: '勤学好问机器人提示词', content, updatedBy: req.user.id }
    });

    res.json({ success: true, data: prompt, message: '保存成功' });
  } catch (error) {
    console.error('保存勤学好问提示词失败:', error);
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

// 重置勤学好问机器人提示词
router.post('/bot/echo/reset', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    await prisma.aiPrompt.deleteMany({ where: { key: 'echo_bot_system' } });
    res.json({ success: true, message: '已恢复默认提示词' });
  } catch (error) {
    console.error('重置勤学好问提示词失败:', error);
    res.status(500).json({ success: false, error: '重置失败' });
  }
});

// 初始化默认模板（管理员）
router.post('/init-defaults', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    // 默认系统提示词
    const defaultSystemPrompt = `你是一位经验丰富的小学教师，正在辅导学生阅读和理解课本内容。

请遵循以下原则：
1. 使用简单易懂的语言，适合小学生理解
2. 鼓励学生思考，而不是直接给出答案
3. 关注知识的趣味性和实用性
4. 如果涉及生僻字词，需要注音和解释
5. 适当引入相关的课外知识拓展视野`;

    // 默认科目模板
    const defaultTemplates = [
      {
        name: '语文默认模板',
        subject: 'CHINESE',
        promptText: `请分析以下语文课文内容（{{page_range}}）：

{{content}}

请从以下角度帮助学生理解：
1. 【生字词解析】找出本段生词，标注拼音并解释含义
2. 【段落大意】用一两句话概括主要内容
3. 【写作特点】分析作者使用的修辞手法或表达技巧
4. 【思考问题】提出 1-2 个启发思考的问题
5. 【好词好句】摘录值得学习的优美句子`,
        description: '语文课文分析默认模板',
        isDefault: true
      },
      {
        name: '数学默认模板',
        subject: 'MATH',
        promptText: `请分析以下数学课本内容（{{page_range}}）：

{{content}}

请帮助学生理解：
1. 【知识点提炼】本页涉及哪些数学概念或公式
2. 【解题思路】例题的解题步骤和关键技巧
3. 【易错提醒】容易犯错的地方和注意事项
4. 【举一反三】给出一个类似的练习题
5. 【生活应用】这个知识点在生活中的实际应用`,
        description: '数学课本分析默认模板',
        isDefault: true
      },
      {
        name: '英语默认模板',
        subject: 'ENGLISH',
        promptText: `请分析以下英语课本内容（{{page_range}}）：

{{content}}

请帮助学生学习：
1. 【单词学习】列出重点单词，标注音标和中文释义
2. 【语法要点】本课涉及的语法知识
3. 【句型练习】重点句型及其变化形式
4. 【对话理解】如有对话，解释对话场景和用法
5. 【朗读建议】发音注意事项和语调提示`,
        description: '英语课本分析默认模板',
        isDefault: true
      },
      {
        name: '通用分析模板',
        subject: null,
        promptText: `请分析以下课本内容（{{page_range}}）：

{{content}}

请帮助学生理解：
1. 【核心内容】本页的主要知识点
2. 【重点解读】重要概念的详细解释
3. 【关键词汇】需要掌握的术语和概念
4. 【思考引导】帮助学生深入理解的问题
5. 【学习建议】如何更好地掌握这部分内容`,
        description: '通用课本分析模板',
        isDefault: true
      }
    ];

    // 创建/更新系统提示词
    const existingSystem = await prisma.systemPrompt.findFirst();
    if (!existingSystem) {
      await prisma.systemPrompt.create({
        data: {
          promptText: defaultSystemPrompt,
          description: '系统默认提示词',
          createdBy: req.user.id
        }
      });
    }

    // 创建默认模板（如果同学科默认不存在）
    let created = 0;
    for (const template of defaultTemplates) {
      const existing = await prisma.aiPromptTemplate.findFirst({
        where: {
          subject: template.subject,
          isDefault: true
        }
      });

      if (!existing) {
        await prisma.aiPromptTemplate.create({
          data: {
            ...template,
            createdBy: req.user.id
          }
        });
        created++;
      }
    }

    res.json({
      success: true,
      message: `初始化完成，创建了 ${created} 个默认模板`,
      data: { created }
    });
  } catch (error) {
    console.error('初始化默认模板失败:', error);
    res.status(500).json({ success: false, error: '初始化失败' });
  }
});

// ========== 教材提示词 API ==========

// 获取教材的提示词列表
router.get('/textbook/:textbookId', authenticate, async (req, res) => {
  try {
    const { textbookId } = req.params;

    const prompts = await prisma.textbookPrompt.findMany({
      where: { textbookId },
      orderBy: [
        { isActive: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ success: true, data: prompts });
  } catch (error) {
    console.error('获取教材提示词失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 创建教材提示词
router.post('/textbook/:textbookId', authenticate, async (req, res) => {
  try {
    const { textbookId } = req.params;
    const { name, promptText, description, isActive, sortOrder } = req.body;

    if (!name || !promptText) {
      return res.status(400).json({ success: false, error: '名称和提示词内容必填' });
    }

    // 验证教材存在
    const textbook = await prisma.textbook.findUnique({ where: { id: textbookId } });
    if (!textbook) {
      return res.status(404).json({ success: false, error: '教材不存在' });
    }

    // 如果设为激活，先取消其他激活的
    if (isActive) {
      await prisma.textbookPrompt.updateMany({
        where: { textbookId, isActive: true },
        data: { isActive: false }
      });
    }

    const prompt = await prisma.textbookPrompt.create({
      data: {
        textbookId,
        name,
        promptText,
        description: description || null,
        isActive: isActive || false,
        sortOrder: sortOrder || 0,
        createdBy: req.user.id
      }
    });

    res.status(201).json({ success: true, data: prompt });
  } catch (error) {
    console.error('创建教材提示词失败:', error);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

// 更新教材提示词
router.put('/textbook-prompt/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, promptText, description, sortOrder } = req.body;

    const existing = await prisma.textbookPrompt.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: '提示词不存在' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (promptText !== undefined) updateData.promptText = promptText;
    if (description !== undefined) updateData.description = description;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const prompt = await prisma.textbookPrompt.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, data: prompt });
  } catch (error) {
    console.error('更新教材提示词失败:', error);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

// 删除教材提示词
router.delete('/textbook-prompt/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.textbookPrompt.delete({ where: { id } });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除教材提示词失败:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

// 设置教材提示词为激活
router.put('/textbook-prompt/:id/activate', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.textbookPrompt.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: '提示词不存在' });
    }

    // 取消同教材的其他激活
    await prisma.textbookPrompt.updateMany({
      where: { textbookId: existing.textbookId, isActive: true },
      data: { isActive: false }
    });

    // 设置当前为激活
    const prompt = await prisma.textbookPrompt.update({
      where: { id },
      data: { isActive: true }
    });

    res.json({ success: true, data: prompt });
  } catch (error) {
    console.error('激活教材提示词失败:', error);
    res.status(500).json({ success: false, error: '激活失败' });
  }
});

// 复制科目默认模板到教材
router.post('/textbook/:textbookId/copy-default', authenticate, async (req, res) => {
  try {
    const { textbookId } = req.params;

    // 获取教材信息
    const textbook = await prisma.textbook.findUnique({ where: { id: textbookId } });
    if (!textbook) {
      return res.status(404).json({ success: false, error: '教材不存在' });
    }

    // 获取对应学科的默认模板
    const defaultTemplate = await prisma.aiPromptTemplate.findFirst({
      where: {
        subject: textbook.subject,
        isDefault: true,
        isEnabled: true
      }
    });

    if (!defaultTemplate) {
      return res.status(404).json({ success: false, error: '未找到对应学科的默认模板' });
    }

    // 创建教材提示词
    const prompt = await prisma.textbookPrompt.create({
      data: {
        textbookId,
        name: `${defaultTemplate.name}（副本）`,
        promptText: defaultTemplate.promptText,
        description: `从默认模板复制: ${defaultTemplate.description || ''}`,
        isActive: false,
        createdBy: req.user.id
      }
    });

    res.status(201).json({ success: true, data: prompt });
  } catch (error) {
    console.error('复制默认模板失败:', error);
    res.status(500).json({ success: false, error: '复制失败' });
  }
});

// ========== 科目模板 API（原有功能）==========

// 获取提示词列表（管理员）
router.get('/', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { subject } = req.query;

    const where = {};
    if (subject) {
      where.subject = subject;
    }

    const prompts = await prisma.aiPromptTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({ success: true, data: prompts });
  } catch (error) {
    console.error('获取提示词列表失败:', error);
    res.status(500).json({ success: false, error: '获取列表失败' });
  }
});

// 获取默认提示词（普通用户也可以获取）
router.get('/default', authenticate, async (req, res) => {
  try {
    const { subject } = req.query;

    const prompt = await aiService.getDefaultPrompt(subject);

    res.json({ success: true, data: prompt });
  } catch (error) {
    console.error('获取默认提示词失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 创建提示词
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { name, subject, promptText, description, isDefault } = req.body;

    if (!name || !promptText) {
      return res.status(400).json({ success: false, error: '名称和提示词内容必填' });
    }

    // 如果设为默认，先取消同学科的其他默认
    if (isDefault) {
      await prisma.aiPromptTemplate.updateMany({
        where: {
          isDefault: true,
          subject: subject || null
        },
        data: { isDefault: false }
      });
    }

    const prompt = await prisma.aiPromptTemplate.create({
      data: {
        name,
        subject: subject || null,
        promptText,
        description: description || null,
        isDefault: isDefault || false,
        createdBy: req.user.id
      }
    });

    res.status(201).json({ success: true, data: prompt });
  } catch (error) {
    console.error('创建提示词失败:', error);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

// 更新提示词
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, promptText, description, isEnabled } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject || null;
    if (promptText !== undefined) updateData.promptText = promptText;
    if (description !== undefined) updateData.description = description;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

    const prompt = await prisma.aiPromptTemplate.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, data: prompt });
  } catch (error) {
    console.error('更新提示词失败:', error);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

// 删除提示词
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.aiPromptTemplate.delete({
      where: { id }
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除提示词失败:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

// 设为默认
router.put('/:id/default', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.aiPromptTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: '提示词不存在' });
    }

    // 取消同学科的其他默认
    await prisma.aiPromptTemplate.updateMany({
      where: {
        isDefault: true,
        subject: existing.subject
      },
      data: { isDefault: false }
    });

    // 设置当前为默认
    const prompt = await prisma.aiPromptTemplate.update({
      where: { id },
      data: { isDefault: true, isEnabled: true }
    });

    res.json({ success: true, data: prompt });
  } catch (error) {
    console.error('设置默认提示词失败:', error);
    res.status(500).json({ success: false, error: '设置失败' });
  }
});

// ========== 评分提示词 API ==========

// 获取评分提示词
router.get('/eval/:key', authenticate, async (req, res) => {
  try {
    const { key } = req.params;
    let prompt = await prisma.aiPrompt.findUnique({ where: { key } });

    // 如果数据库中没有，则返回默认提示词
    if (!prompt) {
      const defaultContent = getDefaultEvalPrompt(key);
      if (defaultContent) {
        prompt = { key, name: getEvalPromptName(key), content: defaultContent };
      }
    }

    res.json({ success: true, data: prompt });
  } catch (error) {
    console.error('获取评分提示词失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 保存/更新评分提示词（管理员）
router.post('/eval/:key', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { key } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: '提示词内容必填' });
    }

    const prompt = await prisma.aiPrompt.upsert({
      where: { key },
      update: { content, updatedBy: req.user.id },
      create: { key, name: getEvalPromptName(key), content, updatedBy: req.user.id }
    });

    res.json({ success: true, data: prompt });
  } catch (error) {
    console.error('保存评分提示词失败:', error);
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

// 重置评分提示词为默认（管理员）
router.post('/eval/:key/reset', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { key } = req.params;
    const defaultContent = getDefaultEvalPrompt(key);

    if (!defaultContent) {
      return res.status(404).json({ success: false, error: '未找到默认提示词' });
    }

    await prisma.aiPrompt.deleteMany({ where: { key } });

    res.json({ success: true, data: { key, content: defaultContent } });
  } catch (error) {
    console.error('重置评分提示词失败:', error);
    res.status(500).json({ success: false, error: '重置失败' });
  }
});

// 获取评分提示词名称
function getEvalPromptName(key) {
  const names = {
    'calligraphy_eval': '书法作品评分提示词',
    'vocabulary_eval': '生词本评分提示词'
  };
  return names[key] || key;
}

// 获取默认评分提示词
function getDefaultEvalPrompt(key) {
  const prompts = {
    'calligraphy_eval': `你是一位极其严格的书法评审专家，对小学生书法评分必须非常苛刻。

作品内容：「{{text}}」（共{{charCount}}字）

【评分原则-必须严格遵守】
1. 评分必须压低，大部分作品总分不超过60分
2. 重点找问题，不要给鼓励性分数
3. 每个字都要单独评价，给出具体的改进建议
4. 发现问题要直接指出，不要委婉

【评分维度-严格标准】

一、字形相似度（满分50分，严格打分）
将用户书写的每个字与标准字逐一对比：
- 笔画数量是否正确
- 笔画位置是否准确
- 字形结构是否匹配

严格评分标准：
- 90%以上相似：40-50分（极少给）
- 75-89%相似：25-39分
- 60-74%相似：15-24分
- 40-59%相似：5-14分
- 40%以下或认不出：0-4分

二、笔画质量（满分30分，严格打分）
- 笔画是否流畅连贯
- 起笔收笔是否规范
- 笔画粗细是否协调
- 有无明显抖动或断笔

严格评分标准：
- 完美流畅：25-30分
- 基本流畅但有问题：15-24分
- 明显不流畅：5-14分
- 很差：0-4分

三、整体美观（满分20分，严格打分）
- 字间距是否均匀
- 整体布局是否协调
- 书写是否工整端正

严格评分标准：
- 很美观：15-20分
- 一般：8-14分
- 较差：0-7分

【输出要求】
只输出 JSON：
{
  "shapeMatch": {
    "score": 25,
    "charScores": [
      {"char": "字1", "similarity": 0.65, "reason": "横画偏短，结构松散", "improvements": ["注意横画长度", "加强结构练习"]},
      {"char": "字2", "similarity": 0.58, "reason": "走之底不规范", "improvements": ["练习走之底笔画", "控制字形大小"]}
    ],
    "comment": "整体字形把握较好，但部分笔画位置需调整"
  },
  "strokeQuality": {
    "score": 10,
    "comment": "笔画有抖动，起收笔不够干净利落"
  },
  "aesthetics": {
    "score": 6,
    "comment": "字间距不够均匀，整体偏向右倾"
  },
  "overallScore": 41,
  "level": "needsWork",
  "summary": "书写基本功有待提高，建议从基础笔画开始练习",
  "improvements": [
    "注意横画的长度比例",
    "加强竖画的垂直度练习",
    "控制书写速度，减少抖动"
  ]
}

【关键要求】
- charScores数组中每个字必须有improvements字段，给出该字的具体改进建议
- overallScore必须严格，大部分作品不超过60分
- level: excellent(>=70) / good(50-69) / needsWork(<50)`,

    'vocabulary_eval': `你是一位严格的书法评审专家，请对这个生词书写进行专业评分。

目标字：「{{character}}」

【评分原则】
- 严格按照标准评分，不要给予鼓励性加分
- 重点关注字形准确度和与原字的相似度
- 发现问题直接指出，给出具体改进建议

【评分维度】

一、字形相似度（权重 50%，满分 50 分）
将用户书写的字与标准字进行对比：
- 笔画数量是否正确
- 笔画位置是否准确
- 字形结构是否匹配
- 整体轮廓是否相似

评分标准：
- 完全匹配（95%+相似）：45-50 分
- 高度相似（80-94%）：35-44 分
- 基本相似（60-79%）：25-34 分
- 差异明显（40-59%）：15-24 分
- 难以辨认（<40%）：0-14 分

二、笔画质量（权重 30%，满分 30 分）
- 笔画是否流畅连贯
- 起笔收笔是否规范
- 笔画粗细是否协调
- 有无明显抖动或断笔

三、整体美观（权重 20%，满分 20 分）
- 字形是否端正
- 比例是否协调
- 书写是否工整

【输出要求】
只输出 JSON：
{
  "shapeMatch": {
    "score": 35,
    "similarity": 0.75,
    "issues": ["横画偏短", "竖画歪斜"],
    "comment": "字形基本正确，但笔画位置需调整"
  },
  "strokeQuality": {
    "score": 20,
    "comment": "笔画有抖动，起收笔不够干净利落"
  },
  "aesthetics": {
    "score": 12,
    "comment": "字形略向右倾，比例需调整"
  },
  "overallScore": 67,
  "level": "good",
  "summary": "书写基本功尚可，但字形准确度需要加强",
  "improvements": [
    "注意横画的长度比例",
    "加强竖画的垂直度练习",
    "控制书写速度，减少抖动"
  ]
}

level: excellent(>=85) / good(60-84) / needsWork(<60)`
  };
  return prompts[key] || null;
}

module.exports = router;
