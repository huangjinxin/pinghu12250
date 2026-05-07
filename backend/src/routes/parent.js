/**
 * 家长专属路由
 * 用于查看绑定孩子的数据（只读）
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// 所有路由都需要登录
router.use(authenticate);

/**
 * 验证家长与孩子的关系
 */
async function verifyParentChild(parentId, childId) {
  if (!parentId || !childId) return false;
  const relation = await prisma.studentParent.findFirst({
    where: { parentId, childId }
  });
  return !!relation;
}

/**
 * 家长身份验证中间件
 */
async function parentOnly(req, res, next) {
  if (req.user.role !== 'PARENT') {
    return res.status(403).json({ success: false, error: '只有家长可以访问此接口' });
  }
  next();
}

/**
 * 孩子关系验证中间件
 */
async function validateChild(req, res, next) {
  const { childId } = req.params;
  const isValid = await verifyParentChild(req.user.id, childId);
  if (!isValid) {
    return res.status(403).json({ success: false, error: '无权查看该孩子的数据' });
  }

  // 检查孩子是否设置了对家长隐藏共享
  const childProfile = await prisma.profile.findUnique({
    where: { userId: childId },
    select: { hideFromParents: true }
  });

  if (childProfile?.hideFromParents) {
    return res.status(403).json({
      success: false,
      error: '由于你不尊重孩子隐私，孩子已经停止了给你的共享，管好自己的言行，耐心等待孩子开启共享',
      code: 'PRIVACY_BLOCKED'
    });
  }

  req.childId = childId;
  next();
}

// ============================================
// 孩子作品接口
// ============================================

