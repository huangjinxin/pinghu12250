/**
 * 书写评价服务
 * 对练字记录进行 AI 评分分析
 */

const prisma = require('../lib/prisma');
const aiService = require('./aiService');

const PROMPT_VERSION = 'v2.1';
const MAX_SCORE = 78; // 最高分上限
const COOLDOWN_HOURS = 24;

class WritingEvaluationService {
  /**
   * 检查是否可以进行分析
   * @param {string} noteId - 笔记 ID
   */
  async canAnalyze(noteId) {
    const existing = await prisma.writingEvaluation.findUnique({
      where: { noteId }
    });

    if (!existing) {
      return { canAnalyze: true, hasEvaluation: false };
    }

    const cooldownEnd = new Date(existing.createdAt);
    cooldownEnd.setHours(cooldownEnd.getHours() + COOLDOWN_HOURS);

    const now = new Date();
    const canAnalyze = now > cooldownEnd;
    const remainingMs = Math.max(0, cooldownEnd - now);
    const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

    return {
      hasEvaluation: true,
      canAnalyze,
      canReanalyzeAt: cooldownEnd.toISOString(),
      remainingHours
    };
  }

  /**
   * 获取评价结果
   * @param {string} noteId - 笔记 ID
   */
  async getEvaluation(noteId) {
    return await prisma.writingEvaluation.findUnique({
      where: { noteId }
    });
  }

  /**
   * 执行书写评价分析
   * @param {string} userId - 用户 ID
   * @param {string} noteId - 笔记 ID
   * @param {string} character - 练习的汉字
   * @param {object} metrics - 笔画指标数据
   * @param {string} renderedImage - 渲染图片 base64
   */
  async analyze(userId, noteId, character, metrics, renderedImage) {
    // 检查冷却
    const status = await this.canAnalyze(noteId);
    if (!status.canAnalyze && status.hasEvaluation) {
      throw new Error(`请在 ${status.remainingHours} 小时后重试`);
    }

    // 获取 AI 配置
    const aiConfig = await aiService.getDefaultConfig('llm');
    if (!aiConfig) {
      throw new Error('未配置 AI 模型，请联系管理员');
    }

    // 构建提示词
    const systemPrompt = this.buildSystemPrompt(character);
    const userPrompt = JSON.stringify({
      task: 'writing_evaluation',
      character,
      studentWriting: metrics
    });

    // 调用 AI（支持图片）
    const result = await aiService.callApi(
      aiConfig,
      systemPrompt,
      userPrompt,
      renderedImage
    );

    if (!result.success) {
      throw new Error('AI 分析失败: ' + (result.error || '未知错误'));
    }

    // 解析响应
    const evaluation = this.parseAIResponse(result.content);

    // 保存结果（upsert）
    const saved = await prisma.writingEvaluation.upsert({
      where: { noteId },
      create: {
        noteId,
        userId,
        overallScore: evaluation.overallScore,
        scoreLevel: evaluation.scoreLevel,
        dimensions: evaluation.dimensions,
        suggestions: evaluation.suggestions,
        encouragement: evaluation.encouragement,
        modelId: aiConfig.model || 'unknown',
        promptVersion: PROMPT_VERSION,
        rawResponse: result.content
      },
      update: {
        overallScore: evaluation.overallScore,
        scoreLevel: evaluation.scoreLevel,
        dimensions: evaluation.dimensions,
        suggestions: evaluation.suggestions,
        encouragement: evaluation.encouragement,
        modelId: aiConfig.model || 'unknown',
        promptVersion: PROMPT_VERSION,
        rawResponse: result.content,
        createdAt: new Date() // 重置时间以重置冷却
      }
    });

    return saved;
  }

