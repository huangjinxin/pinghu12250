/**
 * 知识悬赏问答路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const pointService = require('../services/pointService');

const prisma = new PrismaClient();

/**
 * GET /api/questions
 * 获取问题列表（支持多种Tab）
 * @query tab: solved|open|my|answered
 * @query search: 搜索关键词
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { tab = 'solved', page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user.id;

    // 构建查询条件
    const where = {};
    let orderBy = { createdAt: 'desc' };

    // 搜索条件（只搜索标题）
    if (search) {
      where.title = {
        contains: search,
      };
    }

    switch (tab) {
      case 'solved':
        // 已解决：显示所有CLOSED状态的问题（包括采纳最佳答案和手动关闭的）
        where.status = 'CLOSED';
        where.deletedAt = null;
        // 热度排序：回答数、浏览数、点赞数
        orderBy = [
          { answersCount: 'desc' },
          { viewsCount: 'desc' },
          { likesCount: 'desc' },
        ];
        break;

      case 'open':
        // 进行中：status=OPEN，按创建时间倒序
        where.status = 'OPEN';
        where.deletedAt = null;
        orderBy = { createdAt: 'desc' };
        break;

      case 'my':
        // 我的提问：包括已删除的问题
        where.userId = userId;
        // 不过滤deletedAt，显示所有问题包括已删除的
        orderBy = { createdAt: 'desc' };
        break;

      default:
        where.deletedAt = null;
        orderBy = { createdAt: 'desc' };
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: {
                select: { nickname: true },
              },
            },
          },
          answers: tab === 'answered' ? {
            where: { userId },
            select: {
              id: true,
              content: true,
              isBest: true,
              createdAt: true,
            },
            take: 1,
          } : false,
        },
        orderBy,
        skip,
        take: parseInt(limit),
      }),
      prisma.question.count({ where }),
    ]);

    // 格式化返回数据
    const formattedQuestions = questions.map(q => ({
      ...q,
      author: {
        id: q.user.id,
        name: q.user.profile?.nickname || q.user.username,
        avatar: q.user.avatar,
      },
      myAnswer: q.answers?.[0] || null,
      answers: undefined,
      user: undefined,
    }));

    res.json({
      questions: formattedQuestions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('获取问题列表失败:', error);
    res.status(500).json({ error: error.message || '获取问题列表失败' });
  }
});

/**
 * POST /api/questions
 * 发布问题
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content, reward_points } = req.body;
    const userId = req.user.id;

    // 验证参数
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    // 验证悬赏积分（允许0-5000，0表示无悬赏）
    const rewardPoints = reward_points || 0;
    if (rewardPoints < 0 || rewardPoints > 5000) {
      return res.status(400).json({ error: '悬赏积分必须在0-5000之间' });
    }

    // 只有当悬赏大于0时才检查用户积分余额
    if (rewardPoints > 0) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { totalPoints: true, username: true },
      });

      if (!user || user.totalPoints < rewardPoints) {
        return res.status(400).json({
          error: '积分余额不足',
          currentPoints: user?.totalPoints || 0,
          requiredPoints: rewardPoints,
        });
      }
    }

    // 使用事务处理
    const result = await prisma.$transaction(async (tx) => {
      // 1. 只有当悬赏大于0时才扣除积分
      if (rewardPoints > 0) {
        const deductResult = await pointService.deductPointsDirect(
          userId,
          rewardPoints,
          'question_reward',
          {
            description: `发起悬赏问答：${title.substring(0, 30)}`,
          }
        );

        if (!deductResult.success) {
          throw new Error(deductResult.message || '扣除积分失败');
        }
      }

      // 2. 创建问题
      const question = await tx.question.create({
        data: {
          userId,
          title,
          content,
          rewardPoints: rewardPoints,
          status: 'OPEN',
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
        },
      });

      // 3. 创建动态
      const dynamicContent = rewardPoints > 0
        ? `发起悬赏 ${rewardPoints} 积分求助：《${title}》`
        : `发起提问：《${title}》`;

      await tx.dynamic.create({
        data: {
          authorId: userId,
          content: dynamicContent,
          isPublic: true,
        },
      }).catch(err => console.error('创建动态失败:', err));

      return question;
    });

    // 获取剩余积分
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });

    res.json({
      message: '问题发布成功',
      question: result,
      pointsSpent: rewardPoints,
      currentPoints: updatedUser.totalPoints,
    });
  } catch (error) {
    console.error('发布问题失败:', error);
    res.status(500).json({ error: error.message || '发布问题失败' });
  }
});

/**
 * GET /api/questions/:id
 * 获取问题详情
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: { select: { nickname: true } },
          },
        },
        answers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                profile: { select: { nickname: true } },
              },
            },
            likes: {
              where: { userId },
              select: { id: true },
            },
          },
          orderBy: [
            { isBest: 'desc' }, // 最佳答案排在前面
            { likesCount: 'desc' }, // 按点赞数排序
            { createdAt: 'asc' }, // 最后按时间排序
          ],
        },
      },
    });

    if (!question) {
      return res.status(404).json({ error: '问题不存在' });
    }

    // 记录浏览（不重复计数）
    await prisma.questionView.upsert({
      where: {
        userId_questionId: {
          userId,
          questionId: id,
        },
      },
      update: {},
      create: {
        userId,
        questionId: id,
      },
    }).catch(err => console.error('记录浏览失败:', err));

    // 更新浏览计数
    await prisma.question.update({
      where: { id },
      data: {
        viewsCount: {
          increment: 1,
        },
      },
    }).catch(err => console.error('更新浏览数失败:', err));

    // 格式化返回数据
    const formattedQuestion = {
      ...question,
      author: {
        id: question.user.id,
        name: question.user.profile?.nickname || question.user.username,
        avatar: question.user.avatar,
      },
      answers: question.answers.map(a => ({
        ...a,
        author: {
          id: a.user.id,
          name: a.user.profile?.nickname || a.user.username,
          avatar: a.user.avatar,
        },
        isLiked: a.likes.length > 0,
        user: undefined,
        likes: undefined,
      })),
      user: undefined,
    };

    res.json(formattedQuestion);
  } catch (error) {
    console.error('获取问题详情失败:', error);
    res.status(500).json({ error: error.message || '获取问题详情失败' });
  }
});

/**
 * POST /api/questions/:id/answers
 * 回答问题
 */
