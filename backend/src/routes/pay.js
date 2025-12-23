/**
 * 扫码支付路由
 */

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

// 默认支付密码
const DEFAULT_PAYMENT_PASSWORD = '123456';

// ========== 管理员API ==========

// POST /api/pay/codes - 创建收款码（管理员）
router.post('/codes', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { title, amount, description, category } = req.body;

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
        category: category || null,
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

// GET /api/pay/codes/categories - 获取所有分类列表（管理员）
router.get('/codes/categories', authenticate, isAdmin, async (req, res, next) => {
  try {
    const categories = await prisma.payCode.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });
    res.json({
      categories: categories.map(c => c.category).filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/pay/codes - 获取收款码列表（管理员）
router.get('/codes', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, category, isActive, keyword } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 构建筛选条件
    const where = {};
    if (category) {
      where.category = category;
    }
    if (isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { description: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [codes, total] = await Promise.all([
      prisma.payCode.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          _count: {
            select: { orders: true },
          },
        },
      }),
      prisma.payCode.count({ where }),
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
    const { title, amount, description, category, isActive } = req.body;

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
    if (category !== undefined) updateData.category = category || null;
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
    const { page = 1, limit = 50, payCodeId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 构建筛选条件
    const where = {};
    if (payCodeId) {
      where.payCodeId = payCodeId;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const [orders, total] = await Promise.all([
      prisma.payOrder.findMany({
        where,
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
      prisma.payOrder.count({ where }),
    ]);

    // 获取用户ID列表并批量查询用户信息
    const userIds = [...new Set(orders.map(o => o.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });
    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    // 添加用户信息到订单
    const ordersWithUser = orders.map(o => ({
      ...o,
      user: userMap[o.userId] || null,
    }));

    res.json({
      orders: ordersWithUser,
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

// GET /api/pay/orders/stats - 获取订单统计（含用户信息，用于数据分析）
router.get('/orders/stats', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    // 计算时间范围
    const startDate = days === 'all' ? null : new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    const where = startDate ? { createdAt: { gte: startDate } } : {};

    // 获取订单数据（含用户信息）
    const orders = await prisma.payOrder.findMany({
      where,
      include: {
        payCode: {
          select: {
            title: true,
            code: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // 获取用户ID列表
    const userIds = [...new Set(orders.map(o => o.userId))];

    // 批量获取用户信息
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatar: true },
    });

    const userMap = {};
    users.forEach(u => { userMap[u.id] = u; });

    // 计算用户支付排行
    const userStats = {};
    orders.forEach(o => {
      if (!userStats[o.userId]) {
        userStats[o.userId] = {
          userId: o.userId,
          username: userMap[o.userId]?.username || '未知用户',
          avatar: userMap[o.userId]?.avatar,
          count: 0,
          total: 0,
        };
      }
      userStats[o.userId].count++;
      userStats[o.userId].total += parseFloat(o.amount);
    });

    const topUsers = Object.values(userStats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.json({
      orders: orders.map(o => ({
        ...o,
        user: userMap[o.userId] || null,
      })),
      topUsers,
    });
  } catch (error) {
    next(error);
  }
});

// ========== 公开API（无需认证） ==========

// GET /api/pay/public/codes - 公开获取已启用的收款码列表（用于购物广场）
router.get('/public/codes', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, category } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 只查询已启用的收款码
    const where = { isActive: true };
    if (category) {
      where.category = category;
    }

    const [codes, total] = await Promise.all([
      prisma.payCode.findMany({
        where,
        select: {
          id: true,
          code: true,
          title: true,
          amount: true,
          description: true,
          category: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.payCode.count({ where }),
    ]);

    // 生成二维码
    const codesWithQRCode = await Promise.all(
      codes.map(async (payCode) => {
        const qrcode = await QRCode.toDataURL(payCode.code, {
          width: 200,
          margin: 2,
        });
        return { ...payCode, qrcode };
      })
    );

    // 获取所有分类
    const categories = await prisma.payCode.findMany({
      where: { isActive: true, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });

    res.json({
      codes: codesWithQRCode,
      categories: categories.map(c => c.category).filter(Boolean),
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
    const { payCodeId, paymentPassword } = req.body;
    const userId = req.user.id;

    // 验证支付密码
    if (!paymentPassword) {
      return res.status(400).json({ error: '请输入支付密码' });
    }

    // 获取用户信息（包含支付密码）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paymentPassword: true },
    });

    // 验证支付密码
    if (user.paymentPassword) {
      // 用户已设置支付密码，验证加密后的密码
      const isValid = await bcrypt.compare(paymentPassword, user.paymentPassword);
      if (!isValid) {
        return res.status(401).json({ error: '支付密码错误' });
      }
    } else {
      // 用户未设置支付密码，使用默认密码
      if (paymentPassword !== DEFAULT_PAYMENT_PASSWORD) {
        return res.status(401).json({ error: '支付密码错误（默认密码为123456）' });
      }
    }

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

    // 检查余额 - 将Decimal转为Number进行比较
    const walletBalance = Number(wallet.balance);
    const payAmount = Number(payCode.amount);
    if (walletBalance < payAmount) {
      return res.status(400).json({
        error: '学习币余额不足',
        required: payAmount,
        current: walletBalance,
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
