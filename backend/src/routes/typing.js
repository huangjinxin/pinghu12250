const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const typingService = require('../services/typingService');

router.post('/practice', authenticate, async (req, res) => {
  try {
    const practice = await typingService.createPractice(req.user.id, req.body || {});
    res.json({ success: true, data: practice, message: '练习记录已保存' });
  } catch (error) {
    console.error('保存打字练习失败:', error);
    res.status(500).json({ success: false, error: '保存打字练习失败' });
  }
});

router.get('/practice/my', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await typingService.getMyPractices(req.user.id, parseInt(page, 10), parseInt(limit, 10));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取打字记录失败:', error);
    res.status(500).json({ success: false, error: '获取打字记录失败' });
  }
});

router.get('/practice/my/stats', authenticate, async (req, res) => {
  try {
    const stats = await typingService.getMyStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取打字统计失败:', error);
    res.status(500).json({ success: false, error: '获取打字统计失败' });
  }
});

router.get('/practice/my/today-status', authenticate, async (req, res) => {
  try {
    const timezoneOffset = parseInt(req.query.timezoneOffset, 10) || -480;
    const status = await typingService.getTodayStatus(req.user.id, timezoneOffset);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('获取今日打字状态失败:', error);
    res.status(500).json({ success: false, error: '获取今日打字状态失败' });
  }
});

router.get('/practice/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { period = 'week', page = 1, limit = 20 } = req.query;
    const result = await typingService.getLeaderboard(period, parseInt(page, 10), parseInt(limit, 10));
    if (req.user) {
      result.currentUserId = req.user.id;
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取打字排行榜失败:', error);
    res.status(500).json({ success: false, error: '获取打字排行榜失败' });
  }
});

router.get('/global-best-score', async (req, res) => {
  try {
    const bestScore = await typingService.getGlobalBestScore();
    res.json({ success: true, data: { bestScore } });
  } catch (error) {
    console.error('获取全系统最高分失败:', error);
    res.status(500).json({ success: false, error: '获取全系统最高分失败' });
  }
});

router.delete('/practice/:id', authenticate, async (req, res) => {
  try {
    await typingService.deletePractice(req.params.id, req.user.id);
    res.json({ success: true, data: { message: '删除成功' } });
  } catch (error) {
    if (error.message === '记录不存在' || error.message === '无权限删除') {
      return res.status(403).json({ success: false, error: error.message });
    }
    console.error('删除打字记录失败:', error);
    res.status(500).json({ success: false, error: '删除打字记录失败' });
  }
});

router.get('/achievements', authenticate, async (req, res) => {
  try {
    const achievements = await typingService.getTypingAchievements(req.user.id);
    res.json({ success: true, data: achievements });
  } catch (error) {
    console.error('获取打字成就失败:', error);
    res.status(500).json({ success: false, error: '获取打字成就失败' });
  }
});

router.get('/achievements/stats', authenticate, async (req, res) => {
  try {
    const stats = await typingService.getTypingAchievementStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取打字成就统计失败:', error);
    res.status(500).json({ success: false, error: '获取打字成就统计失败' });
  }
});

router.get('/analytics/overview', authenticate, async (req, res) => {
  try {
    const data = await typingService.getAnalyticsOverview(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取数据分析概览失败:', error);
    res.status(500).json({ success: false, error: '获取数据分析概览失败' });
  }
});

router.get('/analytics/trend', authenticate, async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await typingService.getAnalyticsTrend(req.user.id, days);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取趋势数据失败:', error);
    res.status(500).json({ success: false, error: '获取趋势数据失败' });
  }
});

router.get('/analytics/combo-dist', authenticate, async (req, res) => {
  try {
    const data = await typingService.getAnalyticsComboDistribution(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取连击分布失败:', error);
    res.status(500).json({ success: false, error: '获取连击分布失败' });
  }
});

router.get('/analytics/difficulty-dist', authenticate, async (req, res) => {
  try {
    const data = await typingService.getAnalyticsDifficultyDistribution(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取难度分布失败:', error);
    res.status(500).json({ success: false, error: '获取难度分布失败' });
  }
});

router.get('/analytics/error-keys', authenticate, async (req, res) => {
  try {
    const data = await typingService.getAnalyticsErrorKeys(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取错误按键数据失败:', error);
    res.status(500).json({ success: false, error: '获取错误按键数据失败' });
  }
});

router.get('/leaderboard/multi', optionalAuth, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const data = await typingService.getMultiLeaderboard(period, req.user?.id || null);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取多维排行榜失败:', error);
    res.status(500).json({ success: false, error: '获取多维排行榜失败' });
  }
});

router.get('/idioms', authenticate, async (req, res) => {
  try {
    const data = await typingService.getIdiomStats(req.user.id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取成语统计失败:', error);
    res.status(500).json({ success: false, error: '获取成语统计失败' });
  }
});

module.exports = router;