router.post('/:id/answers', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '回答内容不能为空' });
    }

    // 检查问题是否存在且未关闭
    const question = await prisma.question.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    if (!question) {
      return res.status(404).json({ error: '问题不存在' });
    }

    if (question.status === 'CLOSED') {
      return res.status(400).json({ error: '该问题已关闭，无法回答' });
    }

    // 禁止自己回答自己的问题
    if (question.userId === userId) {
      return res.status(403).json({ error: '不能回答自己的问题' });
    }

    // 创建回答
    const answer = await prisma.$transaction(async (tx) => {
      const newAnswer = await tx.answer.create({
        data: {
          questionId: id,
          userId,
          content,
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
        },
      });

      // 更新问题回答数（保持OPEN状态，允许多人回答）
      await tx.question.update({
        where: { id },
        data: {
          answersCount: { increment: 1 },
          // 不修改status，保持OPEN状态，直到采纳最佳答案或手动关闭
        },
      });

      // 发送通知给提问者（如果不是自己回答自己的问题）
      if (question.userId !== userId) {
        await tx.message.create({
          data: {
            fromUserId: userId,
            toUserId: question.userId,
            messageType: 'SYSTEM_QUESTION',
            content: `回答了您的问题`,
            metadata: {
              questionId: id,
              questionTitle: question.title,
              answerId: newAnswer.id,
            },
          },
        }).catch(err => console.error('发送通知失败:', err));
      }

      return newAnswer;
    });

    res.json({
      message: '回答成功',
      answer: {
        ...answer,
        author: {
          id: answer.user.id,
          name: answer.user.profile?.nickname || answer.user.username,
          avatar: answer.user.avatar,
        },
        user: undefined,
      },
    });
  } catch (error) {
    console.error('回答问题失败:', error);
    res.status(500).json({ error: error.message || '回答问题失败' });
  }
});

