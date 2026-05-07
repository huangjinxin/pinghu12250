const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticate } = require('../middleware/auth');

// 所有接口均需要登录
router.use(authenticate);

// 绑定老师
router.post('/bind', teacherController.bindTeacher);

// 获取我的绑定信息（我是学生，或者我是老师获取我的学生）
router.get('/my', teacherController.getMyBindings);

// 解绑老师
router.post('/unbind', teacherController.unbindTeacher);

// 获取考核统计数据
router.get('/stats', teacherController.getStats);

// 获取排行榜
router.get('/leaderboard', teacherController.getLeaderboard);

module.exports = router;
