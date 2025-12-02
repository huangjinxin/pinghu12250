/**
 * HTML作品路由
 */

const express = require('express');
const router = express.Router();
const htmlWorkController = require('../controllers/htmlWorkController');
const { authenticate } = require('../middleware/auth');

// GET /api/html-works - 获取作品列表
router.get('/', authenticate, htmlWorkController.getWorks);

// GET /api/html-works/categories/list - 获取所有分类
router.get('/categories/list', authenticate, htmlWorkController.getCategories);

// GET /api/html-works/:id - 获取单个作品
router.get('/:id', authenticate, htmlWorkController.getWorkById);

// POST /api/html-works - 创建作品
router.post('/', authenticate, htmlWorkController.createWork);

// PUT /api/html-works/:id - 更新作品
router.put('/:id', authenticate, htmlWorkController.updateWork);

// DELETE /api/html-works/:id - 删除作品
router.delete('/:id', authenticate, htmlWorkController.deleteWork);

// POST /api/html-works/:id/fork - Fork作品
router.post('/:id/fork', authenticate, htmlWorkController.forkWork);

// POST /api/html-works/:id/like - 点赞/取消点赞
router.post('/:id/like', authenticate, htmlWorkController.toggleLike);

// POST /api/html-works/:id/comments - 添加评论
router.post('/:id/comments', authenticate, htmlWorkController.addComment);

module.exports = router;
