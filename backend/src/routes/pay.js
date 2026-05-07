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
    const { title, amount, description, category, pointPrice } = req.body;

    // 验证参数
    if (!title) {
      return res.status(400).json({ error: '商品名称不能为空' });
    }

    const amountNum = parseFloat(amount) || 0;
    if (amountNum < 0) {
      return res.status(400).json({ error: '金额不能为负数' });
    }

    // 验证积分价格
    if (pointPrice !== undefined && pointPrice !== null) {
      const pp = parseInt(pointPrice);
      if (isNaN(pp) || pp < 1) {
        return res.status(400).json({ error: '积分价格必须大于等于1' });
      }
    }

    // 生成唯一code（时间戳 + 随机数）
    const code = `PAY${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // 分期付款选项
    const { allowInstallment, installmentOptions } = req.body;

    // 创建收款码
    const payCode = await prisma.payCode.create({
      data: {
        code,
        title,
        amount: amountNum,
        description: description || null,
        category: category || null,
        createdById: req.user.id,
        pointPrice: pointPrice != null ? parseInt(pointPrice) : null,
        allowInstallment: allowInstallment || false,
        installmentOptions: installmentOptions || null,
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
    const { title, amount, description, category, isActive, allowInstallment, installmentOptions, pointPrice } = req.body;

    const payCode = await prisma.payCode.findUnique({ where: { id } });
    if (!payCode) {
      return res.status(404).json({ error: '收款码不存在' });
    }

    // 验证参数
    if (title !== undefined && !title) {
      return res.status(400).json({ error: '商品名称不能为空' });
    }

    if (amount !== undefined) {
      const amountNum = parseFloat(amount) || 0;
      if (amountNum < 0) {
        return res.status(400).json({ error: '金额不能为负数' });
      }
    }

    if (pointPrice !== undefined && pointPrice !== null) {
      const pp = parseInt(pointPrice);
      if (isNaN(pp) || pp < 1) {
        return res.status(400).json({ error: '积分价格必须大于等于1' });
      }
    }

    // 构建更新数据
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (description !== undefined) updateData.description = description || null;
    if (category !== undefined) updateData.category = category || null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (allowInstallment !== undefined) updateData.allowInstallment = allowInstallment;
    if (installmentOptions !== undefined) updateData.installmentOptions = installmentOptions || null;
    if (pointPrice !== undefined) updateData.pointPrice = pointPrice != null ? parseInt(pointPrice) : null;

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

// GET /api/pay/orders/user/:userId - 获取指定用户的支付记录（管理员）
router.get('/orders/user/:userId', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, startDate, endDate, keyword, category } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 查询用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 构建筛选条件
    const where = { userId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    if (keyword) {
      where.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { payCode: { title: { contains: keyword, mode: 'insensitive' } } },
      ];
    }
    if (category) {
      where.payCode = { category };
    }

    // 查询订单列表和总数
    const [orders, total] = await Promise.all([
      prisma.payOrder.findMany({
        where,
        include: {
          payCode: {
            select: { title: true, code: true, category: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.payOrder.count({ where }),
    ]);

    // 计算统计汇总（基于筛选条件，分币种）
    const [walletSummary, pointsSummary] = await Promise.all([
      prisma.payOrder.aggregate({ where: { ...where, paymentMethod: 'wallet' }, _sum: { amount: true }, _count: true }),
      prisma.payOrder.aggregate({ where: { ...where, paymentMethod: 'points' }, _sum: { amount: true }, _count: true }),
    ]);

    // 获取该用户的总体统计（不受筛选影响，分币种）
    const [overallWallet, overallPoints] = await Promise.all([
      prisma.payOrder.aggregate({ where: { userId, paymentMethod: 'wallet' }, _sum: { amount: true }, _count: true }),
      prisma.payOrder.aggregate({ where: { userId, paymentMethod: 'points' }, _sum: { amount: true }, _count: true }),
    ]);

    // 获取该用户购买过的所有分类
    const userCategories = await prisma.payOrder.findMany({
      where: { userId },
      select: {
        payCode: {
          select: { category: true },
        },
      },
      distinct: ['payCodeId'],
    });
    const categories = [...new Set(
      userCategories
        .map(o => o.payCode?.category)
        .filter(Boolean)
    )];

    res.json({
      orders,
      categories,
      summary: {
        walletAmount: walletSummary._sum.amount ? Number(walletSummary._sum.amount) : 0,
        walletCount: walletSummary._count,
        pointsAmount: pointsSummary._sum.amount ? Number(pointsSummary._sum.amount) : 0,
        pointsCount: pointsSummary._count,
        totalCount: walletSummary._count + pointsSummary._count,
      },
      overallSummary: {
        walletAmount: overallWallet._sum.amount ? Number(overallWallet._sum.amount) : 0,
        walletCount: overallWallet._count,
        pointsAmount: overallPoints._sum.amount ? Number(overallPoints._sum.amount) : 0,
        pointsCount: overallPoints._count,
        totalCount: overallWallet._count + overallPoints._count,
      },
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

    // 计算用户支付排行（分币种）
    const userStats = {};
    orders.forEach(o => {
      if (!userStats[o.userId]) {
        userStats[o.userId] = {
          userId: o.userId,
          username: userMap[o.userId]?.username || '未知用户',
          avatar: userMap[o.userId]?.avatar,
          walletTotal: 0, walletCount: 0,
          pointsTotal: 0, pointsCount: 0,
        };
      }
      if (o.paymentMethod === 'points') {
        userStats[o.userId].pointsCount++;
        userStats[o.userId].pointsTotal += parseFloat(o.amount);
      } else {
        userStats[o.userId].walletCount++;
        userStats[o.userId].walletTotal += parseFloat(o.amount);
      }
    });

    const topUsers = Object.values(userStats)
      .sort((a, b) => b.walletTotal - a.walletTotal)
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
          pointPrice: true,
          createdAt: true,
          allowInstallment: true,
          installmentOptions: true,
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

// POST /api/pay/submit - 提交支付（支持学习币和积分两种方式）
router.post('/submit', authenticate, async (req, res, next) => {
  try {
    const { payCodeId, paymentPassword, paymentMethod = 'wallet' } = req.body;
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

    // 验证支付密码（积分支付和学习币支付共用同一密码）
    if (user.paymentPassword) {
      const isValid = await bcrypt.compare(paymentPassword, user.paymentPassword);
      if (!isValid) {
        return res.status(401).json({ error: '支付密码错误' });
      }
    } else {
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

    // 生成订单号
    const orderNo = `ORD${Date.now()}${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // ===== 积分支付 =====
    if (paymentMethod === 'points') {
      if (!payCode.pointPrice) {
        return res.status(400).json({ error: '该商品不支持积分支付' });
      }

      // 获取用户积分
      const pointService = require('../services/pointService');
      const userPoints = await pointService.getUserPoints(userId);

      if (userPoints.totalPoints < payCode.pointPrice) {
        return res.status(400).json({
          error: '积分不足',
          required: payCode.pointPrice,
          current: userPoints.totalPoints,
        });
      }

      // 使用事务完成积分支付
      const result = await prisma.$transaction(async (tx) => {
        // 扣除积分
        await tx.userPoints.update({
          where: { userId },
          data: { totalPoints: { decrement: payCode.pointPrice } },
        });
        await tx.user.update({
          where: { id: userId },
          data: { totalPoints: { decrement: payCode.pointPrice } },
        });

        // 创建积分日志
        await tx.pointLog.create({
          data: {
            userId,
            points: -payCode.pointPrice,
            description: `积分支付: ${payCode.title}`,
            targetType: 'paycode',
            targetId: payCode.id,
          },
        });

        // 创建支付订单
        const order = await tx.payOrder.create({
          data: {
            orderNo,
            userId,
            payCodeId: payCode.id,
            amount: payCode.pointPrice,
            title: payCode.title,
            status: 'completed',
            paymentMethod: 'points',
          },
        });

        return order;
      });

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'point_payment',
          targetType: 'payorder',
          targetId: result.id,
          description: `积分支付 ${payCode.title}，花费 ${payCode.pointPrice} 积分`,
        },
      });

      return res.json({
        message: '积分支付成功',
        order: result,
        paymentMethod: 'points',
      });
    }

    // ===== 学习币支付（默认） =====
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: { userId, balance: 0 },
      });
    }

    const walletBalance = Number(wallet.balance);
    const payAmount = Number(payCode.amount);
    if (walletBalance < payAmount) {
      return res.status(400).json({
        error: '学习币余额不足',
        required: payAmount,
        current: walletBalance,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: payCode.amount } },
      });

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

      const order = await tx.payOrder.create({
        data: {
          orderNo,
          userId,
          payCodeId: payCode.id,
          amount: payCode.amount,
          title: payCode.title,
          status: 'completed',
          paymentMethod: 'wallet',
        },
      });

      return order;
    });

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
      paymentMethod: 'wallet',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/pay/my-orders - 获取我的支付记录（包含普通支付和分期付款）
