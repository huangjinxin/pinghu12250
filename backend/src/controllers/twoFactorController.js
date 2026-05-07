/**
 * 两步验证 (2FA) 控制器
 */

const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const twoFactorService = require('../services/twoFactorService');

/**
 * 获取 2FA 状态
 * GET /api/2fa/status
 */
exports.getStatus = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        twoFactorEnabled: true,
        twoFactorEnabledAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      });
    }

    res.json({
      success: true,
      data: {
        enabled: user.twoFactorEnabled,
        enabledAt: user.twoFactorEnabledAt,
      },
    });
  } catch (error) {
    console.error('[2FA] 获取状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取状态失败',
    });
  }
};

/**
 * 开始启用 2FA（生成 secret 和二维码）
 * POST /api/2fa/setup
 *
 * 注意：secret 只在此接口返回一次，不会存储到数据库
 * 用户需要在验证成功后才会真正启用
 */
exports.setup = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '两步验证已启用',
      });
    }

    // 生成新的 secret
    const secret = twoFactorService.generateSecret();

    // 生成二维码
    const qrCodeDataURL = await twoFactorService.generateQRCodeDataURL(
      secret,
      user.username
    );

    // 返回 secret 和二维码（secret 用于前端临时保存，验证时再提交）
    res.json({
      success: true,
      data: {
        secret,
        qrCodeDataURL,
        issuer: twoFactorService.ISSUER,
        // 用于手动输入的信息
        manualEntry: {
          secret,
          account: user.username,
          issuer: twoFactorService.ISSUER,
        },
      },
    });
  } catch (error) {
    console.error('[2FA] 启用设置失败:', error);
    res.status(500).json({
      success: false,
      error: '启用设置失败',
    });
  }
};

/**
 * 验证并完成 2FA 启用
 * POST /api/2fa/verify-setup
 *
 * Body: { secret: string, code: string }
 * 返回恢复码（仅此一次）
 */
exports.verifySetup = async (req, res) => {
  try {
    const { secret, code } = req.body;

    if (!secret || !code) {
      return res.status(400).json({
        success: false,
        error: '请提供 secret 和验证码',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '两步验证已启用',
      });
    }

    // 验证 TOTP 码
    const isValid = twoFactorService.verifyTOTPWithPlainSecret(secret, code);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: '验证码错误，请重试',
      });
    }

    // 生成恢复码
    const backupCodes = twoFactorService.generateBackupCodes(10);
    const hashedBackupCodes = await twoFactorService.hashBackupCodes(backupCodes);

    // 加密 secret 并保存
    const encryptedSecret = twoFactorService.encryptSecret(secret);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: encryptedSecret,
        twoFactorBackupCodes: hashedBackupCodes,
        twoFactorEnabledAt: new Date(),
      },
    });

    console.log(`[2FA] 用户 ${req.user.id} 启用了两步验证`);

    // 返回恢复码（仅此一次！）
    res.json({
      success: true,
      message: '两步验证已启用',
      data: {
        backupCodes,
        warning: '请妥善保存恢复码，它们只会显示一次！',
      },
    });
  } catch (error) {
    console.error('[2FA] 验证启用失败:', error);
    res.status(500).json({
      success: false,
      error: '验证启用失败',
    });
  }
};

/**
 * 关闭 2FA
 * POST /api/2fa/disable
 *
 * Body: { password: string, code: string }
 */
exports.disable = async (req, res) => {
  try {
    const { password, code } = req.body;

    if (!password || !code) {
      return res.status(400).json({
        success: false,
        error: '请提供密码和验证码',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        password: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '两步验证未启用',
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: '密码错误',
      });
    }

    // 验证 TOTP 码
    const isCodeValid = twoFactorService.verifyTOTP(user.twoFactorSecret, code);
    if (!isCodeValid) {
      return res.status(400).json({
        success: false,
        error: '验证码错误',
      });
    }

    // 清空 2FA 设置
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        twoFactorEnabledAt: null,
      },
    });

    console.log(`[2FA] 用户 ${req.user.id} 关闭了两步验证`);

    res.json({
      success: true,
      message: '两步验证已关闭',
    });
  } catch (error) {
    console.error('[2FA] 关闭失败:', error);
    res.status(500).json({
      success: false,
      error: '关闭失败',
    });
  }
};

/**
 * 重新生成恢复码
 * POST /api/2fa/regenerate-backup
 *
 * Body: { code: string }
 */
exports.regenerateBackupCodes = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: '请提供验证码',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({
        success: false,
        error: '两步验证未启用',
      });
    }

    // 验证 TOTP 码
    const isCodeValid = twoFactorService.verifyTOTP(user.twoFactorSecret, code);
    if (!isCodeValid) {
      return res.status(400).json({
        success: false,
        error: '验证码错误',
      });
    }

    // 生成新的恢复码
    const backupCodes = twoFactorService.generateBackupCodes(10);
    const hashedBackupCodes = await twoFactorService.hashBackupCodes(backupCodes);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        twoFactorBackupCodes: hashedBackupCodes,
      },
    });

    console.log(`[2FA] 用户 ${req.user.id} 重新生成了恢复码`);

    res.json({
      success: true,
      message: '恢复码已重新生成',
      data: {
        backupCodes,
        warning: '请妥善保存恢复码，它们只会显示一次！之前的恢复码已失效。',
      },
    });
  } catch (error) {
    console.error('[2FA] 重新生成恢复码失败:', error);
    res.status(500).json({
      success: false,
      error: '重新生成恢复码失败',
    });
  }
};

/**
 * 获取恢复码剩余数量
 * GET /api/2fa/backup-codes-count
 */
exports.getBackupCodesCount = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        twoFactorEnabled: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
      });
    }

    res.json({
      success: true,
      data: {
        enabled: user.twoFactorEnabled,
        remainingBackupCodes: user.twoFactorBackupCodes?.length || 0,
      },
    });
  } catch (error) {
    console.error('[2FA] 获取恢复码数量失败:', error);
    res.status(500).json({
      success: false,
      error: '获取恢复码数量失败',
    });
  }
};
