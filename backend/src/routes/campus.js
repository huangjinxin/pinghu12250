/**
 * 校区路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const campusController = require('../controllers/campusController');

// 所有路由需要认证
router.use(authenticate);

// 获取所有校区
router.get('/', campusController.getCampuses);

// 获取单个校区
router.get('/:id', campusController.getCampus);

// 创建校区
router.post('/', campusController.createCampus);

// 更新校区
router.put('/:id', campusController.updateCampus);

// 删除校区
router.delete('/:id', campusController.deleteCampus);

module.exports = router;
