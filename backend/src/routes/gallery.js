/**
 * 少儿画廊 Routes
 * 展示平面设计类型的已通过审核的提交作品
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

/**
 * 获取画廊作品列表
 * GET /api/gallery
 *
 * 参数:
 * - typeId: 技术类型ID（可选，默认查找"平面设计"）
 * - typeName: 技术类型名称（可选，默认"平面设计"）
 * - standardId: 展示标准ID（可选）
 * - search: 用户名搜索（可选）
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认9）
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      typeId,
      typeName = '平面设计',
      standardId,
      search,
      page = 1,
      pageSize = 9
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // 构建查询条件
    const where = {
      status: 'APPROVED', // 只显示已通过审核的
      images: { isEmpty: false }, // 必须有图片
      template: {}
    };

    // 技术类型筛选
    if (typeId) {
      where.template.typeId = typeId;
    } else if (typeName) {
      // 根据类型名称查找
      const ruleType = await prisma.ruleType.findFirst({
        where: { name: typeName }
      });
      if (ruleType) {
        where.template.typeId = ruleType.id;
      }
    }

    // 展示标准筛选
    if (standardId) {
      where.template.standardId = standardId;
    }

    // 用户名搜索
    if (search) {
      where.user = {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { profile: { is: { nickname: { contains: search, mode: 'insensitive' } } } }
        ]
      };
    }

    // 查询数据
    const [total, submissions] = await Promise.all([
      prisma.ruleSubmission.count({ where }),
      prisma.ruleSubmission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: {
                select: {
                  nickname: true
                }
              }
            }
          },
          template: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    // 格式化返回数据
    const works = submissions.map(s => ({
      id: s.id,
      image: s.images[0], // 取第一张图片
      images: s.images,
      content: s.content,
      author: {
        id: s.user.id,
        username: s.user.username,
        nickname: s.user.profile?.nickname,
        avatar: s.user.avatar
      },
      template: {
        id: s.template.id,
        name: s.template.name,
        type: s.template.type,
        standard: s.template.standardId ? { id: s.template.standardId } : undefined
      },
      createdAt: s.createdAt
    }));

    res.json({
      works,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取画廊作品失败:', error);
    res.status(500).json({ error: '获取画廊作品失败' });
  }
});

/**
 * 获取画廊作品列表（公开访问，无需登录）
 * GET /api/gallery/public
 */
router.get('/public', async (req, res) => {
  try {
    const { page = 1, pageSize = 9 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // 查找平面设计类型
    const ruleType = await prisma.ruleType.findFirst({
      where: { name: '平面设计' }
    });

    const where = {
      status: 'APPROVED',
      images: { isEmpty: false },
      ...(ruleType && { template: { typeId: ruleType.id } })
    };

    const [total, submissions] = await Promise.all([
      prisma.ruleSubmission.count({ where }),
      prisma.ruleSubmission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          },
          template: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    const works = submissions.map(s => ({
      id: s.id,
      image: s.images[0],
      images: s.images,
      content: s.content,
      author: {
        id: s.user.id,
        username: s.user.username,
        nickname: s.user.profile?.nickname,
        avatar: s.user.avatar
      },
      template: {
        id: s.template.id,
        name: s.template.name,
        type: s.template.type,
        standard: s.template.standardId ? { id: s.template.standardId } : undefined
      },
      createdAt: s.createdAt
    }));

    res.json({
      works,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取公开画廊作品失败:', error);
    res.status(500).json({ error: '获取画廊作品失败' });
  }
});

/**
 * 获取技术类型列表（用于筛选）
 * GET /api/gallery/types
 */
router.get('/types', authenticate, async (req, res) => {
  try {
    const types = await prisma.ruleType.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ types });
  } catch (error) {
    console.error('获取技术类型失败:', error);
    res.status(500).json({ error: '获取技术类型失败' });
  }
});

/**
 * 获取展示标准列表（用于筛选）
 * GET /api/gallery/standards
 */
router.get('/standards', authenticate, async (req, res) => {
  try {
    const standards = await prisma.ruleStandard.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ standards });
  } catch (error) {
    console.error('获取展示标准失败:', error);
    res.status(500).json({ error: '获取展示标准失败' });
  }
});

/**
 * 获取朗诵作品列表（公开访问，无需登录）
 * GET /api/recitation/public
 */