router.get('/my-orders', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, keyword, category, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user.id;

    // 构建普通订单筛选条件
    const orderWhere = { userId };
    if (startDate || endDate) {
      orderWhere.createdAt = {};
      if (startDate) {
        orderWhere.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        orderWhere.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    if (keyword) {
      orderWhere.OR = [
        { title: { contains: keyword, mode: 'insensitive' } },
        { payCode: { title: { contains: keyword, mode: 'insensitive' } } },
      ];
    }
    if (category) {
      orderWhere.payCode = { category };
    }

    // 构建分期付款交易筛选条件
    const installmentWhere = {
      wallet: { userId },
      type: { in: ['installment_down_payment', 'installment_payment'] },
    };
    if (startDate || endDate) {
      installmentWhere.createdAt = {};
      if (startDate) {
        installmentWhere.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        installmentWhere.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }
    if (keyword) {
      installmentWhere.description = { contains: keyword, mode: 'insensitive' };
    }

    // 根据 type 参数决定查询哪些记录
    const includeOrders = !type || type === 'all' || type === 'order';
    const includeInstallments = !type || type === 'all' || type === 'installment';

    // 并行查询普通订单和分期付款记录
    const [orders, installmentTransactions] = await Promise.all([
      includeOrders ? prisma.payOrder.findMany({
        where: orderWhere,
        include: {
          payCode: {
            select: {
              title: true,
              description: true,
              category: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }) : [],
      includeInstallments ? prisma.walletTransaction.findMany({
        where: installmentWhere,
        orderBy: { createdAt: 'desc' },
      }) : [],
    ]);

    // 合并并格式化记录
    const allRecords = [
      ...orders.map(o => ({
        id: o.id,
        orderNo: o.orderNo,
        title: o.title || o.payCode?.title,
        amount: o.amount,
        paymentMethod: o.paymentMethod || 'wallet',
        category: o.payCode?.category,
        type: 'order',
        typeLabel: '扫码支付',
        createdAt: o.createdAt,
        payCode: o.payCode,
      })),
      ...installmentTransactions.map(t => ({
        id: t.id,
        orderNo: `INS${t.id.slice(0, 8).toUpperCase()}`,
        title: t.description,
        amount: Math.abs(Number(t.amount)),
        category: '分期付款',
        type: 'installment',
        typeLabel: t.type === 'installment_down_payment' ? '分期首付' : '分期还款',
        createdAt: t.createdAt,
        payCode: null,
      })),
    ];

    // 按时间排序
    allRecords.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 分页
    const total = allRecords.length;
    const paginatedRecords = allRecords.slice(skip, skip + parseInt(limit));

    // 计算统计汇总（分币种）
    const walletRecords = orders.filter(o => o.paymentMethod !== 'points');
    const pointRecords = orders.filter(o => o.paymentMethod === 'points');
    const walletAmount = walletRecords.reduce((s, o) => s + Number(o.amount), 0);
    const pointsAmount = pointRecords.reduce((s, o) => s + Number(o.amount), 0);

    // 获取该用户购买过的所有分类
    const userCategories = await prisma.payOrder.findMany({
      where: { userId },
      select: {
        payCode: {
          select: { category: true },
        },
      },
      distinct: ['payCodeId'],
    });
    const categories = [...new Set(
      userCategories
        .map(o => o.payCode?.category)
        .filter(Boolean)
    )];
    // 添加分期付款分类
    if (installmentTransactions.length > 0 && !categories.includes('分期付款')) {
      categories.push('分期付款');
    }

    res.json({
      orders: paginatedRecords,
      categories,
      summary: {
        walletAmount,
        walletCount: walletRecords.length,
        pointsAmount,
        pointsCount: pointRecords.length,
        totalCount: total,
      },
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
