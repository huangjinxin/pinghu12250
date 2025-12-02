/**
 * 打赏路由 - 处理作品打赏、老师奖励等
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const transactionService = require('../services/transactionService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * POST /api/reward/send
 * 发送打赏（使用积分）
 */
router.post('/send', authenticate, async (req, res) => {
  try {
    const { toUserId, points, relatedType, relatedId, message: rewardMessage } = req.body;
    const fromUserId = req.user.id;

    // 验证参数
    if (!toUserId || !points || !relatedType || !relatedId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 验证积分
    const pointAmount = parseInt(points);
    if (isNaN(pointAmount) || pointAmount <= 0) {
      return res.status(400).json({ error: '打赏积分必须为正数' });
    }

    // 不能给自己打赏
    if (fromUserId === toUserId) {
      return res.status(400).json({ error: '不能给自己打赏' });
    }

    // 验证关联内容是否存在
    let relatedContent = null;
    let contentTitle = '';
    let contentTypeName = '';

    if (relatedType === 'work') {
      relatedContent = await prisma.hTMLWork.findUnique({
        where: { id: relatedId },
        select: { id: true, title: true, authorId: true },
      });
      if (!relatedContent) {
        return res.status(404).json({ error: '作品不存在' });
      }
      if (relatedContent.authorId !== toUserId) {
        return res.status(400).json({ error: '收款人必须是作品作者' });
      }
      contentTitle = relatedContent.title;
      contentTypeName = '作品';
    } else if (relatedType === 'diary') {
      relatedContent = await prisma.diary.findUnique({
        where: { id: relatedId },
        select: { id: true, title: true, authorId: true },
      });
      if (!relatedContent) {
        return res.status(404).json({ error: '日记不存在' });
      }
      if (relatedContent.authorId !== toUserId) {
        return res.status(400).json({ error: '收款人必须是日记作者' });
      }
      contentTitle = relatedContent.title;
      contentTypeName = '日记';
    } else if (relatedType === 'homework') {
      relatedContent = await prisma.homework.findUnique({
        where: { id: relatedId },
        select: { id: true, title: true, authorId: true },
      });
      if (!relatedContent) {
        return res.status(404).json({ error: '作业不存在' });
      }
      if (relatedContent.authorId !== toUserId) {
        return res.status(400).json({ error: '收款人必须是作业作者' });
      }
      contentTitle = relatedContent.title;
      contentTypeName = '作业';
    }

    // 检查打赏者积分余额
    const fromUser = await prisma.user.findUnique({
      where: { id: fromUserId },
      select: { totalPoints: true, username: true },
    });

    if (fromUser.totalPoints < pointAmount) {
      return res.status(400).json({ error: '积分余额不足' });
    }

    // 获取收款人信息
    const toUser = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { username: true },
    });

    // 执行积分转账（使用事务）
    const pointService = require('../services/pointService');

    await prisma.$transaction(async (tx) => {
      // 1. 扣除打赏者积分
      await pointService.deductPoints(
        fromUserId,
        pointAmount,
        'reward_send',
        relatedId,
        `打赏${contentTypeName}《${contentTitle}》`
      );

      // 2. 增加收款人积分
      await pointService.adjustPointsByAdmin(
        toUserId,
        pointAmount,
        fromUserId,
        `收到打赏：${contentTypeName}《${contentTitle}》`
      );
    });

    // 发送系统通知
    await prisma.message.create({
      data: {
        fromUserId,
        toUserId,
        messageType: 'SYSTEM_REWARD',
        content: `${fromUser.username} 打赏了您的${contentTypeName} ${pointAmount} 积分`,
        metadata: {
          points: pointAmount,
          relatedType,
          relatedId,
          message: rewardMessage,
          contentTitle,
        },
      },
    });

    res.json({
      message: '打赏成功',
      points: pointAmount,
    });
  } catch (error) {
    console.error('打赏失败:', error);
    res.status(500).json({ error: error.message || '打赏失败' });
  }
});

/**
 * POST /api/reward/teacher
 * 老师奖励学生积分
 */
