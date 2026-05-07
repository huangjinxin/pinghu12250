/**
 * 付款计划路由
 */

const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const paymentPlanService = require('../services/paymentPlanService');

// ========== 用户接口 ==========

/**
 * GET /api/payment-plans
 * 获取我的付款计划列表
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    const result = await paymentPlanService.getUserPlans(req.user.id, status);
    res.json(result);
  } catch (error) {
    console.error('获取付款计划列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/payment-plans/:id
 * 获取付款计划详情
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await paymentPlanService.getPlanDetail(req.params.id, req.user.id);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error('获取付款计划详情失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/payment-plans
 * 创建分期付款计划
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { payCodeId, installments, downPaymentRate, paymentPassword } = req.body;

    if (!payCodeId || !installments) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    if (!paymentPassword) {
      return res.status(400).json({ success: false, error: '请输入支付密码' });
    }

    const result = await paymentPlanService.createPlan(
      req.user.id,
      payCodeId,
      parseInt(installments),
      parseInt(downPaymentRate) || 30,
      paymentPassword
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('创建付款计划失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/payment-plans/:id/pay
 * 支付当期款项
 */
router.post('/:id/pay', authenticate, async (req, res) => {
  try {
    const { paymentPassword } = req.body;

    if (!paymentPassword) {
      return res.status(400).json({ success: false, error: '请输入支付密码' });
    }

    const result = await paymentPlanService.payCurrentInstallment(
      req.params.id,
      req.user.id,
      paymentPassword
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('支付当期款项失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/payment-plans/:id/pay-all
 * 一次性还清
 */
router.post('/:id/pay-all', authenticate, async (req, res) => {
  try {
    const { paymentPassword } = req.body;

    if (!paymentPassword) {
      return res.status(400).json({ success: false, error: '请输入支付密码' });
    }

    const result = await paymentPlanService.payOffPlan(
      req.params.id,
      req.user.id,
      paymentPassword
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('一次性还清失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 管理员接口 ==========

/**
 * GET /api/admin/payment-plans/config
 * 管理员获取分期配置
 */
router.get('/admin/config', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await paymentPlanService.getConfig();
    res.json(result);
  } catch (error) {
    console.error('获取分期配置失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/payment-plans/config
 * 管理员保存分期配置
 */
router.post('/admin/config', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await paymentPlanService.saveConfig(req.body);
    res.json(result);
  } catch (error) {
    console.error('保存分期配置失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/payment-plans
 * 管理员获取所有付款计划
 */
router.get('/admin/all', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await paymentPlanService.getAllPlans({
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    });
    res.json(result);
  } catch (error) {
    console.error('获取所有付款计划失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/payment-plans/overdue
 * 管理员获取逾期计划列表
 */
router.get('/admin/overdue', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await paymentPlanService.getOverduePlans();
    res.json(result);
  } catch (error) {
    console.error('获取逾期计划失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/payment-plans/stats
 * 管理员获取付款统计
 */
router.get('/admin/stats', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await paymentPlanService.getStats();
    res.json(result);
  } catch (error) {
    console.error('获取付款统计失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/admin/payment-plans/check-overdue
 * 管理员手动触发逾期检查
 */
router.post('/admin/check-overdue', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await paymentPlanService.checkOverdueStatus();
    res.json(result);
  } catch (error) {
    console.error('检查逾期状态失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
