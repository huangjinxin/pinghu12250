/**
 * 用户行为埋点路由
 */

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');

/**
 * POST /api/analytics/event
 * 上报单个事件（公开接口，但会尝试获取用户ID）
 */
router.post('/event', async (req, res) => {
  try {
    // 尝试从 token 获取用户ID（可选）
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (e) {
        // token 无效，忽略
      }
    }

    const { sessionId, eventType, eventName, page, metadata } = req.body;

    if (!eventName) {
      return res.status(400).json({ success: false, error: '缺少 eventName' });
    }

    const result = await analyticsService.trackEvent({
      userId,
      sessionId,
      eventType,
      eventName,
      page,
      metadata,
    });

    res.json(result);
  } catch (error) {
    console.error('上报事件失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/analytics/events
 * 批量上报事件
 */
router.post('/events', async (req, res) => {
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (e) {
        // token 无效，忽略
      }
    }

    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 events 数组' });
    }

    // 为每个事件添加用户ID
    const eventsWithUser = events.map(e => ({ ...e, userId }));

    const result = await analyticsService.trackEvents(eventsWithUser);
    res.json(result);
  } catch (error) {
    console.error('批量上报事件失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/analytics/summary
 * 获取统计摘要（管理员）
 */
router.get('/admin/summary', authenticate, isAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const result = await analyticsService.getSummary(days);
    res.json(result);
  } catch (error) {
    console.error('获取统计摘要失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/analytics/features
 * 获取功能使用统计（管理员）
 */
router.get('/admin/features', authenticate, isAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const result = await analyticsService.getFeatureStats(days);
    res.json(result);
  } catch (error) {
    console.error('获取功能统计失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/analytics/aggregate
 * 手动触发聚合统计（管理员）
 */
router.post('/admin/aggregate', authenticate, isAdmin, async (req, res) => {
  try {
    const { date } = req.body;
    const result = await analyticsService.manualAggregate(date);
    res.json(result);
  } catch (error) {
    console.error('手动聚合失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/analytics/dashboard
 * 获取数据看板聚合数据（管理员）
 */
router.get('/admin/dashboard', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await analyticsService.getDashboardData();
    res.json(result);
  } catch (error) {
    console.error('获取看板数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/public/dashboard
 * 获取数据看板聚合数据（公共访问，无需登录）
 */
router.get('/public/dashboard', async (req, res) => {
  try {
    const result = await analyticsService.getDashboardData();
    res.json(result);
  } catch (error) {
    console.error('获取公共看板数据失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
