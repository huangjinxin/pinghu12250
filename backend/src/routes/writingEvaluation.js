/**
 * 书写评价路由
 * AI 对练字记录进行分析评分
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const writingEvaluationService = require('../services/writingEvaluationService');

/**
 * GET /:noteId/status
 * 获取分析状态（是否可分析，剩余冷却时间）
 */
router.get('/:noteId/status', authenticate, async (req, res) => {
  try {
    const { noteId } = req.params;
    const userId = req.user.id;
    const status = await writingEvaluationService.canAnalyze(noteId, userId);

    res.json({
      success: true,
      data: {
        hasEvaluation: status.hasEvaluation,
        canAnalyze: status.canAnalyze,
        canReanalyzeAt: status.canReanalyzeAt,
        remainingHours: status.remainingHours || 0
      }
    });
  } catch (error) {
    console.error('获取评价状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取状态失败'
    });
  }
});

/**
 * GET /:noteId
 * 获取评价结果
 */
router.get('/:noteId', authenticate, async (req, res) => {
  try {
    const { noteId } = req.params;
    const evaluation = await writingEvaluationService.getEvaluation(noteId);

    if (!evaluation) {
      return res.json({
        success: true,
        data: null
      });
    }

    res.json({
      success: true,
      data: evaluation
    });
  } catch (error) {
    console.error('获取评价结果失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取评价失败'
    });
  }
});

/**
 * POST /analyze
 * 发起 AI 分析
 */
router.post('/analyze', authenticate, async (req, res) => {
  try {
    const { noteId, character, metrics, renderedImage } = req.body;
    const userId = req.user.id;

    // 参数验证
    if (!noteId) {
      return res.status(400).json({
        success: false,
        error: '缺少笔记ID'
      });
    }
    if (!character) {
      return res.status(400).json({
        success: false,
        error: '缺少字符信息'
      });
    }
    if (!metrics) {
      return res.status(400).json({
        success: false,
        error: '缺少笔画指标数据'
      });
    }

    // 执行分析
    const result = await writingEvaluationService.analyze(
      userId,
      noteId,
      character,
      metrics,
      renderedImage
    );

    // 计算下次可分析时间
    const canReanalyzeAt = new Date();
    canReanalyzeAt.setHours(canReanalyzeAt.getHours() + 24);

    res.json({
      success: true,
      data: {
        ...result,
        canReanalyzeAt: canReanalyzeAt.toISOString()
      }
    });
  } catch (error) {
    console.error('AI分析失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI分析失败'
    });
  }
});

module.exports = router;
