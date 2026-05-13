/**
 * 管理员路由
 */

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const adminCreditController = require('../controllers/adminCreditController');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

// ========== 信用管理 ==========
router.get('/credit-rules', authenticate, isAdmin, adminCreditController.getRules);
router.post('/credit-rules', authenticate, isAdmin, adminCreditController.createRule);
router.put('/credit-rules/:id', authenticate, isAdmin, adminCreditController.updateRule);
router.delete('/credit-rules/:id', authenticate, isAdmin, adminCreditController.deleteRule);

router.get('/credit-profiles', authenticate, isAdmin, adminCreditController.getAllUserProfiles);
router.get('/credit-profiles/:userId', authenticate, isAdmin, adminCreditController.getUserCreditDetail);
router.get('/credit-profiles/:userId/history', authenticate, isAdmin, adminCreditController.getUserCreditHistory);

// GET /api/admin/users - 获取所有用户
router.get('/users', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { status, role, keyword, search, schoolId, classId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (role === 'BOT') {
      where.username = { startsWith: 'echo-bot' };
    } else if (role) {
      where.role = role;
    }
    if (schoolId) {
      where.schoolId = schoolId;
    }
    if (classId) {
      where.classId = classId;
    }

    // 关键词搜索（用户名、昵称、邮箱）
    const searchTerm = keyword || search;
    if (searchTerm) {
      where.OR = [
        { username: { contains: searchTerm } },
        { email: { contains: searchTerm } },
        { profile: { is: { nickname: { contains: searchTerm } } } },
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
          classId: true,
          createdAt: true,
          twoFactorEnabled: true,
          profile: {
            select: {
              nickname: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              grade: true,
              school: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          Student: {
            select: {
              class: {
                select: {
                  id: true,
                  name: true,
                  grade: true,
                  school: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          StudentParent_StudentParent_parentIdToUser: {
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
      users: users.map(({ class: classInfo, Student, StudentParent_StudentParent_parentIdToUser, ...user }) => ({
        ...user,
        classInfo,
        student: Student,
        parentRelations: StudentParent_StudentParent_parentIdToUser,
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
    // 获取昨天的时间范围
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      pendingUsers,
      activeUsers,
      disabledUsers,
      yesterdayActivity,
      todayLogins,
      bestTypingScore,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'DISABLED' } }),
      // 昨日活跃用户数（去重）
      prisma.activityLog.groupBy({
        by: ['userId'],
        where: {
          action: 'login',
          createdAt: { gte: yesterday, lt: todayStart },
        },
      }),
      // 今日登录次数
      prisma.activityLog.count({
        where: {
          action: 'login',
          createdAt: { gte: todayStart },
        },
      }),
      // 打字最高分
      prisma.typingPractice.aggregate({
        where: { isValid: true },
        _max: { score: true }
      }),
    ]);

    res.json({
      totalUsers,
      pendingUsers,
      activeUsers,
      disabledUsers,
      yesterdayActive: yesterdayActivity.length,
      todayLogins,
      bestTypingScore: bestTypingScore._max.score || 0,
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
          StudentParent_StudentParent_parentIdToUser: {
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
      students: students.map(s => {
        const { StudentParent_StudentParent_parentIdToUser: prels, ...rest } = s;
        return {
          ...rest,
          parentCount: prels?.length || 0,
        };
      }),
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

// DELETE /api/admin/users/:id/2fa - 清空用户的两步验证（管理员专用）
router.delete('/users/:id/2fa', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        twoFactorEnabled: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: '该用户未启用两步验证' });
    }

    // 清空 2FA 设置
    await prisma.user.update({
      where: { id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
        twoFactorEnabledAt: null,
      },
    });

    // 记录活动日志
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'clear_user_2fa',
        targetType: 'user',
        targetId: id,
        description: `清空了用户 ${user.username} 的两步验证`,
      },
    });

    console.log(`[Admin] 管理员 ${req.user.id} 清空了用户 ${user.username} 的 2FA`);

    res.json({
      success: true,
      message: '两步验证已清空',
    });
  } catch (error) {
    next(error);
  }
});

// 获取待审核用户列表
router.get('/users/pending', authenticate, isAdmin, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { status: 'PENDING' },
          { needsReview: true }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        realName: true,
        birthDate: true,
        studentNumber: true,
        role: true,
        status: true,
        needsReview: true,
        registeredAt: true,
        classId: true,
        class: { select: { name: true } },
        inviteCode: {
          select: {
            code: true,
            creator: { select: { username: true } }
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    });

    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
});

// 审核通过用户
router.post('/users/:id/approve', authenticate, isAdmin, async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        status: 'ACTIVE',
        needsReview: false,
        approvedBy: req.user.id,
        approvedAt: new Date()
      }
    });

    res.json({ success: true, data: user, message: '用户已审核通过' });
  } catch (error) {
    next(error);
  }
});

