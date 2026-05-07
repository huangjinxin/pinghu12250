const express = require('express');
const router = express.Router();
const delegatedReviewController = require('../controllers/delegatedReviewController');
const { authenticate } = require('../middleware/auth');

// 所有接口均需要登录
router.use(authenticate);

// 获取待我审核的代办任务
router.get('/pending', delegatedReviewController.getPendingReviews);

// 小老师进行审核
router.post('/:id/review', delegatedReviewController.reviewSubmission);

module.exports = router;