/**
 * POST /api/questions/:id/accept
 * 采纳最佳答案
 */
router.post('/:id/accept', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { answer_id } = req.body;
    const userId = req.user.id;

    if (!answer_id) {
      return res.status(400).json({ error: '缺少答案ID' });
    }

    // 检查问题
    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      return res.status(404).json({ error: '问题不存在' });
    }

    // 验证是否为提问者
    if (question.userId !== userId) {
      return res.status(403).json({ error: '只有提问者可以采纳答案' });
    }

    if (question.status === 'CLOSED') {
      return res.status(400).json({ error: '该问题已关闭' });
    }

    // 检查答案
    const answer = await prisma.answer.findUnique({
      where: { id: answer_id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!answer) {
      return res.status(404).json({ error: '答案不存在' });
    }

    if (answer.questionId !== id) {
      return res.status(400).json({ error: '答案不属于该问题' });
    }

    // 执行采纳
    await prisma.$transaction(async (tx) => {
      // 1. 标记最佳答案
      await tx.answer.update({
        where: { id: answer_id },
        data: { isBest: true },
      });

      // 2. 更新问题状态
      await tx.question.update({
        where: { id },
        data: {
          bestAnswerId: answer_id,
          status: 'CLOSED',
          closedReason: 'accepted',
        },
      });

      // 3. 将悬赏积分转给回答者（直接在事务中操作，避免嵌套事务）
      if (question.rewardPoints > 0) {
        // 创建积分日志
        await tx.pointLog.create({
          data: {
            userId: answer.userId,
            points: question.rewardPoints,
            description: `问题被采纳，获得悬赏：${question.title.substring(0, 20)} (by system)`,
          },
        });

        // 确保 UserPoints 记录存在
        const userPoints = await tx.userPoints.findUnique({
          where: { userId: answer.userId },
        });

        if (!userPoints) {
          await tx.userPoints.create({
            data: {
              userId: answer.userId,
              totalPoints: question.rewardPoints,
              todayPoints: question.rewardPoints,
            },
          });
        } else {
          // 更新 UserPoints 表
          await tx.userPoints.update({
            where: { userId: answer.userId },
            data: {
              totalPoints: {
                increment: question.rewardPoints,
              },
              todayPoints: {
                increment: question.rewardPoints,
              },
            },
          });
        }

        // 同时更新 User 表的 totalPoints（保持兼容）
        await tx.user.update({
          where: { id: answer.userId },
          data: {
            totalPoints: {
              increment: question.rewardPoints,
            },
          },
        });
      }

      // 4. 发送通知给回答者
      await tx.message.create({
        data: {
          fromUserId: null, // 系统消息
          toUserId: answer.userId,
          messageType: 'SYSTEM_QUESTION',
          content: `您的回答被采纳为最佳答案，获得 ${question.rewardPoints} 积分`,
          metadata: {
            questionId: id,
            questionTitle: question.title,
            answerId: answer_id,
            points: question.rewardPoints,
          },
        },
      }).catch(err => console.error('发送通知失败:', err));

      // 5. 创建动态
      await tx.dynamic.create({
        data: {
          authorId: answer.userId,
          content: `回答被采纳，获得 ${question.rewardPoints} 积分`,
          isPublic: true,
        },
      }).catch(err => console.error('创建动态失败:', err));
    });

    res.json({
      message: '采纳成功',
      points: question.rewardPoints,
    });
  } catch (error) {
    console.error('采纳答案失败:', error);
    res.status(500).json({ error: error.message || '采纳答案失败' });
  }
});

/**
 * POST /api/answers/:id/like
 * 回答点赞/取消点赞
 */
