const prisma = require('../lib/prisma');
const aiService = require('./aiService');
const { buildSingleDiaryPrompt, parseScoreResponse } = require('./diaryScoreService');

function extractChineseChars(text) {
  if (!text) return [];
  return text.match(/[\u4e00-\u9fa5]/g) || [];
}

function buildCalligraphyPrompt(text, charCount, customPrompt) {
  const chineseChars = extractChineseChars(text);
  const chineseText = chineseChars.join('');
  const actualCharCount = chineseChars.length;

  if (customPrompt) {
    return customPrompt
      .replace(/\{\{text\}\}/g, chineseText)
      .replace(/\{\{charCount\}\}/g, actualCharCount);
  }

  const charTemplate = chineseChars.map(c => `{"c":"${c}","s":0.50,"r":"横画偏短","imp":["注意横画长度","加强结构练习"]}`).join(',');

  return `你是一位极其严格的书法评审专家，对小学生书法评分必须非常苛刻。

要评分的汉字：${chineseText}

【评分原则-必须严格遵守】
1. 评分必须压低，大部分作品总分不超过60分
2. 重点找问题，不要给鼓励性分数
3. 每个字都要单独评价，给出具体的改进建议
4. 发现问题要直接指出，不要委婉

【评分标准-严格打分】

字形相似度（满分50分）：
- 90%以上相似：40-50分（极少给）
- 75-89%相似：25-39分
- 60-74%相似：15-24分
- 40-59%相似：5-14分
- 40%以下或认不出：0-4分

笔画质量（满分30分）：
- 完美流畅：25-30分
- 基本流畅但有问题：15-24分
- 明显不流畅：5-14分
- 很差：0-4分

整体美观（满分20分）：
- 很美观：15-20分
- 一般：8-14分
- 较差：0-7分

【输出格式】只输出JSON：
{"chars":[${charTemplate}],"stroke":{"s":15,"r":"笔画整体评价"},"beauty":{"s":10,"r":"美观整体评价"},"summary":"总评","tips":["建议1","建议2"]}

【关键要求】
1. chars数组中每个字必须有：s(相似度0-1)、r(具体分析)、imp(改进建议数组)
2. similarity分数必须严格压低，大部分不超过0.6
3. overallScore总分必须压低，大部分作品不超过60分

【r字段示例】
- "横画不平，向右上倾斜约15度"
- "撇画过短，与捺画不协调"
- "结构松散，各部分间距过大"
- "笔画抖动明显，不够流畅"
- "整体向左倾斜，重心不稳"

【imp字段示例】
- "注意横画长度比例"
- "加强竖钩力度练习"
- "控制书写速度"
- "减少笔画抖动"

必须为每个字写具体的r和imp！不能省略！`;
}

