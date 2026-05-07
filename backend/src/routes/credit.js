const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const creditController = require('../controllers/creditController');

// 获取当前用户的信用概况
router.get('/profile', authenticate, creditController.getMyCreditProfile);

// 提交线下活动记录
router.post('/offline-activity', authenticate, creditController.submitOfflineActivity);

// 获取历史快照
router.get('/history', authenticate, creditController.getMyCreditHistory);

module.exports = router;
