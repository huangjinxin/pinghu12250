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
    const { toUserId, content, tags, scores, category } = req.body;

    if (!toUserId || !content) {
      return res.status(400).json({ error: '参数不完整' });
    }

    const review = await reviewService.submitReview(fromUserId, toUserId, content, tags, scores, category);
    res.json({ success: true, data: review });
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