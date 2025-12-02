/**
 * 动态/时间轴控制器
 */

const { PrismaClient } = require('@prisma/client');
const pointService = require('../services/pointService');

const prisma = new PrismaClient();

/**
 * 获取动态列表
 */
exports.getPosts = async (req, res, next) => {
  try {
    const { type = 'all', userId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};

    // 筛选类型
    if (type === 'personal') {
      // 个人时间轴：仅自己的动态
      where.authorId = userId || req.user.id;
    } else if (type === 'public') {
      // 公共时间轴：所有公开的动态
      where.isPublic = true;
    } else if (type === 'following') {
      // 关注的人的动态（暂时显示所有公开动态）
      where.isPublic = true;
    }

    if (userId && type === 'all') {
      where.authorId = userId;
    }

    const [posts, total] = await Promise.all([
      prisma.dynamic.findMany({
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
          diary: {
            select: {
              id: true,
              title: true,
            },
          },
          homework: {
            select: {
              id: true,
              title: true,
              subject: true,
            },
          },
          htmlWork: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
          comments: {
            select: {
              id: true,
              content: true,
              createdAt: true,
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
            take: 3,
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.dynamic.count({ where }),
    ]);

    // 添加当前用户是否点赞的标记
    const postsWithLikeStatus = posts.map(post => ({
      ...post,
      isLiked: post.likes.some(like => like.userId === req.user.id),
      likes: undefined,
    }));

    res.json({
      posts: postsWithLikeStatus,
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
 * 获取单个动态
 */
exports.getPostById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await prisma.dynamic.findUnique({
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
        diary: true,
        homework: true,
        htmlWork: true,
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
            replies: {
              include: {
                author: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true,
                  },
                },
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
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ error: '动态不存在' });
    }

    // 检查权限
    if (!post.isPublic && post.authorId !== req.user.id) {
      return res.status(403).json({ error: '无权查看该动态' });
    }

    const postWithLikeStatus = {
      ...post,
      isLiked: post.likes.some(like => like.userId === req.user.id),
      likes: undefined,
    };

    res.json(postWithLikeStatus);
  } catch (error) {
    next(error);
  }
};

/**
 * 创建动态
 */
exports.createPost = async (req, res, next) => {
  try {
    const { content, images = [], isPublic = true, diaryId, homeworkId, htmlWorkId } = req.body;

    if (!content) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    const post = await prisma.dynamic.create({
      data: {
        authorId: req.user.id,
        content,
        images,
        isPublic,
        ...(diaryId && { diaryId }),
        ...(homeworkId && { homeworkId }),
        ...(htmlWorkId && { htmlWorkId }),
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

    // 注意：发布动态本身不奖励积分
    // 关联的内容（日记/作业/作品）会在各自模块创建时奖励积分

    res.status(201).json({
      message: '动态发布成功',
      post,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除动态
 */
exports.deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await prisma.dynamic.findUnique({
      where: { id },
    });

    if (!post) {
      return res.status(404).json({ error: '动态不存在' });
    }

    if (post.authorId !== req.user.id) {
      return res.status(403).json({ error: '无权删除该动态' });
    }

    await prisma.dynamic.delete({
      where: { id },
    });

    res.json({ message: '删除成功' });
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

    const post = await prisma.dynamic.findUnique({
      where: { id },
    });

    if (!post) {
      return res.status(404).json({ error: '动态不存在' });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_dynamicId: {
          userId: req.user.id,
          dynamicId: id,
        },
      },
    });

    if (existingLike) {
      // 取消点赞
      await prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      });

      res.json({ message: '取消点赞', isLiked: false });
    } else {
      // 点赞
      await prisma.like.create({
        data: {
          userId: req.user.id,
          dynamicId: id,
        },
      });

      res.json({ message: '点赞成功', isLiked: true });
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
    const { content, parentId } = req.body;

    if (!content) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    const post = await prisma.dynamic.findUnique({
      where: { id },
    });

    if (!post) {
      return res.status(404).json({ error: '动态不存在' });
    }

    const comment = await prisma.comment.create({
      data: {
        authorId: req.user.id,
        content,
        dynamicId: id,
        ...(parentId && { parentId }),
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

    // 奖励积分
    try {
      const pointResult = await pointService.addPoints('COMMENT_CREATE', req.user.id, {
        relatedType: 'comment',
        relatedId: comment.id,
      });
      if (pointResult.success) {
        comment.earnedPoints = pointResult.log.pointsChanged;
        comment.newTotalPoints = pointResult.totalPoints;
      }
    } catch (error) {
      console.error('积分奖励失败:', error);
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
 * 删除评论
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    if (comment.authorId !== req.user.id) {
      return res.status(403).json({ error: '无权删除该评论' });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
};