  /**
   * 构建系统提示词
   * @param {string} character - 练习的汉字
   */
  buildSystemPrompt(character) {
    return `你是一位严格但有耐心的书法教师，擅长指导儿童练习汉字书写。

任务：分析学生的手写汉字图片，目标字是"${character}"。

【重要】评分采用严格的分层权重制，满分78分：

一、字形识别（权重 40%，满分 32 分）
首先识别图片中的手写字最可能是什么汉字，给出 Top3 猜测：
- 第1位命中目标字"${character}"：得 32 分
- 第2位命中：得 20 分
- 第3位命中：得 8 分
- 均未命中：得 0 分（说明写的完全不像目标字）

【严格要求】字形相似度判断标准：
- 必须笔画数量完全正确才能进入 Top1
- 笔画顺序明显错误的，最高只能 Top2
- 结构比例偏差超过20%的，降一档
- 关键笔画（如撇、捺、钩）缺失或变形严重的，直接判为不命中

二、结构准确（权重 30%，满分 23 分）
评估笔画数量、位置、比例是否正确（严格标准）：
- 笔画数量必须完全正确（错一笔扣5分）
- 各部分比例必须协调（偏差大于15%扣分）
- 整体结构必须端正（倾斜超过10度扣分）
- 笔画位置必须准确（偏移明显扣分）

三、书写质量（权重 30%，满分 23 分）
评估书写的流畅度和美观度（严格标准）：
- 笔画必须流畅无明显停顿（参考 metrics 中的 pauseCount，pauseCount>3 扣分）
- 粗细必须基本一致（变化过大扣分）
- 起笔收笔要有力度
- 整体美观度要求较高

【输出要求】
只输出 JSON，不要有其他内容：
{
  "recognition": {
    "top3": ["猜测1", "猜测2", "猜测3"],
    "matchRank": 1,
    "score": 32,
    "comment": "字形基本正确，但仍有改进空间"
  },
  "structure": {
    "score": 18,
    "comment": "结构基本正确，横画可以再平一些"
  },
  "quality": {
    "score": 16,
    "comment": "书写较流畅，但笔画力度还需加强"
  },
  "overallScore": 66,
  "scoreLevel": "good",
  "suggestions": ["具体建议1", "具体建议2"],
  "encouragement": "鼓励语"
}

字段说明：
- recognition.top3: 你识别出的最可能的3个汉字
- recognition.matchRank: 目标字在 top3 中的排名（1/2/3），不在则为 0
- recognition.score: 字形识别得分（32/20/8/0）
- structure.score: 结构准确得分（0-23）
- quality.score: 书写质量得分（0-23）
- overallScore: 总分 = recognition.score + structure.score + quality.score（满分78分）
- scoreLevel: excellent(>=70) / good(50-69) / needsWork(<50)

【特别注意】
- 满分为78分，不要给出超过78分的评分
- 如果字形识别得 0 分，总分不应超过 25 分
- 评分要严格，普通水平的书写应该在50-60分区间
- 只有非常优秀的书写才能达到70分以上
- 使用鼓励式语言，适合儿童阅读
- 建议要具体可操作`;
  }

  /**
   * 解析 AI 响应
   * @param {string} content - AI 返回的内容
   */
  parseAIResponse(content) {
    try {
      // 尝试从 markdown 代码块中提取 JSON
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      // 尝试找到 JSON 对象
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }

      const parsed = JSON.parse(jsonStr);

      // 处理新格式（v2.0 分层评分）
      if (parsed.recognition) {
        return this.parseV2Response(parsed);
      }

      // 兼容旧格式（v1.0）
      return this.parseV1Response(parsed);
    } catch (error) {
      console.error('解析 AI 响应失败:', error, content);
      return this.getDefaultEvaluation();
    }
  }

  /**
   * 解析 v2.0 分层评分响应
   */
  parseV2Response(parsed) {
    const recognition = parsed.recognition || {};
    const structure = parsed.structure || {};
    const quality = parsed.quality || {};

    // 计算各维度得分（调整为新的满分标准）
    const recognitionScore = Math.min(32, Math.max(0, recognition.score || 0));
    const structureScore = Math.min(23, Math.max(0, structure.score || 0));
    const qualityScore = Math.min(23, Math.max(0, quality.score || 0));

    // 如果字形识别为 0，总分上限为 25
    let overallScore = recognitionScore + structureScore + qualityScore;
    if (recognitionScore === 0) {
      overallScore = Math.min(25, structureScore + qualityScore);
    }

    // 强制最高分上限为78分
    overallScore = Math.min(MAX_SCORE, overallScore);

    // 确定等级（调整阈值）
    let scoreLevel = 'needsWork';
    if (overallScore >= 70) {
      scoreLevel = 'excellent';
    } else if (overallScore >= 50) {
      scoreLevel = 'good';
    }

    return {
      overallScore: Math.round(overallScore),
      scoreLevel,
      dimensions: {
        recognition: {
          score: recognitionScore,
          top3: recognition.top3 || [],
          matchRank: recognition.matchRank || 0,
          comment: recognition.comment || ''
        },
        structure: {
          score: structureScore,
          comment: structure.comment || ''
        },
        quality: {
          score: qualityScore,
          comment: quality.comment || ''
        }
      },
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      encouragement: parsed.encouragement || '继续努力！'
    };
  }

  /**
   * 解析 v1.0 旧格式响应（兼容）
   */
  parseV1Response(parsed) {
    if (typeof parsed.overallScore !== 'number') {
      throw new Error('缺少 overallScore');
    }

    // 将旧格式的100分制转换为78分制
    let adjustedScore = Math.round(parsed.overallScore * 0.78);
    adjustedScore = Math.min(MAX_SCORE, Math.max(0, adjustedScore));

    let scoreLevel = 'needsWork';
    if (adjustedScore >= 70) {
      scoreLevel = 'excellent';
    } else if (adjustedScore >= 50) {
      scoreLevel = 'good';
    }

    return {
      overallScore: adjustedScore,
      scoreLevel,
      dimensions: parsed.dimensions || {},
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      encouragement: parsed.encouragement || '继续努力！'
    };
  }

  /**
   * 获取默认评价（解析失败时使用）
   */
  getDefaultEvaluation() {
    return {
      overallScore: 40,
      scoreLevel: 'needsWork',
      dimensions: {
        recognition: { score: 0, top3: [], matchRank: 0, comment: '无法识别' },
        structure: { score: 20, comment: '需要继续练习' },
        quality: { score: 20, comment: '书写质量有待提高' }
      },
      suggestions: ['多加练习，熟能生巧'],
      encouragement: '继续加油，你一定可以写得更好！'
    };
  }
}

module.exports = new WritingEvaluationService();
