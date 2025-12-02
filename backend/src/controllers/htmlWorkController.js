/**
 * HTML作品控制器
 */

const { PrismaClient } = require('@prisma/client');
const pointService = require('../services/pointService');
const achievementService = require('../services/achievementService');

const prisma = new PrismaClient();

/**
 * 获取作品列表
 */
exports.getWorks = async (req, res, next) => {
  try {
    const { userId, myOnly, search, category, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};

    // 处理myOnly参数：如果为true，则查看当前用户的作品
    const targetUserId = myOnly === 'true' ? req.user.id : userId;

    if (targetUserId) {
      where.authorId = targetUserId;
    }

    // 搜索功能：支持标题和描述搜索
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 分类筛选
    if (category) {
      where.category = category;
    }

    const [works, total] = await Promise.all([
      prisma.hTMLWork.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: {
                select: {
                  nickname: true,
                },
              },
            },
          },
          forkedFrom: {
            select: {
              id: true,
              title: true,
              author: {
                select: {
                  username: true,
                },
              },
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              forks: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.hTMLWork.count({ where }),
    ]);

    res.json({
      works,
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
 * 获取单个作品
 */
exports.getWorkById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const work = await prisma.hTMLWork.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: {
              select: {
                nickname: true,
              },
            },
          },
        },
        forkedFrom: {
          select: {
            id: true,
            title: true,
            author: {
              select: {
                username: true,
              },
            },
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            forks: true,
          },
        },
      },
    });

    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }

    // 检查可见性权限
    if (work.visibility === 'PRIVATE' && work.authorId !== req.user.id) {
      return res.status(403).json({ error: '无权查看该作品' });
    }

    if (work.visibility === 'PARENT_ONLY' && work.authorId !== req.user.id) {
      // 检查是否是家长
      if (req.user.role !== 'PARENT') {
        return res.status(403).json({ error: '该作品仅对家长可见' });
      }

      // 检查是否是该学生的家长
      const isParent = await prisma.studentParent.findFirst({
        where: {
          studentId: work.authorId,
          parentId: req.user.id,
        },
      });

      if (!isParent) {
        return res.status(403).json({ error: '无权查看该作品' });
      }
    }

    const workWithLikeStatus = {
      ...work,
      isLiked: work.likes.some(like => like.userId === req.user.id),
      likes: undefined,
    };

    res.json(workWithLikeStatus);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建作品
 */
