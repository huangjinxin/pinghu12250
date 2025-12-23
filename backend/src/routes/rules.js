const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const ruleController = require('../controllers/ruleController');

// ========== 技术类型管理 ==========
router.get('/types', authenticate, ruleController.getRuleTypes);
router.post('/types', authenticate, authorize('ADMIN'), ruleController.createRuleType);
router.put('/types/:id', authenticate, authorize('ADMIN'), ruleController.updateRuleType);
router.delete('/types/:id', authenticate, authorize('ADMIN'), ruleController.deleteRuleType);

// ========== 展示标准管理 ==========
router.get('/standards', authenticate, ruleController.getRuleStandards);
router.post('/standards', authenticate, authorize('ADMIN'), ruleController.createRuleStandard);
router.put('/standards/:id', authenticate, authorize('ADMIN'), ruleController.updateRuleStandard);
router.delete('/standards/:id', authenticate, authorize('ADMIN'), ruleController.deleteRuleStandard);

// ========== 规则模板管理 ==========
router.get('/templates', authenticate, ruleController.getRuleTemplates);
router.get('/templates/active', authenticate, ruleController.getActiveTemplates);
router.get('/templates/:id', authenticate, ruleController.getRuleTemplate);
router.post('/templates', authenticate, authorize('ADMIN'), ruleController.createRuleTemplate);
router.put('/templates/:id', authenticate, authorize('ADMIN'), ruleController.updateRuleTemplate);
router.delete('/templates/:id', authenticate, authorize('ADMIN'), ruleController.deleteRuleTemplate);
router.patch('/templates/:id/status', authenticate, authorize('ADMIN'), ruleController.toggleRuleStatus);

module.exports = router;
