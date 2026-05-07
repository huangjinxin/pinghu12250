/**
 * 认证路由
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/register - 注册
router.post('/register', authController.register);

// POST /api/auth/login - 登录
router.post('/login', authController.login);

// POST /api/auth/verify-2fa - 两步验证
router.post('/verify-2fa', authController.verifyTwoFactor);

// GET /api/auth/refresh - 刷新token (改为从 cookie 读取，推荐用 GET 或 POST)
router.get('/refresh', authController.refresh);

// POST /api/auth/logout - 登出
router.post('/logout', authController.logout);

// POST /api/auth/logout-all - 登出所有设备
router.post('/logout-all', authenticate, authController.logoutAll);

// GET /api/auth/sessions - 获取活跃会话
router.get('/sessions', authenticate, authController.getSessions);

// POST /api/auth/sessions/:id/revoke - 吊销会话
router.post('/sessions/:id/revoke', authenticate, authController.revokeSession);

// DELETE /api/auth/delete-account - 删除账户（需要登录）
router.delete('/delete-account', authenticate, authController.deleteAccount);

module.exports = router;
