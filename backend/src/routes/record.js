/**
 * 日常记录路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const recordController = require('../controllers/recordController');

// 所有路由需要认证
router.use(authenticate);

// 获取记录列表
router.get('/', recordController.getRecords);

// 获取统计数据
router.get('/statistics', recordController.getStatistics);

// 获取学生记录列表（按日期聚合）
router.get('/student/:studentId', recordController.getStudentRecords);

// 获取学生某日的所有记录
router.get('/student/:studentId/date/:date', recordController.getStudentDayRecords);

// 创建记录
router.post('/', recordController.createRecord);

// 更新记录
router.put('/:id', recordController.updateRecord);

// 删除记录
router.delete('/:id', recordController.deleteRecord);

module.exports = router;