router.post('/teacher', authenticate, async (req, res) => {
  try {
    const { studentId, points, comment, relatedType, relatedId } = req.body;
    const teacherId = req.user.id;

    // 验证教师身份
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { role: true, username: true },
    });

    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(403).json({ error: '只有老师才能执行此操作' });
    }

    // 验证参数
    if (!studentId || !points) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const pointAmount = parseInt(points);
    if (isNaN(pointAmount) || pointAmount <= 0 || pointAmount > 100) {
      return res.status(400).json({ error: '奖励积分必须在1-100之间' });
    }

    // 验证学生存在
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true, username: true },
    });

    if (!student) {
      return res.status(404).json({ error: '学生不存在' });
    }

    // 执行奖励（使用积分服务）
    const pointService = require('../services/pointService');

    const result = await pointService.adjustPointsByAdmin(
      studentId,
      pointAmount,
      teacherId,
      `老师奖励：${comment || '表现优秀'}`
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error || '奖励失败' });
    }

    // 发送系统通知
    await prisma.message.create({
      data: {
        fromUserId: null, // 系统消息
        toUserId: studentId,
        messageType: 'SYSTEM_TEACHER_REWARD',
        content: `收到老师 ${teacher.username} 的积分奖励：${pointAmount} 积分`,
        metadata: {
          teacherId,
          teacherName: teacher.username,
          points: pointAmount,
          comment: comment || '',
          relatedType,
          relatedId,
        },
      },
    });

    // 创建动态（可选）
    if (relatedType && relatedId) {
      await prisma.dynamic.create({
        data: {
          authorId: teacherId,
          content: `老师 ${teacher.username} 奖励了学生 ${student.username} ${pointAmount} 积分`,
          isPublic: false, // 设为私密，只有相关人员可见
        },
      }).catch(err => console.error('创建动态失败:', err));
    }

    res.json({
      message: '奖励成功',
      points: pointAmount,
      totalPoints: result.totalPoints,
    });
  } catch (error) {
    console.error('老师奖励失败:', error);
    res.status(500).json({ error: error.message || '奖励失败' });
  }
});

/**
 * GET /api/reward/balance
 * 获取当前用户金币余额
 */
router.get('/balance', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const balance = await transactionService.getBalance(userId);

    res.json({ balance });
  } catch (error) {
    console.error('获取余额失败:', error);
    res.status(500).json({ error: '获取余额失败' });
  }
});

/**
 * GET /api/reward/transactions
 * 获取交易记录
 */
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type } = req.query;

    const result = await transactionService.getTransactions(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
    });

    res.json(result);
  } catch (error) {
    console.error('获取交易记录失败:', error);
    res.status(500).json({ error: '获取交易记录失败' });
  }
});

/**
 * POST /api/reward/purchase-content
 * 购买付费内容（使用积分）
 */
router.post('/purchase-content', authenticate, async (req, res) => {
  try {
    const { contentType, contentId } = req.body;
    const userId = req.user.id;

    // 验证参数
    if (!contentType || !contentId) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 查找付费内容
    const paidContent = await prisma.paidContent.findUnique({
      where: {
        contentType_contentId: {
          contentType,
          contentId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!paidContent) {
      return res.status(404).json({ error: '该内容未设置付费' });
    }

    // 不能购买自己的内容
    if (paidContent.userId === userId) {
      return res.status(400).json({ error: '不能购买自己的内容' });
    }

    // 检查是否已购买
    const existingPurchase = await prisma.contentPurchase.findUnique({
      where: {
        userId_paidContentId: {
          userId,
          paidContentId: paidContent.id,
        },
      },
    });

    if (existingPurchase) {
      return res.status(400).json({ error: '您已购买过此内容' });
    }

    // 免费内容直接记录购买
    if (paidContent.price === 0) {
      await prisma.contentPurchase.create({
        data: {
          userId,
          paidContentId: paidContent.id,
          price: 0,
        },
      });

      return res.json({ message: '获取成功', price: 0 });
    }

    // 检查购买者积分余额
    const buyer = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true, username: true },
    });

    if (buyer.totalPoints < paidContent.price) {
      return res.status(400).json({ error: '积分余额不足' });
    }

    // 执行购买（使用积分）
    const pointService = require('../services/pointService');
    const contentTypeName = contentType === 'diary' ? '日记' : contentType === 'note' ? '笔记' : '内容';

    await prisma.$transaction(async (tx) => {
      // 1. 扣除购买者积分
      await pointService.deductPoints(
        userId,
        paidContent.price,
        'content_purchase',
        contentId,
        `购买${contentTypeName}`
      );

      // 2. 增加作者积分
      await pointService.adjustPointsByAdmin(
        paidContent.userId,
        paidContent.price,
        'system',
        `${contentTypeName}被购买`
      );

      // 3. 创建购买记录
      await tx.contentPurchase.create({
        data: {
          userId,
          paidContentId: paidContent.id,
          price: paidContent.price,
        },
      });

      // 4. 更新付费内容统计
      await tx.paidContent.update({
        where: { id: paidContent.id },
        data: {
          sales: { increment: 1 },
          revenue: { increment: paidContent.price },
        },
      });
    });

    // 发送系统通知
    await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId: paidContent.userId,
        messageType: 'SYSTEM_PURCHASE',
        content: `${buyer.username} 购买了您的${contentTypeName}（${paidContent.price} 积分）`,
        metadata: {
          points: paidContent.price,
          contentType,
          contentId,
        },
      },
    });

    res.json({ message: '购买成功', price: paidContent.price });
  } catch (error) {
    console.error('购买失败:', error);
    res.status(500).json({ error: error.message || '购买失败' });
  }
});

module.exports = router;
