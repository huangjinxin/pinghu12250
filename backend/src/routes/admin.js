/**
 * 管理员路由
 */

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

// GET /api/admin/users - 获取所有用户
router.get('/users', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { status, role, keyword, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (role) where.role = role;

    // 关键词搜索（用户名、昵称、邮箱）
    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { email: { contains: keyword } },
        { profile: { nickname: { contains: keyword } } },
      ];
    }

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
          // 家长关联的孩子（家长作为 parent，所以查 parentRelations）
          parentRelations: {
            select: {
              child: {
                select: {
                  id: true,
                  username: true,
                  profile: { select: { nickname: true } },
                },
              },
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

// POST /api/admin/users - 管理员创建用户
router.post('/users', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { username, email, password, role, nickname, childrenIds } = req.body;

    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码为必填项' });
    }

    if (!['STUDENT', 'PARENT', 'TEACHER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ error: '无效的用户角色' });
    }

    // 验证密码长度
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // 检查用户名和邮箱是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: '用户名已存在' });
      }
      return res.status(400).json({ error: '邮箱已被注册' });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role,
        status: 'ACTIVE', // 管理员创建的用户直接激活
        profile: {
          create: {
            nickname: nickname || username,
          },
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
      },
    });

    // 如果是家长且选择了孩子，创建关联关系
    if (role === 'PARENT' && childrenIds && childrenIds.length > 0) {
      // 验证孩子账户是否存在且是学生，同时获取Student记录
      const children = await prisma.user.findMany({
        where: {
          id: { in: childrenIds },
          role: 'STUDENT',
        },
        include: {
          student: true,
        },
      });

      for (const child of children) {
        // 确保Student记录存在
        let studentRecord = child.student;
        if (!studentRecord) {
          studentRecord = await prisma.student.create({
            data: { userId: child.id },
          });
        }

        // 创建家长-孩子关联
        await prisma.studentParent.upsert({
          where: {
            studentId_parentId: {
              studentId: studentRecord.id,
              parentId: user.id,
            },
          },
          update: {},
          create: {
            studentId: studentRecord.id,
            parentId: user.id,
            childId: child.id,
          },
        });
      }
    }

    // 记录活动日志
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'create_user',
        targetType: 'user',
        targetId: user.id,
        description: `创建了${role === 'STUDENT' ? '学生' : role === 'PARENT' ? '家长' : role === 'TEACHER' ? '老师' : '管理员'}账户 ${username}`,
      },
    });

    res.json({ message: '用户创建成功', user });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/students - 获取学生列表（供家长关联使用）
router.get('/students', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { keyword, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { role: 'STUDENT' };

    if (keyword) {
      where.OR = [
        { username: { contains: keyword } },
        { email: { contains: keyword } },
        { profile: { nickname: { contains: keyword } } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          profile: {
            select: { nickname: true },
          },
          // 已关联的家长数
          parentRelations: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      students: students.map(s => ({
        ...s,
        parentCount: s.parentRelations?.length || 0,
        parentRelations: undefined,
      })),
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

// PUT /api/admin/users/:id/children - 更新家长关联的孩子
router.put('/users/:id/children', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { childrenIds } = req.body;

    // 验证用户是否存在且是家长
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.role !== 'PARENT') {
      return res.status(400).json({ error: '只有家长账户可以关联孩子' });
    }

    // 删除旧的关联
    await prisma.studentParent.deleteMany({
      where: { parentId: id },
    });

    // 创建新的关联
    if (childrenIds && childrenIds.length > 0) {
      const children = await prisma.user.findMany({
        where: {
          id: { in: childrenIds },
          role: 'STUDENT',
        },
        include: {
          student: true,
        },
      });

      for (const child of children) {
        // 确保Student记录存在
        let studentRecord = child.student;
        if (!studentRecord) {
          studentRecord = await prisma.student.create({
            data: { userId: child.id },
          });
        }

        // 创建家长-孩子关联
        await prisma.studentParent.create({
          data: {
            studentId: studentRecord.id,
            parentId: id,
            childId: child.id,
          },
        });
      }
    }

    // 记录活动日志
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'update_parent_children',
        targetType: 'user',
        targetId: id,
        description: `更新了家长 ${user.username} 关联的孩子账户`,
      },
    });

    res.json({ message: '关联更新成功' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:id - 删除用户
router.delete('/users/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 不允许删除管理员
    if (user.role === 'ADMIN') {
      return res.status(403).json({ error: '不能删除管理员账户' });
    }

    // 不允许删除自己
    if (user.id === req.user.id) {
      return res.status(403).json({ error: '不能删除自己的账户' });
    }

    // 删除用户（关联数据通过数据库级联删除自动处理）
    await prisma.user.delete({ where: { id } });

    // 记录活动日志
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'delete_user',
        targetType: 'user',
        targetId: id,
        description: `删除了用户 ${user.username}`,
      },
    });

    res.json({ message: '用户删除成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
