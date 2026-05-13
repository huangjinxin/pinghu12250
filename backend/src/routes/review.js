const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/task-status', authenticate, reviewController.getTaskStatus);
router.get('/task-targets', authenticate, reviewController.getTaskTargets);
router.post('/submit', authenticate, reviewController.submitReview);
router.post('/skip-target', authenticate, reviewController.skipTarget);
router.get('/my-reviews', authenticate, reviewController.getMyReviews);

router.get('/admin/all-students', authenticate, authorize('TEACHER', 'ADMIN'), reviewController.adminGetAllStudents);
router.get('/admin/student/:studentId', authenticate, authorize('TEACHER', 'ADMIN'), reviewController.adminGetStudentDetail);

module.exports = router;
