/**
 * 用户控制器
 */

const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const path = require('path');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

/**
 * 获取当前用户信息
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
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
        parentRelations: {
          include: {
            parent: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        childRelations: {
          include: {
            child: {
              select: {
                id: true,
                username: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 自动计算加入天数
    const joinedDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    // 获取打卡统计
    const checkInStats = await getCheckInStats(user.id);

    const { password: _, ...userWithoutPassword } = user;

    // 更新 profile 中的 joinedDays
    if (user.profile && user.profile.joinedDays !== joinedDays) {
      await prisma.profile.update({
        where: { userId: user.id },
        data: { joinedDays },
      });
      userWithoutPassword.profile.joinedDays = joinedDays;
    }

    res.json({
      ...userWithoutPassword,
      checkInStats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取打卡统计数据
 */
async function getCheckInStats(userId) {
  try {
    // 获取所有活动记录的日期（去重）
    const activities = await prisma.$queryRaw`
      SELECT DISTINCT DATE("createdAt") as date
      FROM (
        SELECT "createdAt" FROM "Post" WHERE "authorId" = ${userId}
        UNION ALL
        SELECT "createdAt" FROM "Diary" WHERE "authorId" = ${userId}
        UNION ALL
        SELECT "createdAt" FROM "Homework" WHERE "authorId" = ${userId}
        UNION ALL
        SELECT "createdAt" FROM "Note" WHERE "authorId" = ${userId}
        UNION ALL
        SELECT "createdAt" FROM "HTMLWork" WHERE "authorId" = ${userId}
        UNION ALL
        SELECT "createdAt" FROM "ReadingNote" WHERE "authorId" = ${userId}
      ) AS all_activities
      ORDER BY date DESC
    `;

    const totalCheckInDays = activities.length;

    // 计算连续打卡天数
    let consecutiveDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < activities.length; i++) {
      const activityDate = new Date(activities[i].date);
      activityDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (activityDate.getTime() === expectedDate.getTime()) {
        consecutiveDays++;
      } else if (i === 0 && activityDate.getTime() === new Date(today.setDate(today.getDate() - 1)).setHours(0, 0, 0, 0)) {
        // 如果今天没有，但昨天有，从昨天开始算
        consecutiveDays++;
      } else {
        break;
      }
    }

    return {
      totalCheckInDays,
      consecutiveDays,
    };
  } catch (error) {
    console.error('获取打卡统计失败:', error);
    return {
      totalCheckInDays: 0,
      consecutiveDays: 0,
    };
  }
}

/**
 * 更新当前用户信息
 */
exports.updateCurrentUser = async (req, res, next) => {
  try {
    const { nickname, bio, grade, interests, profilePublic, showStats, hideFromParents } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        profile: {
          update: {
            ...(nickname && { nickname }),
            ...(bio !== undefined && { bio }),
            ...(grade && { grade }),
            ...(interests && { interests }),
            ...(profilePublic !== undefined && { profilePublic }),
            ...(showStats !== undefined && { showStats }),
            ...(hideFromParents !== undefined && { hideFromParents }),
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json({
      message: '更新成功',
      user: userWithoutPassword,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 修改密码
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码为必填项' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { 
        password: hashedPassword,
        passwordChangedAt: new Date()
      },
    });

    // 吊销所有现有会话
    await prisma.userSession.updateMany({
      where: { userId: req.user.id },
      data: { isRevoked: true }
    });

    // 清除当前请求的 Cookie，强制重新登录
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ message: '密码修改成功，所有设备已下线，请重新登录' });
  } catch (error) {
    next(error);
  }
};

/**
 * 重置支付密码
 * 默认密码为 123456，用户可以重置为自己的密码
 */
exports.resetPaymentPassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const DEFAULT_PAYMENT_PASSWORD = '123456';

    if (!newPassword) {
      return res.status(400).json({ error: '新密码为必填项' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '支付密码至少6位' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    // 如果用户已设置支付密码，需要验证旧密码
    if (user.paymentPassword) {
      if (!oldPassword) {
        return res.status(400).json({ error: '请输入原支付密码' });
      }
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.paymentPassword);
      if (!isOldPasswordValid) {
        return res.status(401).json({ error: '原支付密码错误' });
      }
    } else {
      // 如果用户未设置支付密码，验证默认密码
      if (!oldPassword) {
        return res.status(400).json({ error: '请输入原支付密码' });
      }
      if (oldPassword !== DEFAULT_PAYMENT_PASSWORD) {
        return res.status(401).json({ error: '原支付密码错误（默认密码为123456）' });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { paymentPassword: hashedPassword },
    });

    res.json({ message: '支付密码设置成功' });
  } catch (error) {
    next(error);
  }
};

