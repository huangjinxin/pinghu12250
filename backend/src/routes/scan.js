const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

// POST /api/scan - 解析扫码并记录
router.post('/', authenticate, async (req, res) => {
  try {
    const { scanType, target, params } = req.body;
    if (!scanType || !target) {
      return res.status(400).json({ success: false, error: '缺少scanType或target' });
    }

    const log = await prisma.scanLog.create({
      data: { userId: req.user.id, scanType, target, params: params || {} },
    });

    res.json({ success: true, data: { log, navigation: { scanType, target, params } } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/scan/logs - 扫码记录
router.get('/logs', authenticate, async (req, res) => {
  try {
    const logs = await prisma.scanLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: logs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
