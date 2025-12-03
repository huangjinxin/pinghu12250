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
