/**
 * 钱包路由 - 学习币管理
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * GET /api/wallet
 * 获取当前用户的钱包信息
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取或创建钱包
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    res.json({
      wallet: {
        balance: wallet.balance,
        updatedAt: wallet.updatedAt,
      },
    });
  } catch (error) {
    console.error('获取钱包失败:', error);
    res.status(500).json({ error: error.message || '获取钱包失败' });
  }
});

/**
 * GET /api/wallet/transactions
 * 获取学习币交易记录
 */
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 获取或创建钱包
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    // 获取交易记录
    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.count({
        where: { walletId: wallet.id },
      }),
    ]);

    res.json({
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.type,
        description: t.description,
        relatedType: t.relatedType,
        relatedId: t.relatedId,
        createdAt: t.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取交易记录失败:', error);
    res.status(500).json({ error: error.message || '获取交易记录失败' });
  }
});

module.exports = router;