/**
 * 验证支付密码
 */
exports.verifyPaymentPassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    const DEFAULT_PAYMENT_PASSWORD = '123456';

    if (!password) {
      return res.status(400).json({ error: '请输入支付密码' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    // 如果用户已设置支付密码
    if (user.paymentPassword) {
      const isValid = await bcrypt.compare(password, user.paymentPassword);
      if (!isValid) {
        return res.status(401).json({ error: '支付密码错误' });
      }
    } else {
      // 使用默认密码
      if (password !== DEFAULT_PAYMENT_PASSWORD) {
        return res.status(401).json({ error: '支付密码错误' });
      }
    }

    res.json({ success: true, message: '验证成功' });
  } catch (error) {
    next(error);
  }
};

/**
 * 检查是否已设置支付密码
 */
exports.checkPaymentPasswordSet = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { paymentPassword: true },
    });

    res.json({
      isSet: !!user.paymentPassword,
      message: user.paymentPassword ? '已设置支付密码' : '未设置支付密码（默认密码123456）'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 上传头像
 */
exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }

    // 使用sharp处理图片（裁剪、压缩）
    const filename = `avatar-${req.user.id}-${Date.now()}.jpg`;
    const outputPath = path.join(process.env.UPLOAD_DIR || './uploads', 'avatars', filename);

    await sharp(req.file.path)
      .resize(200, 200, { fit: 'cover' })
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    // 删除原始文件
    const fs = require('fs');
    fs.unlinkSync(req.file.path);

    const avatarUrl = `/uploads/avatars/${filename}`;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        avatar: true,
      },
    });

    res.json({
      message: '头像上传成功',
      avatar: user.avatar,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取指定用户信息
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
        createdAt: true,
        profile: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查隐私设置
    if (!user.profile?.profilePublic && user.id !== req.user.id) {
      return res.status(403).json({ error: '该用户设置了隐私保护' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取用户统计数据
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [user, diaryCount, homeworkCount, noteCount, htmlWorkCount, likeCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        include: { profile: true },
      }),
      prisma.diary.count({ where: { authorId: id } }),
      prisma.homework.count({ where: { authorId: id } }),
      prisma.note.count({ where: { authorId: id } }),
      prisma.hTMLWork.count({ where: { authorId: id } }),
      prisma.like.count({
        where: {
          OR: [
            { post: { authorId: id } },
            { work: { authorId: id } },
          ],
        },
      }),
    ]);

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查隐私设置
    if (!user.profile?.showStats && user.id !== req.user.id) {
      return res.status(403).json({ error: '该用户隐藏了统计数据' });
    }

    res.json({
      joinedDays: user.profile?.joinedDays || 0,
      diaryCount,
      homeworkCount,
      noteCount,
      htmlWorkCount,
      totalWorks: diaryCount + homeworkCount + noteCount + htmlWorkCount,
      likeCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 关联家长（学生操作）
 */
exports.linkParent = async (req, res, next) => {
  try {
    const { parentEmail } = req.body;

    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ error: '只有学生可以关联家长' });
    }

    const parent = await prisma.user.findUnique({
      where: { email: parentEmail },
    });

    if (!parent) {
      return res.status(404).json({ error: '家长用户不存在' });
    }

    if (parent.role !== 'PARENT') {
      return res.status(400).json({ error: '该用户不是家长角色' });
    }

    const link = await prisma.studentParent.create({
      data: {
        studentId: req.user.id,
        parentId: parent.id,
      },
    });

    res.json({
      message: '关联成功',
      link,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '已经关联过该家长' });
    }
    next(error);
  }
};

/**
 * 生成邀请码（用户操作：家长/同学）
 */
