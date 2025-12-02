/**
 * 好友关注系统路由
 */

const express = require('express');
const router = express.Router();
const followService = require('../services/followService');
const achievementService = require('../services/achievementService');
const { sendFollowNotification, sendFriendNotification } = require('../services/notificationService');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// ========== 关注操作 ==========

/**
 * POST /api/follows/:userId
 * 关注用户
 */
router.post('/:userId', authenticate, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    const result = await followService.follow(followerId, followingId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // 获取关注者信息
    const follower = await prisma.user.findUnique({
      where: { id: followerId },
      select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } }
    });

    // 发送通知给被关注者
    try {
      if (result.isFriend) {
        // 发送好友通知给双方
        await sendFriendNotification(followingId, follower);
        await sendFriendNotification(followerId, result.followingUser || { id: followingId, username: 'User' });
      } else {
        // 发送关注通知给被关注者
        await sendFollowNotification(followingId, follower);
      }
    } catch (notifError) {
      console.error('发送关注通知失败:', notifError);
    }

    // 检查成就
    try {
      achievementService.checkAchievements(followingId, 'follower_gained', {});
    } catch (error) {
      console.error('检查成就失败:', error);
    }

    res.json({
      success: true,
      message: result.isFriend ? '关注成功，已成为好友' : '关注成功',
      isFriend: result.isFriend,
    });
  } catch (error) {
    console.error('关注用户失败:', error);
    res.status(500).json({ error: '关注失败' });
  }
});

/**
 * DELETE /api/follows/:userId
 * 取消关注
 */
router.delete('/:userId', authenticate, async (req, res) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;

    const result = await followService.unfollow(followerId, followingId);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success: true,
      message: result.wasFriend ? '取消关注成功，已解除好友关系' : '取消关注成功',
      wasFriend: result.wasFriend,
    });
  } catch (error) {
    console.error('取消关注失败:', error);
    res.status(500).json({ error: '取消关注失败' });
  }
});

// ========== 查询接口 ==========

/**
 * GET /api/follows/following
 * 查询某用户关注的人
 * Query参数：userId（可选，不传则查询当前用户）, page, limit
 */
router.get('/following', authenticate, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await followService.getFollowing(userId, { page, limit });

    res.json(result);
  } catch (error) {
    console.error('获取关注列表失败:', error);
    res.status(500).json({ error: '获取关注列表失败' });
  }
});

/**
 * GET /api/follows/followers
 * 查询某用户的粉丝
 * Query参数：userId（可选，不传则查询当前用户）, page, limit
 */
router.get('/followers', authenticate, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await followService.getFollowers(userId, { page, limit });

    res.json(result);
  } catch (error) {
    console.error('获取粉丝列表失败:', error);
    res.status(500).json({ error: '获取粉丝列表失败' });
  }
});

/**
 * GET /api/follows/friends
 * 查询某用户的好友
 * Query参数：userId（可选，不传则查询当前用户）, page, limit
 */
router.get('/friends', authenticate, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await followService.getFriends(userId, { page, limit });

    res.json(result);
  } catch (error) {
    console.error('获取好友列表失败:', error);
    res.status(500).json({ error: '获取好友列表失败' });
  }
});

/**
 * GET /api/follows/status/:userId
 * 查询我与某用户的关系状态
 */
router.get('/status/:userId', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.userId;

    const status = await followService.getRelationshipStatus(
      currentUserId,
      targetUserId
    );

    res.json(status);
  } catch (error) {
    console.error('获取关系状态失败:', error);
    res.status(500).json({ error: '获取关系状态失败' });
  }
});

/**
 * GET /api/follows/recommendations
 * 获取推荐关注或搜索用户
 * Query参数：limit（默认10），search（搜索关键词）
 */
router.get('/recommendations', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;

    // 如果有搜索关键词，执行搜索
    if (search && search.trim()) {
      const users = await prisma.user.findMany({
        where: {
          AND: [
            { id: { not: req.user.id } }, // 排除自己
            { status: 'ACTIVE' }, // 只搜索激活用户
            {
              OR: [
                { username: { contains: search.trim(), mode: 'insensitive' } },
                { profile: { nickname: { contains: search.trim(), mode: 'insensitive' } } }
              ]
            }
          ]
        },
        take: limit,
        select: {
          id: true,
          username: true,
          avatar: true,
          status: true,
          followersCount: true,
          followingCount: true,
          profile: {
            select: {
              nickname: true,
              bio: true
            }
          }
        }
      });

      // 获取每个用户的关注状态
      const usersWithStatus = await Promise.all(users.map(async (user) => {
        const status = await followService.getRelationshipStatus(req.user.id, user.id);
        return {
          ...user,
          followStatus: status.isFriend ? 'friend' : status.isFollowing ? 'following' : status.isFollowedBy ? 'follower' : 'none'
        };
      }));

      return res.json({ users: usersWithStatus, total: usersWithStatus.length });
    }

    // 没有搜索关键词，返回推荐
    const recommendations = await followService.getRecommendations(
      req.user.id,
      limit
    );

    res.json({
      users: recommendations,
      total: recommendations.length
    });
  } catch (error) {
    console.error('获取推荐失败:', error);
    res.status(500).json({ error: '获取推荐失败' });
  }
});

/**
 * GET /api/follows/stats/:userId
 * 获取用户的关注统计
 */
router.get('/stats/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await require('@prisma/client').PrismaClient.prototype.user.findUnique({
      where: { id: userId },
      select: {
        followersCount: true,
        followingCount: true,
        friendsCount: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
});

module.exports = router;
