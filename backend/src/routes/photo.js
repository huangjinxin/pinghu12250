/**
 * 照片分享路由
 * 支持照片上传、心情标记、照片类型标记
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { photoUpload, photoDir } = require('../middleware/upload');
const path = require('path');

// 心情选项
const MOOD_OPTIONS = ['happy', 'calm', 'sad', 'angry', 'anxious', 'excited'];
// 照片类型选项
const PHOTO_TYPE_OPTIONS = ['selfie', 'scenery', 'friends', 'food', 'pet', 'activity', 'other'];

/**
 * POST /api/photos - 发布照片分享
 * 支持最多9张图片
 */
router.post('/', authenticate, photoUpload.array('photos', 9), async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, mood, moodScore, photoType, location, isPublic } = req.body;

    // 检查是否有照片
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: '请至少上传一张照片' });
    }

    // 验证心情
    if (mood && !MOOD_OPTIONS.includes(mood)) {
      return res.status(400).json({ success: false, error: '无效的心情选项' });
    }

    // 验证照片类型
    if (photoType && !PHOTO_TYPE_OPTIONS.includes(photoType)) {
      return res.status(400).json({ success: false, error: '无效的照片类型' });
    }

    // 构建图片URL列表
    const images = req.files.map(file => {
      // 返回静态文件服务路径
      const relativePath = path.relative(photoDir, file.path);
      return `/photos-static/${relativePath}`;
    });

    // 创建动态
    const dynamic = await prisma.dynamic.create({
      data: {
        authorId: userId,
        content: content || '',
        images,
        isPublic: isPublic !== 'false',
        dynamicType: 'photo',
        mood,
        moodScore: moodScore ? parseInt(moodScore) : null,
        photoType,
        location,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: { select: { nickname: true } },
          },
        },
        _count: { select: { Like: true, Comment: true } },
      },
    });

    res.json({
      success: true,
      data: {
        ...dynamic,
        author: dynamic.user,
        likesCount: dynamic._count.Like,
        commentsCount: dynamic._count.Comment,
      },
    });
  } catch (error) {
    console.error('发布照片分享失败:', error);
    res.status(500).json({ success: false, error: '发布失败' });
  }
});

/**
 * GET /api/photos - 获取照片分享列表
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, mood, photoType, authorId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      dynamicType: 'photo',
      OR: [
        { isPublic: true },
        { authorId: userId },
      ],
    };

    // 筛选条件
    if (mood) where.mood = mood;
    if (photoType) where.photoType = photoType;
    if (authorId) where.authorId = authorId;

    const [photos, total] = await Promise.all([
      prisma.dynamic.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } },
            },
          },
          Like: {
            where: { userId },
            select: { id: true },
          },
          _count: { select: { Like: true, Comment: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.dynamic.count({ where }),
    ]);

    const data = photos.map(photo => ({
      ...photo,
      author: photo.user,
      likesCount: photo._count.Like,
      commentsCount: photo._count.Comment,
      isLiked: photo.Like.length > 0,
      Like: undefined,
      user: undefined,
      _count: undefined,
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('获取照片列表失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

/**
 * GET /api/photos/:id - 获取单张照片详情
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const photo = await prisma.dynamic.findUnique({
      where: { id, dynamicType: 'photo' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: { select: { nickname: true } },
          },
        },
        Like: {
          where: { userId },
          select: { id: true },
        },
        Comment: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                profile: { select: { nickname: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        _count: { select: { Like: true, Comment: true } },
      },
    });

    if (!photo) {
      return res.status(404).json({ success: false, error: '照片不存在' });
    }

    // 检查权限
    if (!photo.isPublic && photo.authorId !== userId) {
      return res.status(403).json({ success: false, error: '无权查看' });
    }

    res.json({
      success: true,
      data: {
        ...photo,
        author: photo.user,
        comments: photo.Comment.map(c => ({ ...c, author: c.user, user: undefined })),
        likesCount: photo._count.Like,
        commentsCount: photo._count.Comment,
        isLiked: photo.Like.length > 0,
        Like: undefined,
        user: undefined,
        Comment: undefined,
        _count: undefined,
      },
    });
  } catch (error) {
    console.error('获取照片详情失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

/**
 * DELETE /api/photos/:id - 删除照片分享
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const photo = await prisma.dynamic.findUnique({
      where: { id },
    });

    if (!photo) {
      return res.status(404).json({ success: false, error: '照片不存在' });
    }

    if (photo.authorId !== userId) {
      return res.status(403).json({ success: false, error: '无权删除' });
    }

    await prisma.dynamic.delete({ where: { id } });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除照片失败:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

/**
 * POST /api/photos/:id/like - 点赞照片
 */
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const photo = await prisma.dynamic.findUnique({ where: { id } });
    if (!photo) {
      return res.status(404).json({ success: false, error: '照片不存在' });
    }

    // 检查是否已点赞
    const existingLike = await prisma.like.findUnique({
      where: { userId_dynamicId: { userId, dynamicId: id } },
    });

    if (existingLike) {
      // 取消点赞
      await prisma.like.delete({ where: { id: existingLike.id } });
      res.json({ success: true, liked: false });
    } else {
      // 点赞
      await prisma.like.create({
        data: { userId, dynamicId: id },
      });
      res.json({ success: true, liked: true });
    }
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

