/**
 * 影视控制器
 */

const { PrismaClient } = require('@prisma/client');
const pointService = require('../services/pointService');
const achievementService = require('../services/achievementService');

const prisma = new PrismaClient();

/**
 * 搜索影视（从全局影视库）
 */
exports.searchMovies = async (req, res, next) => {
  try {
    const { keyword, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { director: { contains: keyword, mode: 'insensitive' } },
            { actors: { contains: keyword, mode: 'insensitive' } },
          ],
        }
      : {};

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
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
              movieLibrary: true,
              movieLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.movie.count({ where }),
    ]);

    res.json({
      movies,
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
 * 获取影视详情
 */
exports.getMovieDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const movie = await prisma.movie.findUnique({
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
            movieLibrary: true,
            movieLogs: true,
          },
        },
      },
    });

    if (!movie) {
      return res.status(404).json({ error: '影视不存在' });
    }

    // 获取当前用户的影视库状态
    let myMovieLibrary = null;
    if (req.user) {
      myMovieLibrary = await prisma.userMovieLibrary.findUnique({
        where: {
          userId_movieId: {
            userId: req.user.id,
            movieId: id,
          },
        },
      });
    }

    res.json({
      ...movie,
      myMovieLibrary,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 添加影视到影视库
 */
exports.addMovie = async (req, res, next) => {
  try {
    const { title, director, actors, posterUrl, genre, imdbUrl, doubanUrl, duration, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: '影视名不能为空' });
    }

    const movie = await prisma.movie.create({
      data: {
        title,
        director,
        actors,
        posterUrl,
        genre,
        imdbUrl,
        doubanUrl,
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
      message: '影视添加成功',
      movie,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的影视库
 */
exports.getMyMovieLibrary = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.user.id,
      ...(status && { status }),
    };

    const [movieLibrary, total] = await Promise.all([
      prisma.userMovieLibrary.findMany({
        where,
        include: {
          movie: {
            include: {
              _count: {
                select: {
                  movieLogs: {
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
      prisma.userMovieLibrary.count({ where }),
    ]);

    res.json({
      movieLibrary,
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
 * 添加影视到我的影视库
 */
exports.addToMyMovieLibrary = async (req, res, next) => {
  try {
    const { movieId, status = 'WANT_TO_WATCH' } = req.body;

    if (!movieId) {
      return res.status(400).json({ error: '影视ID不能为空' });
    }

    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      return res.status(404).json({ error: '影视不存在' });
    }

    const movieLibrary = await prisma.userMovieLibrary.create({
      data: {
        userId: req.user.id,
        movieId,
        status,
      },
      include: {
        movie: true,
      },
    });

    res.status(201).json({
      message: '添加成功',
      movieLibrary,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '该影视已在影视库中' });
    }
    next(error);
  }
};

/**
 * 更新影视库中的状态
 */
exports.updateMovieLibraryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const movieLibrary = await prisma.userMovieLibrary.findUnique({
      where: { id },
    });

    if (!movieLibrary) {
      return res.status(404).json({ error: '影视库记录不存在' });
    }

    if (movieLibrary.userId !== req.user.id) {
      return res.status(403).json({ error: '无权操作' });
    }

    const updated = await prisma.userMovieLibrary.update({
      where: { id },
      data: { status },
      include: {
        movie: true,
      },
    });

    res.json({
      message: '更新成功',
      movieLibrary: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取影视记录列表（观后感动态）
 */
exports.getMovieLogs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movieLogs, total] = await Promise.all([
      prisma.movieLog.findMany({
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
          movie: true,
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
      prisma.movieLog.count({ where: { isPublic: true } }),
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

/**
 * 创建影视记录
 */
exports.createMovieLog = async (req, res, next) => {
  try {
    const { movieId, content } = req.body;

    if (!movieId || !content) {
      return res.status(400).json({ error: '影视ID和内容不能为空' });
    }

    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      return res.status(404).json({ error: '影视不存在' });
    }

    const movieLog = await prisma.movieLog.create({
      data: {
        userId: req.user.id,
        movieId,
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
        movie: true,
      },
    });

    res.status(201).json({
      message: '观后感发布成功',
      movieLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 点赞/点踩影视记录
 */
exports.toggleMovieLogLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isLike } = req.body;

    const movieLog = await prisma.movieLog.findUnique({ where: { id } });
    if (!movieLog) {
      return res.status(404).json({ error: '观后感不存在' });
    }

    const existing = await prisma.movieLogLike.findUnique({
      where: {
        movieLogId_userId: {
          movieLogId: id,
          userId: req.user.id,
        },
      },
    });

    if (existing) {
      if (existing.isLike === isLike) {
        // 取消点赞/点踩
        await prisma.movieLogLike.delete({
          where: { id: existing.id },
        });

        await prisma.movieLog.update({
          where: { id },
          data: {
            likesCount: isLike ? { decrement: 1 } : movieLog.likesCount,
            dislikesCount: !isLike ? { decrement: 1 } : movieLog.dislikesCount,
          },
        });

        return res.json({ message: '已取消' });
      } else {
        // 切换点赞/点踩
        await prisma.movieLogLike.update({
          where: { id: existing.id },
          data: { isLike },
        });

        await prisma.movieLog.update({
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
      await prisma.movieLogLike.create({
        data: {
          movieLogId: id,
          userId: req.user.id,
          isLike,
        },
      });

      await prisma.movieLog.update({
        where: { id },
        data: {
          likesCount: isLike ? { increment: 1 } : movieLog.likesCount,
          dislikesCount: !isLike ? { increment: 1 } : movieLog.dislikesCount,
        },
      });

      return res.json({ message: isLike ? '已点赞' : '已点踩' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * 删除影视记录
 */
exports.deleteMovieLog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const movieLog = await prisma.movieLog.findUnique({ where: { id } });
    if (!movieLog) {
      return res.status(404).json({ error: '观后感不存在' });
    }

    if (movieLog.userId !== req.user.id) {
      return res.status(403).json({ error: '无权删除' });
    }

    await prisma.movieLog.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新影视信息
 */
exports.updateMovie = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, director, actors, posterUrl, genre, imdbUrl, doubanUrl, duration, description } = req.body;

    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) {
      return res.status(404).json({ error: '影视不存在' });
    }

    if (movie.createdBy !== req.user.id) {
      return res.status(403).json({ error: '无权修改' });
    }

    const updated = await prisma.movie.update({
      where: { id },
      data: {
        title,
        director,
        actors,
        posterUrl,
        genre,
        imdbUrl,
        doubanUrl,
        duration: duration ? parseInt(duration) : null,
        description,
      },
    });

    res.json({
      message: '更新成功',
      movie: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除影视
 */
exports.deleteMovie = async (req, res, next) => {
  try {
    const { id } = req.params;

    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) {
      return res.status(404).json({ error: '影视不存在' });
    }

    if (movie.createdBy !== req.user.id) {
      return res.status(403).json({ error: '无权删除' });
    }

    await prisma.movie.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
};