router.post('/answers/:id/like', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 检查答案是否存在
    const answer = await prisma.answer.findUnique({
      where: { id },
    });

    if (!answer) {
      return res.status(404).json({ error: '答案不存在' });
    }

    // 检查是否已点赞
    const existingLike = await prisma.answerLike.findUnique({
      where: {
        answerId_userId: {
          answerId: id,
          userId,
        },
      },
    });

    if (existingLike) {
      // 取消点赞
      await prisma.$transaction([
        prisma.answerLike.delete({
          where: { id: existingLike.id },
        }),
        prisma.answer.update({
          where: { id },
          data: { likesCount: { decrement: 1 } },
        }),
      ]);

      res.json({ message: '取消点赞', liked: false });
    } else {
      // 点赞
      await prisma.$transaction([
        prisma.answerLike.create({
          data: {
            answerId: id,
            userId,
          },
        }),
        prisma.answer.update({
          where: { id },
          data: { likesCount: { increment: 1 } },
        }),
      ]);

      res.json({ message: '点赞成功', liked: true });
    }
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({ error: error.message || '点赞失败' });
  }
});

/**
 * PUT /api/questions/:id
 * 编辑问题（只能修改标题和内容）
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    // 验证参数
    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    // 查找问题
    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        answersCount: true,
        deletedAt: true,
      },
    });

    if (!question || question.deletedAt) {
      return res.status(404).json({ error: '问题不存在' });
    }

    // 检查是否为作者
    if (question.userId !== userId) {
      return res.status(403).json({ error: '只有作者可以编辑问题' });
    }

    // 更新问题
    const updated = await prisma.question.update({
      where: { id },
      data: {
        title,
        content,
        updatedAt: new Date(),
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
      },
    });

    res.json({
      message: '问题更新成功',
      question: {
        ...updated,
        author: {
          id: updated.user.id,
          name: updated.user.profile?.nickname || updated.user.username,
          avatar: updated.user.avatar,
        },
        user: undefined,
      },
    });
  } catch (error) {
    console.error('编辑问题失败:', error);
    res.status(500).json({ error: error.message || '编辑问题失败' });
  }
});

/**
 * DELETE /api/questions/:id/soft
 * 用户软删除问题
 */
router.delete('/:id/soft', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 查找问题
    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        answersCount: true,
        status: true,
        rewardPoints: true,
        deletedAt: true,
        title: true,
      },
    });

    if (!question || question.deletedAt) {
      return res.status(404).json({ error: '问题不存在' });
    }

    // 检查是否为作者
    if (question.userId !== userId) {
      return res.status(403).json({ error: '只有作者可以删除问题' });
    }

    // 有回答时不能删除
    if (question.answersCount > 0) {
      return res.status(400).json({
        error: '已有回答的问题不能删除，您可以关闭问题'
      });
    }

    // 软删除并退还积分
    await prisma.$transaction(async (tx) => {
      // 1. 软删除问题
      await tx.question.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
      });

      // 2. 如果有悬赏积分未发放，退还给提问者
      if (question.status !== 'CLOSED' && question.rewardPoints > 0) {
        await pointService.addPointsDirect(
          userId,
          question.rewardPoints,
          'question_refund',
          {
            description: `删除问题退还悬赏：${question.title.substring(0, 30)}`,
            targetType: 'question',
            targetId: question.id,
          }
        );
      }
    });

    res.json({
      message: '问题已删除',
      refundPoints: question.status !== 'CLOSED' ? question.rewardPoints : 0,
    });
  } catch (error) {
    console.error('删除问题失败:', error);
    res.status(500).json({ error: error.message || '删除问题失败' });
  }
});

/**
 * DELETE /api/questions/:id (管理员)
 * 删除问题并退还积分
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查是否为管理员
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    // 查找问题
    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        rewardPoints: true,
        status: true,
        title: true,
      },
    });

    if (!question) {
      return res.status(404).json({ error: '问题不存在' });
    }

    // 使用事务处理
    await prisma.$transaction(async (tx) => {
      // 1. 如果悬赏还未发放（问题未关闭），退还积分给提问者
      if (question.status !== 'CLOSED' && question.rewardPoints > 0) {
        await pointService.addPointsDirect(
          question.userId,
          question.rewardPoints,
          'question_refund',
          {
            description: `删除问题退还悬赏：${question.title.substring(0, 30)}`,
            targetType: 'question',
            targetId: question.id,
          }
        );
      }

      // 2. 删除所有相关数据
      await tx.answerLike.deleteMany({
        where: {
          answer: {
            questionId: id,
          },
        },
      });

      await tx.answer.deleteMany({
        where: { questionId: id },
      });

      await tx.questionView.deleteMany({
        where: { questionId: id },
      });

      // 3. 删除问题
      await tx.question.delete({
        where: { id },
      });
    });

    res.json({
      message: '删除成功',
      refundPoints: question.status !== 'CLOSED' ? question.rewardPoints : 0,
    });
  } catch (error) {
    console.error('删除问题失败:', error);
    res.status(500).json({ error: error.message || '删除问题失败' });
  }
});

/**
 * DELETE /api/answers/:id (管理员)
 * 删除回答
 */