// 拒绝用户（禁用账号）
router.post('/users/:id/reject', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { reason } = req.body;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        status: 'DISABLED',
        approvedBy: req.user.id,
        approvedAt: new Date()
      }
    });

    res.json({ success: true, data: user, message: '用户已被拒绝' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/assign-class - 分配学生班级
router.put('/users/:id/assign-class', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { classId } = req.body;

    // 验证用户存在且是学生
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    if (user.role !== 'STUDENT') {
      return res.status(400).json({ success: false, error: '只能为学生分配班级' });
    }

    // 验证班级存在
    if (classId) {
      const classExists = await prisma.class.findUnique({
        where: { id: classId },
      });

      if (!classExists) {
        return res.status(400).json({ success: false, error: '班级不存在' });
      }
    }

    // 更新用户班级
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { classId: classId || null },
      select: {
        id: true,
        username: true,
        classId: true,
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            school: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // 同时更新Student表（如果存在）
    await prisma.student.updateMany({
      where: { userId: id },
      data: { classId: classId || null },
    });

    res.json({ success: true, data: updatedUser, message: '班级分配成功' });
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users/:id/settings - 获取用户所有设置
router.get('/users/:id/settings', authenticate, isAdmin, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        profile: true,
        class: {
          select: {
            id: true,
            name: true,
            grade: true,
            school: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const settings = {
      basic: {
        nickname: user.profile?.nickname || '',
        grade: user.profile?.grade || '',
        bio: user.profile?.bio || '',
        interests: user.profile?.interests || [],
      },
      privacy: {
        profilePublic: user.profile?.profilePublic ?? true,
        showStats: user.profile?.showStats ?? true,
        hideFromParents: user.profile?.hideFromParents ?? false,
      },
      security: {
        twoFactorEnabled: user.twoFactorEnabled,
        twoFactorEnabledAt: user.twoFactorEnabledAt,
        autoAcceptFriend: user.autoAcceptFriend ?? false,
        friendRequestMessage: user.friendRequestMessage || '',
      },
      school: user.class ? {
        schoolId: user.class.school?.id,
        schoolName: user.class.school?.name,
        classId: user.class.id,
        className: user.class.name,
        classGrade: user.class.grade,
      } : null,
    };

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id/settings - 更新用户设置
router.put('/users/:id/settings', authenticate, isAdmin, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { profile: true },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const { basic, privacy, security } = req.body;
    const changes = [];

    // 更新基本资料
    if (basic && user.Profile) {
      const profileUpdate = {};
      if (basic.nickname !== undefined && basic.nickname !== user.Profile.nickname) {
        profileUpdate.nickname = basic.nickname;
        changes.push(`昵称`);
      }
      if (basic.grade !== undefined && basic.grade !== user.Profile.grade) {
        profileUpdate.grade = basic.grade;
        changes.push(`年级`);
      }
      if (basic.bio !== undefined && basic.bio !== user.Profile.bio) {
        profileUpdate.bio = basic.bio;
        changes.push(`个人简介`);
      }
      if (basic.interests !== undefined && JSON.stringify(basic.interests) !== JSON.stringify(user.Profile.interests)) {
        profileUpdate.interests = basic.interests;
        changes.push(`兴趣爱好`);
      }

      if (Object.keys(profileUpdate).length > 0) {
        await prisma.profile.update({
          where: { userId: user.id },
          data: profileUpdate,
        });
      }
    }

    // 更新隐私设置
    if (privacy && user.Profile) {
      const profileUpdate = {};
      if (privacy.profilePublic !== undefined && privacy.profilePublic !== user.Profile.profilePublic) {
        profileUpdate.profilePublic = privacy.profilePublic;
        changes.push(`个人主页公开状态`);
      }
      if (privacy.showStats !== undefined && privacy.showStats !== user.Profile.showStats) {
        profileUpdate.showStats = privacy.showStats;
        changes.push(`统计数据展示`);
      }
      if (privacy.hideFromParents !== undefined && privacy.hideFromParents !== user.Profile.hideFromParents) {
        profileUpdate.hideFromParents = privacy.hideFromParents;
        changes.push(`家长共享设置`);
      }

      if (Object.keys(profileUpdate).length > 0) {
        await prisma.profile.update({
          where: { userId: user.id },
          data: profileUpdate,
        });
      }
    }

    // 更新安全设置
    if (security) {
      const userUpdate = {};
      if (security.autoAcceptFriend !== undefined && security.autoAcceptFriend !== user.autoAcceptFriend) {
        userUpdate.autoAcceptFriend = security.autoAcceptFriend;
        changes.push(`自动接受好友`);
      }
      if (security.friendRequestMessage !== undefined && security.friendRequestMessage !== user.friendRequestMessage) {
        userUpdate.friendRequestMessage = security.friendRequestMessage;
        changes.push(`好友请求消息`);
      }

      if (Object.keys(userUpdate).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: userUpdate,
        });
      }
    }

    if (changes.length > 0) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'update_user_settings',
          targetType: 'user',
          targetId: user.id,
          description: `修改了用户 ${user.username} 的设置：${changes.join('、')}`,
        },
      });
    }

    res.json({ success: true, message: '设置更新成功' });
  } catch (error) {
    next(error);
  }
});

// ========== 日记编辑权限管理 ==========

// GET /api/admin/diary-whitelist - 获取所有用户的日记权限状态
router.get('/diary-whitelist', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { keyword, page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { status: 'ACTIVE' };
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
          username: true,
          email: true,
          role: true,
          status: true,
          avatar: true,
          createdAt: true,
          diaryEnabled: true,
          profile: { select: { nickname: true } },
          class: { select: { name: true } },
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

// PUT /api/admin/diary-whitelist/:userId - 切换用户日记权限
router.put('/diary-whitelist/:userId', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, diaryEnabled: true },
    });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const newValue = !(user.diaryEnabled !== false);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { diaryEnabled: newValue },
      select: { id: true, username: true, diaryEnabled: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: newValue ? 'enable_diary' : 'disable_diary',
        targetType: 'user',
        targetId: userId,
        description: newValue
          ? `启用了用户 ${user.username} 的日记编辑权限`
          : `禁用了用户 ${user.username} 的日记编辑权限`,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