exports.createWork = async (req, res, next) => {
  try {
    const { title, description, htmlCode, cssCode, jsCode, category } = req.body;

    if (!title || !htmlCode) {
      return res.status(400).json({ error: '标题和HTML代码为必填项' });
    }

    const work = await prisma.hTMLWork.create({
      data: {
        authorId: req.user.id,
        title,
        description,
        htmlCode,
        cssCode: cssCode || '',
        jsCode: jsCode || '',
        category: category || null,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // 奖励积分 (W001: 发布HTML作品 +10分)
    try {
      const pointResult = await pointService.addPoints('W001', req.user.id, {
        targetType: 'htmlWork',
        targetId: work.id,
      });
      if (pointResult.success) {
        work.earnedPoints = pointResult.log.points;
        work.newTotalPoints = pointResult.totalPoints;
      }

      // 检查作品成就
      achievementService.checkAchievements(req.user.id, 'work_published', {});
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.status(201).json({
      message: '作品创建成功',
      work,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新作品
 */
exports.updateWork = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, htmlCode, cssCode, jsCode, category } = req.body;

    const work = await prisma.hTMLWork.findUnique({
      where: { id },
    });

    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }

    if (work.authorId !== req.user.id) {
      return res.status(403).json({ error: '无权修改该作品' });
    }

    const updatedWork = await prisma.hTMLWork.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(htmlCode && { htmlCode }),
        ...(cssCode !== undefined && { cssCode }),
        ...(jsCode !== undefined && { jsCode }),
        ...(category !== undefined && { category }),
      },
    });

    res.json({
      message: '更新成功',
      work: updatedWork,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除作品
 */
exports.deleteWork = async (req, res, next) => {
  try {
    const { id } = req.params;

    const work = await prisma.hTMLWork.findUnique({
      where: { id },
    });

    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }

    // 允许作品作者或管理员删除
    if (work.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '无权删除该作品' });
    }

    // 扣除该作品相关的所有积分
    try {
      await pointService.deductPointsOnDelete('htmlWork', id);
    } catch (error) {
      console.error('扣除积分失败:', error);
    }

    await prisma.hTMLWork.delete({
      where: { id },
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
};

/**
 * Fork作品
 */
exports.forkWork = async (req, res, next) => {
  try {
    const { id } = req.params;

    const originalWork = await prisma.hTMLWork.findUnique({
      where: { id },
    });

    if (!originalWork) {
      return res.status(404).json({ error: '作品不存在' });
    }

    const forkedWork = await prisma.hTMLWork.create({
      data: {
        authorId: req.user.id,
        title: `${originalWork.title} (Fork)`,
        description: originalWork.description,
        htmlCode: originalWork.htmlCode,
        cssCode: originalWork.cssCode,
        jsCode: originalWork.jsCode,
        forkedFromId: originalWork.id,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        forkedFrom: {
          select: {
            id: true,
            title: true,
            author: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    // 给原作者奖励积分 (W004: 作品被Fork +5分)
    try {
      await pointService.addPoints('W004', originalWork.authorId, {
        targetType: 'htmlWork',
        targetId: originalWork.id,
        description: `作品"${originalWork.title}"被Fork`,
      });
    } catch (error) {
      console.error('原作者积分奖励失败:', error);
    }

    // 给Fork者奖励积分 (W001: 发布HTML作品 +10分)
    try {
      const pointResult = await pointService.addPoints('W001', req.user.id, {
        targetType: 'htmlWork',
        targetId: forkedWork.id,
        description: `Fork作品"${originalWork.title}"`,
      });
      if (pointResult.success) {
        forkedWork.earnedPoints = pointResult.log.points;
        forkedWork.newTotalPoints = pointResult.totalPoints;
      }
    } catch (error) {
      console.error('Fork者积分奖励失败:', error);
    }

    res.status(201).json({
      message: 'Fork成功',
      work: forkedWork,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 点赞/取消点赞
 */
exports.toggleLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isLike = true } = req.body; // true=点赞, false=点踩

    const work = await prisma.hTMLWork.findUnique({
      where: { id },
    });

    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_workId: {
          userId: req.user.id,
          workId: id,
        },
      },
    });

    if (existingLike) {
      // 取消点赞/点踩
      await prisma.like.delete({
        where: { id: existingLike.id },
      });

      res.json({ message: '取消操作', isLiked: false });
    } else {
      // 点赞/点踩
      await prisma.like.create({
        data: {
          userId: req.user.id,
          workId: id,
        },
      });

      // 给作者奖励/扣除积分
      try {
        if (isLike) {
          // W002: 作品被点赞 +2分
          await pointService.addPoints('W002', work.authorId, {
            targetType: 'htmlWork',
            targetId: id,
            description: `作品"${work.title}"被点赞`,
          });
        } else {
          // W003: 作品被点踩 -2分
          await pointService.addPoints('W003', work.authorId, {
            targetType: 'htmlWork',
            targetId: id,
            description: `作品"${work.title}"被点踩`,
          });
        }
      } catch (error) {
        console.error('作者积分处理失败:', error);
      }

      // 给点赞者奖励积分 (S001: 给他人点赞 +1分,每日限5次)
      if (isLike && req.user.id !== work.authorId) {
        try {
          await pointService.addPoints('S001', req.user.id, {
            targetType: 'like',
            targetId: id,
            description: '点赞作品',
          });
        } catch (error) {
          console.error('点赞者积分奖励失败:', error);
        }
      }

      res.json({ message: isLike ? '点赞成功' : '点踩成功', isLiked: true });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 添加评论
 */
exports.addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    const work = await prisma.hTMLWork.findUnique({
      where: { id },
    });

    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }

    const comment = await prisma.comment.create({
      data: {
        authorId: req.user.id,
        content,
        workId: id,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // 给评论者奖励积分 (S002: 发表评论 +2分,每日限10次)
    try {
      const pointResult = await pointService.addPoints('S002', req.user.id, {
        targetType: 'comment',
        targetId: comment.id,
        description: '评论作品',
      });
      if (pointResult.success) {
        comment.earnedPoints = pointResult.log.points;
      }
    } catch (error) {
      console.error('评论积分奖励失败:', error);
    }

    res.status(201).json({
      message: '评论成功',
      comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取所有作品分类（去重）
 */
exports.getCategories = async (req, res, next) => {
  try {
    // 使用Prisma的distinct查询获取所有不重复的分类
    const works = await prisma.hTMLWork.findMany({
      where: {
        category: {
          not: null,
        },
      },
      select: {
        category: true,
      },
      distinct: ['category'],
      orderBy: {
        category: 'asc',
      },
    });

    const categories = works.map(work => work.category).filter(Boolean);

    res.json({
      categories,
    });
  } catch (error) {
    next(error);
  }
};
