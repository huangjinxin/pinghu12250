const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const botService = require('../services/botService');

// GET /api/bot - 获取所有活跃Bot（用户端）
router.get('/', authenticate, async (req, res) => {
  try {
    const bots = await botService.listBots(true);
    res.json({ success: true, data: bots });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/bot/admin - 获取所有Bot（管理端）
router.get('/admin', authenticate, isAdmin, async (req, res) => {
  try {
    const bots = await botService.listBots(false);
    res.json({ success: true, data: bots });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/bot - 创建Bot
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const bot = await botService.createBot(req.body);
    res.json({ success: true, data: bot });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/bot/:id - 更新Bot
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const bot = await botService.updateBot(req.params.id, req.body);
    res.json({ success: true, data: bot });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/bot/:id - 删除Bot
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    await botService.deleteBot(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
