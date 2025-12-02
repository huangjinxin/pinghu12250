/**
 * 看板路由 - Trello风格的看板系统
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// ========== 用户搜索（用于邀请成员）- 必须在 /:id 路由之前 ==========

// GET /api/boards/users/search - 搜索用户（任何已认证用户可用）
router.get('/users/search', authenticate, async (req, res, next) => {
  try {
    const { q = '', limit = 20 } = req.query;

    const users = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { profile: { nickname: { contains: q, mode: 'insensitive' } } },
        ],
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        role: true,
        profile: {
          select: { nickname: true },
        },
      },
      take: parseInt(limit),
      orderBy: { username: 'asc' },
    });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

// ========== 看板管理 ==========

// GET /api/boards - 获取当前用户的所有看板
router.get('/', authenticate, async (req, res, next) => {
  try {
    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { creatorId: req.user.id },
          { members: { some: { userId: req.user.id } } },
        ],
      },
      include: {
        creator: {
          select: { id: true, username: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
        _count: {
          select: { lists: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(boards);
  } catch (error) {
    next(error);
  }
});

// GET /api/boards/:id - 获取单个看板详情
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, username: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
        lists: {
          include: {
            cards: {
              include: {
                creator: {
                  select: { id: true, username: true, avatar: true },
                },
                members: {
                  include: {
                    user: {
                      select: { id: true, username: true, avatar: true },
                    },
                  },
                },
                _count: {
                  select: { comments: true, attachments: true },
                },
              },
              orderBy: { position: 'asc' },
            },
          },
          orderBy: { position: 'asc' },
        },
      },
    });

    if (!board) {
      return res.status(404).json({ error: '看板不存在' });
    }

    // 检查权限
    const isMember = board.creatorId === req.user.id ||
                     board.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: '无权访问此看板' });
    }

    res.json(board);
  } catch (error) {
    next(error);
  }
});

// POST /api/boards - 创建看板
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, color } = req.body;

    const board = await prisma.board.create({
      data: {
        creatorId: req.user.id,
        title,
        description,
        color: color || '#6366f1',
        members: {
          create: {
            userId: req.user.id,
            role: 'OWNER',
          },
        },
        lists: {
          create: [
            { title: '待办', position: 1 },
            { title: '进行中', position: 2 },
            { title: '已完成', position: 3 },
          ],
        },
      },
      include: {
        creator: {
          select: { id: true, username: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
        lists: true,
      },
    });

    res.status(201).json(board);
  } catch (error) {
    next(error);
  }
});

// PUT /api/boards/:id - 更新看板
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, color } = req.body;

    const board = await prisma.board.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!board) {
      return res.status(404).json({ error: '看板不存在' });
    }

    // 检查权限：创建者或管理员
    const member = board.members.find(m => m.userId === req.user.id);
    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      return res.status(403).json({ error: '无权修改此看板' });
    }

    const updated = await prisma.board.update({
      where: { id },
      data: { title, description, color },
      include: {
        creator: {
          select: { id: true, username: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/boards/:id - 删除看板
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const board = await prisma.board.findUnique({
      where: { id },
    });

    if (!board) {
      return res.status(404).json({ error: '看板不存在' });
    }

    if (board.creatorId !== req.user.id) {
      return res.status(403).json({ error: '只有创建者可以删除看板' });
    }

    await prisma.board.delete({ where: { id } });

    res.json({ message: '看板已删除' });
  } catch (error) {
    next(error);
  }
});

// ========== 看板成员管理 ==========

// POST /api/boards/:id/members - 邀请成员
router.post('/:id/members', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userIds, role = 'MEMBER' } = req.body;

    const board = await prisma.board.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!board) {
      return res.status(404).json({ error: '看板不存在' });
    }

    // 检查权限
    const member = board.members.find(m => m.userId === req.user.id);
    if (!member || member.role === 'MEMBER') {
      return res.status(403).json({ error: '只有管理员可以邀请成员' });
    }

    // 添加成员
    const newMembers = await Promise.all(
      userIds.map(userId =>
        prisma.boardMember.create({
          data: {
            boardId: id,
            userId,
            role,
          },
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        })
      )
    );

    res.status(201).json(newMembers);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '用户已是看板成员' });
    }
    next(error);
  }
});

// PUT /api/boards/:id/members/:memberId - 更新成员角色
router.put('/:id/members/:memberId', authenticate, async (req, res, next) => {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;

    const board = await prisma.board.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!board) {
      return res.status(404).json({ error: '看板不存在' });
    }

    // 检查权限
    const currentMember = board.members.find(m => m.userId === req.user.id);
    if (!currentMember || currentMember.role !== 'OWNER') {
      return res.status(403).json({ error: '只有拥有者可以修改成员角色' });
    }

    const updated = await prisma.boardMember.update({
      where: { id: memberId },
      data: { role },
      include: {
        user: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/boards/:id/members/:memberId - 移除成员
router.delete('/:id/members/:memberId', authenticate, async (req, res, next) => {
  try {
    const { id, memberId } = req.params;

    const board = await prisma.board.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!board) {
      return res.status(404).json({ error: '看板不存在' });
    }

    const targetMember = board.members.find(m => m.id === memberId);
    if (!targetMember) {
      return res.status(404).json({ error: '成员不存在' });
    }

    // 检查权限：自己离开或者管理员移除
    const currentMember = board.members.find(m => m.userId === req.user.id);
    const canRemove =
      targetMember.userId === req.user.id ||
      (currentMember && (currentMember.role === 'OWNER' || currentMember.role === 'ADMIN'));

    if (!canRemove) {
      return res.status(403).json({ error: '无权移除此成员' });
    }

    // 不能移除拥有者
    if (targetMember.role === 'OWNER') {
      return res.status(400).json({ error: '不能移除看板拥有者' });
    }

    await prisma.boardMember.delete({ where: { id: memberId } });

    res.json({ message: '成员已移除' });
  } catch (error) {
    next(error);
  }
});

// ========== 列表管理 ==========

// POST /api/boards/:id/lists - 创建列表
router.post('/:id/lists', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, position } = req.body;

    const board = await prisma.board.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!board) {
      return res.status(404).json({ error: '看板不存在' });
    }

    // 检查权限
    const isMember = board.creatorId === req.user.id ||
                     board.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: '无权操作此看板' });
    }

    // 如果没有指定位置，放在最后
    let finalPosition = position;
    if (finalPosition === undefined) {
      const maxPosition = await prisma.boardList.findFirst({
        where: { boardId: id },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      finalPosition = maxPosition ? maxPosition.position + 1 : 1;
    }

    const list = await prisma.boardList.create({
      data: {
        boardId: id,
        title,
        position: finalPosition,
      },
    });

    res.status(201).json(list);
  } catch (error) {
    next(error);
  }
});

// PUT /api/lists/:id - 更新列表
router.put('/lists/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, position } = req.body;

    const list = await prisma.boardList.findUnique({
      where: { id },
      include: { board: { include: { members: true } } },
    });

    if (!list) {
      return res.status(404).json({ error: '列表不存在' });
    }

    // 检查权限
    const isMember = list.board.creatorId === req.user.id ||
                     list.board.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: '无权操作此列表' });
    }

    const updated = await prisma.boardList.update({
      where: { id },
      data: { title, position },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/lists/:id - 删除列表
router.delete('/lists/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const list = await prisma.boardList.findUnique({
      where: { id },
      include: { board: { include: { members: true } } },
    });

    if (!list) {
      return res.status(404).json({ error: '列表不存在' });
    }

    // 检查权限
    const member = list.board.members.find(m => m.userId === req.user.id);
    if (!member || member.role === 'MEMBER') {
      return res.status(403).json({ error: '只有管理员可以删除列表' });
    }

    await prisma.boardList.delete({ where: { id } });

    res.json({ message: '列表已删除' });
  } catch (error) {
    next(error);
  }
});

// ========== 卡片管理 ==========

// POST /api/lists/:id/cards - 创建卡片
router.post('/lists/:id/cards', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, labels, dueDate, position, memberIds } = req.body;

    const list = await prisma.boardList.findUnique({
      where: { id },
      include: { board: { include: { members: true } } },
    });

    if (!list) {
      return res.status(404).json({ error: '列表不存在' });
    }

    // 检查权限
    const isMember = list.board.creatorId === req.user.id ||
                     list.board.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: '无权操作此看板' });
    }

    // 如果没有指定位置，放在最后
    let finalPosition = position;
    if (finalPosition === undefined) {
      const maxPosition = await prisma.card.findFirst({
        where: { listId: id },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      finalPosition = maxPosition ? maxPosition.position + 1 : 1;
    }

    const card = await prisma.card.create({
      data: {
        listId: id,
        creatorId: req.user.id,
        title,
        description,
        labels: labels || [],
        dueDate: dueDate ? new Date(dueDate) : null,
        position: finalPosition,
        members: memberIds
          ? { create: memberIds.map(userId => ({ userId })) }
          : undefined,
      },
      include: {
        creator: {
          select: { id: true, username: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
    });

    res.status(201).json(card);
  } catch (error) {
    next(error);
  }
});

// PUT /api/cards/:id - 更新卡片
router.put('/cards/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, labels, dueDate, completed, listId, position } = req.body;

    const card = await prisma.card.findUnique({
      where: { id },
      include: { list: { include: { board: { include: { members: true } } } } },
    });

    if (!card) {
      return res.status(404).json({ error: '卡片不存在' });
    }

    // 检查权限
    const isMember = card.list.board.creatorId === req.user.id ||
                     card.list.board.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: '无权操作此卡片' });
    }

    const updated = await prisma.card.update({
      where: { id },
      data: {
        title,
        description,
        labels,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        completed,
        listId,
        position,
      },
      include: {
        creator: {
          select: { id: true, username: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
        _count: {
          select: { comments: true, attachments: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/cards/:id - 删除卡片
router.delete('/cards/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const card = await prisma.card.findUnique({
      where: { id },
      include: { list: { include: { board: { include: { members: true } } } } },
    });

    if (!card) {
      return res.status(404).json({ error: '卡片不存在' });
    }

    // 检查权限：创建者或管理员
    const member = card.list.board.members.find(m => m.userId === req.user.id);
    const canDelete = card.creatorId === req.user.id ||
                      (member && member.role !== 'MEMBER');

    if (!canDelete) {
      return res.status(403).json({ error: '无权删除此卡片' });
    }

    await prisma.card.delete({ where: { id } });

    res.json({ message: '卡片已删除' });
  } catch (error) {
    next(error);
  }
});

// POST /api/cards/:id/members - 分配成员到卡片
router.post('/cards/:id/members', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    const card = await prisma.card.findUnique({
      where: { id },
      include: { list: { include: { board: { include: { members: true } } } } },
    });

    if (!card) {
      return res.status(404).json({ error: '卡片不存在' });
    }

    // 检查权限
    const isMember = card.list.board.creatorId === req.user.id ||
                     card.list.board.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: '无权操作此卡片' });
    }

    const newMembers = await Promise.all(
      userIds.map(userId =>
        prisma.cardMember.create({
          data: {
            cardId: id,
            userId,
          },
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        })
      )
    );

    res.status(201).json(newMembers);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '用户已是卡片成员' });
    }
    next(error);
  }
});

// DELETE /api/cards/:id/members/:memberId - 从卡片移除成员
router.delete('/cards/:id/members/:memberId', authenticate, async (req, res, next) => {
  try {
    const { id, memberId } = req.params;

    const card = await prisma.card.findUnique({
      where: { id },
      include: { list: { include: { board: { include: { members: true } } } } },
    });

    if (!card) {
      return res.status(404).json({ error: '卡片不存在' });
    }

    // 检查权限
    const isMember = card.list.board.creatorId === req.user.id ||
                     card.list.board.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: '无权操作此卡片' });
    }

    await prisma.cardMember.delete({ where: { id: memberId } });

    res.json({ message: '成员已移除' });
  } catch (error) {
    next(error);
  }
});

// POST /api/cards/:id/comments - 添加评论
router.post('/cards/:id/comments', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const card = await prisma.card.findUnique({
      where: { id },
      include: { list: { include: { board: { include: { members: true } } } } },
    });

    if (!card) {
      return res.status(404).json({ error: '卡片不存在' });
    }

    // 检查权限
    const isMember = card.list.board.creatorId === req.user.id ||
                     card.list.board.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: '无权评论此卡片' });
    }

    const comment = await prisma.cardComment.create({
      data: {
        cardId: id,
        authorId: req.user.id,
        content,
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});

// GET /api/cards/:id/comments - 获取卡片评论
router.get('/cards/:id/comments', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const card = await prisma.card.findUnique({
      where: { id },
      include: { list: { include: { board: { include: { members: true } } } } },
    });

    if (!card) {
      return res.status(404).json({ error: '卡片不存在' });
    }

    // 检查权限
    const isMember = card.list.board.creatorId === req.user.id ||
                     card.list.board.members.some(m => m.userId === req.user.id);
    if (!isMember) {
      return res.status(403).json({ error: '无权查看此卡片' });
    }

    const comments = await prisma.cardComment.findMany({
      where: { cardId: id },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(comments);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/comments/:id - 删除评论
router.delete('/comments/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const comment = await prisma.cardComment.findUnique({
      where: { id },
    });

    if (!comment) {
      return res.status(404).json({ error: '评论不存在' });
    }

    if (comment.authorId !== req.user.id) {
      return res.status(403).json({ error: '只能删除自己的评论' });
    }

    await prisma.cardComment.delete({ where: { id } });

    res.json({ message: '评论已删除' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
