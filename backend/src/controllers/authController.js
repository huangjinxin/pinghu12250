/**
 * 认证控制器
 */

const bcrypt = require('bcryptjs');
const { setTokensInCookies, hashToken } = require('../utils/sessionHelper');
const pointService = require('../services/pointService');
const { processUserAvatar } = require('../utils/avatarHelper');
const twoFactorService = require('../services/twoFactorService');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

/**
 * 解析 User-Agent 字符串，获取设备信息
 */
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return { deviceType: 'Unknown', deviceName: 'Unknown', browser: 'Unknown', os: 'Unknown' };
  }

  const ua = userAgent.toLowerCase();

  let deviceType = 'desktop';
  let deviceName = 'Unknown';
  let browser = 'Unknown';
  let os = 'Unknown';

  if (ua.includes('mobile') || ua.includes('android') && !ua.includes('mobile') || ua.includes('iphone') || ua.includes('ipad') || ua.includes('tablet')) {
    if (ua.includes('ipad') || ua.includes('tablet')) {
      deviceType = 'tablet';
      deviceName = 'Tablet';
    } else {
      deviceType = 'mobile';
      deviceName = 'Mobile';
    }
  }

  if (ua.includes('windows')) {
    os = ua.includes('windows nt 10') ? 'Windows 10' :
         ua.includes('windows nt 11') ? 'Windows 11' :
         ua.includes('windows nt') ? 'Windows' : 'Windows';
    deviceName = deviceName === 'Unknown' ? 'Windows' : deviceName + ' (Windows)';
  } else if (ua.includes('mac os') || ua.includes('macos')) {
    os = 'macOS';
    deviceName = deviceName === 'Unknown' ? 'Mac' : deviceName + ' (macOS)';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    const match = ua.match(/os (\d+)_/);
    const version = match ? ` iOS ${match[1]}` : '';
    os = 'iOS' + version;
    deviceName = ua.includes('iphone') ? 'iPhone' : 'iPad';
  } else if (ua.includes('android')) {
    const match = ua.match(/android (\d+\.\d+)/);
    const version = match ? ` Android ${match[1]}` : '';
    os = 'Android' + version;
    deviceName = 'Android Phone';
  } else if (ua.includes('linux')) {
    os = 'Linux';
    deviceName = deviceName === 'Unknown' ? 'Linux' : deviceName + ' (Linux)';
  }

  if (ua.includes('chrome') && !ua.includes('edge') && !ua.includes('opr')) {
    browser = 'Chrome';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    browser = 'Safari';
  } else if (ua.includes('firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('edge') || ua.includes('edg')) {
    browser = 'Edge';
  } else if (ua.includes('opera') || ua.includes('opr')) {
    browser = 'Opera';
  }

  return { deviceType, deviceName, browser, os };
}

/**
 * 用户注册
 */
