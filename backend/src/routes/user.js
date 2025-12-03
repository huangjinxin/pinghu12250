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

// GET /api/users/:id/dynamics - 获取用户动态（聚合各种内容）
router.get('/:id/dynamics', authenticate, userController.getUserDynamics);

// GET /api/users/:id/diaries - 获取用户日记
router.get('/:id/diaries', authenticate, userController.getUserDiaries);

// GET /api/users/:id/homeworks - 获取用户作业
router.get('/:id/homeworks', authenticate, userController.getUserHomeworks);

// GET /api/users/:id/notes - 获取用户笔记
router.get('/:id/notes', authenticate, userController.getUserNotes);

// GET /api/users/:id/reading-logs - 获取用户读书笔记
router.get('/:id/reading-logs', authenticate, userController.getUserReadingLogs);

// GET /api/users/:id/games - 获取用户游戏记录
router.get('/:id/games', authenticate, userController.getUserGames);

// GET /api/users/:id/music-logs - 获取用户音乐记录
router.get('/:id/music-logs', authenticate, userController.getUserMusicLogs);

// GET /api/users/:id/movie-logs - 获取用户影视记录
router.get('/:id/movie-logs', authenticate, userController.getUserMovieLogs);

module.exports = router;
