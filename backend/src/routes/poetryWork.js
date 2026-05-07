/**
 * 唐诗宋词作品路由
 */

const express = require('express');
const router = express.Router();
const poetryWorkController = require('../controllers/poetryWorkController');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/poetry-works - 获取作品列表
router.get('/', authenticate, poetryWorkController.getWorks);

// GET /api/poetry-works/public - 公开获取已审核作品列表（无需登录）
router.get('/public', poetryWorkController.getPublicWorks);

// GET /api/poetry-works/public/:id - 公开访问单个作品（无需登录）
router.get('/public/:id', poetryWorkController.getPublicWorkById);

// GET /api/poetry-works/admin/pending/users - 获取有待审核作品的用户列表（管理员）
router.get('/admin/pending/users', authenticate, authorize('ADMIN'), poetryWorkController.getPendingUsers);

// GET /api/poetry-works/admin/pending - 获取待审核作品（管理员）
router.get('/admin/pending', authenticate, authorize('ADMIN'), poetryWorkController.getPendingWorks);

// GET /api/poetry-works/admin/stats - 获取统计数据（管理员）
router.get('/admin/stats', authenticate, authorize('ADMIN'), poetryWorkController.getStats);

// GET /api/poetry-works/admin/history - 获取已审核作品（管理员）
router.get('/admin/history', authenticate, authorize('ADMIN'), poetryWorkController.getReviewedWorks);

// POST /api/poetry-works/admin/regenerate-covers - 批量生成封面（管理员）
router.post('/admin/regenerate-covers', authenticate, authorize('ADMIN'), poetryWorkController.regenerateCovers);

// POST /api/poetry-works - 创建作品
router.post('/', authenticate, poetryWorkController.createWork);

// PUT /api/poetry-works/:id - 更新作品（用户编辑）
router.put('/:id', authenticate, poetryWorkController.updateWork);

// PUT /api/poetry-works/:id/status - 更新作品状态（管理员审核）
router.put('/:id/status', authenticate, authorize('ADMIN'), poetryWorkController.updateWorkStatus);

// DELETE /api/poetry-works/:id - 删除作品
router.delete('/:id', authenticate, poetryWorkController.deleteWork);

// POST /api/poetry-works/:id/like - 点赞/取消点赞
router.post('/:id/like', authenticate, poetryWorkController.toggleLike);

module.exports = router;
