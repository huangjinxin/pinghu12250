/**
 * 认证路由
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/register - 注册
router.post('/register', authController.register);

// POST /api/auth/login - 登录
router.post('/login', authController.login);

// POST /api/auth/refresh - 刷新token
router.post('/refresh', authController.refresh);

module.exports = router;