function sanitizeJsonString(str) {
  if (!str) return str;
  str = str.replace(/^\uFEFF/, '');
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  str = str.replace(/:\s*of\s+(\d)/g, ': $1');
  str = str.replace(/,(\s*[}\]])/g, '$1');
  str = str.replace(/\}(\s*)\{/g, '}, {');
  str = str.replace(/\](\s*)\[/g, '], [');
  str = str.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
  str = str.replace(/'/g, '"');
  str = str.replace(/\/\/[^\n]*/g, '');
  str = str.replace(/\/\*[\s\S]*?\*\//g, '');
  str = str.replace(/""+/g, '"');
  str = str.replace(/:\s*\.(\d)/g, ': 0.$1');
  return str;
}

function tryParseJson(content) {
  try {
    return JSON.parse(content);
  } catch {}

  const codeBlockMatch = content.match(/```(?:json)?[\s\n]*(\{[\s\S]*?\})[\s\n]*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(sanitizeJsonString(codeBlockMatch[1]));
    } catch {}
  }

  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    let jsonStr = content.substring(jsonStart, jsonEnd + 1);
    jsonStr = sanitizeJsonString(jsonStr);
    try {
      return JSON.parse(jsonStr);
    } catch {
      jsonStr = jsonStr
        .replace(/\n/g, ' ')
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/,\s*,/g, ',')
        .replace(/\[\s*,/g, '[')
        .replace(/,\s*\]/g, ']')
        .replace(/\{\s*,/g, '{')
        .replace(/,\s*\}/g, '}');
      try {
        return JSON.parse(jsonStr);
      } catch {}
    }
  }

  return null;
}

function parseCalligraphyResponse(content) {
  const parsed = tryParseJson(content);
  if (!parsed) {
    return {
      overallScore: 0,
      level: 'needsWork',
      shapeMatch: { score: 0, charScores: [], comment: '' },
      strokeQuality: { score: 0, comment: '' },
      aesthetics: { score: 0, comment: '' },
      summary: '评分失败',
      improvements: []
    };
  }

  let charScores = [];
  let shapeComment = '';
  if (parsed.chars && Array.isArray(parsed.chars)) {
    charScores = parsed.chars;
  } else if (parsed.shapeMatch) {
    charScores = parsed.shapeMatch.chars || parsed.shapeMatch.charScores || [];
    shapeComment = parsed.shapeMatch.comment || '';
  }

  let shapeScore = 0;
  if (charScores.length > 0) {
    let totalSim = 0;
    let validCount = 0;
    for (const item of charScores) {
      let sim = item.s ?? item.similarity ?? item.score ?? 0;
      if (typeof sim === 'string') sim = parseFloat(sim) || 0;
      if (sim > 1) sim = sim / 100;
      sim = Math.max(0, Math.min(1, sim));
      totalSim += sim;
      validCount++;
    }
    if (validCount > 0) {
      shapeScore = Math.round((totalSim / validCount) * 50);
    }
  }

  const strokeData = parsed.stroke || parsed.strokeQuality || {};
  const strokeScore = Math.min(30, Math.max(0, Math.round(Number(strokeData.s ?? strokeData.score) || 0)));
  const beautyData = parsed.beauty || parsed.aesthetics || {};
  const beautyScore = Math.min(20, Math.max(0, Math.round(Number(beautyData.s ?? beautyData.score) || 0)));
  const overallScore = shapeScore + strokeScore + beautyScore;

  return {
    overallScore,
    level: overallScore >= 60 ? 'excellent' : overallScore >= 40 ? 'good' : 'needsWork',
    shapeMatch: {
      score: shapeScore,
      charScores: charScores.map(c => {
        let sim = c.s ?? c.similarity ?? 0;
        if (typeof sim === 'string') sim = parseFloat(sim) || 0;
        if (sim > 1) sim = sim / 100;
        return {
          char: c.c || c.char || '?',
          similarity: sim,
          reason: c.r || c.reason || c.analysis || c.comment || '',
          improvements: Array.isArray(c.imp || c.improvements || c.suggestions) ? (c.imp || c.improvements || c.suggestions) : []
        };
      }),
      comment: shapeComment
    },
    strokeQuality: {
      score: strokeScore,
      comment: strokeData.r || strokeData.comment || ''
    },
    aesthetics: {
      score: beautyScore,
      comment: beautyData.r || beautyData.comment || ''
    },
    summary: parsed.summary || '',
    improvements: parsed.tips || parsed.improvements || parsed.suggestions || []
  };
}

const AUTOMATION_KEY = 'ai_admin_automation';
const DEFAULT_AUTOMATION_SETTINGS = {
  autoAnalyzeApprovedSubmissions: false,
  autoAnalyzeApprovedCalligraphy: false,
  updatedBy: null,
  updatedAt: null
};

function parseSettingValue(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function getAutomationSettings() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: AUTOMATION_KEY }
  });

  if (!setting) return { ...DEFAULT_AUTOMATION_SETTINGS };

  return {
    ...DEFAULT_AUTOMATION_SETTINGS,
    ...(parseSettingValue(setting.value) || {})
  };
}

async function updateAutomationSettings(data, userId) {
  const current = await getAutomationSettings();
  const next = {
    ...current,
    autoAnalyzeApprovedSubmissions: data.autoAnalyzeApprovedSubmissions ?? current.autoAnalyzeApprovedSubmissions,
    autoAnalyzeApprovedCalligraphy: data.autoAnalyzeApprovedCalligraphy ?? current.autoAnalyzeApprovedCalligraphy,
    updatedBy: userId,
    updatedAt: new Date().toISOString()
  };

  await prisma.systemSetting.upsert({
    where: { key: AUTOMATION_KEY },
    create: {
      key: AUTOMATION_KEY,
      value: JSON.stringify(next),
      type: 'json',
      description: 'AI 自动化分析开关配置'
    },
    update: {
      value: JSON.stringify(next)
    }
  });

  return next;
}

async function createSubmissionAutomationTask(submissionId) {
  const settings = await getAutomationSettings();
  if (!settings.autoAnalyzeApprovedSubmissions) return null;

  const submission = await prisma.ruleSubmission.findUnique({
    where: { id: submissionId },
    include: {
      template: {
        include: {
          type: true,
          standardId: true
        }
      },
      user: {
        select: {
          id: true,
          username: true
        }
      }
    }
  });

  if (!submission || submission.status !== 'APPROVED') return null;

  const existing = await prisma.aiAutomationTask.findFirst({
    where: {
      submissionId,
      taskType: 'submission_analysis',
      status: { in: ['pending', 'processing', 'success'] }
    }
  });
  if (existing) return existing;

  return prisma.aiAutomationTask.create({
    data: {
      taskType: 'submission_analysis',
      sourceType: 'rule_submission',
      sourceId: submissionId,
      triggerMode: 'auto',
      submissionId,
      payload: {
        templateName: submission.template?.name || '',
        typeName: submission.template?.type?.name || '',
        standardName: '',
        content: submission.content || '',
        images: submission.images || [],
        audios: submission.audios || [],
        link: submission.link || null,
        username: submission.user?.username || '',
        diaryId: submission.link ? String(submission.link).split('/diary/')[1]?.split(/[?#]/)[0] || null : null
      }
    }
  });
}

async function createCalligraphyAutomationTask(workId) {
  const settings = await getAutomationSettings();
  if (!settings.autoAnalyzeApprovedCalligraphy) return null;

  const work = await prisma.calligraphyWork.findUnique({
    where: { id: workId }
  });

  if (!work || work.status !== 'APPROVED') return null;

  const existing = await prisma.aiAutomationTask.findFirst({
    where: {
      calligraphyWorkId: workId,
      taskType: 'calligraphy_analysis',
      status: { in: ['pending', 'processing', 'success'] }
    }
  });
  if (existing) return existing;

  return prisma.aiAutomationTask.create({
    data: {
      taskType: 'calligraphy_analysis',
      sourceType: 'calligraphy_work',
      sourceId: workId,
      triggerMode: 'auto',
      calligraphyWorkId: workId,
      payload: {
        title: work.title,
        charCount: work.charCount,
        preview: work.preview,
        previewUrl: work.previewUrl || null
      }
    }
  });
}

async function summarizeTask(task) {
  return {
    id: task.id,
    taskType: task.taskType,
    sourceType: task.sourceType,
    sourceId: task.sourceId,
    triggerMode: task.triggerMode,
    status: task.status,
    retryCount: task.retryCount,
    errorMessage: task.errorMessage,
    payload: task.payload,
    resultSummary: task.resultSummary,
    processedAt: task.processedAt,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    aiConfig: task.aiConfig ? {
      id: task.aiConfig.id,
      name: task.aiConfig.name,
      model: task.aiConfig.model
    } : null
  };
}

async function getTaskSummary() {
  const [pending, processing, success, error, last24hSuccess, last24hError] = await Promise.all([
    prisma.aiAutomationTask.count({ where: { status: 'pending' } }),
    prisma.aiAutomationTask.count({ where: { status: 'processing' } }),
    prisma.aiAutomationTask.count({ where: { status: 'success' } }),
    prisma.aiAutomationTask.count({ where: { status: 'error' } }),
    prisma.aiAutomationTask.count({
      where: {
        status: 'success',
        processedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    }),
    prisma.aiAutomationTask.count({
      where: {
        status: 'error',
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
  ]);

  return { pending, processing, success, error, last24hSuccess, last24hError };
}

async function getTasks(params = {}) {
  const page = Math.max(parseInt(params.page || 1, 10), 1);
  const limit = Math.min(Math.max(parseInt(params.limit || 20, 10), 1), 100);
  const where = {};

  if (params.status) where.status = params.status;
  if (params.taskType) where.taskType = params.taskType;
  if (params.sourceType) where.sourceType = params.sourceType;

  const [items, total] = await Promise.all([
    prisma.aiAutomationTask.findMany({
      where,
      include: {
        aiConfig: {
          select: { id: true, name: true, model: true }
        },
        submission: {
          include: {
            user: {
              select: { id: true, username: true, realName: true }
            }
          }
        },
        calligraphyWork: {
          include: {
            author: {
              select: { id: true, username: true, realName: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.aiAutomationTask.count({ where })
  ]);

  return {
    items: items.map(item => {
      let userInfo = null;
      if (item.taskType === 'submission_analysis' && item.submission?.user) {
        userInfo = {
          id: item.submission.user.id,
          username: item.submission.user.username,
          realName: item.submission.user.realName
        };
      } else if (item.taskType === 'calligraphy_analysis' && item.calligraphyWork?.author) {
        userInfo = {
          id: item.calligraphyWork.author.id,
          username: item.calligraphyWork.author.username,
          realName: item.calligraphyWork.author.realName
        };
      }
      return {
        ...item,
        aiConfig: item.aiConfig || null,
        user: userInfo
      };
    }),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

async function runSubmissionAnalysis(task) {
  const payload = task.payload || {};
  if (payload.templateName !== '日记(审批前提项/日)' || !payload.diaryId) {
    return {
      aiConfigId: null,
      resultSummary: {
        skipped: true,
        reason: '当前提交不是日记审批链路或缺少 diaryId'
      }
    };
  }

  const diary = await prisma.diary.findUnique({
    where: { id: payload.diaryId }
  });
  if (!diary) throw new Error('日记不存在');

  const apiConfig = await aiService.getDefaultConfig('llm');
  if (!apiConfig) throw new Error('未配置可用的 AI 模型');

  const previousAnalysis = await prisma.diaryAnalysis.findFirst({
    where: {
      diaryId: diary.id,
      userId: diary.authorId,
      isBatch: false
    },
    orderBy: { createdAt: 'desc' }
  });

  const prompt = buildSingleDiaryPrompt(diary, previousAnalysis ? {
    totalScore: previousAnalysis.totalScore,
    grade: previousAnalysis.grade,
    highlights: previousAnalysis.highlights || [],
    improvements: previousAnalysis.improvements || []
  } : null);

  const result = await aiService.callApi(apiConfig, '', prompt, null, 300000);
  if (!result.success) throw new Error(result.error || 'AI 分析失败');

  const scoreData = parseScoreResponse(result.content);

  await prisma.diaryAnalysis.create({
    data: {
      userId: diary.authorId,
      isBatch: false,
      diaryId: diary.id,
      diaryIds: [diary.id],
      diaryCount: 1,
      diarySnapshot: {
        id: diary.id,
        title: diary.title,
        content: diary.content,
        mood: diary.mood,
        weather: diary.weather,
        createdAt: diary.createdAt
      },
      analysis: result.content,
      modelName: apiConfig.model || apiConfig.name || 'unknown',
      tokensUsed: result.tokensUsed || null,
      responseTime: result.responseTime || null,
      totalScore: scoreData.totalScore,
      grade: scoreData.grade,
      scoreDetails: scoreData.scoreDetails,
      highlights: scoreData.highlights || [],
      improvements: scoreData.improvements || [],
      nextGoal: scoreData.nextGoal || null
    }
  });

  return {
    aiConfigId: apiConfig.id,
    resultSummary: {
      diaryId: diary.id,
      title: diary.title,
      modelName: apiConfig.model || apiConfig.name,
      responseTime: result.responseTime,
      tokensUsed: result.tokensUsed,
      totalScore: scoreData.totalScore,
      grade: scoreData.grade,
      preview: result.content.slice(0, 300)
    }
  };
}

async function runCalligraphyAnalysis(task) {
  const work = await prisma.calligraphyWork.findUnique({ where: { id: task.calligraphyWorkId } });
  if (!work) throw new Error('书法作品不存在');

  const apiConfig = await aiService.getDefaultConfig('llm');
  if (!apiConfig) throw new Error('未配置可用的 AI 模型');

  const promptTemplate = await prisma.aiPrompt.findUnique({ where: { key: 'calligraphy_eval' } });
  const systemPrompt = buildCalligraphyPrompt(work.title, work.charCount, promptTemplate?.content);
  const userPrompt = `请基于这份书法作品内容进行评分。\n作品标题：${work.title}\n字数：${work.charCount}`;
  const result = await aiService.callApi(apiConfig, '', `${systemPrompt}\n\n${userPrompt}`, null, 300000);
  if (!result.success) throw new Error(result.error || 'AI 评分失败');

  const parsed = parseCalligraphyResponse(result.content);

  await prisma.calligraphyWork.update({
    where: { id: work.id },
    data: {
      evaluationScore: parsed.overallScore ?? work.evaluationScore,
      evaluationData: parsed,
      evaluatedAt: new Date()
    }
  });

  return {
    aiConfigId: apiConfig.id,
    resultSummary: {
      modelName: apiConfig.model || apiConfig.name,
      responseTime: result.responseTime,
      tokensUsed: result.tokensUsed,
      overallScore: parsed.overallScore ?? null,
      summary: parsed.summary || result.content.slice(0, 300)
    }
  };
}

async function processTask(task) {
  if (task.taskType === 'submission_analysis') {
    return runSubmissionAnalysis(task);
  }
  if (task.taskType === 'calligraphy_analysis') {
    return runCalligraphyAnalysis(task);
  }
  throw new Error(`不支持的任务类型: ${task.taskType}`);
}

async function processPendingTasks() {
  const task = await prisma.aiAutomationTask.findFirst({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' }
  });

  if (!task) return false;

  const claimed = await prisma.aiAutomationTask.updateMany({
    where: { id: task.id, status: 'pending' },
    data: { status: 'processing' }
  });

  if (!claimed.count) return true;

  try {
    const result = await processTask(task);
    await prisma.aiAutomationTask.update({
      where: { id: task.id },
      data: {
        status: 'success',
        aiConfigId: result.aiConfigId || null,
        resultSummary: result.resultSummary || null,
        errorMessage: null,
        processedAt: new Date()
      }
    });
  } catch (error) {
    const retryCount = task.retryCount + 1;
    await prisma.aiAutomationTask.update({
      where: { id: task.id },
      data: {
        status: retryCount >= 3 ? 'error' : 'pending',
        retryCount,
        errorMessage: error.message || '处理失败'
      }
    });
  }

  return true;
}

function startAutomationTaskConsumer() {
  const loop = async () => {
    try {
      const handled = await processPendingTasks();
      setTimeout(loop, handled ? 500 : 3000);
    } catch (error) {
      console.error('[AI 自动化任务] 消费失败:', error);
      setTimeout(loop, 5000);
    }
  };

  loop();
}

async function retryTask(taskId) {
  const task = await prisma.aiAutomationTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error('任务不存在');

  return prisma.aiAutomationTask.update({
    where: { id: taskId },
    data: {
      status: 'pending',
      errorMessage: null,
      processedAt: null
    }
  });
}

module.exports = {
  getAutomationSettings,
  updateAutomationSettings,
  createSubmissionAutomationTask,
  createCalligraphyAutomationTask,
  getTaskSummary,
  getTasks,
  retryTask,
  startAutomationTaskConsumer,
  summarizeTask
};
