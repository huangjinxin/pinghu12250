/**
 * JWT认证中间件
 */

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * 验证JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
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
      },
    });

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '无效的令牌' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期' });
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

module.exports = { authenticate, authorize, isAdmin };