router.get('/recitation/public', async (req, res) => {
  try {
    const { page = 1, pageSize = 9 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // 查找朗读背诵类型
    const ruleType = await prisma.ruleType.findFirst({
      where: { name: '朗读背诵' }
    });

    const where = {
      status: 'APPROVED',
      audios: { isEmpty: false },
      ...(ruleType && { template: { typeId: ruleType.id } })
    };

    const [total, submissions] = await Promise.all([
      prisma.ruleSubmission.count({ where }),
      prisma.ruleSubmission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          },
          template: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    const works = submissions.map(s => ({
      id: s.id,
      audio: s.audios[0],
      audios: s.audios,
      title: s.template?.name || '朗诵作品',
      content: s.content,
      author: {
        id: s.user.id,
        username: s.user.username,
        nickname: s.user.profile?.nickname,
        avatar: s.user.avatar
      },
      createdAt: s.createdAt
    }));

    res.json({
      works,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取公开朗诵作品失败:', error);
    res.status(500).json({ error: '获取朗诵作品失败' });
  }
});

/**
 * 获取朗诵作品列表（音频类）
 * GET /api/gallery/recitation
 *
 * 参数:
 * - typeId: 技术类型ID（可选，默认查找"朗读背诵"）
 * - typeName: 技术类型名称（可选，默认"朗读背诵"）
 * - standardId: 展示标准ID（可选）
 * - search: 用户名搜索（可选）
 * - description: 描述搜索（可选）
 * - page: 页码（默认1）
 * - pageSize: 每页数量（默认9）
 */
router.get('/recitation', authenticate, async (req, res) => {
  try {
    const {
      typeId,
      typeName = '朗读背诵',
      standardId,
      search,
      description,
      page = 1,
      pageSize = 9
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // 构建查询条件
    const where = {
      status: 'APPROVED', // 只显示已通过审核的
      audios: { isEmpty: false }, // 必须有音频
      template: {}
    };

    // 技术类型筛选
    if (typeId) {
      where.template.typeId = typeId;
    } else if (typeName) {
      // 根据类型名称查找
      const ruleType = await prisma.ruleType.findFirst({
        where: { name: typeName }
      });
      if (ruleType) {
        where.template.typeId = ruleType.id;
      }
    }

    // 展示标准筛选
    if (standardId) {
      where.template.standardId = standardId;
    }

    // 用户名搜索
    if (search) {
      where.user = {
        OR: [
          { username: { contains: search, mode: 'insensitive' } },
          { profile: { is: { nickname: { contains: search, mode: 'insensitive' } } } }
        ]
      };
    }

    // 描述搜索
    if (description) {
      where.content = { contains: description };
    }

    // 查询数据
    const [total, submissions] = await Promise.all([
      prisma.ruleSubmission.count({ where }),
      prisma.ruleSubmission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: {
                select: {
                  nickname: true
                }
              }
            }
          },
          template: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    // 格式化返回数据
    const works = submissions.map(s => ({
      id: s.id,
      audio: s.audios[0], // 取第一个音频
      audios: s.audios,
      content: s.content,
      author: {
        id: s.user.id,
        username: s.user.username,
        nickname: s.user.profile?.nickname,
        avatar: s.user.avatar
      },
      template: {
        id: s.template.id,
        name: s.template.name,
        type: s.template.type,
        standard: s.template.standardId ? { id: s.template.standardId } : undefined
      },
      createdAt: s.createdAt
    }));

    res.json({
      works,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取朗诵作品失败:', error);
    res.status(500).json({ error: '获取朗诵作品失败' });
  }
});

/**
 * 获取单个朗诵作品详情（公开访问）
 * GET /api/gallery/recitation/:id
 * 注意：此路由必须在 /:id 之前定义
 */
router.get('/recitation/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await prisma.ruleSubmission.findFirst({
      where: {
        id,
        status: 'APPROVED',
        audios: { isEmpty: false }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: {
              select: {
                nickname: true
              }
            }
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            type: true,
            standardId: true
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: '作品不存在或未通过审核' });
    }

    const work = {
      id: submission.id,
audio: submission.audios[0],
      audios: submission.audios,
      content: submission.content,
      author: {
        id: submission.user.id,
        username: submission.user.username,
        nickname: submission.user.profile?.nickname,
        avatar: submission.user.avatar
      },
      template: {
        select: {
          id: true,
          name: true,
          type: true,
          standardId: true
        }
      }
    };

    res.json({ work });
  } catch (error) {
    console.error('获取朗诵作品详情失败:', error);
    res.status(500).json({ error: '获取作品详情失败' });
  }
});

/**
 * 获取单个画廊作品详情（公开访问）
 * GET /api/gallery/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await prisma.ruleSubmission.findFirst({
      where: {
        id,
        status: 'APPROVED',
        images: { isEmpty: false }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: {
              select: {
                nickname: true
              }
            }
          }
        },
        template: {
          select: {
            id: true,
            name: true,
            type: true,
            standardId: true
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: '作品不存在或未通过审核' });
    }

    const work = {
      id: submission.id,
image: submission.images[0],
      images: submission.images,
      content: submission.content,
      author: {
        id: submission.user.id,
        username: submission.user.username,
        nickname: submission.user.profile?.nickname,
        avatar: submission.user.avatar
      },
      template: {
        select: {
          id: true,
          name: true,
          type: true,
          standardId: true
        }
      }
    };

    res.json({ work });
  } catch (error) {
    console.error('获取画廊作品详情失败:', error);
    res.status(500).json({ error: '获取作品详情失败' });
  }
});

module.exports = router;