exports.register = async (req, res, next) => {
  try {
    const {
      email, username, password, role = 'STUDENT',
      inviteCode, realName, birthDate, studentNumber, classId
    } = req.body;

    // 验证必填字段
    if (!email || !username || !password || !inviteCode || !realName || !birthDate) {
      return res.status(400).json({ error: '邮箱、用户名、密码、邀请码、真实姓名和出生日期为必填项' });
    }

    // 验证邀请码
    const invite = await prisma.inviteCode.findUnique({
      where: { code: inviteCode }
    });

    if (!invite) {
      return res.status(400).json({ error: '邀请码无效' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: '邀请码已过期' });
    }

    if (invite.usedCount >= invite.maxUses) {
      return res.status(400).json({ error: '邀请码已达使用上限' });
    }

    // 检查用户是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: '邮箱或用户名已被使用' });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户（ACTIVE状态，但标记需审核）
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: invite.role || role,
        status: 'ACTIVE',
        needsReview: true,
        avatar: null,
        realName,
        birthDate: new Date(birthDate),
        studentNumber,
        classId: invite.classId || classId,
        inviteCodeId: invite.id,
        registeredAt: new Date(),
        profile: {
          create: {
            nickname: realName,
            joinedDays: 0,
          },
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatar: true,
        realName: true,
        needsReview: true,
        createdAt: true,
      },
    });

    // 更新邀请码使用次数
    await prisma.inviteCode.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } }
    });

    // 生成token并设置cookie
    const { accessToken } = await setTokensInCookies(res, user.id, req.ip || req.connection?.remoteAddress, req.headers['user-agent']);
    const token = accessToken;

    // 处理头像
    const avatarData = processUserAvatar(user);
    const userWithAvatar = { ...user, ...avatarData };

    res.status(201).json({
      message: '注册成功，24小时内可免审核使用',
      token,
      user: userWithAvatar,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 用户登录
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码为必填项' });
    }

    // 查找用户（支持邮箱或用户名登录）
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: username }, { username }],
      },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        role: true,
        status: true,
        avatar: true,
        createdAt: true,
        profile: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
        needsReview: true,
        registeredAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // 记录失败的登录尝试
      const deviceInfo = parseUserAgent(req.headers['user-agent']);
      await prisma.loginActivity.create({
        data: {
          userId: user.id,
          loginType: 'password',
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'],
          ...deviceInfo,
          isSuccess: false,
          failReason: 'invalid_password',
        },
      });
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 检查24小时审核期
    if (user.needsReview) {
      const hoursSinceRegistration = (Date.now() - new Date(user.registeredAt).getTime()) / (1000 * 60 * 60);

      if (hoursSinceRegistration > 24) {
        // 超过24小时未审核，自动锁定
        await prisma.user.update({
          where: { id: user.id },
          data: { status: 'PENDING' }
        });

        return res.status(403).json({
          error: '账号审核中，请等待管理员审核后再登录'
        });
      }
    }

    // 检查用户状态
    if (user.status === 'PENDING') {
      return res.status(403).json({ error: '账号正在审核中，请等待管理员审核' });
    }

    if (user.status === 'DISABLED') {
      return res.status(403).json({ error: '账号已被禁用，请联系管理员' });
    }

    // 检查是否启用了两步验证
    if (user.twoFactorEnabled) {
      // 生成临时 token，用于 2FA 验证流程
      const tempToken = twoFactorService.generateTempToken(user.id);
      return res.json({
        requiresTwoFactor: true,
        tempToken,
        message: '请输入两步验证码',
      });
    }

    // 生成token并设置cookie
    const { accessToken } = await setTokensInCookies(res, user.id, req.ip || req.connection?.remoteAddress, req.headers['user-agent']);
    const token = accessToken;

    // 记录登录活动详情
    const deviceInfo = parseUserAgent(req.headers['user-agent']);
    await prisma.loginActivity.create({
      data: {
        userId: user.id,
        loginType: 'password',
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        ...deviceInfo,
        isSuccess: true,
      },
    });

    // 记录通用活动日志
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'login',
        description: '用户登录',
        ipAddress: req.ip || req.connection?.remoteAddress,
      },
    });

    // 应用登录积分（每日登录 + 连续登录奖励）
    let loginPointsInfo = null;
    try {
      const loginResult = await pointService.applyLoginPoints(user.id);
      if (loginResult.success && loginResult.log) {
        loginPointsInfo = {
          earnedPoints: loginResult.log.pointsChanged,
          totalPoints: loginResult.totalPoints,
          message: loginResult.message,
        };
      }
    } catch (error) {
      console.error('登录积分奖励失败:', error);
    }

    // 移除密码和敏感 2FA 字段
    const {
      password: _,
      twoFactorSecret: __,
      twoFactorBackupCodes: ___,
      ...userWithoutPassword
    } = user;

    // 处理头像（生成文字头像）
    const avatarData = processUserAvatar(userWithoutPassword);
    const userWithAvatar = { ...userWithoutPassword, ...avatarData };

    res.json({
      message: '登录成功',
      token,
      user: userWithAvatar,
      loginPoints: loginPointsInfo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 刷新token
 */
exports.refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: '未提供刷新令牌' });
    }

    const { verifyRefreshToken } = require('../utils/jwt');
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (e) {
      return res.status(401).json({ error: '刷新令牌无效或已过期' });
    }

    // 验证UserSession
    const tokenHash = hashToken(refreshToken);
    const session = await prisma.userSession.findUnique({
      where: { tokenHash }
    });

    if (!session || session.isRevoked) {
      return res.status(401).json({ error: '会话已失效，请重新登录' });
    }

    // 验证用户密码是否已修改
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (user.passwordChangedAt && session.createdAt < user.passwordChangedAt) {
      // 会话是在密码修改前创建的，强制失效
      await prisma.userSession.update({
        where: { id: session.id },
        data: { isRevoked: true }
      });
      return res.status(401).json({ error: '密码已修改，请重新登录' });
    }

    // 重新签发双Token
    const { accessToken } = await setTokensInCookies(res, user.id, req.ip || req.connection?.remoteAddress, req.headers['user-agent']);

    res.json({
      message: '令牌刷新成功',
      token: accessToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 登出当前设备
 */
exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.userSession.updateMany({
        where: { tokenHash },
        data: { isRevoked: true }
      });
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: '已登出' });
  } catch (error) {
    next(error);
  }
};

/**
 * 登出所有设备
 */
exports.logoutAll = async (req, res, next) => {
  try {
    const userId = req.user.id;
    await prisma.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true }
    });

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: '已从所有设备登出' });
  } catch (error) {
    next(error);
  }
};

/**
 * 验证两步验证码
 * POST /api/auth/verify-2fa
 *
 * Body: { tempToken: string, code: string }
 * code 可以是 6 位 TOTP 验证码，或 XXXX-XXXX-XXXX 格式的恢复码
 */