// 获取孩子的所有作品（聚合：HTML作品 + 诗词作品 + 创意作品）
router.get('/child/:childId/works', parentOnly, validateChild, async (req, res) => {
  try {
    const { childId } = req.params;
    const { type, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let works = [];
    let total = 0;

    if (!type || type === 'all') {
      // 聚合所有类型的作品
      const [htmlWorks, poetryWorks, creativeWorks] = await Promise.all([
        prisma.hTMLWork.findMany({
          where: { authorId: childId },
          select: {
            id: true, title: true, description: true, thumbnail: true,
            viewCount: true, likeCount: true, isPublic: true, createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }),
        prisma.poetryWork.findMany({
          where: { authorId: childId },
          select: {
            id: true, title: true, content: true, coverImage: true, coverStyle: true,
            status: true, likeCount: true, createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        }),
        prisma.creativeWork.findMany({
          where: { authorId: childId },
          select: {
            id: true, title: true, description: true, type: true,
            thumbnail: true, status: true, likeCount: true, createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      ]);

      // 标记作品类型
      const allWorks = [
        ...htmlWorks.map(w => ({ ...w, workType: 'html' })),
        ...poetryWorks.map(w => ({ ...w, workType: 'poetry' })),
        ...creativeWorks.map(w => ({ ...w, workType: 'creative' }))
      ];

      // 按创建时间排序
      allWorks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      total = allWorks.length;
      works = allWorks.slice(skip, skip + limitNum);
    } else if (type === 'html') {
      [works, total] = await Promise.all([
        prisma.hTMLWork.findMany({
          where: { authorId: childId },
          select: {
            id: true, title: true, description: true, thumbnail: true,
            viewCount: true, likeCount: true, isPublic: true, createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          skip, take: limitNum
        }),
        prisma.hTMLWork.count({ where: { authorId: childId } })
      ]);
      works = works.map(w => ({ ...w, workType: 'html' }));
    } else if (type === 'poetry') {
      [works, total] = await Promise.all([
        prisma.poetryWork.findMany({
          where: { authorId: childId },
          select: {
            id: true, title: true, content: true, coverImage: true, coverStyle: true,
            status: true, likeCount: true, createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          skip, take: limitNum
        }),
        prisma.poetryWork.count({ where: { authorId: childId } })
      ]);
      works = works.map(w => ({ ...w, workType: 'poetry' }));
    } else if (type === 'creative') {
      [works, total] = await Promise.all([
        prisma.creativeWork.findMany({
          where: { authorId: childId },
          select: {
            id: true, title: true, description: true, type: true,
            thumbnail: true, status: true, likeCount: true, createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          skip, take: limitNum
        }),
        prisma.creativeWork.count({ where: { authorId: childId } })
      ]);
      works = works.map(w => ({ ...w, workType: 'creative' }));
    }

    res.json({
      success: true,
      data: {
        works,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('获取孩子作品列表失败:', error);
    res.status(500).json({ success: false, error: '获取列表失败' });
  }
});

// 获取孩子的作品统计
router.get('/child/:childId/works/stats', parentOnly, validateChild, async (req, res) => {
  try {
    const { childId } = req.params;

    const [htmlCount, poetryCount, creativeCount] = await Promise.all([
      prisma.hTMLWork.count({ where: { authorId: childId } }),
      prisma.poetryWork.count({ where: { authorId: childId } }),
      prisma.creativeWork.count({ where: { authorId: childId } })
    ]);

    res.json({
      success: true,
      data: {
        html: htmlCount,
        poetry: poetryCount,
        creative: creativeCount,
        total: htmlCount + poetryCount + creativeCount
      }
    });
  } catch (error) {
    console.error('获取孩子作品统计失败:', error);
    res.status(500).json({ success: false, error: '获取统计失败' });
  }
});

// 获取单个HTML作品详情
router.get('/child/:childId/works/html/:workId', parentOnly, validateChild, async (req, res) => {
  try {
    const { childId, workId } = req.params;

    const work = await prisma.hTMLWork.findFirst({
      where: { id: workId, authorId: childId },
      include: {
        author: {
          select: { id: true, username: true, avatar: true, profile: true }
        }
      }
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    res.json({ success: true, data: work });
  } catch (error) {
    console.error('获取HTML作品详情失败:', error);
    res.status(500).json({ success: false, error: '获取详情失败' });
  }
});

// 获取单个诗词作品详情
router.get('/child/:childId/works/poetry/:workId', parentOnly, validateChild, async (req, res) => {
  try {
    const { childId, workId } = req.params;

    const work = await prisma.poetryWork.findFirst({
      where: { id: workId, authorId: childId },
      include: {
        author: {
          select: { id: true, username: true, avatar: true, profile: true }
        }
      }
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    res.json({ success: true, data: work });
  } catch (error) {
    console.error('获取诗词作品详情失败:', error);
    res.status(500).json({ success: false, error: '获取详情失败' });
  }
});

// 获取单个创意作品详情
router.get('/child/:childId/works/creative/:workId', parentOnly, validateChild, async (req, res) => {
  try {
    const { childId, workId } = req.params;

    const work = await prisma.creativeWork.findFirst({
      where: { id: workId, authorId: childId },
      include: {
        author: {
          select: { id: true, username: true, avatar: true, profile: true }
        },
        category: true
      }
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    res.json({ success: true, data: work });
  } catch (error) {
    console.error('获取创意作品详情失败:', error);
    res.status(500).json({ success: false, error: '获取详情失败' });
  }
});

// ============================================
// 孩子日记AI分析记录接口
// ============================================

// 获取孩子的日记AI分析记录（只读）
router.get('/child/:childId/diary/analysis', parentOnly, validateChild, async (req, res) => {
  try {
    const { childId } = req.params;
    const { page = 1, limit = 20, isBatch } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = { userId: childId };
    if (isBatch !== undefined) {
      where.isBatch = isBatch === 'true';
    }

    const [records, total] = await Promise.all([
      prisma.diaryAnalysis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.diaryAnalysis.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('获取孩子日记分析记录失败:', error);
    res.status(500).json({ success: false, error: '获取记录失败' });
  }
});

// 获取单条分析记录详情（只读）
router.get('/child/:childId/diary/analysis/:recordId', parentOnly, validateChild, async (req, res) => {
  try {
    const { childId, recordId } = req.params;

    const record = await prisma.diaryAnalysis.findFirst({
      where: { id: recordId, userId: childId }
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('获取分析记录详情失败:', error);
    res.status(500).json({ success: false, error: '获取详情失败' });
  }
});

module.exports = router;
