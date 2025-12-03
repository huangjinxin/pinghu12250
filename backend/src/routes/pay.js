/**
 * 扫码支付路由
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, isAdmin } = require('../middleware/auth');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

// ========== 管理员API ==========

// POST /api/pay/codes - 创建收款码（管理员）
router.post('/codes', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { title, amount, description } = req.body;

    // 验证参数
    if (!title || !amount) {
      return res.status(400).json({ error: '商品名称和金额不能为空' });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 0.01) {
      return res.status(400).json({ error: '金额必须大于等于0.01' });
    }

    // 生成唯一code（时间戳 + 随机数）
    const code = `PAY${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 创建收款码
    const payCode = await prisma.payCode.create({
      data: {
        code,
        title,
        amount: amountNum,
        description: description || null,
        createdById: req.user.id,
      },
    });

    // 生成二维码（dataURL格式）
    const qrcodeDataURL = await QRCode.toDataURL(code, {
      width: 300,
      margin: 2,
    });

    // 记录活动日志
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'create_paycode',
        targetType: 'paycode',
        targetId: payCode.id,
        description: `创建收款码: ${title}，金额 ${amount} 学习币`,
      },
    });

    res.json({
      message: '收款码创建成功',
      payCode,
      qrcode: qrcodeDataURL,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/pay/codes - 获取收款码列表（管理员）
router.get('/codes', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [codes, total] = await Promise.all([
      prisma.payCode.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          _count: {
            select: { orders: true },
          },
        },
      }),
      prisma.payCode.count(),
    ]);

    res.json({
      codes,
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
});

// GET /api/pay/codes/:id - 获取单个收款码详情（管理员）
router.get('/codes/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const payCode = await prisma.payCode.findUnique({
      where: { id },
      include: {
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!payCode) {
      return res.status(404).json({ error: '收款码不存在' });
    }

    // 生成二维码
    const qrcodeDataURL = await QRCode.toDataURL(payCode.code, {
      width: 300,
      margin: 2,
    });

    res.json({
      payCode,
      qrcode: qrcodeDataURL,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/pay/codes/:id - 更新收款码（管理员）
router.put('/codes/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, amount, description, isActive } = req.body;

    const payCode = await prisma.payCode.findUnique({ where: { id } });
    if (!payCode) {
      return res.status(404).json({ error: '收款码不存在' });
    }

    // 验证参数
    if (title !== undefined && !title) {
      return res.status(400).json({ error: '商品名称不能为空' });
    }

    if (amount !== undefined) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum < 0.01) {
        return res.status(400).json({ error: '金额必须大于等于0.01' });
      }
    }

    // 构建更新数据
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (description !== undefined) updateData.description = description || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.payCode.update({
      where: { id },
      data: updateData,
    });

    // 记录活动日志
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'update_paycode',
        targetType: 'paycode',
        targetId: id,
        description: `更新收款码: ${updated.title}`,
      },
    });

    res.json({
      message: '收款码更新成功',
      payCode: updated,
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/pay/codes/:id/toggle - 启用/禁用收款码（管理员）
router.put('/codes/:id/toggle', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const payCode = await prisma.payCode.findUnique({ where: { id } });
    if (!payCode) {
      return res.status(404).json({ error: '收款码不存在' });
    }

    const updated = await prisma.payCode.update({
      where: { id },
      data: { isActive: !payCode.isActive },
    });

    res.json({
      message: updated.isActive ? '收款码已启用' : '收款码已禁用',
      payCode: updated,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/pay/codes/:id - 删除收款码（管理员）
router.delete('/codes/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { id } = req.params;

    const payCode = await prisma.payCode.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true } },
      },
    });

    if (!payCode) {
      return res.status(404).json({ error: '收款码不存在' });
    }

    if (payCode._count.orders > 0) {
      return res.status(400).json({ error: '该收款码已有支付记录，无法删除' });
    }

    await prisma.payCode.delete({ where: { id } });

    res.json({ message: '收款码已删除' });
  } catch (error) {
    next(error);
  }
});

// GET /api/pay/orders - 获取所有订单（管理员）
router.get('/orders', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.payOrder.findMany({
        include: {
          payCode: {
            select: {
              title: true,
              code: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.payOrder.count(),
    ]);

    res.json({
      orders,
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
});

// ========== 学生API ==========

// GET /api/pay/scan/:code - 扫码获取收款码信息
router.get('/scan/:code', authenticate, async (req, res, next) => {
  try {
    const { code } = req.params;

    const payCode = await prisma.payCode.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        title: true,
        amount: true,
        description: true,
        isActive: true,
      },
    });

    if (!payCode) {
      return res.status(404).json({ error: '收款码不存在' });
    }

    if (!payCode.isActive) {
      return res.status(400).json({ error: '该收款码已禁用' });
    }

    res.json({ payCode });
  } catch (error) {
    next(error);
  }
});

// POST /api/pay/submit - 提交支付
router.post('/submit', authenticate, async (req, res, next) => {
  try {
    const { payCodeId } = req.body;
    const userId = req.user.id;

    // 获取收款码信息
    const payCode = await prisma.payCode.findUnique({
      where: { id: payCodeId },
    });

    if (!payCode) {
      return res.status(404).json({ error: '收款码不存在' });
    }

    if (!payCode.isActive) {
      return res.status(400).json({ error: '该收款码已禁用' });
    }

    // 获取用户钱包
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    // 如果钱包不存在，创建一个
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    // 检查余额
    if (wallet.balance < payCode.amount) {
      return res.status(400).json({
        error: '学习币余额不足',
        required: payCode.amount,
        current: wallet.balance,
      });
    }

    // 生成订单号
    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 使用事务完成支付
    const result = await prisma.$transaction(async (tx) => {
      // 扣除学习币
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: payCode.amount } },
      });

      // 创建钱包交易记录
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -payCode.amount,
          type: 'pay_code_payment',
          description: `支付: ${payCode.title}`,
          relatedType: 'paycode',
          relatedId: payCode.id,
        },
      });

      // 创建支付订单
      const order = await tx.payOrder.create({
        data: {
          orderNo,
          userId,
          payCodeId: payCode.id,
          amount: payCode.amount,
          title: payCode.title,
          status: 'completed',
        },
      });

      return order;
    });

    // 记录活动日志
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'pay_code_payment',
        targetType: 'payorder',
        targetId: result.id,
        description: `支付 ${payCode.title}，花费 ${payCode.amount} 学习币`,
      },
    });

    res.json({
      message: '支付成功',
      order: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/pay/my-orders - 获取我的支付记录
router.get('/my-orders', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      prisma.payOrder.findMany({
        where: { userId: req.user.id },
        include: {
          payCode: {
            select: {
              title: true,
              description: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.payOrder.count({
        where: { userId: req.user.id },
      }),
    ]);

    res.json({
      orders,
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
});

module.exports = router;
