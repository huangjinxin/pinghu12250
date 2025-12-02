/**
 * 任务路由
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const pointService = require('../services/pointService');

const prisma = new PrismaClient();

// GET /api/tasks - 获取所有任务（系统任务+个人任务）
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { includeArchived = 'false' } = req.query;
    const showArchived = includeArchived === 'true';

    let systemTasks = [];
    let personalTasks = [];
    let archivedTasks = [];

    // 获取系统任务（老师或管理员发布的）
    if (req.user.role === 'TEACHER') {
      // 老师只能看到自己创建的任务
      systemTasks = await prisma.task.findMany({
        where: {
          creatorId: req.user.id,
          type: { in: ['TEACHER', 'SYSTEM'] }
        },
        include: {
          creator: {
            select: { id: true, username: true, avatar: true },
          },
          assignments: {
            where: showArchived ? {} : { isArchived: false },
            include: {
              student: {
                select: { id: true, username: true, avatar: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      systemTasks = systemTasks.map(t => ({ ...t, isSystem: true }));
    } else if (req.user.role === 'ADMIN') {
      // 管理员可以看到所有任务
      systemTasks = await prisma.task.findMany({
        include: {
          creator: {
            select: { id: true, username: true, avatar: true, role: true },
          },
          assignments: {
            where: showArchived ? {} : { isArchived: false },
            include: {
              student: {
                select: { id: true, username: true, avatar: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      systemTasks = systemTasks.map(t => ({ ...t, isSystem: true }));
    } else if (req.user.role === 'STUDENT') {
      // 学生只能看到分配给自己的任务
      const assignments = await prisma.taskAssignment.findMany({
        where: {
          studentId: req.user.id,
          isArchived: false
        },
        include: {
          task: {
            include: {
              creator: {
                select: { id: true, username: true, avatar: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      systemTasks = assignments.map(a => ({
        ...a.task,
        assignment: a,
        isSystem: true
      }));

      // 获取已归档的任务
      if (showArchived) {
        const archivedAssignments = await prisma.taskAssignment.findMany({
          where: {
            studentId: req.user.id,
            isArchived: true
          },
          include: {
            task: {
              include: {
                creator: {
                  select: { id: true, username: true, avatar: true },
                },
              },
            },
            post: true,
          },
          orderBy: { completedAt: 'desc' },
        });
        archivedTasks = archivedAssignments.map(a => ({
          ...a.task,
          assignment: a,
          isSystem: true,
          isArchived: true
        }));
      }
    }

    // 获取个人任务
    personalTasks = await prisma.personalTask.findMany({
      where: {
        userId: req.user.id,
        isArchived: false
      },
      orderBy: { createdAt: 'desc' },
    });
    personalTasks = personalTasks.map(t => ({ ...t, isSystem: false }));

    // 获取已归档的个人任务
    if (showArchived && req.user.role === 'STUDENT') {
      const archivedPersonal = await prisma.personalTask.findMany({
        where: {
          userId: req.user.id,
          isArchived: true
        },
        include: {
          post: true,
        },
        orderBy: { completedAt: 'desc' },
      });
      archivedTasks.push(...archivedPersonal.map(t => ({
        ...t,
        isSystem: false,
        isArchived: true
      })));
    }

    const tasks = { systemTasks, personalTasks, archivedTasks };

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks - 创建任务（老师和管理员）
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, dueDate, studentIds = [], type = 'TEACHER', publishToAll = false } = req.body;

    // 权限检查
    if (req.user.role !== 'TEACHER' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '只有老师和管理员可以创建任务' });
    }

    // 类型检查
    let taskType = type;
    if (req.user.role === 'TEACHER' && type !== 'TEACHER') {
      taskType = 'TEACHER'; // 老师只能创建TEACHER类型的任务
    } else if (req.user.role === 'ADMIN') {
      // 管理员可以创建任何类型的任务
      if (!['SYSTEM', 'TEACHER', 'ADMIN'].includes(type)) {
        return res.status(400).json({ error: '无效的任务类型' });
      }
    }

    // 如果发布给所有人，获取所有学生
    let targetStudentIds = studentIds;
    if (publishToAll) {
      const allStudents = await prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { id: true },
      });
      targetStudentIds = allStudents.map(s => s.id);
    }

    const task = await prisma.task.create({
      data: {
        creatorId: req.user.id,
        title,
        description,
        type: taskType,
        dueDate: dueDate ? new Date(dueDate) : null,
        assignments: {
          create: targetStudentIds.map(studentId => ({ studentId })),
        },
      },
      include: {
        creator: {
          select: { id: true, username: true, avatar: true },
        },
        assignments: {
          include: {
            student: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
    });

    res.status(201).json({ message: '任务创建成功', task });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id - 更新任务（创建者或管理员）
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 权限检查：创建者或管理员可以修改
    if (task.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '无权修改此任务' });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        creator: {
          select: { id: true, username: true, avatar: true },
        },
        assignments: {
          include: {
            student: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
    });

    res.json({ message: '任务更新成功', task: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - 删除任务（创建者或管理员）
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 权限检查：创建者或管理员可以删除
    if (task.creatorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '无权删除此任务' });
    }

    await prisma.task.delete({ where: { id } });

    res.json({ message: '任务删除成功' });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id/complete - 完成任务（学生）
router.put('/:id/complete', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note, publishToTimeline = false, isPublic = true } = req.body;

    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ error: '只有学生可以完成任务' });
    }

    const assignment = await prisma.taskAssignment.findFirst({
      where: {
        taskId: id,
        studentId: req.user.id,
      },
      include: {
        task: true,
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: '任务不存在' });
    }

    // 完成任务
    const updateData = {
      status: 'COMPLETED',
      completedAt: new Date(),
      note,
    };

    // 如果选择发布到动态
    let post = null;
    if (publishToTimeline) {
      post = await prisma.post.create({
        data: {
          authorId: req.user.id,
          content: `完成了任务：${assignment.task.title}${note ? '\n\n' + note : ''}`,
          isPublic,
        },
      });
      updateData.postId = post.id;
    }

    const updated = await prisma.taskAssignment.update({
      where: { id: assignment.id },
      data: updateData,
      include: {
        task: true,
        post: true,
      },
    });

    // 奖励积分
    let earnedPoints = 0;
    let newTotalPoints = 0;
    try {
      const pointResult = await addPoints('TASK_COMPLETE', req.user.id, {
        relatedType: 'task',
        relatedId: assignment.task.id,
        remark: `完成任务：${assignment.task.title}`,
      });
      if (pointResult.success) {
        earnedPoints = pointResult.log.pointsChanged;
        newTotalPoints = pointResult.totalPoints;
      }
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.json({
      message: '任务已完成',
      assignment: updated,
      post,
      earnedPoints,
      newTotalPoints,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id/archive - 归档任务（学生）
router.put('/:id/archive', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'STUDENT') {
      return res.status(403).json({ error: '只有学生可以归档任务' });
    }

    const assignment = await prisma.taskAssignment.findFirst({
      where: {
        taskId: id,
        studentId: req.user.id,
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: '任务不存在' });
    }

    if (assignment.status !== 'COMPLETED') {
      return res.status(400).json({ error: '只能归档已完成的任务' });
    }

    const updated = await prisma.taskAssignment.update({
      where: { id: assignment.id },
      data: {
        isArchived: true,
      },
    });

    res.json({ message: '任务已归档', assignment: updated });
  } catch (error) {
    next(error);
  }
});

// ===== 个人任务路由 =====

// POST /api/tasks/personal - 创建个人任务
router.post('/personal', authenticate, async (req, res, next) => {
  try {
    const { title, description, dueDate } = req.body;

    const task = await prisma.personalTask.create({
      data: {
        userId: req.user.id,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json({ message: '任务创建成功', task });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/personal/:id - 更新个人任务
router.put('/personal/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status } = req.body;

    const task = await prisma.personalTask.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    if (task.userId !== req.user.id) {
      return res.status(403).json({ error: '无权修改' });
    }

    const updated = await prisma.personalTask.update({
      where: { id },
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        status,
        completedAt: status === 'COMPLETED' ? new Date() : task.completedAt,
      },
    });

    res.json({ message: '更新成功', task: updated });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/personal/:id/complete - 完成个人任务
router.put('/personal/:id/complete', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { publishToTimeline = false, isPublic = true, note } = req.body;

    const task = await prisma.personalTask.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    if (task.userId !== req.user.id) {
      return res.status(403).json({ error: '无权操作' });
    }

    const updateData = {
      status: 'COMPLETED',
      completedAt: new Date(),
    };

    // 如果选择发布到动态
    let post = null;
    if (publishToTimeline) {
      post = await prisma.post.create({
        data: {
          authorId: req.user.id,
          content: `完成了个人任务：${task.title}${note ? '\n\n' + note : ''}`,
          isPublic,
        },
      });
      updateData.postId = post.id;
    }

    const updated = await prisma.personalTask.update({
      where: { id },
      data: updateData,
      include: {
        post: true,
      },
    });

    // 奖励积分
    let earnedPoints = 0;
    let newTotalPoints = 0;
    try {
      const pointResult = await addPoints('TASK_COMPLETE', req.user.id, {
        relatedType: 'personalTask',
        relatedId: task.id,
        remark: `完成个人任务：${task.title}`,
      });
      if (pointResult.success) {
        earnedPoints = pointResult.log.pointsChanged;
        newTotalPoints = pointResult.totalPoints;
      }
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    res.json({
      message: '任务已完成',
      task: updated,
      post,
      earnedPoints,
      newTotalPoints,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/personal/:id/archive - 归档个人任务
router.put('/personal/:id/archive', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.personalTask.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    if (task.userId !== req.user.id) {
      return res.status(403).json({ error: '无权操作' });
    }

    if (task.status !== 'COMPLETED') {
      return res.status(400).json({ error: '只能归档已完成的任务' });
    }

    const updated = await prisma.personalTask.update({
      where: { id },
      data: {
        isArchived: true,
      },
    });

    res.json({ message: '任务已归档', task: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/personal/:id - 删除个人任务
router.delete('/personal/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.personalTask.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    if (task.userId !== req.user.id) {
      return res.status(403).json({ error: '无权删除' });
    }

    await prisma.personalTask.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
