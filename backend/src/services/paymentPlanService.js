/**
 * 付款计划服务
 * 处理分期付款逻辑，逾期检查为手动触发
 */

const prisma = require('../lib/prisma');
const walletService = require('./walletService');
const bcrypt = require('bcryptjs');

class PaymentPlanService {
  /**
   * 创建分期付款计划
   */
  async createPlan(userId, payCodeId, installments, downPaymentRate = 30, paymentPassword) {
    try {
      // 1. 获取商品信息
      const payCode = await prisma.payCode.findUnique({
        where: { id: payCodeId },
        include: { restriction: true },
      });

      if (!payCode) {
        return { success: false, error: '商品不存在' };
      }

      if (!payCode.isActive) {
        return { success: false, error: '商品已下架' };
      }

      if (!payCode.allowInstallment) {
        return { success: false, error: '该商品不支持分期付款' };
      }

      // 2. 检查可选期数
      const allowedInstallments = payCode.installmentOptions
        ? payCode.installmentOptions.split(',').map(n => parseInt(n.trim()))
        : [3, 6, 12];

      if (!allowedInstallments.includes(installments)) {
        return { success: false, error: `不支持 ${installments} 期，可选：${allowedInstallments.join(', ')}` };
      }

      // 3. 检查支付限制
      if (payCode.restriction && payCode.restriction.isActive) {
        const now = new Date();
        const { dateStart, dateEnd } = payCode.restriction;

        if (dateStart && now < new Date(dateStart)) {
          return { success: false, error: `该商品将于 ${new Date(dateStart).toLocaleDateString()} 开放购买` };
        }

        if (dateEnd && now > new Date(dateEnd)) {
          return { success: false, error: '该商品已过购买期限' };
        }
      }

      // 4. 检查用户是否已有该商品的进行中计划
      const existingPlan = await prisma.paymentPlan.findFirst({
        where: {
          userId,
          payCodeId,
          status: { in: ['active', 'overdue'] },
        },
      });

      if (existingPlan) {
        return { success: false, error: '您已有该商品的付款计划进行中' };
      }

      // 5. 验证首付比例（10%-50%）
      const validRate = Math.max(10, Math.min(50, downPaymentRate));

      // 6. 计算首付和分期金额
      const totalAmount = parseFloat(payCode.amount);
      const downPaymentAmount = Math.ceil(totalAmount * validRate / 100 * 100) / 100;
      const remainingAmount = totalAmount - downPaymentAmount;
      const installmentAmount = Math.ceil(remainingAmount / installments * 100) / 100;

      // 7. 验证支付密码
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { paymentPassword: true },
      });

      const defaultPassword = '123456';
      const storedPassword = user.paymentPassword || await bcrypt.hash(defaultPassword, 10);

      const isValidPassword = await bcrypt.compare(paymentPassword, storedPassword);
      if (!isValidPassword && paymentPassword !== defaultPassword) {
        return { success: false, error: '支付密码错误' };
      }

