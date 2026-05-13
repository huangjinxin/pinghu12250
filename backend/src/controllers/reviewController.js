const reviewService = require('../services/reviewService');

exports.getTaskStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await reviewService.getTodayTaskStatus(userId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getTaskTargets = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const targets = await reviewService.getTaskTargets(userId);
    res.json({ success: true, data: targets });
  } catch (error) {
    next(error);
  }
};

exports.submitReview = async (req, res, next) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId, dimension, score, detail } = req.body;

    if (!toUserId || !dimension || score == null) {
      return res.status(400).json({ error: '参数不完整' });
    }

    const review = await reviewService.submitReview(fromUserId, toUserId, dimension, score, detail);
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

exports.skipTarget = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const newTarget = await reviewService.skipTarget(userId);
    res.json({ success: true, data: newTarget });
  } catch (error) {
    next(error);
  }
};

exports.getMyReviews = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const result = await reviewService.getMyReviews(userId, limit, offset);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.adminGetAllStudents = async (req, res, next) => {
  try {
    const { status, schoolId, classId, page, limit } = req.query;
    const result = await reviewService.getAllStudentReviews({
      status, schoolId, classId,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 24
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.adminGetStudentDetail = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const result = await reviewService.getStudentReviewDetail(studentId, limit, offset);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
