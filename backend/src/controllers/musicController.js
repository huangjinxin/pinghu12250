/**
 * 音乐控制器
 */

const { PrismaClient } = require('@prisma/client');
const pointService = require('../services/pointService');
const achievementService = require('../services/achievementService');

const prisma = new PrismaClient();

/**
 * 搜索音乐（从全局音乐库）
 */
exports.searchMusic = async (req, res, next) => {
  try {
    const { keyword, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { artist: { contains: keyword, mode: 'insensitive' } },
            { album: { contains: keyword, mode: 'insensitive' } },
          ],
        }
      : {};

    const [musics, total] = await Promise.all([
      prisma.music.findMany({
        where,
        include: {
          createdByUser: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              musicLibrary: true,
              musicLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.music.count({ where }),
    ]);

    res.json({
      musics,
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
 * 获取音乐详情
 */
exports.getMusicDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const music = await prisma.music.findUnique({
      where: { id },
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            musicLibrary: true,
            musicLogs: true,
          },
        },
      },
    });

    if (!music) {
      return res.status(404).json({ error: '音乐不存在' });
    }

    // 获取当前用户的音乐库状态
    let myMusicLibrary = null;
    if (req.user) {
      myMusicLibrary = await prisma.userMusicLibrary.findUnique({
        where: {
          userId_musicId: {
            userId: req.user.id,
            musicId: id,
          },
        },
      });
    }

    res.json({
      ...music,
      myMusicLibrary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 添加音乐到音乐库
 */
exports.addMusic = async (req, res, next) => {
  try {
    const { title, artist, album, coverUrl, genre, spotifyUrl, duration, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: '音乐名不能为空' });
    }

    const music = await prisma.music.create({
      data: {
        title,
        artist,
        album,
        coverUrl,
        genre,
        spotifyUrl,
        duration: duration ? parseInt(duration) : null,
        description,
        createdBy: req.user.id,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({
      message: '音乐添加成功',
      music,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的音乐库
 */
exports.getMyMusicLibrary = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.user.id,
      ...(status && { status }),
    };

    const [musicLibrary, total] = await Promise.all([
      prisma.userMusicLibrary.findMany({
        where,
        include: {
          music: {
            include: {
              _count: {
                select: {
                  musicLogs: {
                    where: { userId: req.user.id },
                  },
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.userMusicLibrary.count({ where }),
    ]);

    res.json({
      musicLibrary,
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
 * 添加音乐到我的音乐库
 */
exports.addToMyMusicLibrary = async (req, res, next) => {
  try {
    const { musicId, status = 'WANT_TO_LISTEN' } = req.body;

    if (!musicId) {
      return res.status(400).json({ error: '音乐ID不能为空' });
    }

    const music = await prisma.music.findUnique({ where: { id: musicId } });
    if (!music) {
      return res.status(404).json({ error: '音乐不存在' });
    }

    const musicLibrary = await prisma.userMusicLibrary.create({
      data: {
        userId: req.user.id,
        musicId,
        status,
      },
      include: {
        music: true,
      },
    });

    res.status(201).json({
      message: '添加成功',
      musicLibrary,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '该音乐已在音乐库中' });
    }
    next(error);
  }
};

/**
 * 更新音乐库中的状态
 */
exports.updateMusicLibraryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const musicLibrary = await prisma.userMusicLibrary.findUnique({
      where: { id },
    });

    if (!musicLibrary) {
      return res.status(404).json({ error: '音乐库记录不存在' });
    }

    if (musicLibrary.userId !== req.user.id) {
      return res.status(403).json({ error: '无权操作' });
    }

    const updated = await prisma.userMusicLibrary.update({
      where: { id },
      data: { status },
      include: {
        music: true,
      },
    });

    res.json({
      message: '更新成功',
      musicLibrary: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取音乐记录列表（听后感动态）
 */
exports.getMusicLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [musicLogs, total] = await Promise.all([
      prisma.musicLog.findMany({
        where: { isPublic: true },
        include: {
          user: {
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
          music: true,
          _count: {
            select: {
              likes: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.musicLog.count({ where: { isPublic: true } }),
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
 * 创建音乐记录
 */
exports.createMusicLog = async (req, res, next) => {
  try {
    const { musicId, content } = req.body;

    if (!musicId || !content) {
      return res.status(400).json({ error: '音乐ID和内容不能为空' });
    }

    const music = await prisma.music.findUnique({ where: { id: musicId } });
    if (!music) {
      return res.status(404).json({ error: '音乐不存在' });
    }

    const musicLog = await prisma.musicLog.create({
      data: {
        userId: req.user.id,
        musicId,
        content,
        isPublic: true,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        music: true,
      },
    });

    res.status(201).json({
      message: '听后感发布成功',
      musicLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 点赞/点踩音乐记录
 */
exports.toggleMusicLogLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isLike } = req.body;

    const musicLog = await prisma.musicLog.findUnique({ where: { id } });
    if (!musicLog) {
      return res.status(404).json({ error: '听后感不存在' });
    }

    const existing = await prisma.musicLogLike.findUnique({
      where: {
        musicLogId_userId: {
          musicLogId: id,
          userId: req.user.id,
        },
      },
    });

    if (existing) {
      if (existing.isLike === isLike) {
        // 取消点赞/点踩
        await prisma.musicLogLike.delete({
          where: { id: existing.id },
        });

        await prisma.musicLog.update({
          where: { id },
          data: {
            likesCount: isLike ? { decrement: 1 } : musicLog.likesCount,
            dislikesCount: !isLike ? { decrement: 1 } : musicLog.dislikesCount,
          },
        });

        return res.json({ message: '已取消' });
      } else {
        // 切换点赞/点踩
        await prisma.musicLogLike.update({
          where: { id: existing.id },
          data: { isLike },
        });

        await prisma.musicLog.update({
          where: { id },
          data: {
            likesCount: isLike ? { increment: 1 } : { decrement: 1 },
            dislikesCount: !isLike ? { increment: 1 } : { decrement: 1 },
          },
        });

        return res.json({ message: isLike ? '已点赞' : '已点踩' });
      }
    } else {
      // 新增点赞/点踩
      await prisma.musicLogLike.create({
        data: {
          musicLogId: id,
          userId: req.user.id,
          isLike,
        },
      });

      await prisma.musicLog.update({
        where: { id },
        data: {
          likesCount: isLike ? { increment: 1 } : musicLog.likesCount,
          dislikesCount: !isLike ? { increment: 1 } : musicLog.dislikesCount,
        },
      });

      return res.json({ message: isLike ? '已点赞' : '已点踩' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 删除音乐记录
 */
exports.deleteMusicLog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const musicLog = await prisma.musicLog.findUnique({ where: { id } });
    if (!musicLog) {
      return res.status(404).json({ error: '听后感不存在' });
    }

    if (musicLog.userId !== req.user.id) {
      return res.status(403).json({ error: '无权删除' });
    }

    await prisma.musicLog.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新音乐信息
 */
exports.updateMusic = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, artist, album, coverUrl, genre, spotifyUrl, duration, description } = req.body;

    const music = await prisma.music.findUnique({ where: { id } });
    if (!music) {
      return res.status(404).json({ error: '音乐不存在' });
    }

    if (music.createdBy !== req.user.id) {
      return res.status(403).json({ error: '无权修改' });
    }

    const updated = await prisma.music.update({
      where: { id },
      data: {
        title,
        artist,
        album,
        coverUrl,
        genre,
        spotifyUrl,
        duration: duration ? parseInt(duration) : null,
        description,
      },
    });

    res.json({
      message: '更新成功',
      music: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除音乐
 */
exports.deleteMusic = async (req, res, next) => {
  try {
    const { id } = req.params;

    const music = await prisma.music.findUnique({ where: { id } });
    if (!music) {
      return res.status(404).json({ error: '音乐不存在' });
    }

    if (music.createdBy !== req.user.id) {
      return res.status(403).json({ error: '无权删除' });
    }

    await prisma.music.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
};
