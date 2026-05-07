/**
 * 唐诗宋词作品控制器
 */

const pointService = require('../services/pointService');
const achievementService = require('../services/achievementService');
const { generatePoetryCover, deletePoetryCover } = require('../services/poetryCoverService');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

/**
 * 获取作品列表
 */
exports.getWorks = async (req, res, next) => {
  try {
    const { userId, myOnly, search, page = 1, limit = 20, sort = 'latest', author } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let where = {};

    // 处理myOnly参数：如果为true，则只查看当前用户的作品
    if (myOnly === 'true') {
      where.authorId = req.user.id;
    } else if (userId) {
      where.authorId = userId;
      where.status = 'APPROVED'; // 查看他人作品只显示已审核的
    } else {
      // 默认：显示所有已审核通过的 + 当前用户自己的待审核作品
      where.OR = [
        { status: 'APPROVED' },
        { authorId: req.user.id }
      ];
    }

    // 作者筛选
    if (author) {
      where.authorId = author;
      // 如果筛选作者且不是自己，只显示已审核的
      if (author !== req.user.id) {
        where.status = 'APPROVED';
        delete where.OR;
      }
    }

    // 搜索功能：支持标题搜索
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    // 排序方式
    let orderBy;
    if (sort === 'popular') {
      orderBy = [
        { likes: { _count: 'desc' } },
        { createdAt: 'desc' }
      ];
    } else {
      orderBy = { createdAt: 'desc' };
    }

    const [works, total, authorsList] = await Promise.all([
      prisma.poetryWork.findMany({
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
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.poetryWork.count({ where }),
      // 获取所有有作品的作者列表（用于筛选）
      prisma.poetryWork.findMany({
        where: { status: 'APPROVED' },
        select: {
          author: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  nickname: true,
                },
              },
            },
          },
        },
        distinct: ['authorId'],
      }),
    ]);

    // 格式化作者列表
    const authors = authorsList.map(w => ({
      id: w.author.id,
      name: w.author.profile?.nickname || w.author.username,
    }));

    res.json({
      works,
      authors,
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
 * 获取已审核的诗词作品列表（公开访问，无需登录）
 * 支持搜索、排序、作者筛选
 */
exports.getPublicWorks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, sort = 'latest', author } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { status: 'APPROVED' };

    // 搜索：支持标题搜索
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    // 作者筛选
    if (author) {
      where.authorId = author;
    }

    // 排序方式
    let orderBy;
    if (sort === 'popular') {
      orderBy = [
        { likes: { _count: 'desc' } },
        { createdAt: 'desc' }
      ];
    } else {
      orderBy = { createdAt: 'desc' };
    }

    const [works, total, authors] = await Promise.all([
      prisma.poetryWork.findMany({
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
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.poetryWork.count({ where }),
      // 获取所有有作品的作者列表（用于筛选）
      prisma.poetryWork.findMany({
        where: { status: 'APPROVED' },
        select: {
          author: {
            select: {
              id: true,
              username: true,
              profile: {
                select: {
                  nickname: true,
                },
              },
            },
          },
        },
        distinct: ['authorId'],
      }),
    ]);

    // 格式化作者列表
    const authorList = authors.map(w => ({
      id: w.author.id,
      name: w.author.profile?.nickname || w.author.username,
    }));

    res.json({
      works,
      authors: authorList,
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
 * 获取单个诗词作品（公开访问）
 */
exports.getPublicWorkById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const work = await prisma.poetryWork.findUnique({
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
      },
    });

    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }

    // 只返回已审核通过的作品
    if (work.status !== 'APPROVED') {
      return res.status(404).json({ error: '作品不存在或尚未通过审核' });
    }

    res.json({
      id: work.id,
      title: work.title,
      htmlCode: work.htmlCode,
      author: work.author,
      createdAt: work.createdAt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取待审核作品（管理员）
 */
exports.getPendingWorks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, userId, username } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = { status: 'PENDING' };

    // 支持按用户ID筛选
    if (userId) {
      where.authorId = userId;
    }

    // 支持按用户名模糊搜索
    if (username) {
      where.author = {
        OR: [
          { username: { contains: username, mode: 'insensitive' } },
          { profile: { nickname: { contains: username, mode: 'insensitive' } } }
        ]
      };
    }

    const [works, total] = await Promise.all([
      prisma.poetryWork.findMany({
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
        },
        orderBy: {
          createdAt: 'asc', // 先创建的排前面
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.poetryWork.count({ where }),
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
 * 获取诗词作品统计（管理员）
 */
exports.getStats = async (req, res, next) => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      prisma.poetryWork.count({ where: { status: 'PENDING' } }),
      prisma.poetryWork.count({ where: { status: 'APPROVED' } }),
      prisma.poetryWork.count({ where: { status: 'REJECTED' } }),
      prisma.poetryWork.count(),
    ]);

    res.json({
      stats: {
        pending,
        approved,
        rejected,
        total,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取有待审核作品的用户列表（管理员）
 */
exports.getPendingUsers = async (req, res, next) => {
  try {
    // 获取所有有待审核作品的用户
    const works = await prisma.poetryWork.findMany({
      where: { status: 'PENDING' },
      select: {
        authorId: true,
        author: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { nickname: true }
            }
          }
        }
      },
      distinct: ['authorId']
    });

    // 统计每个用户的待审核数量
    const userCounts = await prisma.poetryWork.groupBy({
      by: ['authorId'],
      where: { status: 'PENDING' },
      _count: { id: true }
    });

    const countMap = {};
    userCounts.forEach(item => {
      countMap[item.authorId] = item._count.id;
    });

    // 格式化用户列表
    const users = works.map(w => ({
      id: w.author.id,
      username: w.author.username,
      nickname: w.author.profile?.nickname,
      displayName: w.author.profile?.nickname || w.author.username,
      pendingCount: countMap[w.authorId] || 0
    }));

    // 按待审核数量降序排列
    users.sort((a, b) => b.pendingCount - a.pendingCount);

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取已审核作品（历史记录）
 */
exports.getReviewedWorks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      status: {
        in: ['APPROVED', 'REJECTED']
      }
    };

    // 状态筛选
    if (status && ['APPROVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    // 搜索
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [works, total] = await Promise.all([
      prisma.poetryWork.findMany({
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
        },
        orderBy: {
          updatedAt: 'desc', // 最近审核的排前面
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.poetryWork.count({ where }),
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
 * 创建诗词作品
 */
exports.createWork = async (req, res, next) => {
  try {
    const { title, htmlCode } = req.body;

    if (!title || !htmlCode) {
      return res.status(400).json({ error: '标题和HTML代码为必填项' });
    }

    // 创建诗词作品
    const work = await prisma.poetryWork.create({
      data: {
        authorId: req.user.id,
        title,
        htmlCode,
        status: 'PENDING', // 待审核状态
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

    // 生成封面图片
    try {
      const coverImage = await generatePoetryCover(htmlCode, title, work.id);
      await prisma.poetryWork.update({
        where: { id: work.id },
        data: { coverImage }
      });
      work.coverImage = coverImage;
    } catch (coverError) {
      console.error('封面生成失败:', coverError);
      // 封面生成失败不影响作品创建
    }

    // 诗词作品直接进入待审核状态，管理员在后台审核
    // 审核通过后会自动奖励5积分
    res.status(201).json({
      message: '作品创建成功，已提交审核',
      work,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新诗词作品（用户编辑）
 */
exports.updateWork = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, htmlCode } = req.body;

    if (!title || !htmlCode) {
      return res.status(400).json({ error: '标题和HTML代码为必填项' });
    }

    const work = await prisma.poetryWork.findUnique({
      where: { id },
    });

    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }

    // 只有作者可以编辑自己的作品
    if (work.authorId !== req.user.id) {
      return res.status(403).json({ error: '无权编辑该作品' });
    }

    // 删除旧封面
    if (work.coverImage) {
      try {
        await deletePoetryCover(work.coverImage);
      } catch (e) {
        console.error('删除旧封面失败:', e);
      }
    }

    // 生成新封面
    let coverImage = null;
    try {
      coverImage = await generatePoetryCover(htmlCode, title, id);
    } catch (coverError) {
      console.error('封面生成失败:', coverError);
    }

    // 更新作品，重新进入审核流程
    const updatedWork = await prisma.poetryWork.update({
      where: { id },
      data: {
        title,
        htmlCode,
        coverImage,
        status: 'PENDING', // 修改后重新进入待审核状态
        reviewReason: null, // 清除之前的拒绝原因
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

    res.json({
      message: '作品更新成功，已重新提交审核',
      work: updatedWork,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新诗词作品状态（审核用）
 */
exports.updateWorkStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body; // status: APPROVED, REJECTED

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: '无效的状态' });
    }

    const work = await prisma.poetryWork.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          }
        }
      }
    });

    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }

    // 更新作品状态
    const updatedWork = await prisma.poetryWork.update({
      where: { id },
      data: {
        status,
        reviewReason: reason || null
      }
    });

    // 如果审核通过，奖励积分
    if (status === 'APPROVED') {
      try {
        // 检查是否已经为该作品发放过积分（防止二次编辑后重复加分）
        const existingPointLog = await prisma.pointLog.findFirst({
          where: {
            targetType: 'poetryWork',
            targetId: work.id,
            points: { gt: 0 } // 只检查正数积分记录
          }
        });

        if (existingPointLog) {
          console.log(`作品《${work.title}》已发放过积分，跳过重复发放`);
        } else {
          const pointResult = await pointService.addPoints('P001', work.authorId, {
            targetType: 'poetryWork',
            targetId: work.id,
            description: `唐诗宋词作品《${work.title}》通过审核`,
            points: 5 // 奖励5积分
          });

          if (pointResult.success) {
            console.log(`用户 ${work.author.username} 获得${pointResult.log?.points || 5}积分，当前总积分：${pointResult.totalPoints}`);
          } else {
            console.log(`积分发放未成功: ${pointResult.message}`);
          }
        }

        // 检查作品成就
        achievementService.checkAchievements(work.authorId, 'poetry_published', {});
      } catch (pointError) {
        console.error('积分奖励失败:', pointError);
      }
    }

    res.json({
      message: `作品已${status === 'APPROVED' ? '通过审核' : '被拒绝'}`,
      work: updatedWork
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除诗词作品
 */
exports.deleteWork = async (req, res, next) => {
  try {
    const { id } = req.params;

    const work = await prisma.poetryWork.findUnique({
      where: { id },
    });

    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }

    // 允许作品作者或管理员删除
    if (work.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '无权删除该作品' });
    }

    // 删除封面图片
    if (work.coverImage) {
      try {
        await deletePoetryCover(work.coverImage);
      } catch (e) {
        console.error('删除封面失败:', e);
      }
    }

    await prisma.poetryWork.delete({
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
    const { isLike = true } = req.body; // true=点赞, false=点踩

    const work = await prisma.poetryWork.findUnique({
      where: { id },
    });

    if (!work) {
      return res.status(404).json({ error: '作品不存在' });
    }

    const existingLike = await prisma.poetryLike.findUnique({
      where: {
        userId_workId: {
          userId: req.user.id,
          workId: id,
        },
      },
    });

    if (existingLike) {
      // 取消点赞/点踩
      await prisma.poetryLike.delete({
        where: { id: existingLike.id },
      });

      res.json({ message: '取消操作', isLiked: false });
    } else {
      // 点赞/点踩
      await prisma.poetryLike.create({
        data: {
          userId: req.user.id,
          workId: id,
          isLike,
        },
      });

      // 给作者奖励积分（只在点赞时）
      if (isLike) {
        try {
          await pointService.addPoints('W002', work.authorId, {
            targetType: 'poetryWork',
            targetId: id,
            description: `作品"${work.title}"被点赞`,
          });
        } catch (error) {
          console.error('作者积分奖励失败:', error);
        }
      }

      res.json({ message: isLike ? '点赞成功' : '点踩成功', isLiked: true });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 批量生成封面（管理员）
 * 为没有封面的作品生成封面
 */
exports.regenerateCovers = async (req, res, next) => {
  try {
    // 获取所有没有封面的作品
    const works = await prisma.poetryWork.findMany({
      where: {
        OR: [
          { coverImage: null },
          { coverImage: '' }
        ]
      },
      select: {
        id: true,
        title: true,
        htmlCode: true
      }
    });

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    for (const work of works) {
      try {
        const coverImage = await generatePoetryCover(work.htmlCode, work.title, work.id);
        await prisma.poetryWork.update({
          where: { id: work.id },
          data: { coverImage }
        });
        successCount++;
      } catch (e) {
        failCount++;
        errors.push({ id: work.id, title: work.title, error: e.message });
      }
    }

    res.json({
      message: `封面生成完成: 成功 ${successCount} 个, 失败 ${failCount} 个`,
      total: works.length,
      successCount,
      failCount,
      errors: errors.slice(0, 10) // 只返回前10个错误
    });
  } catch (error) {
    next(error);
  }
};