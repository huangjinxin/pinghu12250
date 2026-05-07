const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const submissionController = require('../controllers/submissionController');

// ========== 用户端接口 ==========
router.post('/', authenticate, submissionController.createSubmission);
router.get('/my', authenticate, submissionController.getMySubmissions);
router.get('/my/today-status', authenticate, submissionController.getTodayStatus);
router.get('/my/dashboard-stats', authenticate, submissionController.getMyDashboardStats);
router.get('/my/full-stats', authenticate, submissionController.getMyFullDashboardStats);
router.put('/my/:id', authenticate, submissionController.updateMySubmission);
router.delete('/my/:id', authenticate, submissionController.deleteMySubmission);

// ========== 收藏接口 ==========
router.get('/favorites', authenticate, submissionController.getMyFavorites);
router.post('/favorites', authenticate, submissionController.addFavorite);
router.post('/favorites/check', authenticate, submissionController.checkFavorites);
router.delete('/favorites/:templateId', authenticate, submissionController.removeFavorite);

// ========== 家长接口 ==========
router.get('/children', authenticate, submissionController.getChildrenSubmissions);
router.get('/child/:childId/today-status', authenticate, submissionController.getChildTodayStatus);
router.get('/child/:childId/full-stats', authenticate, submissionController.getChildFullDashboardStats);
router.get('/parent/pending', authenticate, submissionController.getParentPendingSubmissions);
router.post('/:id/parent-review', authenticate, submissionController.parentReviewSubmission);

// ========== 每日挑战奖励接口 ==========
router.get('/challenge-config', authenticate, submissionController.getChallengeConfig);
router.get('/daily-reward/status', authenticate, submissionController.getDailyRewardStatus);
router.post('/daily-reward/claim', authenticate, submissionController.claimDailyReward);

// ========== 管理员接口 ==========
router.put('/challenge-config', authenticate, authorize('ADMIN'), submissionController.updateChallengeConfig);
router.get('/stats', authenticate, authorize('ADMIN'), submissionController.getSubmissionStats);
router.get('/pending/users', authenticate, authorize('ADMIN'), submissionController.getPendingUsers);
router.get('/pending', authenticate, authorize('ADMIN'), submissionController.getPendingSubmissions);
router.get('/', authenticate, authorize('ADMIN'), submissionController.getAllSubmissions);
router.post('/:id/review', authenticate, authorize('ADMIN'), submissionController.reviewSubmission);
router.delete('/admin/:id', authenticate, authorize('ADMIN'), submissionController.adminDeleteSubmission);

module.exports = router;
