/**
 * 动态/时间轴路由
 */

const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { authenticate } = require('../middleware/auth');

// GET /api/posts - 获取动态列表（支持筛选个人/公共）
router.get('/', authenticate, postController.getPosts);

// GET /api/posts/:id - 获取单个动态
router.get('/:id', authenticate, postController.getPostById);

// POST /api/posts - 创建动态
router.post('/', authenticate, postController.createPost);

// DELETE /api/posts/:id - 删除动态
router.delete('/:id', authenticate, postController.deletePost);

// POST /api/posts/:id/like - 点赞/取消点赞
router.post('/:id/like', authenticate, postController.toggleLike);

// POST /api/posts/:id/comments - 添加评论
router.post('/:id/comments', authenticate, postController.addComment);

// DELETE /api/posts/:id/comments/:commentId - 删除评论
router.delete('/:id/comments/:commentId', authenticate, postController.deleteComment);

module.exports = router;
