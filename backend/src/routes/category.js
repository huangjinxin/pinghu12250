/**
 * 栏目管理路由
 */
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticate, isAdmin } = require('../middleware/auth');

// 公开接口
router.get('/', categoryController.getCategories);

// 管理员接口
router.get('/admin/all', authenticate, isAdmin, categoryController.getAllCategories);
router.post('/', authenticate, isAdmin, categoryController.createCategory);
router.put('/:id', authenticate, isAdmin, categoryController.updateCategory);
router.delete('/:id', authenticate, isAdmin, categoryController.deleteCategory);

module.exports = router;
