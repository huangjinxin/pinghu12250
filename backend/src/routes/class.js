/**
 * 班级路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const classController = require('../controllers/classController');

// 所有路由需要认证
router.use(authenticate);

// 获取老师的班级列表
router.get('/my-classes', classController.getTeacherClasses);

// 获取所有班级
router.get('/', classController.getClasses);

// 获取单个班级
router.get('/:id', classController.getClass);

// 创建班级
router.post('/', classController.createClass);

// 更新班级
router.put('/:id', classController.updateClass);

// 删除班级
router.delete('/:id', classController.deleteClass);

// 分配老师到班级
router.post('/:id/teachers', classController.assignTeacher);

// 移除班级老师
router.delete('/:id/teachers/:teacherId', classController.removeTeacher);

module.exports = router;
