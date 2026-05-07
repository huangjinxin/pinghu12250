const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/auth');

router.get('/task-status', authenticate, reviewController.getTaskStatus);
router.get('/task-targets', authenticate, reviewController.getTaskTargets);
router.post('/submit', authenticate, reviewController.submitReview);
router.get('/my-reviews', authenticate, reviewController.getMyReviews);

module.exports = router;