router.delete('/answers/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查是否为管理员
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    // 查找回答
    const answer = await prisma.answer.findUnique({
      where: { id },
      include: {
        question: {
          select: {
            id: true,
            userId: true,
            answersCount: true,
            rewardPoints: true,
            status: true,
          },
        },
      },
    });

    if (!answer) {
      return res.status(404).json({ error: '回答不存在' });
    }

    // 使用事务处理
    await prisma.$transaction(async (tx) => {
      // 1. 如果是最佳答案，需要撤销状态和退还积分
      if (answer.isBest && answer.question.status === 'CLOSED') {
        // 从回答者扣除积分
        await pointService.deductPointsDirect(
          answer.userId,
          answer.question.rewardPoints,
          'answer_revoke',
          {
            description: `回答被删除，扣除已获得的悬赏积分`,
          }
        );

        // 退还给提问者
        await pointService.addPointsDirect(
          answer.question.userId,
          answer.question.rewardPoints,
          'question_refund',
          {
            description: `最佳答案被删除，退还悬赏积分`,
          }
        );

        // 更新问题状态（重新开放问题）
        await tx.question.update({
          where: { id: answer.questionId },
          data: {
            bestAnswerId: null,
            status: 'OPEN', // 删除最佳答案后重新开放问题
          },
        });
      }

      // 2. 删除点赞
      await tx.answerLike.deleteMany({
        where: { answerId: id },
      });

      // 3. 删除回答
      await tx.answer.delete({
        where: { id },
      });

      // 4. 更新问题回答数
      await tx.question.update({
        where: { id: answer.questionId },
        data: {
          answersCount: { decrement: 1 },
        },
      });
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除回答失败:', error);
    res.status(500).json({ error: error.message || '删除回答失败' });
  }
});

/**
 * POST /api/questions/:id/add-reward
 * 增加悬赏积分
 */
router.post('/:id/add-reward', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { points } = req.body;
    const userId = req.user.id;

    // 验证积分
    if (!points || points <= 0 || points > 5000) {
      return res.status(400).json({ error: '追加积分必须在1-5000之间' });
    }

    // 查找问题
    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        rewardPoints: true,
        title: true,
        deletedAt: true,
      },
    });

    if (!question || question.deletedAt) {
      return res.status(404).json({ error: '问题不存在' });
    }

    // 检查是否为作者
    if (question.userId !== userId) {
      return res.status(403).json({ error: '只有作者可以增加悬赏' });
    }

    // 检查问题状态
    if (question.status === 'CLOSED') {
      return res.status(400).json({ error: '已关闭的问题无法增加悬赏' });
    }

    // 检查用户积分余额
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });

    if (!user || user.totalPoints < points) {
      return res.status(400).json({
        error: '积分余额不足',
        currentPoints: user?.totalPoints || 0,
        requiredPoints: points,
      });
    }

    // 使用事务处理
    await prisma.$transaction(async (tx) => {
      // 1. 扣除积分
      const deductResult = await pointService.deductPointsDirect(
        userId,
        points,
        'question_reward_add',
        {
          description: `追加悬赏：${question.title.substring(0, 30)}`,
          targetType: 'question',
          targetId: id,
        }
      );

      if (!deductResult.success) {
        throw new Error(deductResult.message || '扣除积分失败');
      }

      // 2. 更新问题悬赏
      await tx.question.update({
        where: { id },
        data: {
          rewardPoints: {
            increment: points,
          },
        },
      });
    });

    res.json({
      message: '悬赏增加成功',
      addedPoints: points,
      newRewardPoints: question.rewardPoints + points,
    });
  } catch (error) {
    console.error('增加悬赏失败:', error);
    res.status(500).json({ error: error.message || '增加悬赏失败' });
  }
});

