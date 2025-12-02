/**
 * 用户控制器
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const path = require('path');

const prisma = new PrismaClient();

/**
 * 获取当前用户信息
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
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
    const { nickname, bio, grade, interests, profilePublic, showStats } = req.body;

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
      data: { password: hashedPassword },
    });

    res.json({ message: '密码修改成功' });
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
 * 获取我的孩子列表（家长操作）
 */
exports.getChildren = async (req, res, next) => {
  try {
    if (req.user.role !== 'PARENT') {
      return res.status(403).json({ error: '只有家长可以查看孩子列表' });
    }

    const children = await prisma.studentParent.findMany({
      where: { parentId: req.user.id },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            email: true,
            avatar: true,
            profile: true,
            class: {
              include: {
                campus: true,
              },
            },
          },
        },
      },
    });

    res.json({ children: children.map(c => c.student) });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有老师列表（管理员操作）
 */
exports.getTeachers = async (req, res, next) => {
  try {
    const teachers = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        profile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ teachers });
  } catch (error) {
    next(error);
  }
};
