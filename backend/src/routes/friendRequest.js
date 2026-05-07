const express = require('express');
const router = express.Router();
const friendRequestController = require('../controllers/friendRequestController');
const { authenticate } = require('../middleware/auth');

// 发送好友申请
router.post('/', authenticate, friendRequestController.sendRequest);

// 获取收到的好友申请
router.get('/received', authenticate, friendRequestController.getReceivedRequests);

// 获取发出的好友申请
router.get('/sent', authenticate, friendRequestController.getSentRequests);

// 接受好友申请
router.post('/:requestId/accept', authenticate, friendRequestController.acceptRequest);

// 拒绝好友申请
router.post('/:requestId/reject', authenticate, friendRequestController.rejectRequest);

module.exports = router;
