/**
 * 认证控制器
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');
const pointService = require('../services/pointService');
const { processUserAvatar } = require('../utils/avatarHelper');

const prisma = new PrismaClient();

/**
 * 用户注册
 */
exports.register = async (req, res, next) => {
  try {
    const { email, username, password, role = 'STUDENT' } = req.body;

    // 验证必填字段
    if (!email || !username || !password) {
      return res.status(400).json({ error: '邮箱、用户名和密码为必填项' });
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

    // 创建用户（不设置默认头像，后续自动生成文字头像）
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role,
        avatar: null, // 不设置默认头像，使用文字头像
        profile: {
          create: {
            nickname: username,
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
        createdAt: true,
      },
    });

    // 生成token
    const token = generateToken(user.id);

    // 处理头像（生成文字头像）
    const avatarData = processUserAvatar(user);
    const userWithAvatar = { ...user, ...avatarData };

    res.status(201).json({
      message: '注册成功',
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
      include: {
        profile: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 检查用户状态
    if (user.status === 'PENDING') {
      return res.status(403).json({ error: '账号正在审核中，请等待管理员审核' });
    }

    if (user.status === 'DISABLED') {
      return res.status(403).json({ error: '账号已被禁用，请联系管理员' });
    }

    // 生成token
    const token = generateToken(user.id);

    // 记录登录活动
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

    // 移除密码字段
    const { password: _, ...userWithoutPassword } = user;

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
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: '未提供令牌' });
    }

    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    const newToken = generateToken(decoded.userId);

    res.json({
      message: '令牌刷新成功',
      token: newToken,
    });
  } catch (error) {
    return res.status(401).json({ error: '令牌无效或已过期' });
  }
};
