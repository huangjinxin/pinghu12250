/**
 * 交易服务 - 处理学习货币系统的交易
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class TransactionService {
  /**
   * 转账（打赏、奖励等）
   * @param {object} params - 转账参数
   * @param {string} params.fromUserId - 付款用户ID
   * @param {string} params.toUserId - 收款用户ID
   * @param {number} params.amount - 金额
   * @param {string} params.type - 交易类型（EARN_REWARD/SPEND_REWARD等）
   * @param {string} params.description - 描述
   * @param {string} params.relatedType - 关联类型（work/diary等）
   * @param {string} params.relatedId - 关联ID
   * @param {object} params.metadata - 额外元数据
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async transfer({ fromUserId, toUserId, amount, type, description, relatedType, relatedId, metadata }) {
    try {
      // 确保金额为正数
      const coinAmount = Math.abs(amount);

      const result = await prisma.$transaction(async (tx) => {
        // 1. 获取付款人钱包
        let fromWallet = await tx.wallet.findUnique({
          where: { userId: fromUserId },
        });

        if (!fromWallet) {
          fromWallet = await tx.wallet.create({
            data: { userId: fromUserId, balance: 0 },
          });
        }

        // 2. 检查余额
        if (fromWallet.balance < coinAmount) {
          throw new Error('金币余额不足');
        }

        // 3. 获取收款人钱包
        let toWallet = await tx.wallet.findUnique({
          where: { userId: toUserId },
        });

        if (!toWallet) {
          toWallet = await tx.wallet.create({
            data: { userId: toUserId, balance: 0 },
          });
        }

        // 4. 扣款
        fromWallet = await tx.wallet.update({
          where: { id: fromWallet.id },
          data: { balance: { decrement: coinAmount } },
        });

        // 5. 加款
        toWallet = await tx.wallet.update({
          where: { id: toWallet.id },
          data: { balance: { increment: coinAmount } },
        });

        // 6. 创建付款人交易记录（支出）
        await tx.transaction.create({
          data: {
            userId: fromUserId,
            type: type.includes('SPEND') ? type : 'SPEND_REWARD',
            amount: -coinAmount,
            balance: fromWallet.balance,
            fromUserId,
            toUserId,
            relatedType,
            relatedId,
            description: `支出：${description}`,
            metadata: metadata || {},
          },
        });

        // 7. 创建收款人交易记录（收入）
        await tx.transaction.create({
          data: {
            userId: toUserId,
            type: type.includes('EARN') ? type : 'EARN_REWARD',
            amount: coinAmount,
            balance: toWallet.balance,
            fromUserId,
            toUserId,
            relatedType,
            relatedId,
            description: `收入：${description}`,
            metadata: metadata || {},
          },
        });

        return { fromWallet, toWallet };
      });

      return {
        success: true,
        message: '转账成功',
        data: result,
      };
    } catch (error) {
      console.error('转账失败:', error);
      return {
        success: false,
        message: error.message || '转账失败',
      };
    }
  }

  /**
   * 获取用户余额
   * @param {string} userId - 用户ID
   * @returns {Promise<number>}
   */
  async getBalance(userId) {
    try {
      let wallet = await prisma.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: { userId, balance: 0 },
        });
      }

      return wallet.balance;
    } catch (error) {
      console.error('获取余额失败:', error);
      return 0;
    }
  }

  /**
   * 获取用户交易记录
   * @param {string} userId - 用户ID
   * @param {object} options - 选项
   * @returns {Promise<{transactions: Array, pagination: object}>}
   */
  async getTransactions(userId, options = {}) {
    try {
      const { page = 1, limit = 20, type } = options;
      const skip = (page - 1) * limit;

      const where = { userId };
      if (type) {
        where.type = type;
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            fromUser: {
              select: {
                id: true,
                username: true,
                avatar: true,
                profile: {
                  select: { nickname: true },
                },
              },
            },
            toUser: {
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
        }),
        prisma.transaction.count({ where }),
      ]);

      return {
        transactions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('获取交易记录失败:', error);
      return {
        transactions: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    }
  }

  /**
   * 老师奖励学生（系统发放）
   * @param {object} params - 奖励参数
   * @param {string} params.teacherId - 老师ID
   * @param {string} params.studentId - 学生ID
   * @param {number} params.amount - 金额
   * @param {string} params.reason - 原因
   * @param {string} params.relatedType - 关联类型
   * @param {string} params.relatedId - 关联ID
   * @returns {Promise<{success: boolean}>}
   */
  async teacherReward({ teacherId, studentId, amount, reason, relatedType, relatedId }) {
    try {
      const coinAmount = Math.abs(amount);

      const result = await prisma.$transaction(async (tx) => {
        // 获取或创建学生钱包
        let wallet = await tx.wallet.findUnique({
          where: { userId: studentId },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: { userId: studentId, balance: 0 },
          });
        }

        // 更新余额
        wallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: coinAmount } },
        });

        // 创建交易记录（老师奖励，fromUserId为null表示系统发放）
        await tx.transaction.create({
          data: {
            userId: studentId,
            type: 'EARN_TEACHER',
            amount: coinAmount,
            balance: wallet.balance,
            fromUserId: null, // 系统发放
            toUserId: studentId,
            relatedType,
            relatedId,
            description: reason,
            metadata: { teacherId }, // 在元数据中记录老师ID
          },
        });

        return { wallet };
      });

      return {
        success: true,
        message: '奖励成功',
        data: result,
      };
    } catch (error) {
      console.error('老师奖励失败:', error);
      return {
        success: false,
        message: error.message || '奖励失败',
      };
    }
  }
}

// 导出单例
const transactionService = new TransactionService();
module.exports = transactionService;
