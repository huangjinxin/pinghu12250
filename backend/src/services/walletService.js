/**
 * 虚拟货币服务 - 管理用户金币钱包
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class WalletService {
  /**
   * 获取或创建用户钱包
   * @param {string} userId - 用户ID
   * @returns {Promise<object>}
   */
  async getOrCreateWallet(userId) {
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

    return wallet;
  }

  /**
   * 增加金币
   * @param {string} userId - 用户ID
   * @param {number} amount - 金币数量
   * @param {string} type - 交易类型
   * @param {string} description - 描述
   * @param {object} options - 额外选项
   * @returns {Promise<{success: boolean, wallet: object, transaction: object}>}
   */
  async addCoins(userId, amount, type, description, options = {}) {
    try {
      const { relatedType, relatedId } = options;

      // 确保金额为正数
      const coinAmount = Math.abs(amount);

      const result = await prisma.$transaction(async (tx) => {
        // 获取或创建钱包
        let wallet = await tx.wallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              userId,
              balance: 0,
            },
          });
        }

        // 创建交易记录
        const transaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: coinAmount,
            type,
            description,
            relatedType,
            relatedId,
          },
        });

        // 更新钱包余额
        wallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: coinAmount,
            },
          },
        });

        return { wallet, transaction };
      });

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error('增加金币失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 扣除金币
   * @param {string} userId - 用户ID
   * @param {number} amount - 金币数量
   * @param {string} type - 交易类型
   * @param {string} description - 描述
   * @param {object} options - 额外选项
   * @returns {Promise<{success: boolean, wallet: object, transaction: object}>}
   */
  async deductCoins(userId, amount, type, description, options = {}) {
    try {
      const { relatedType, relatedId } = options;

      // 确保金额为正数
      const coinAmount = Math.abs(amount);

      const result = await prisma.$transaction(async (tx) => {
        // 获取钱包
        const wallet = await tx.wallet.findUnique({
          where: { userId },
        });

        if (!wallet) {
          throw new Error('钱包不存在');
        }

        // 检查余额
        if (wallet.balance < coinAmount) {
          throw new Error('金币余额不足');
        }

        // 创建交易记录
        const transaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -coinAmount,
            type,
            description,
            relatedType,
            relatedId,
          },
        });

        // 更新钱包余额
        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              decrement: coinAmount,
            },
          },
        });

        return { wallet: updatedWallet, transaction };
      });

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error('扣除金币失败:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取用户金币余额
   * @param {string} userId - 用户ID
   * @returns {Promise<number>}
   */
  async getBalance(userId) {
    try {
      const wallet = await this.getOrCreateWallet(userId);
      return wallet.balance;
    } catch (error) {
      console.error('获取金币余额失败:', error);
      return 0;
    }
  }

  /**
   * 获取用户交易记录
   * @param {string} userId - 用户ID
   * @param {object} options - 选项
   * @returns {Promise<Array>}
   */
  async getTransactions(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const wallet = await this.getOrCreateWallet(userId);

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
   * 管理员调整金币
   * @param {string} userId - 用户ID
   * @param {number} amount - 金币数量（正数增加，负数扣除）
   * @param {string} adminId - 管理员ID
   * @param {string} reason - 原因
   * @returns {Promise<{success: boolean}>}
   */
  async adminAdjust(userId, amount, adminId, reason) {
    try {
      if (amount > 0) {
        return await this.addCoins(
          userId,
          amount,
          'admin_adjust',
          `管理员调整: ${reason} (by ${adminId})`
        );
      } else {
        return await this.deductCoins(
          userId,
          Math.abs(amount),
          'admin_adjust',
          `管理员调整: ${reason} (by ${adminId})`
        );
      }
    } catch (error) {
      console.error('管理员调整金币失败:', error);
      return { success: false, message: error.message };
    }
  }
}

// 导出单例
const walletService = new WalletService();
module.exports = walletService;