      // 8. 使用事务处理扣费和计划创建
      const result = await prisma.$transaction(async (tx) => {
        // A. 扣除首付款
        const deductResult = await walletService.deductCoins(
          userId,
          downPaymentAmount,
          'installment_down_payment',
          `分期付款首付 - ${payCode.title}`,
          { relatedType: 'payment_plan', relatedId: 'pending' },
          tx // 传入事务实例
        );

        if (!deductResult.success) {
          throw new Error(deductResult.message || '首付款余额不足');
        }

        // B. 生成付款日程
        const schedules = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 1; i <= installments; i++) {
          const dueDate = new Date(today);
          dueDate.setDate(dueDate.getDate() + i * 7);

          const amount = i === installments
            ? remainingAmount - installmentAmount * (installments - 1)
            : installmentAmount;

          schedules.push({
            installmentNo: i,
            amount,
            dueDate,
            status: 'pending',
          });
        }

        // C. 创建付款计划
        const plan = await tx.paymentPlan.create({
          data: {
            userId,
            payCodeId,
            totalAmount,
            paidAmount: downPaymentAmount,
            downPaymentRate: validRate,
            downPaymentAmount,
            downPaymentPaid: true,
            installments,
            nextDueDate: schedules[0].dueDate,
            schedules: {
              create: schedules,
            },
          },
          include: {
            payCode: true,
          },
        });

        // D. 更新交易记录中的 relatedId
        if (deductResult.transaction) {
          await tx.walletTransaction.update({
            where: { id: deductResult.transaction.id },
            data: { relatedId: plan.id }
          });
        }

        return plan;
      });

      return {
        success: true,
        plan: result,
        message: `首付 ${downPaymentAmount.toFixed(2)} 学习币已支付，剩余 ${installments} 期`
      };
    } catch (error) {
      console.error('[PaymentPlan] 创建计划失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 支付当期款项
   */
  async payCurrentInstallment(planId, userId, paymentPassword) {
    try {
      // 1. 获取计划和当前待付款项
      const plan = await prisma.paymentPlan.findFirst({
        where: { id: planId, userId },
        include: {
          schedules: {
            where: { status: { in: ['pending', 'overdue'] } },
            orderBy: { installmentNo: 'asc' },
            take: 1,
          },
          payCode: true,
        },
      });

      if (!plan) {
        return { success: false, error: '付款计划不存在' };
      }

      if (plan.status === 'completed') {
        return { success: false, error: '该计划已完成' };
      }

      const currentSchedule = plan.schedules[0];
      if (!currentSchedule) {
        return { success: false, error: '没有待付款项' };
      }

      // 2. 验证支付密码
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { paymentPassword: true },
      });

      const bcrypt = require('bcryptjs');
      const defaultPassword = '123456';
      const storedPassword = user.paymentPassword || await bcrypt.hash(defaultPassword, 10);

      const isValidPassword = await bcrypt.compare(paymentPassword, storedPassword);
      if (!isValidPassword && paymentPassword !== defaultPassword) {
        return { success: false, error: '支付密码错误' };
      }

      // 3. 扣除学习币
      const amount = parseFloat(currentSchedule.amount);
      const deductResult = await walletService.deductCoins(
        userId,
        amount,
        'installment_payment',
        `分期付款 - ${plan.payCode.title} 第${currentSchedule.installmentNo}期`,
        { relatedType: 'payment_plan', relatedId: planId }
      );

      if (!deductResult.success) {
        return { success: false, error: deductResult.message || '余额不足' };
      }

      // 4. 更新付款日程状态
      const now = new Date();
      const isLate = now > new Date(currentSchedule.dueDate);

      await prisma.paymentSchedule.update({
        where: { id: currentSchedule.id },
        data: {
          status: isLate ? 'paid_late' : 'paid',
          paidAt: now,
        },
      });

      // 5. 更新付款计划
      const newPaidInstallments = plan.paidInstallments + 1;
      const newPaidAmount = parseFloat(plan.paidAmount) + amount;
      const isCompleted = newPaidInstallments >= plan.installments;

      // 获取下一期待付款日期
      let nextDueDate = plan.nextDueDate;
      if (!isCompleted) {
        const nextSchedule = await prisma.paymentSchedule.findFirst({
          where: {
            planId,
            status: 'pending',
          },
          orderBy: { installmentNo: 'asc' },
        });
        if (nextSchedule) {
          nextDueDate = nextSchedule.dueDate;
        }
      }

      const updatedPlan = await prisma.paymentPlan.update({
        where: { id: planId },
        data: {
          paidInstallments: newPaidInstallments,
          paidAmount: newPaidAmount,
          status: isCompleted ? 'completed' : 'active',
          nextDueDate,
        },
        include: {
          schedules: { orderBy: { installmentNo: 'asc' } },
          payCode: true,
        },
      });

      return {
        success: true,
        plan: updatedPlan,
        message: isCompleted ? '恭喜！付款计划已完成' : `第${currentSchedule.installmentNo}期付款成功`,
      };
    } catch (error) {
      console.error('[PaymentPlan] 支付失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 一次性还清
   */
  async payOffPlan(planId, userId, paymentPassword) {
    try {
      const plan = await prisma.paymentPlan.findFirst({
        where: { id: planId, userId },
        include: {
          schedules: {
            where: { status: { in: ['pending', 'overdue'] } },
            orderBy: { installmentNo: 'asc' },
          },
          payCode: true,
        },
      });

      if (!plan) {
        return { success: false, error: '付款计划不存在' };
      }

      if (plan.status === 'completed') {
        return { success: false, error: '该计划已完成' };
      }

      // 计算剩余金额
      const remainingAmount = parseFloat(plan.totalAmount) - parseFloat(plan.paidAmount);

      if (remainingAmount <= 0) {
        return { success: false, error: '没有待付金额' };
      }

      // 验证支付密码
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { paymentPassword: true },
      });

      const bcrypt = require('bcryptjs');
      const defaultPassword = '123456';
      const storedPassword = user.paymentPassword || await bcrypt.hash(defaultPassword, 10);

      const isValidPassword = await bcrypt.compare(paymentPassword, storedPassword);
      if (!isValidPassword && paymentPassword !== defaultPassword) {
        return { success: false, error: '支付密码错误' };
      }

      // 扣除学习币
      const deductResult = await walletService.deductCoins(
        userId,
        remainingAmount,
        'installment_payoff',
        `分期付款一次性还清 - ${plan.payCode.title}`,
        { relatedType: 'payment_plan', relatedId: planId }
      );

      if (!deductResult.success) {
        return { success: false, error: deductResult.message || '余额不足' };
      }

      // 更新所有待付款日程
      const now = new Date();
      await prisma.paymentSchedule.updateMany({
        where: {
          planId,
          status: { in: ['pending', 'overdue'] },
        },
        data: {
          status: 'paid',
          paidAt: now,
        },
      });

      // 更新付款计划
      const updatedPlan = await prisma.paymentPlan.update({
        where: { id: planId },
        data: {
          paidInstallments: plan.installments,
          paidAmount: plan.totalAmount,
          status: 'completed',
        },
        include: {
          schedules: { orderBy: { installmentNo: 'asc' } },
          payCode: true,
        },
      });

      return {
        success: true,
        plan: updatedPlan,
        message: '恭喜！付款计划已全部还清',
      };
    } catch (error) {
      console.error('[PaymentPlan] 一次性还清失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用户的付款计划列表
   */
  async getUserPlans(userId, status = null) {
    try {
      const where = { userId };
      if (status) {
        where.status = status;
      }

      const plans = await prisma.paymentPlan.findMany({
        where,
        include: {
          schedules: { orderBy: { installmentNo: 'asc' } },
          payCode: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return { success: true, plans };
    } catch (error) {
      console.error('[PaymentPlan] 获取计划列表失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取单个付款计划详情
   */
  async getPlanDetail(planId, userId) {
    try {
      const plan = await prisma.paymentPlan.findFirst({
        where: { id: planId, userId },
        include: {
          schedules: { orderBy: { installmentNo: 'asc' } },
          payCode: true,
        },
      });

      if (!plan) {
        return { success: false, error: '付款计划不存在' };
      }

      return { success: true, plan };
    } catch (error) {
      console.error('[PaymentPlan] 获取计划详情失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查并更新逾期状态（手动触发）
   */
  async checkOverdueStatus() {
    try {
      const now = new Date();

      // 1. 找出所有逾期的付款日程
      const overdueSchedules = await prisma.paymentSchedule.findMany({
        where: {
          status: 'pending',
          dueDate: { lt: now },
        },
        include: {
          plan: true,
        },
      });

      // 2. 更新日程状态
      const scheduleIds = overdueSchedules.map(s => s.id);
      if (scheduleIds.length > 0) {
        await prisma.paymentSchedule.updateMany({
          where: { id: { in: scheduleIds } },
          data: { status: 'overdue' },
        });
      }

      // 3. 更新相关计划状态
      const planIds = [...new Set(overdueSchedules.map(s => s.planId))];
      if (planIds.length > 0) {
        await prisma.paymentPlan.updateMany({
          where: { id: { in: planIds } },
          data: { status: 'overdue' },
        });
      }

      return {
        success: true,
        updatedSchedules: scheduleIds.length,
        updatedPlans: planIds.length,
      };
    } catch (error) {
      console.error('[PaymentPlan] 检查逾期状态失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 管理员获取所有付款计划
   */
  async getAllPlans(options = {}) {
    try {
      const { status, page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const where = {};
      if (status) {
        where.status = status;
      }

      const [plans, total] = await Promise.all([
        prisma.paymentPlan.findMany({
          where,
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
            schedules: { orderBy: { installmentNo: 'asc' } },
            payCode: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.paymentPlan.count({ where }),
      ]);

      return {
        success: true,
        plans,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('[PaymentPlan] 获取所有计划失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 管理员获取逾期计划列表
   */
  async getOverduePlans() {
    try {
      const plans = await prisma.paymentPlan.findMany({
        where: { status: 'overdue' },
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
          schedules: {
            where: { status: 'overdue' },
            orderBy: { installmentNo: 'asc' },
          },
          payCode: true,
        },
        orderBy: { nextDueDate: 'asc' },
      });

      return { success: true, plans };
    } catch (error) {
      console.error('[PaymentPlan] 获取逾期计划失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 管理员获取付款统计
   */
  async getStats() {
    try {
      const [
        totalPlans,
        activePlans,
        completedPlans,
        overduePlans,
        totalAmountResult,
        paidAmountResult,
      ] = await Promise.all([
        prisma.paymentPlan.count(),
        prisma.paymentPlan.count({ where: { status: 'active' } }),
        prisma.paymentPlan.count({ where: { status: 'completed' } }),
        prisma.paymentPlan.count({ where: { status: 'overdue' } }),
        prisma.paymentPlan.aggregate({ _sum: { totalAmount: true } }),
        prisma.paymentPlan.aggregate({ _sum: { paidAmount: true } }),
      ]);

      return {
        success: true,
        stats: {
          totalPlans,
          activePlans,
          completedPlans,
          overduePlans,
          totalAmount: totalAmountResult._sum.totalAmount || 0,
          paidAmount: paidAmountResult._sum.paidAmount || 0,
          overdueRate: totalPlans > 0 ? (overduePlans / totalPlans * 100).toFixed(2) : 0,
        },
      };
    } catch (error) {
      console.error('[PaymentPlan] 获取统计失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取全局分期配置
   */
  async getConfig() {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'installment_config' },
      });
      if (setting) {
        return { success: true, config: JSON.parse(setting.value) };
      }
      return {
        success: true,
        config: {
          enabled: true,
          minAmount: 100,
          downPaymentRate: 20,
          allow3Months: true,
          allow6Months: true,
          allow12Months: false,
          overduePenaltyRate: 0.5,
          interestRate: 0,
        },
      };
    } catch (error) {
      console.error('[PaymentPlan] 获取配置失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 保存全局分期配置
   */
  async saveConfig(configData) {
    try {
      const value = JSON.stringify(configData);
      await prisma.systemSetting.upsert({
        where: { key: 'installment_config' },
        create: {
          key: 'installment_config',
          value,
          type: 'json',
          description: '全局分期配置',
        },
        update: {
          value,
        },
      });
      return { success: true, message: '配置保存成功' };
    } catch (error) {
      console.error('[PaymentPlan] 保存配置失败:', error);
      return { success: false, error: error.message };
    }
  }
}

// 导出单例
const paymentPlanService = new PaymentPlanService();
module.exports = paymentPlanService;