exports.generateInviteCode = async (req, res, next) => {
  try {
    const { inviteType } = req.body;

    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ error: '只有学生可以生成邀请码' });
    }

    if (!['PARENT', 'CLASSMATE'].includes(inviteType)) {
      return res.status(400).json({ error: '邀请类型无效' });
    }

    if (inviteType === 'PARENT') {
      const usedCount = await prisma.inviteCode.count({
        where: {
          createdBy: req.user.id,
          inviteType: 'PARENT',
        },
      });

      if (usedCount >= 3) {
        return res.status(403).json({ error: '最多只能生成3个家长邀请码' });
      }
    }

    const [parentSetting, classmateSetting] = await Promise.all([
      prisma.systemSetting.findUnique({ where: { key: 'parent_invite_cost' } }),
      prisma.systemSetting.findUnique({ where: { key: 'classmate_invite_cost' } }),
    ]);

    const parentCost = parentSetting ? parseInt(parentSetting.value) : 10;
    const classmateCost = classmateSetting ? parseInt(classmateSetting.value) : 5;
    const cost = inviteType === 'PARENT' ? parentCost : classmateCost;

    const pointService = require('../services/pointService');
    const deductResult = await pointService.deductPointsDirect(
      req.user.id,
      cost,
      'invite_code',
      { inviteType, description: `生成${inviteType === 'PARENT' ? '家长' : '同学'}邀请码` }
    );

    if (!deductResult.success) {
      return res.status(400).json({ error: deductResult.error || '积分不足' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const role = inviteType === 'PARENT' ? 'PARENT' : 'STUDENT';

    const code = await prisma.inviteCode.create({
      data: {
        createdBy: req.user.id,
        maxUses: 1,
        expiresAt,
        role,
        inviteType,
      },
    });

    res.json({
      success: true,
      data: code,
      deductedPoints: cost,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的邀请记录
 */
exports.getInviteRecords = async (req, res, next) => {
  try {
    const codes = await prisma.inviteCode.findMany({
      where: {
        createdBy: req.user.id,
        inviteType: { in: ['PARENT', 'CLASSMATE'] },
      },
      include: {
        users: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            profile: { select: { nickname: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parentUsedCount = await prisma.inviteCode.count({
      where: {
        createdBy: req.user.id,
        inviteType: 'PARENT',
        usedCount: { gte: 1 },
      },
    });

    res.json({
      success: true,
      data: {
        codes,
        parentUsedCount,
        parentRemaining: 3 - parentUsedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的孩子列表（家长操作）- 包含成长统计和最近动态
 */
exports.getChildren = async (req, res, next) => {
  try {
    if (req.user.role !== 'PARENT') {
      return res.status(403).json({ error: '只有家长可以查看孩子列表' });
    }

    // 获取关联的孩子基本信息
    const relations = await prisma.studentParent.findMany({
      where: { parentId: req.user.id },
      include: {
        child: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            totalPoints: true,
            createdAt: true,
            profile: true,
            class: {
              include: {
                school: true,
              },
            },
          },
        },
      },
    });

    // 为每个孩子获取统计数据和最近动态
    const childrenWithStats = await Promise.all(
      relations.map(async (rel) => {
        const child = rel.child;
        if (!child) return null;

        // 计算加入天数
        const joinedDays = Math.floor(
          (Date.now() - new Date(child.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        ) + 1; // +1 是因为注册当天算第1天

        // 并行获取统计数据
        const [approvedCount, poetryWorksCount, submissionsCount, wallet, recentActivities] = await Promise.all([
          // 审核通过的提交数量
          prisma.ruleSubmission.count({
            where: { userId: child.id, status: 'APPROVED' },
          }),
          // 诗词作品数量
          prisma.poetryWork.count({
            where: { authorId: child.id },
          }),
          // 提交记录数量
          prisma.ruleSubmission.count({
            where: { userId: child.id },
          }),
          // 钱包余额
          prisma.wallet.findUnique({
            where: { userId: child.id },
            select: { balance: true },
          }),
          // 最近动态（最近10条）
          getRecentActivities(child.id, 10),
        ]);

        return {
          ...child,
          stats: {
            totalPoints: child.totalPoints || 0,
            learningCoins: wallet?.balance || 0,
            approvedCount,
            poetryWorksCount,
            submissionsCount,
            joinedDays,
          },
          recentActivities,
        };
      })
    );

    res.json({ children: childrenWithStats.filter(Boolean) });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取用户最近动态
 */
async function getRecentActivities(userId, limit = 15) {
  try {
    // 获取最近的提交记录
    const submissions = await prisma.ruleSubmission.findMany({
      where: { userId },
      include: {
        template: {
          select: { name: true, points: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 获取最近的HTML作品
    const works = await prisma.hTMLWork.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 获取最近的诗词作品
    const poetryWorks = await prisma.poetryWork.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 获取最近的积分记录
    const pointLogs = await prisma.pointLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // 获取最近的学习币记录
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });

    let coinLogs = [];
    if (wallet) {
      coinLogs = await prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }

    // 合并并排序
    const activities = [
      ...submissions.map((s) => ({
        type: 'submission',
        id: s.id,
        title: s.template?.name || '提交记录',
        points: s.pointsAwarded || s.template?.points || 0,
        status: s.status,
        createdAt: s.createdAt,
      })),
      ...works.map((w) => ({
        type: 'work',
        id: w.id,
        title: w.title,
        createdAt: w.createdAt,
      })),
      ...poetryWorks.map((p) => ({
        type: 'poetry',
        id: p.id,
        title: p.title,
        status: p.status,
        points: p.status === 'APPROVED' ? 5 : 0,
        createdAt: p.createdAt,
      })),
      ...pointLogs.map((p) => ({
        type: 'point',
        id: p.id,
        title: p.reason || '积分变动',
        amount: p.amount,
        createdAt: p.createdAt,
      })),
      ...coinLogs.map((c) => ({
        type: 'coin',
        id: c.id,
        title: c.description || '学习币变动',
        amount: Number(c.amount),
        createdAt: c.createdAt,
      })),
    ];

    // 按时间排序，取最近的
    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return activities.slice(0, limit);
  } catch (error) {
    console.error('获取用户动态失败:', error);
    return [];
  }
}

/**
 * 获取孩子的积分和学习币明细（家长用）
 */
exports.getChildFinancialDetails = async (req, res, next) => {
  try {
    const { childId } = req.params;
    const { type = 'all', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 验证是否是该孩子的家长
    const relation = await prisma.studentParent.findFirst({
      where: {
        parentId: req.user.id,
        childId,
      },
    });

    if (!relation && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '无权查看该孩子信息' });
    }

    const results = { points: null, coins: null };

    // 获取积分记录
    if (type === 'all' || type === 'points') {
      const [pointLogs, pointsTotal] = await Promise.all([
        prisma.pointLog.findMany({
          where: { userId: childId },
          orderBy: { createdAt: 'desc' },
          skip: type === 'points' ? skip : 0,
          take: type === 'points' ? parseInt(limit) : 10,
        }),
        prisma.pointLog.count({ where: { userId: childId } }),
      ]);

      results.points = {
        logs: pointLogs,
        total: pointsTotal,
        page: type === 'points' ? parseInt(page) : 1,
        totalPages: type === 'points' ? Math.ceil(pointsTotal / parseInt(limit)) : 1,
      };
    }

    // 获取学习币记录 - 需要先通过 wallet 找到 walletId
    if (type === 'all' || type === 'coins') {
      const childWallet = await prisma.wallet.findUnique({
        where: { userId: childId },
        select: { id: true },
      });

      let coinLogs = [];
      let coinsTotal = 0;

      if (childWallet) {
        [coinLogs, coinsTotal] = await Promise.all([
          prisma.walletTransaction.findMany({
            where: { walletId: childWallet.id },
            orderBy: { createdAt: 'desc' },
            skip: type === 'coins' ? skip : 0,
            take: type === 'coins' ? parseInt(limit) : 10,
          }),
          prisma.walletTransaction.count({ where: { walletId: childWallet.id } }),
        ]);
      }

      results.coins = {
        logs: coinLogs,
        total: coinsTotal,
        page: type === 'coins' ? parseInt(page) : 1,
        totalPages: type === 'coins' ? Math.ceil(coinsTotal / parseInt(limit)) : 1,
      };
    }

    // 获取当前余额
    const [user, wallet] = await Promise.all([
      prisma.user.findUnique({
        where: { id: childId },
        select: { totalPoints: true },
      }),
      prisma.wallet.findUnique({
        where: { userId: childId },
        select: { balance: true },
      }),
    ]);

    res.json({
      currentPoints: user?.totalPoints || 0,
      currentCoins: wallet?.balance || 0,
      ...results,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有老师列表（管理员操作）
 */
exports.getTeachers = async (req, res, next) => {
  try {
    const teachers = await prisma.teacher.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      teachers: teachers.map(teacher => ({
        id: teacher.id,
        userId: teacher.user.id,
        username: teacher.user.username,
        email: teacher.user.email,
        avatar: teacher.user.avatar,
        profile: teacher.user.profile,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取用户动态（聚合所有公开内容）
 */
exports.getUserDynamics = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 判断是否为本人查看
    const isSelf = req.user.id === userId;

    // 查询条件：公开内容，或本人查看
    const whereCondition = isSelf ? { authorId: userId } : { authorId: userId, isPublic: true };

    // 获取各种内容
    const [diaries, homeworks, notes, works, readingLogs, musicLogs, movieLogs] = await Promise.all([
      prisma.diary.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          content: true,
          mood: true,
          weather: true,
          createdAt: true,
          isPublic: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.homework.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          subject: true,
          content: true,
          images: true,
          createdAt: true,
          isPublic: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.note.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          subject: true,
          content: true,
          createdAt: true,
          isPublic: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.hTMLWork.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          createdAt: true,
          isPublic: true,
          _count: {
            select: { likes: true, forks: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.readingLog.findMany({
        where: isSelf ? { userId } : { userId, isPublic: true },
        select: {
          id: true,
          content: true,
          chapterInfo: true,
          readPages: true,
          createdAt: true,
          book: {
            select: {
              title: true,
              author: true,
              cover: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.musicLog.findMany({
        where: isSelf ? { userId } : { userId, isPublic: true },
        select: {
          id: true,
          content: true,
          createdAt: true,
          music: {
            select: {
              title: true,
              artist: true,
              coverUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.movieLog.findMany({
        where: isSelf ? { userId } : { userId, isPublic: true },
        select: {
          id: true,
          content: true,
          createdAt: true,
          movie: {
            select: {
              title: true,
              director: true,
              posterUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // 合并并添加类型标识
    const allDynamics = [
      ...diaries.map((d) => ({ ...d, type: 'diary', _createdAt: d.createdAt })),
      ...homeworks.map((h) => ({ ...h, type: 'homework', _createdAt: h.createdAt })),
      ...notes.map((n) => ({ ...n, type: 'note', _createdAt: n.createdAt })),
      ...works.map((w) => ({ ...w, type: 'work', _createdAt: w.createdAt })),
      ...readingLogs.map((r) => ({ ...r, type: 'reading', _createdAt: r.createdAt })),
      ...musicLogs.map((m) => ({ ...m, type: 'music', _createdAt: m.createdAt })),
      ...movieLogs.map((m) => ({ ...m, type: 'movie', _createdAt: m.createdAt })),
    ];

    // 按时间排序
    allDynamics.sort((a, b) => new Date(b._createdAt) - new Date(a._createdAt));

    // 分页
    const paginatedDynamics = allDynamics.slice(skip, skip + parseInt(limit));

    res.json({
      dynamics: paginatedDynamics,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: allDynamics.length,
        totalPages: Math.ceil(allDynamics.length / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取用户日记
 */
exports.getUserDiaries = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const isSelf = req.user.id === userId;
    const whereCondition = isSelf ? { authorId: userId } : { authorId: userId, isPublic: true };

    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where: whereCondition,
        include: {
          tags: {
            include: { tag: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.diary.count({ where: whereCondition }),
    ]);

    res.json({
      diaries,
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
};

/**
 * 获取用户作业
 */
exports.getUserHomeworks = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const isSelf = req.user.id === userId;
    const whereCondition = isSelf ? { authorId: userId } : { authorId: userId, isPublic: true };

    const [homeworks, total] = await Promise.all([
      prisma.homework.findMany({
        where: whereCondition,
        include: {
          tags: {
            include: { tag: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.homework.count({ where: whereCondition }),
    ]);

    res.json({
      homeworks,
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
};

/**
 * 获取用户笔记
 */
exports.getUserNotes = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const isSelf = req.user.id === userId;
    const whereCondition = isSelf ? { authorId: userId } : { authorId: userId, isPublic: true };

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: whereCondition,
        include: {
          tags: {
            include: { tag: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.note.count({ where: whereCondition }),
    ]);

    res.json({
      notes,
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
};

/**
 * 获取用户读书笔记
 */
exports.getUserReadingLogs = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const isSelf = req.user.id === userId;
    const whereCondition = isSelf ? { userId } : { userId, isPublic: true };

    const [readingLogs, total] = await Promise.all([
      prisma.readingLog.findMany({
        where: whereCondition,
        include: {
          book: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.readingLog.count({ where: whereCondition }),
    ]);

    res.json({
      readingLogs,
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
};

/**
 * 获取用户游戏记录
 */
exports.getUserGames = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [games, total] = await Promise.all([
      prisma.gameLibrary.findMany({
        where: { userId },
        include: {
          game: true,
          shortReview: true,
          longReviews: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.gameLibrary.count({ where: { userId } }),
    ]);

    res.json({
      games,
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
};

/**
 * 获取用户音乐记录
 */
exports.getUserMusicLogs = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const isSelf = req.user.id === userId;
    const whereCondition = isSelf ? { userId } : { userId, isPublic: true };

    const [musicLogs, total] = await Promise.all([
      prisma.musicLog.findMany({
        where: whereCondition,
        include: {
          music: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.musicLog.count({ where: whereCondition }),
    ]);

    res.json({
      musicLogs,
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
};

/**
 * 获取用户影视记录
 */
exports.getUserMovieLogs = async (req, res, next) => {
  try {
    const { id: userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const isSelf = req.user.id === userId;
    const whereCondition = isSelf ? { userId } : { userId, isPublic: true };

    const [movieLogs, total] = await Promise.all([
      prisma.movieLog.findMany({
        where: whereCondition,
        include: {
          movie: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.movieLog.count({ where: whereCondition }),
    ]);

    res.json({
      movieLogs,
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
};

/**
 * 更新设备推送token
 */
exports.updateDeviceToken = async (req, res, next) => {
  try {
    const { deviceToken, deviceId, deviceName } = req.body;

    await prisma.user.update({
      where: { id: req.user.id },
      data: { deviceToken }
    });

    if (deviceToken && deviceId) {
      await prisma.syncDevice.upsert({
        where: { deviceId },
        update: {
          userId: req.user.id,
          deviceType: 'ios',
          deviceName: deviceName || 'iOS Device',
          pushToken: deviceToken,
          isActive: true,
          lastSyncAt: new Date(),
          updatedAt: new Date()
        },
        create: {
          userId: req.user.id,
          deviceId,
          deviceType: 'ios',
          deviceName: deviceName || 'iOS Device',
          pushToken: deviceToken,
          isActive: true
        }
      });
    }

    res.json({ success: true, message: '设备token已更新' });
  } catch (error) {
    next(error);
  }
};

/**
 * 搜索用户
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user.id;

    if (!q || q.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { profile: { nickname: { contains: q, mode: 'insensitive' } } }
        ],
        id: { not: currentUserId }
      },
      take: 20,
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
        profile: { select: { nickname: true } }
      }
    });

    // 检查好友状态
    const userIds = users.map(u => u.id);
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId1: currentUserId, userId2: { in: userIds } },
          { userId1: { in: userIds }, userId2: currentUserId }
        ]
      }
    });

    const friendIds = new Set(
      friendships.map(f => f.userId1 === currentUserId ? f.userId2 : f.userId1)
    );

    // 检查好友申请状态
    const requests = await prisma.friendRequest.findMany({
      where: {
        OR: [
          { fromUserId: currentUserId, toUserId: { in: userIds }, status: 'PENDING' },
          { fromUserId: { in: userIds }, toUserId: currentUserId, status: 'PENDING' }
        ]
      }
    });

    const requestMap = new Map();
    requests.forEach(req => {
      if (req.fromUserId === currentUserId) {
        requestMap.set(req.toUserId, 'SENT');
      } else {
        requestMap.set(req.fromUserId, 'RECEIVED');
      }
    });

    const result = users.map(u => ({
      id: u.id,
      username: u.username,
      nickname: u.profile?.nickname,
      avatar: u.avatar,
      role: u.role,
      isFriend: friendIds.has(u.id),
      requestStatus: requestMap.get(u.id) || 'NONE'
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取好友设置
 */
exports.getFriendSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        autoAcceptFriend: true,
        friendRequestMessage: true
      }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新好友设置
 */
exports.updateFriendSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { autoAcceptFriend, friendRequestMessage } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        autoAcceptFriend,
        friendRequestMessage
      },
      select: {
        autoAcceptFriend: true,
        friendRequestMessage: true
      }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * 用户自行修改学校班级（每月一次限制）
 */
exports.updateMySchoolClass = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { classId } = req.body;

    if (!classId) {
      return res.status(400).json({ error: '班级ID为必填项' });
    }

    // 验证班级存在
    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      include: { school: true },
    });

    if (!classRecord) {
      return res.status(400).json({ error: '班级不存在' });
    }

    // 检查每月一次限制
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, schoolClassUpdatedAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (user.schoolClassUpdatedAt) {
      const lastUpdate = new Date(user.schoolClassUpdatedAt);
      const now = new Date();
      const diffDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);
      if (diffDays < 30) {
        const remainingDays = Math.ceil(30 - diffDays);
        return res.status(400).json({
          error: `距离上次修改不足30天，还需等待 ${remainingDays} 天`,
          remainingDays,
          lastUpdatedAt: user.schoolClassUpdatedAt,
        });
      }
    }

    // 更新用户班级（同时更新 schoolId）
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        classId,
        schoolClassUpdatedAt: new Date(),
      },
      select: {
        id: true,
        classId: true,
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

    // 同时更新 Student 表
    await prisma.student.updateMany({
      where: { userId },
      data: { classId },
    });

    // 记录活动日志
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'update_school_class',
        targetType: 'user',
        targetId: userId,
        description: `用户自行修改了学校班级为 ${classRecord.school.name} - ${classRecord.grade} ${classRecord.name}`,
      },
    });

    res.json({
      success: true,
      data: updatedUser,
      message: '学校班级修改成功',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取登录活动记录
 * GET /api/users/me/login-activities
 */
exports.getLoginActivities = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20, type } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = Math.min(parseInt(pageSize), 100);

    const where = { userId };
    if (type === 'success') {
      where.isSuccess = true;
    } else if (type === 'failed') {
      where.isSuccess = false;
    }

    const [activities, total] = await Promise.all([
      prisma.loginActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.loginActivity.count({ where }),
    ]);

    // 获取设备统计
    const deviceStats = await prisma.loginActivity.groupBy({
      by: ['deviceName'],
      where: { userId, isSuccess: true },
      _count: { deviceName: true },
    });

    // 获取地点统计
    const locationStats = await prisma.loginActivity.groupBy({
      by: ['city'],
      where: { userId, isSuccess: true, city: { not: null } },
      _count: { city: true },
    });

    // 获取最近的登录活动（用于判断是否有异常）
    const recentLogins = await prisma.loginActivity.findMany({
      where: { userId, isSuccess: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        ipAddress: true,
        deviceName: true,
        browser: true,
        city: true,
      },
    });

    // 检测潜在的可疑活动
    const suspiciousActivities = [];
    const uniqueDevices = new Set(recentLogins.map(l => `${l.ipAddress}-${l.deviceName}`));
    const uniqueLocations = new Set(recentLogins.filter(l => l.city).map(l => l.city));

    activities.forEach(activity => {
      const activityKey = `${activity.ipAddress}-${activity.deviceName}`;
      const isNewDevice = !recentLogins.slice(1).some(l => `${l.ipAddress}-${l.deviceName}` === activityKey);
      const isNewLocation = activity.city && !recentLogins.slice(1).some(l => l.city === activity.city);

      if (activity.isSuccess) {
        if (isNewDevice || isNewLocation) {
          suspiciousActivities.push({
            id: activity.id,
            reason: isNewDevice ? '新设备登录' : '新地点登录',
            activity,
          });
        }
      }
    });

    res.json({
      success: true,
      data: {
        activities,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
        deviceStats: deviceStats.map(d => ({
          deviceName: d.deviceName,
          count: d._count.deviceName,
        })),
        locationStats: locationStats.map(l => ({
          city: l.city,
          count: l._count.city,
        })),
        suspiciousActivities: suspiciousActivities.slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取用户操作日志
 * GET /api/users/me/activity-logs
 */
exports.getActivityLogs = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 50, action } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = Math.min(parseInt(pageSize), 100);

    const where = { userId };
    if (action) {
      where.action = action;
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.activityLog.count({ where }),
    ]);

    // 获取操作类型统计
    const actionStats = await prisma.activityLog.groupBy({
      by: ['action'],
      where: { userId },
      _count: { action: true },
    });

    // 获取今日操作数量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await prisma.activityLog.count({
      where: { userId, createdAt: { gte: today } },
    });

    res.json({
      success: true,
      data: {
        logs,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / parseInt(pageSize)),
        todayCount,
        actionStats: actionStats.map(s => ({
          action: s.action,
          count: s._count.action,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
