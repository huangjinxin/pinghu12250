/**
 * 管理员路由
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// GET /api/admin/users - 获取所有用户
router.get('/users', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { status, role, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
          status: true,
          avatar: true,
          createdAt: true,
          profile: {
            select: {
              nickname: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/status - 更新用户状态
router.put('/users/:id/status', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['PENDING', 'ACTIVE', 'DISABLED'].includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        username: true,
        status: true,
      },
    });

    // 记录活动日志
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'update_user_status',
        targetType: 'user',
        targetId: id,
        description: `将用户 ${user.username} 状态更新为 ${status}${reason ? `, 原因: ${reason}` : ''}`,
      },
    });

    res.json({ message: '状态更新成功', user: updated });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/pending-users - 获取待审核用户
router.get('/pending-users', authenticate, isAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        status: true,
        avatar: true,
        createdAt: true,
        profile: {
          select: {
            nickname: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/activity-logs - 获取活动日志
router.get('/activity-logs', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { userId, action, startDate, endDate, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: {
                select: { nickname: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/stats - 获取管理统计数据
router.get('/stats', authenticate, isAdmin, async (req, res, next) => {
  try {
    const [
      totalUsers,
      pendingUsers,
      activeUsers,
      disabledUsers,
      todayLogins,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'DISABLED' } }),
      prisma.activityLog.count({
        where: {
          action: 'login',
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    res.json({
      totalUsers,
      pendingUsers,
      activeUsers,
      disabledUsers,
      todayLogins,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/joined-date - 修改用户加入时间（管理员专用）
router.put('/users/:id/joined-date', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { createdAt } = req.body;

    if (!createdAt) {
      return res.status(400).json({ error: '加入时间不能为空' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const newDate = new Date(createdAt);
    if (isNaN(newDate.getTime())) {
      return res.status(400).json({ error: '无效的日期格式' });
    }

    await prisma.user.update({
      where: { id },
      data: { createdAt: newDate },
    });

    // 记录活动日志
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'update_user_joined_date',
        targetType: 'user',
        targetId: id,
        description: `将用户 ${user.username} 的加入时间修改为 ${newDate.toLocaleDateString('zh-CN')}`,
      },
    });

    res.json({ message: '加入时间更新成功' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/reset-password - 重置用户密码（管理员专用）
router.put('/users/:id/reset-password', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // 验证密码
    if (!newPassword) {
      return res.status(400).json({ error: '新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 防止重置管理员密码（除非是超级管理员）
    if (user.role === 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: '无权重置管理员密码' });
    }

    // 哈希新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // 记录活动日志
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'reset_user_password',
        targetType: 'user',
        targetId: id,
        description: `重置了用户 ${user.username} (${user.email}) 的密码`,
      },
    });

    res.json({ message: '密码重置成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