/**
 * POST /api/photos/:id/comment - 评论照片
 */
router.post('/:id/comment', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { content, parentId } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: '评论内容不能为空' });
    }

    const photo = await prisma.dynamic.findUnique({ where: { id } });
    if (!photo) {
      return res.status(404).json({ success: false, error: '照片不存在' });
    }

    const comment = await prisma.comment.create({
      data: {
        authorId: userId,
        dynamicId: id,
        content: content.trim(),
        parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: { select: { nickname: true } },
          },
        },
      },
    });

    res.json({ success: true, data: comment });
  } catch (error) {
    console.error('评论失败:', error);
    res.status(500).json({ success: false, error: '评论失败' });
  }
});

/**
 * GET /api/photos/image/:path(*) - 获取照片文件
 */
router.get('/image/:path(*)', async (req, res) => {
  try {
    const imagePath = path.join(photoDir, req.params.path);
    res.sendFile(imagePath);
  } catch (error) {
    console.error('获取图片失败:', error);
    res.status(404).json({ success: false, error: '图片不存在' });
  }
});

/**
 * GET /api/photos/stats - 获取用户照片统计（心理分析用）
 */
router.get('/stats/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const photos = await prisma.dynamic.findMany({
      where: {
        authorId: userId,
        dynamicType: 'photo',
        createdAt: { gte: startDate },
      },
      select: {
        mood: true,
        moodScore: true,
        photoType: true,
        createdAt: true,
      },
    });

    // 统计心情分布
    const moodDistribution = {};
    MOOD_OPTIONS.forEach(m => (moodDistribution[m] = 0));
    photos.forEach(p => {
      if (p.mood) moodDistribution[p.mood]++;
    });

    // 统计照片类型分布
    const photoTypeDistribution = {};
    PHOTO_TYPE_OPTIONS.forEach(t => (photoTypeDistribution[t] = 0));
    photos.forEach(p => {
      if (p.photoType) photoTypeDistribution[p.photoType]++;
    });

    // 计算平均心情分数
    const moodScores = photos.filter(p => p.moodScore).map(p => p.moodScore);
    const avgMoodScore = moodScores.length > 0
      ? (moodScores.reduce((a, b) => a + b, 0) / moodScores.length).toFixed(1)
      : null;

    // 按日期统计发布数量
    const byDate = {};
    photos.forEach(p => {
      const dateKey = p.createdAt.toISOString().split('T')[0];
      byDate[dateKey] = (byDate[dateKey] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        totalPhotos: photos.length,
        moodDistribution,
        photoTypeDistribution,
        avgMoodScore,
        byDate,
        period: { start: startDate.toISOString().split('T')[0], days: parseInt(days) },
      },
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

module.exports = router;
