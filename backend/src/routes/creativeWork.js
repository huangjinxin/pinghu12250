/**
 * 创意作品路由
 */
const express = require('express');
const router = express.Router();
const creativeWorkController = require('../controllers/creativeWorkController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 公开接口
router.get('/public', creativeWorkController.getPublicWorks);
router.get('/public/:id', creativeWorkController.getPublicWork);

// 需要登录的接口
router.get('/my', authenticate, creativeWorkController.getMyWorks);
router.post('/', authenticate, creativeWorkController.createWork);
router.put('/:id', authenticate, creativeWorkController.updateWork);
router.delete('/:id', authenticate, creativeWorkController.deleteWork);
router.post('/:id/like', authenticate, creativeWorkController.toggleLike);
router.get('/:id/like', authenticate, creativeWorkController.checkLike);

// 管理员接口
router.get('/admin/pending', authenticate, isAdmin, creativeWorkController.getPendingWorks);
router.get('/admin/pending/users', authenticate, isAdmin, creativeWorkController.getPendingUsers);
router.get('/admin/stats', authenticate, isAdmin, creativeWorkController.getStats);
router.get('/admin/history', authenticate, isAdmin, creativeWorkController.getReviewHistory);
router.put('/:id/review', authenticate, isAdmin, creativeWorkController.reviewWork);

module.exports = router;
