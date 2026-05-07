/**
 * 创意作品控制器
 */
const prisma = require('../lib/prisma');
const pointService = require('../services/pointService');

// 获取作品列表（公开，已审核通过的）
exports.getPublicWorks = async (req, res, next) => {
  try {
    const {
      category, // 栏目 slug
      type, // 作品类型筛选
      page = 1,
      limit = 12,
      sort = 'latest', // latest / popular
      search,
      author, // 作者 ID
    } = req.query;

    const where = {
      status: 'APPROVED',
    };

    // 按栏目筛选
    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category } });
      if (cat) {
        where.categoryId = cat.id;
      }
    }

    // 按类型筛选
    if (type) {
      where.type = type;
    }

    // 搜索标题
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    // 按作者筛选
    if (author) {
      where.authorId = author;
    }

    const orderBy = sort === 'popular'
      ? { CreativeWorkLike: { _count: 'desc' } }
      : { createdAt: 'desc' };

    const [works, total] = await Promise.all([
      prisma.creativeWork.findMany({
        where,
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } },
            },
          },
          Category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
          _count: { select: { CreativeWorkLike: true } },
        },
      }),
      prisma.creativeWork.count({ where }),
    ]);

    // 获取栏目下的作者列表（用于筛选）
    const authorsWhere = { status: 'APPROVED' };
    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category } });
      if (cat) authorsWhere.categoryId = cat.id;
    }
    const authors = await prisma.creativeWork.findMany({
      where: authorsWhere,
      select: {
        author: {
          select: {
            id: true,
            username: true,
            profile: { select: { nickname: true } },
          },
        },
      },
      distinct: ['authorId'],
    });

    res.json({
      success: true,
      data: {
        works: works.map((w) => ({
          ...w,
          likesCount: w._count.CreativeWorkLike,
          _count: undefined,
        })),
        authors: authors.map((a) => ({
          id: a.author.id,
          name: a.author.profile?.nickname || a.author.username,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 获取单个作品详情（公开）
exports.getPublicWork = async (req, res, next) => {
  try {
    const { id } = req.params;

    const work = await prisma.creativeWork.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: { select: { nickname: true } },
          },
        },
        Category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
        _count: { select: { CreativeWorkLike: true } },
      },
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    // 只有已审核通过的作品可以公开访问
    if (work.status !== 'APPROVED') {
      return res.status(403).json({ success: false, error: '作品未发布' });
    }

    res.json({
      success: true,
      data: {
        ...work,
        likesCount: work._count.CreativeWorkLike,
        _count: undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

// 获取我的作品列表
exports.getMyWorks = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      category, // 栏目 slug
      type, // 作品类型筛选
      status, // PENDING / APPROVED / REJECTED
      page = 1,
      limit = 12,
      search,
    } = req.query;

    const where = { authorId: userId };

    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [works, total] = await Promise.all([
      prisma.creativeWork.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          Category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
          _count: { select: { CreativeWorkLike: true } },
        },
      }),
      prisma.creativeWork.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        works: works.map((w) => ({
          ...w,
          likesCount: w._count.CreativeWorkLike,
          _count: undefined,
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 创建作品
exports.createWork = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { categoryId, title, htmlCode, plainText, type } = req.body;

    if (!categoryId || !title || !htmlCode) {
      return res.status(400).json({ success: false, error: '栏目、标题和HTML代码为必填项' });
    }

    // 验证栏目存在且启用
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || !category.isActive) {
      return res.status(400).json({ success: false, error: '栏目不存在或已禁用' });
    }

    const work = await prisma.creativeWork.create({
      data: {
        authorId: userId,
        categoryId,
        title,
        type: type || null,
        htmlCode,
        plainText: plainText || null,
        status: 'PENDING',
      },
      include: {
        Category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
      },
    });

    res.status(201).json({ success: true, data: work });
  } catch (error) {
    next(error);
  }
};

// 更新作品
exports.updateWork = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, htmlCode, plainText, type, categoryId } = req.body;

    const work = await prisma.creativeWork.findUnique({ where: { id } });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    if (work.authorId !== userId) {
      return res.status(403).json({ success: false, error: '无权编辑此作品' });
    }

    // 编辑后重新进入待审核状态
    const updated = await prisma.creativeWork.update({
      where: { id },
      data: {
        title: title || work.title,
        type: type !== undefined ? type : work.type,
        htmlCode: htmlCode || work.htmlCode,
        plainText: plainText !== undefined ? plainText : work.plainText,
        categoryId: categoryId || work.categoryId,
        status: 'PENDING',
        reviewReason: null,
      },
      include: {
        Category: {
          select: { id: true, name: true, slug: true, icon: true },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// 删除作品
exports.deleteWork = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { id } = req.params;

    const work = await prisma.creativeWork.findUnique({ where: { id } });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    // 只有作者或管理员可以删除
    if (work.authorId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, error: '无权删除此作品' });
    }

    await prisma.creativeWork.delete({ where: { id } });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    next(error);
  }
};

// 点赞/取消点赞
exports.toggleLike = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const work = await prisma.creativeWork.findUnique({
      where: { id },
      include: { Category: true },
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    if (work.status !== 'APPROVED') {
      return res.status(400).json({ success: false, error: '只能给已发布的作品点赞' });
    }

    // 查找现有点赞
    const existingLike = await prisma.creativeWorkLike.findUnique({
      where: { userId_workId: { userId, workId: id } },
    });

    let liked;
    if (existingLike) {
      // 取消点赞
      await prisma.creativeWorkLike.delete({
        where: { id: existingLike.id },
      });
      liked = false;
    } else {
      // 点赞
      await prisma.creativeWorkLike.create({
        data: { userId, workId: id, isLike: true },
      });
      liked = true;

      // 给作者加积分（如果不是自己点赞自己）
      if (work.authorId !== userId) {
        try {
          await pointService.addPoints('W002', work.authorId, {
            targetType: 'creativeWork',
            targetId: id,
            description: `作品"${work.title}"被点赞`,
          });
        } catch (e) {
          console.error('点赞积分发放失败:', e.message);
        }
      }
    }

    // 获取最新点赞数
    const likesCount = await prisma.creativeWorkLike.count({
      where: { workId: id, isLike: true },
    });

    res.json({ success: true, data: { liked, likesCount } });
  } catch (error) {
    next(error);
  }
};

// 检查是否已点赞
exports.checkLike = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const like = await prisma.creativeWorkLike.findUnique({
      where: { userId_workId: { userId, workId: id } },
    });

    res.json({ success: true, data: { liked: !!like && like.isLike } });
  } catch (error) {
    next(error);
  }
};

// ========== 管理员接口 ==========

// 获取待审核作品列表
exports.getPendingWorks = async (req, res, next) => {
  try {
    const {
      category, // 栏目 slug
      userId, // 按用户筛选
      page = 1,
      limit = 20,
    } = req.query;

    const where = { status: 'PENDING' };

    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }

    if (userId) {
      where.authorId = userId;
    }

    const [works, total] = await Promise.all([
      prisma.creativeWork.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } },
            },
          },
          Category: {
            select: { id: true, name: true, slug: true, icon: true, points: true },
          },
        },
      }),
      prisma.creativeWork.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        works,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// 获取有待审核作品的用户列表
