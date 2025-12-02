/**
 * 用户路由
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// GET /api/users/me - 获取当前用户信息
router.get('/me', authenticate, userController.getCurrentUser);

// PUT /api/users/me - 更新当前用户信息
router.put('/me', authenticate, userController.updateCurrentUser);

// PUT /api/users/me/password - 修改密码
router.put('/me/password', authenticate, userController.updatePassword);

// POST /api/users/me/avatar - 上传头像
router.post('/me/avatar', authenticate, upload.single('avatar'), userController.uploadAvatar);

// GET /api/users/:id - 获取指定用户信息
router.get('/:id', authenticate, userController.getUserById);

// GET /api/users/:id/stats - 获取用户统计数据
router.get('/:id/stats', authenticate, userController.getUserStats);

// POST /api/users/link-parent - 关联家长（学生操作）
router.post('/link-parent', authenticate, userController.linkParent);

// GET /api/users/me/children - 获取我的孩子列表（家长操作）
router.get('/me/children', authenticate, userController.getChildren);

// GET /api/users/teachers - 获取所有老师列表
router.get('/teachers', authenticate, userController.getTeachers);

module.exports = router;
