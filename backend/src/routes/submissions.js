const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const submissionController = require('../controllers/submissionController');

// ========== 用户端接口 ==========
router.post('/', authenticate, submissionController.createSubmission);
router.get('/my', authenticate, submissionController.getMySubmissions);
router.put('/my/:id', authenticate, submissionController.updateMySubmission);
router.delete('/my/:id', authenticate, submissionController.deleteMySubmission);

// ========== 收藏接口 ==========
router.get('/favorites', authenticate, submissionController.getMyFavorites);
router.post('/favorites', authenticate, submissionController.addFavorite);
router.post('/favorites/check', authenticate, submissionController.checkFavorites);
router.delete('/favorites/:templateId', authenticate, submissionController.removeFavorite);

// ========== 家长接口 ==========
router.get('/children', authenticate, submissionController.getChildrenSubmissions);

// ========== 管理员接口 ==========
router.get('/stats', authenticate, authorize('ADMIN'), submissionController.getSubmissionStats);
router.get('/pending/users', authenticate, authorize('ADMIN'), submissionController.getPendingUsers);
router.get('/pending', authenticate, authorize('ADMIN'), submissionController.getPendingSubmissions);
router.get('/', authenticate, authorize('ADMIN'), submissionController.getAllSubmissions);
router.post('/:id/review', authenticate, authorize('ADMIN'), submissionController.reviewSubmission);
router.delete('/admin/:id', authenticate, authorize('ADMIN'), submissionController.adminDeleteSubmission);

module.exports = router;
