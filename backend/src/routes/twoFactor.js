/**
 * 两步验证 (2FA) 路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const twoFactorController = require('../controllers/twoFactorController');

// 所有路由都需要认证
router.use(authenticate);

// 获取 2FA 状态
router.get('/status', twoFactorController.getStatus);

// 开始启用 2FA（获取二维码）
router.post('/setup', twoFactorController.setup);

// 验证并完成启用
router.post('/verify-setup', twoFactorController.verifySetup);

// 关闭 2FA
router.post('/disable', twoFactorController.disable);

// 重新生成恢复码
router.post('/regenerate-backup', twoFactorController.regenerateBackupCodes);

// 获取恢复码剩余数量
router.get('/backup-codes-count', twoFactorController.getBackupCodesCount);

module.exports = router;
