/**
 * 用户反馈路由
 */

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const prisma = require('../lib/prisma');

// 有效状态列表
const VALID_STATUSES = ['pending', 'todo', 'discussing', 'resolved', 'adopted', 'archived'];

// ========== 用户接口 ==========

/**
 * POST /api/feedback
 * 提交反馈
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { type, content, page } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ success: false, error: '请输入反馈内容' });
    }

    if (!type || !['bug', 'suggestion', 'other'].includes(type)) {
      return res.status(400).json({ success: false, error: '请选择反馈类型' });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: req.user.id,
        type,
        content: content.trim(),
        page: page || null,
      },
    });

    res.json({ success: true, feedback });
  } catch (error) {
    console.error('提交反馈失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/feedback
 * 获取我的反馈列表
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.feedback.count({ where: { userId: req.user.id } }),
    ]);

    res.json({
      success: true,
      feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('获取反馈列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 管理员接口 ==========

/**
 * GET /api/feedback/admin/all
 * 管理员获取所有反馈
 */
router.get('/admin/all', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, type, priority, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) {
      // 支持多状态查询（逗号分隔）
      const statuses = status.split(',').filter(s => VALID_STATUSES.includes(s));
      if (statuses.length === 1) {
        where.status = statuses[0];
      } else if (statuses.length > 1) {
        where.status = { in: statuses };
      }
    }
    if (type) where.type = type;
    if (priority !== undefined) where.priority = parseInt(priority);

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: parseInt(limit),
      }),
      prisma.feedback.count({ where }),
    ]);

    res.json({
      success: true,
      feedbacks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('获取所有反馈失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/feedback/admin/stats
 * 管理员获取反馈统计（增强版）
 */
router.get('/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    // 基础统计
    const [
      total,
      pending,
      todo,
      discussing,
      resolved,
      adopted,
      archived,
      byType,
      byUser,
      byPriority,
      recentTrend,
    ] = await Promise.all([
      prisma.feedback.count(),
      prisma.feedback.count({ where: { status: 'pending' } }),
      prisma.feedback.count({ where: { status: 'todo' } }),
      prisma.feedback.count({ where: { status: 'discussing' } }),
      prisma.feedback.count({ where: { status: 'resolved' } }),
      prisma.feedback.count({ where: { status: 'adopted' } }),
      prisma.feedback.count({ where: { status: 'archived' } }),
      // 按类型统计
      prisma.feedback.groupBy({
        by: ['type'],
        _count: { type: true },
      }),
      // 按用户统计（前10名）
      prisma.feedback.groupBy({
        by: ['userId'],
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
      // 按优先级统计
      prisma.feedback.groupBy({
        by: ['priority'],
        _count: { priority: true },
      }),
      // 最近30天趋势
      prisma.$queryRaw`
        SELECT
          DATE("createdAt") as date,
          COUNT(*) as count,
          COUNT(CASE WHEN status IN ('resolved', 'adopted') THEN 1 END) as resolved_count
        FROM "Feedback"
        WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `,
    ]);

    // 获取用户名
    const userIds = byUser.map(u => u.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });
    const userMap = users.reduce((acc, u) => {
      acc[u.id] = u.username;
      return acc;
    }, {});

    // 计算处理效率
    const completedCount = resolved + adopted;
    const activeCount = pending + todo + discussing;
    const resolveRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const adoptRate = total > 0 ? Math.round((adopted / total) * 100) : 0;

    res.json({
      success: true,
      stats: {
        total,
        byStatus: {
          pending,
          todo,
          discussing,
          resolved,
          adopted,
          archived,
        },
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {}),
        byUser: byUser.map(item => ({
          userId: item.userId,
          username: userMap[item.userId] || '未知',
          count: item._count.userId,
        })),
        byPriority: byPriority.reduce((acc, item) => {
          const labels = { 0: 'normal', 1: 'important', 2: 'urgent' };
          acc[labels[item.priority] || 'normal'] = item._count.priority;
          return acc;
        }, {}),
        efficiency: {
          resolveRate,
          adoptRate,
          activeCount,
          completedCount,
        },
        trend: recentTrend.map(item => ({
          date: item.date,
          count: Number(item.count),
          resolvedCount: Number(item.resolved_count),
        })),
      },
    });
  } catch (error) {
    console.error('获取反馈统计失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/feedback/admin/:id
 * 管理员更新反馈（状态/回复/备注）
 */
router.put('/admin/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reply, adminNote, priority } = req.body;

    const feedback = await prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      return res.status(404).json({ success: false, error: '反馈不存在' });
    }

    const updateData = {};

    if (status && VALID_STATUSES.includes(status)) {
      updateData.status = status;
      // 如果标记为已解决或已采纳，记录解决时间
      if (['resolved', 'adopted'].includes(status) && !feedback.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
    }

    if (reply !== undefined) {
      updateData.reply = reply;
      updateData.repliedBy = req.user.id;
      updateData.repliedAt = new Date();
    }

    if (adminNote !== undefined) {
      updateData.adminNote = adminNote;
    }

    if (priority !== undefined && [0, 1, 2].includes(priority)) {
      updateData.priority = priority;
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    res.json({ success: true, feedback: updated });
  } catch (error) {
    console.error('更新反馈失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/feedback/admin/batch
 * 批量更新反馈状态
 */
router.put('/admin/batch', authenticate, isAdmin, async (req, res) => {
  try {
    const { ids, status } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请选择要更新的反馈' });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: '无效的状态' });
    }

    const updateData = { status };
    if (['resolved', 'adopted'].includes(status)) {
      updateData.resolvedAt = new Date();
    }

    const result = await prisma.feedback.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    res.json({ success: true, updated: result.count });
  } catch (error) {
    console.error('批量更新反馈失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/feedback/admin/:id
 * 管理员删除反馈
 */
router.delete('/admin/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.feedback.delete({
      where: { id },
    });

    res.json({ success: true, message: '反馈已删除' });
  } catch (error) {
    console.error('删除反馈失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
