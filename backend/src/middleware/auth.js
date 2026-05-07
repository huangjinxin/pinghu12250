/**
 * JWT认证中间件
 */

const jwt = require('jsonwebtoken');
// 使用 Prisma 单例
const prisma = require('../lib/prisma');

/**
 * 验证JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // 优先从 Cookie 读取，兼容 Header
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 获取完整用户信息以校验安全状态
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatar: true,
        passwordChangedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // 安全校验：如果 Token 签发时间早于密码修改时间，则失效
    const tokenIat = decoded.iat * 1000;
    if (user.passwordChangedAt && tokenIat < new Date(user.passwordChangedAt).getTime()) {
      return res.status(401).json({ error: '密码已修改，请重新登录', code: 'PASSWORD_CHANGED' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '无效的令牌' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期', code: 'TOKEN_EXPIRED' });
    }
    next(error);
  }
};

/**
 * 角色验证中间件
 * @param {string[]} roles - 允许的角色数组
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }

    next();
  };
};

/**
 * 验证管理员权限（快捷方法）
 */
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: '未认证' });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: '需要管理员权限' });
  }

  next();
};

/**
 * 可选认证中间件（有token就验证，没有也放行）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        avatar: true,
        passwordChangedAt: true,
      },
    });

    if (user) {
      // 安全校验：如果 Token 签发时间早于密码修改时间，则不设置 user
      const tokenIat = decoded.iat * 1000;
      if (!user.passwordChangedAt || tokenIat >= new Date(user.passwordChangedAt).getTime()) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // token无效也放行，只是不设置user
    next();
  }
};

module.exports = { authenticate, authorize, isAdmin, optionalAuth };