/**
 * 删除账户
 * DELETE /api/auth/delete-account
 * 需要登录状态，需要验证密码
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: '请输入密码确认删除' });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, username: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: '密码错误' });
    }

    // 删除用户（级联删除关联数据）
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log(`[Account Deleted] User ${user.username} (${userId}) deleted their account`);

    res.json({
      success: true,
      message: '账户已删除',
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyTwoFactor = async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ error: '请提供临时令牌和验证码' });
    }

    // 验证临时 token
    const tokenResult = twoFactorService.verifyTempToken(tempToken);
    if (!tokenResult.valid) {
      return res.status(401).json({ error: '验证已过期，请重新登录' });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: tokenResult.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        avatar: true,
        createdAt: true,
        profile: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        twoFactorBackupCodes: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '两步验证未启用' });
    }

    // 判断是 TOTP 验证码还是恢复码
    const isBackupCode = code.includes('-') || code.length > 6;
    let isValid = false;
    let usedBackupCodeIndex = -1;

    if (isBackupCode) {
      // 验证恢复码
      const backupResult = await twoFactorService.verifyBackupCode(
        code,
        user.twoFactorBackupCodes
      );
      isValid = backupResult.valid;
      usedBackupCodeIndex = backupResult.index;
    } else {
      // 验证 TOTP 码
      isValid = twoFactorService.verifyTOTP(user.twoFactorSecret, code);
    }

    if (!isValid) {
      // 记录失败的2FA尝试
      const deviceInfo = parseUserAgent(req.headers['user-agent']);
      await prisma.loginActivity.create({
        data: {
          userId: user.id,
          loginType: 'two_factor',
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'],
          ...deviceInfo,
          isSuccess: false,
          failReason: 'invalid_code',
        },
      });
      return res.status(400).json({ error: '验证码错误' });
    }

    // 如果使用了恢复码，从数组中移除
    if (usedBackupCodeIndex >= 0) {
      const updatedBackupCodes = [...user.twoFactorBackupCodes];
      updatedBackupCodes.splice(usedBackupCodeIndex, 1);
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorBackupCodes: updatedBackupCodes },
      });
      console.log(`[2FA] 用户 ${user.id} 使用了恢复码，剩余 ${updatedBackupCodes.length} 个`);
    }

    // 生成正式 token
    const { accessToken } = await setTokensInCookies(res, user.id, req.ip || req.connection?.remoteAddress, req.headers['user-agent']);
    const token = accessToken;

    // 记录登录活动详情（两步验证）
    const deviceInfo = parseUserAgent(req.headers['user-agent']);
    await prisma.loginActivity.create({
      data: {
        userId: user.id,
        loginType: 'two_factor',
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent'],
        ...deviceInfo,
        isSuccess: true,
      },
    });

    // 记录通用活动日志
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'login',
        description: '用户登录（两步验证）',
        ipAddress: req.ip || req.connection?.remoteAddress,
      },
    });

    // 应用登录积分
    let loginPointsInfo = null;
    try {
      const loginResult = await pointService.applyLoginPoints(user.id);
      if (loginResult.success && loginResult.log) {
        loginPointsInfo = {
          earnedPoints: loginResult.log.pointsChanged,
          totalPoints: loginResult.totalPoints,
          message: loginResult.message,
        };
      }
    } catch (error) {
      console.error('登录积分奖励失败:', error);
    }

    // 处理头像
    const avatarData = processUserAvatar(user);
    const userWithAvatar = { ...user, ...avatarData };

    // 移除敏感字段
    delete userWithAvatar.twoFactorSecret;
    delete userWithAvatar.twoFactorBackupCodes;

    res.json({
      message: '登录成功',
      token,
      user: userWithAvatar,
      loginPoints: loginPointsInfo,
      usedBackupCode: usedBackupCodeIndex >= 0,
      remainingBackupCodes: usedBackupCodeIndex >= 0
        ? user.twoFactorBackupCodes.length - 1
        : undefined,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取活跃会话列表
 */
exports.getSessions = async (req, res, next) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: { 
        userId: req.user.id,
        isRevoked: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    const currentTokenHash = req.cookies.refreshToken ? hashToken(req.cookies.refreshToken) : null;

    const data = sessions.map(s => ({
      id: s.id,
      device: s.device,
      ip: s.ip,
      createdAt: s.createdAt,
      isCurrent: s.tokenHash === currentTokenHash
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

/**
 * 吊销特定会话
 */
exports.revokeSession = async (req, res, next) => {
  try {
    const { id } = req.params;

    const session = await prisma.userSession.findUnique({
      where: { id }
    });

    if (!session || session.userId !== req.user.id) {
      return res.status(404).json({ error: '会话未找到' });
    }

    await prisma.userSession.update({
      where: { id },
      data: { isRevoked: true }
    });

    res.json({ success: true, message: '设备已成功下线' });
  } catch (error) {
    next(error);
  }
};
