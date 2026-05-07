/**
 * 拼音打字练习路由
 */

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const pinyinService = require('../services/pinyinService');

// 汉字转拼音
router.post('/convert', authenticate, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: '请提供汉字文本' });
    }

    const result = pinyinService.convertToPinyin(text);
    if (result.total === 0) {
      return res.status(400).json({ success: false, error: '未检测到汉字' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('拼音转换失败:', error);
    res.status(500).json({ success: false, error: '转换失败' });
  }
});

// 提交练习记录
router.post('/practice', authenticate, async (req, res) => {
  try {
    const { title, charCount, content, totalKeys, correctKeys, accuracy, duration } = req.body;

    if (!title || !charCount || !content) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    const practice = await pinyinService.createPractice(req.user.id, {
      title,
      charCount,
      content,
      totalKeys: totalKeys || 0,
      correctKeys: correctKeys || 0,
      accuracy: accuracy || 0,
      duration: duration || 0,
    });

    res.json({ success: true, data: practice });
  } catch (error) {
    console.error('保存练习记录失败:', error);
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

// 获取我的练习列表
router.get('/practice/my', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await pinyinService.getMyPractices(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取练习列表失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 获取我的统计数据
router.get('/practice/my/stats', authenticate, async (req, res) => {
  try {
    const stats = await pinyinService.getMyStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 获取今日拼音练习完成状态
router.get('/practice/my/today-status', authenticate, async (req, res) => {
  try {
    const timezoneOffset = parseInt(req.query.timezoneOffset, 10) || -480;
    const status = await pinyinService.getTodayStatus(req.user.id, timezoneOffset);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('获取今日拼音状态失败:', error);
    res.status(500).json({ success: false, error: '获取今日拼音状态失败' });
  }
});

// 排行榜（可选登录）
router.get('/practice/leaderboard', optionalAuth, async (req, res) => {
  try {
    const { period = 'week', page = 1, limit = 20 } = req.query;
    const result = await pinyinService.getLeaderboard(period, parseInt(page), parseInt(limit));

    // 如果已登录，标记当前用户
    if (req.user) {
      result.currentUserId = req.user.id;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 获取错误拼音频次分析
router.get('/practice/my/error-analysis', authenticate, async (req, res) => {
  try {
    const analysis = await pinyinService.getErrorAnalysis(req.user.id);
    res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('获取错误分析失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 删除练习记录
router.delete('/practice/:id', authenticate, async (req, res) => {
  try {
    await pinyinService.deletePractice(req.params.id, req.user.id);
    res.json({ success: true, data: { message: '删除成功' } });
  } catch (error) {
    if (error.message === '记录不存在' || error.message === '无权限删除') {
      return res.status(403).json({ success: false, error: error.message });
    }
    console.error('删除练习记录失败:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

module.exports = router;