exports.getPendingUsers = async (req, res, next) => {
  try {
    const { category } = req.query;

    const where = { status: 'PENDING' };

    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }

    const users = await prisma.creativeWork.groupBy({
      by: ['authorId'],
      where,
      _count: { id: true },
    });

    const userDetails = await prisma.user.findMany({
      where: { id: { in: users.map((u) => u.authorId) } },
      select: {
        id: true,
        username: true,
        profile: { select: { nickname: true } },
      },
    });

    const result = users.map((u) => {
      const user = userDetails.find((d) => d.id === u.authorId);
      return {
        id: u.authorId,
        username: user?.username || '',
        nickname: user?.profile?.nickname || '',
        displayName: user?.profile?.nickname || user?.username || '',
        pendingCount: u._count.id,
      };
    });

    res.json({ success: true, data: { users: result } });
  } catch (error) {
    next(error);
  }
};

// 获取审核统计
exports.getStats = async (req, res, next) => {
  try {
    const { category } = req.query;

    const where = {};
    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }

    const [pending, approved, rejected, total] = await Promise.all([
      prisma.creativeWork.count({ where: { ...where, status: 'PENDING' } }),
      prisma.creativeWork.count({ where: { ...where, status: 'APPROVED' } }),
      prisma.creativeWork.count({ where: { ...where, status: 'REJECTED' } }),
      prisma.creativeWork.count({ where }),
    ]);

    res.json({
      success: true,
      data: { stats: { pending, approved, rejected, total } },
    });
  } catch (error) {
    next(error);
  }
};

// 审核作品（通过/拒绝）
exports.reviewWork = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, error: '无效的审核状态' });
    }

    const work = await prisma.creativeWork.findUnique({
      where: { id },
      include: { Category: true },
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    if (work.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: '只能审核待审核的作品' });
    }

    // 更新状态
    const updated = await prisma.creativeWork.update({
      where: { id },
      data: {
        status,
        reviewReason: status === 'REJECTED' ? reason : null,
      },
    });

    // 如果审核通过，发放积分
    if (status === 'APPROVED') {
      // 检查是否已发过积分（防止重复）
      const existingLog = await prisma.pointLog.findFirst({
        where: {
          targetType: 'creativeWork',
          targetId: id,
          points: { gt: 0 },
        },
      });

      if (!existingLog) {
        const points = work.Category?.points || 5;
        try {
          // 使用通用积分规则或直接添加
          await prisma.pointLog.create({
            data: {
              userId: work.authorId,
              points,
              description: `创意作品《${work.title}》审核通过`,
              targetType: 'creativeWork',
              targetId: id,
            },
          });

          // 更新用户总积分
          await prisma.user.update({
            where: { id: work.authorId },
            data: { totalPoints: { increment: points } },
          });
        } catch (e) {
          console.error('积分发放失败:', e.message);
        }
      }
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// 获取审核历史
exports.getReviewHistory = async (req, res, next) => {
  try {
    const {
      category,
      status, // APPROVED / REJECTED
      page = 1,
      limit = 20,
      search,
    } = req.query;

    const where = {
      status: { in: ['APPROVED', 'REJECTED'] },
    };

    if (category) {
      const cat = await prisma.category.findUnique({ where: { slug: category } });
      if (cat) where.categoryId = cat.id;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { username: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [works, total] = await Promise.all([
      prisma.creativeWork.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } },
            },
          },
          Category: {
            select: { id: true, name: true, slug: true, icon: true },
          },
        },
      }),
      prisma.creativeWork.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        works,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
