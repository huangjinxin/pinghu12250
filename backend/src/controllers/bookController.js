/**
 * 读书笔记控制器
 */

const { PrismaClient } = require('@prisma/client');
const pointService = require('../services/pointService');
const achievementService = require('../services/achievementService');

const prisma = new PrismaClient();

/**
 * 搜索书籍（从全局书库）
 */
exports.searchBooks = async (req, res, next) => {
  try {
    const { keyword, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = keyword
      ? {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { author: { contains: keyword, mode: 'insensitive' } },
          ],
        }
      : {};

    const [books, total] = await Promise.all([
      prisma.book.findMany({
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
              bookshelves: true,
              readingLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.book.count({ where }),
    ]);

    res.json({
      books,
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
 * 获取书籍详情
 */
exports.getBookDetail = async (req, res, next) => {
  try {
    const { id } = req.params;

    const book = await prisma.book.findUnique({
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
            bookshelves: true,
            readingLogs: true,
          },
        },
      },
    });

    if (!book) {
      return res.status(404).json({ error: '书籍不存在' });
    }

    // 获取当前用户的书架状态
    let myBookshelf = null;
    if (req.user) {
      myBookshelf = await prisma.userBookshelf.findUnique({
        where: {
          userId_bookId: {
            userId: req.user.id,
            bookId: id,
          },
        },
      });
    }

    res.json({
      ...book,
      myBookshelf,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 添加书籍到书库
 */
exports.addBook = async (req, res, next) => {
  try {
    const { title, author, coverUrl, sourceType, sourceUrl, totalPages, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: '书名不能为空' });
    }

    const book = await prisma.book.create({
      data: {
        title,
        author,
        coverUrl,
        sourceType,
        sourceUrl,
        totalPages: totalPages ? parseInt(totalPages) : null,
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
      message: '书籍添加成功',
      book,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的书架
 */
exports.getMyBookshelf = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: req.user.id,
      ...(status && { status }),
    };

    const [bookshelves, total] = await Promise.all([
      prisma.userBookshelf.findMany({
        where,
        include: {
          book: {
            include: {
              _count: {
                select: {
                  readingLogs: {
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
      prisma.userBookshelf.count({ where }),
    ]);

    res.json({
      bookshelves,
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
 * 添加书籍到我的书架
 */
exports.addToMyBookshelf = async (req, res, next) => {
  try {
    const { bookId, status = 'WANT_TO_READ' } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: '书籍ID不能为空' });
    }

    // 检查书籍是否存在
    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return res.status(404).json({ error: '书籍不存在' });
    }

    // 检查是否已添加
    const existing = await prisma.userBookshelf.findUnique({
      where: {
        userId_bookId: {
          userId: req.user.id,
          bookId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: '该书籍已在书架中' });
    }

    const bookshelf = await prisma.userBookshelf.create({
      data: {
        userId: req.user.id,
        bookId,
        status,
      },
      include: {
        book: true,
      },
    });

    // 奖励积分 (R001: 添加书籍 +2分)
    try {
      const pointResult = await pointService.addPoints('R001', req.user.id, {
        targetType: 'bookshelf',
        targetId: bookshelf.id,
      });
      if (pointResult.success) {
        bookshelf.earnedPoints = pointResult.log.points;
        bookshelf.newTotalPoints = pointResult.totalPoints;
      }
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.status(201).json({
      message: '添加成功',
      bookshelf,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新书架中的书籍状态
 */
exports.updateBookshelfStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const bookshelf = await prisma.userBookshelf.findUnique({
      where: { id },
    });

    if (!bookshelf) {
      return res.status(404).json({ error: '书架记录不存在' });
    }

    if (bookshelf.userId !== req.user.id) {
      return res.status(403).json({ error: '无权修改' });
    }

    const oldStatus = bookshelf.status;
    const updated = await prisma.userBookshelf.update({
      where: { id },
      data: { status },
      include: {
        book: true,
      },
    });

    // 如果改为已读完，奖励积分 (R005: 读完一本书 +20分)
    if (status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
      try {
        const pointResult = await pointService.addPoints('R005', req.user.id, {
          targetType: 'bookshelf',
          targetId: id,
        });
        if (pointResult.success) {
          updated.earnedPoints = pointResult.log.points;
          updated.newTotalPoints = pointResult.totalPoints;
        }

        // 检查读书成就
        achievementService.checkAchievements(req.user.id, 'book_finished', {});
      } catch (error) {
        console.error('积分奖励失败:', error);
      }
    }

    res.json({
      message: '更新成功',
      bookshelf: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建阅读记录
 */
exports.createReadingLog = async (req, res, next) => {
  try {
    const { bookId, chapterInfo, readPages, content } = req.body;

    if (!bookId || !content) {
      return res.status(400).json({ error: '书籍ID和感想内容不能为空' });
    }

    const readingLog = await prisma.readingLog.create({
      data: {
        userId: req.user.id,
        bookId,
        chapterInfo,
        readPages: readPages ? parseInt(readPages) : 0,
        content,
        isPublic: true,
      },
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
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverUrl: true,
          },
        },
      },
    });

    // 更新书架的累计阅读页数
    if (readPages && readPages > 0) {
      await prisma.userBookshelf.updateMany({
        where: {
          userId: req.user.id,
          bookId,
        },
        data: {
          totalReadPages: {
            increment: parseInt(readPages),
          },
        },
      });
    }

    // 奖励积分 (R002: 发布阅读记录 +5分)
    try {
      const pointResult = await pointService.addPoints('R002', req.user.id, {
        targetType: 'readingLog',
        targetId: readingLog.id,
      });
      if (pointResult.success) {
        readingLog.earnedPoints = pointResult.log.points;
        readingLog.newTotalPoints = pointResult.totalPoints;
      }

      // 检查阅读记录成就
      achievementService.checkAchievements(req.user.id, 'reading_log_published', {});
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.status(201).json({
      message: '阅读记录创建成功',
      readingLog,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取阅读记录列表（阅读动态）
 */
exports.getReadingLogs = async (req, res, next) => {
  try {
    const { bookId, userId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      isPublic: true,
      ...(bookId && { bookId }),
      ...(userId && { userId }),
    };

    const [readingLogs, total] = await Promise.all([
      prisma.readingLog.findMany({
        where,
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
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              coverUrl: true,
            },
          },
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
      prisma.readingLog.count({ where }),
    ]);

    // 添加当前用户的点赞状态
    const logsWithLikeStatus = await Promise.all(
      readingLogs.map(async (log) => {
        let myLikeStatus = null;
        if (req.user) {
          const myLike = await prisma.readingLogLike.findUnique({
            where: {
              readingLogId_userId: {
                readingLogId: log.id,
                userId: req.user.id,
              },
            },
          });
          myLikeStatus = myLike ? (myLike.isLike ? 'like' : 'dislike') : null;
        }
        return {
          ...log,
          myLikeStatus,
        };
      })
    );

    res.json({
      readingLogs: logsWithLikeStatus,
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
 * 点赞/点踩阅读记录
 */
exports.toggleReadingLogLike = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isLike } = req.body; // true=点赞, false=点踩

    const readingLog = await prisma.readingLog.findUnique({
      where: { id },
    });

    if (!readingLog) {
      return res.status(404).json({ error: '阅读记录不存在' });
    }

    const existing = await prisma.readingLogLike.findUnique({
      where: {
        readingLogId_userId: {
          readingLogId: id,
          userId: req.user.id,
        },
      },
    });

    if (existing) {
      if (existing.isLike === isLike) {
        // 取消点赞/点踩
        await prisma.readingLogLike.delete({
          where: { id: existing.id },
        });

        await prisma.readingLog.update({
          where: { id },
          data: {
            [isLike ? 'likesCount' : 'dislikesCount']: {
              decrement: 1,
            },
          },
        });

        return res.json({
          message: '已取消',
          status: null,
        });
      } else {
        // 切换点赞/点踩
        await prisma.readingLogLike.update({
          where: { id: existing.id },
          data: { isLike },
        });

        await prisma.readingLog.update({
          where: { id },
          data: {
            likesCount: {
              [isLike ? 'increment' : 'decrement']: 1,
            },
            dislikesCount: {
              [isLike ? 'decrement' : 'increment']: 1,
            },
          },
        });

        return res.json({
          message: isLike ? '已点赞' : '已点踩',
          status: isLike ? 'like' : 'dislike',
        });
      }
    }

    // 新增点赞/点踩
    await prisma.readingLogLike.create({
      data: {
        readingLogId: id,
        userId: req.user.id,
        isLike,
      },
    });

    await prisma.readingLog.update({
      where: { id },
      data: {
        [isLike ? 'likesCount' : 'dislikesCount']: {
          increment: 1,
        },
      },
    });

    // 给作者奖励/扣除积分
    try {
      const ruleId = isLike ? 'R003' : 'R004'; // R003: +1分, R004: -1分
      await pointService.addPoints(ruleId, readingLog.userId, {
        targetType: 'readingLog',
        targetId: id,
        description: isLike ? '阅读记录被点赞' : '阅读记录被点踩',
      });
    } catch (error) {
      console.error('积分处理失败:', error);
    }

    // 给点赞者奖励积分 (S001: 给他人点赞 +1分,每日限5次)
    if (isLike && req.user.id !== readingLog.userId) {
      try {
        await pointService.addPoints('S001', req.user.id, {
          targetType: 'like',
          targetId: id,
          description: '点赞阅读记录',
        });
      } catch (error) {
        console.error('点赞者积分奖励失败:', error);
      }
    }

    res.json({
      message: isLike ? '点赞成功' : '点踩成功',
      status: isLike ? 'like' : 'dislike',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除阅读记录
 */
exports.deleteReadingLog = async (req, res, next) => {
  try {
    const { id } = req.params;

    const readingLog = await prisma.readingLog.findUnique({
      where: { id },
    });

    if (!readingLog) {
      return res.status(404).json({ error: '阅读记录不存在' });
    }

    if (readingLog.userId !== req.user.id) {
      return res.status(403).json({ error: '无权删除' });
    }

    await prisma.readingLog.delete({
      where: { id },
    });

    // 扣除积分 (R006: 删除阅读记录 -5分)
    try {
      await pointService.addPoints('R006', req.user.id, {
        targetType: 'readingLog',
        targetId: id,
      });
    } catch (error) {
      console.error('积分扣除失败:', error);
    }

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新书籍信息
 */
exports.updateBook = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, author, coverUrl, sourceType, sourceUrl, totalPages, description } = req.body;

    // 检查书籍是否存在
    const book = await prisma.book.findUnique({
      where: { id },
    });

    if (!book) {
      return res.status(404).json({ error: '书籍不存在' });
    }

    // 检查权限：只有创建者或管理员可以修改
    if (book.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '无权修改此书籍' });
    }

    if (!title) {
      return res.status(400).json({ error: '书名不能为空' });
    }

    const updatedBook = await prisma.book.update({
      where: { id },
      data: {
        title,
        author,
        coverUrl,
        sourceType,
        sourceUrl,
        totalPages: totalPages ? parseInt(totalPages) : null,
        description,
      },
    });

    res.json({ book: updatedBook, message: '更新成功' });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除书籍
 */
exports.deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查书籍是否存在
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            bookshelves: true,
            readingLogs: true,
          },
        },
      },
    });

    if (!book) {
      return res.status(404).json({ error: '书籍不存在' });
    }

    // 检查权限：只有创建者或管理员可以删除
    if (book.createdBy !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '无权删除此书籍' });
    }

    // 检查是否有关联数据
    if (book._count.bookshelves > 0 || book._count.readingLogs > 0) {
      return res.status(400).json({
        error: '该书籍已有用户添加到书架或写了阅读记录，无法删除'
      });
    }

    await prisma.book.delete({
      where: { id },
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