/**
 * POST /api/questions/:id/append
 * 补充问题内容
 */
router.post('/:id/append', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: '补充内容不能为空' });
    }

    // 查找问题
    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        appendContent: true,
        deletedAt: true,
      },
    });

    if (!question || question.deletedAt) {
      return res.status(404).json({ error: '问题不存在' });
    }

    // 检查是否为作者
    if (question.userId !== userId) {
      return res.status(403).json({ error: '只有作者可以补充内容' });
    }

    // 构建新的补充内容
    const timestamp = new Date().toLocaleString('zh-CN');
    const appendText = question.appendContent
      ? `${question.appendContent}\n\n--- 补充于 ${timestamp} ---\n${content}`
      : `--- 补充于 ${timestamp} ---\n${content}`;

    // 更新问题
    const updated = await prisma.question.update({
      where: { id },
      data: {
        appendContent: appendText,
        updatedAt: new Date(),
      },
    });

    res.json({
      message: '补充内容成功',
      appendContent: updated.appendContent,
    });
  } catch (error) {
    console.error('补充内容失败:', error);
    res.status(500).json({ error: error.message || '补充内容失败' });
  }
});

/**
 * POST /api/questions/:id/close
 * 手动关闭问题
 */
router.post('/:id/close', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 查找问题
    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        rewardPoints: true,
        deletedAt: true,
      },
    });

    if (!question || question.deletedAt) {
      return res.status(404).json({ error: '问题不存在' });
    }

    // 检查是否为作者
    if (question.userId !== userId) {
      return res.status(403).json({ error: '只有作者可以关闭问题' });
    }

    // 检查问题状态
    if (question.status === 'CLOSED') {
      return res.status(400).json({ error: '问题已经关闭' });
    }

    // 更新问题状态（手动关闭，悬赏作废，不退还积分）
    await prisma.question.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedReason: 'manual',
      },
    });

    res.json({
      message: '问题已关闭',
      note: `悬赏 ${question.rewardPoints} 积分已作废`,
    });
  } catch (error) {
    console.error('关闭问题失败:', error);
    res.status(500).json({ error: error.message || '关闭问题失败' });
  }
});

/**
 * GET /api/questions/my-answers
 * 获取我的回答列表
 */
router.get('/my-answers', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user.id;

    // 构建查询条件
    const where = {
      userId,
    };

    // 查询我的回答
    const [answers, total] = await Promise.all([
      prisma.answer.findMany({
        where,
        include: {
          question: {
            where: {
              deletedAt: null,
              ...(search ? { title: { contains: search } } : {}),
            },
            select: {
              id: true,
              title: true,
              status: true,
              rewardPoints: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  profile: {
                    select: { nickname: true },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.answer.count({ where }),
    ]);

    // 过滤掉question为null的记录（已删除的问题）
    const filteredAnswers = answers.filter(a => a.question !== null);

    // 格式化返回数据
    const formattedAnswers = filteredAnswers.map(a => ({
      id: a.question.id,
      title: a.question.title,
      status: a.question.status,
      rewardPoints: a.question.rewardPoints,
      author: {
        id: a.question.user.id,
        name: a.question.user.profile?.nickname || a.question.user.username,
        avatar: a.question.user.avatar,
      },
      myAnswer: {
        content: a.content,
        isBest: a.isBest,
        createdAt: a.createdAt,
      },
      answeredAt: a.createdAt,
    }));

    res.json({
      answers: formattedAnswers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredAnswers.length,
        totalPages: Math.ceil(filteredAnswers.length / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('获取我的回答失败:', error);
    res.status(500).json({ error: error.message || '获取我的回答失败' });
  }
});

module.exports = router;
