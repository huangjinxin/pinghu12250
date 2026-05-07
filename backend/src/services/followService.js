/**
 * 好友关注服务
 * 管理用户关注、好友关系、推荐算法
 */

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

class FollowService {
  /**
   * 关注用户
   * @param {string} followerId - 关注者ID
   * @param {string} followingId - 被关注者ID
   * @returns {Promise<{success: boolean, isFriend?: boolean, error?: string}>}
   */
  async follow(followerId, followingId) {
    try {
      // 1. 防刷检查
      if (followerId === followingId) {
        return { success: false, error: '不能关注自己' };
      }

      // 2. 检查是否已关注
      const existing = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      if (existing) {
        return { success: false, error: '已经关注过了' };
      }

      // 3. 检查每日关注上限（可选实现）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayFollowCount = await prisma.userFollow.count({
        where: {
          followerId,
          createdAt: {
            gte: today,
          },
        },
      });

      if (todayFollowCount >= 100) {
        return { success: false, error: '今日关注次数已达上限（100次）' };
      }

      // 4. 创建关注关系
      await prisma.userFollow.create({
        data: {
          followerId,
          followingId,
        },
      });

      // 5. 更新统计数
      await prisma.$transaction([
        // 关注者的 followingCount +1
        prisma.user.update({
          where: { id: followerId },
          data: { followingCount: { increment: 1 } },
        }),
        // 被关注者的 followersCount +1
        prisma.user.update({
          where: { id: followingId },
          data: { followersCount: { increment: 1 } },
        }),
      ]);

      // 6. 检查是否互相关注，是则创建好友关系
      const isMutual = await this.checkMutualFollow(followerId, followingId);
      let isFriend = false;

      if (isMutual) {
        await this.createFriendship(followerId, followingId);
        isFriend = true;
      }

      console.log(`✅ ${followerId} 关注了 ${followingId}${isFriend ? '，成为好友' : ''}`);

      return {
        success: true,
        isFriend,
      };
    } catch (error) {
      console.error('关注用户失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 取消关注
   * @param {string} followerId - 关注者ID
   * @param {string} followingId - 被关注者ID
   * @returns {Promise<{success: boolean, wasFriend?: boolean, error?: string}>}
   */
  async unfollow(followerId, followingId) {
    try {
      // 1. 检查是否已关注
      const existing = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      if (!existing) {
        return { success: false, error: '未关注该用户' };
      }

      // 2. 检查是否是好友
      const friendship = await this.getFriendship(followerId, followingId);
      const wasFriend = !!friendship;

      // 3. 删除关注关系
      await prisma.userFollow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });

      // 4. 更新统计数
      const updates = [
        // 关注者的 followingCount -1
        prisma.user.update({
          where: { id: followerId },
          data: { followingCount: { decrement: 1 } },
        }),
        // 被关注者的 followersCount -1
        prisma.user.update({
          where: { id: followingId },
          data: { followersCount: { decrement: 1 } },
        }),
      ];

      // 5. 如果之前是好友，删除好友关系并更新好友计数
      if (wasFriend && friendship) {
        updates.push(
          prisma.friendship.delete({
            where: { id: friendship.id },
          }),
          prisma.user.update({
            where: { id: followerId },
            data: { friendsCount: { decrement: 1 } },
          }),
          prisma.user.update({
            where: { id: followingId },
            data: { friendsCount: { decrement: 1 } },
          })
        );
      }

      await prisma.$transaction(updates);

      console.log(`❌ ${followerId} 取消关注 ${followingId}${wasFriend ? '，解除好友关系' : ''}`);

      return {
        success: true,
        wasFriend,
      };
    } catch (error) {
      console.error('取消关注失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查是否互相关注
   * @param {string} userId1 - 用户1
   * @param {string} userId2 - 用户2
   * @returns {Promise<boolean>}
   */
  async checkMutualFollow(userId1, userId2) {
    try {
      // 检查 userId1 是否关注 userId2
      const follow1 = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId1,
            followingId: userId2,
          },
        },
      });

      // 检查 userId2 是否关注 userId1
      const follow2 = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId2,
            followingId: userId1,
          },
        },
      });

      return !!follow1 && !!follow2;
    } catch (error) {
      console.error('检查互相关注失败:', error);
      return false;
    }
  }

  /**
   * 创建好友关系
   * @param {string} userId1 - 用户1
   * @param {string} userId2 - 用户2
   * @returns {Promise<void>}
   */
  async createFriendship(userId1, userId2) {
    try {
      // 确保 userId1 < userId2 (按字典序排序)
      const [smallerId, biggerId] = [userId1, userId2].sort();

      // 检查是否已经是好友
      const existing = await prisma.friendship.findUnique({
        where: {
          userId1_userId2: {
            userId1: smallerId,
            userId2: biggerId,
          },
        },
      });

      if (existing) {
        return; // 已经是好友，不重复创建
      }

      // 创建好友关系
      await prisma.friendship.create({
        data: {
          userId1: smallerId,
          userId2: biggerId,
        },
      });

      // 更新双方的好友计数
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId1 },
          data: { friendsCount: { increment: 1 } },
        }),
        prisma.user.update({
          where: { id: userId2 },
          data: { friendsCount: { increment: 1 } },
        }),
      ]);

      console.log(`🤝 ${userId1} 和 ${userId2} 成为好友`);
    } catch (error) {
      console.error('创建好友关系失败:', error);
    }
  }

  /**
   * 获取好友关系记录
   * @param {string} userId1 - 用户1
   * @param {string} userId2 - 用户2
   * @returns {Promise<Object|null>}
   */
  async getFriendship(userId1, userId2) {
    try {
      const [smallerId, biggerId] = [userId1, userId2].sort();

      const friendship = await prisma.friendship.findUnique({
        where: {
          userId1_userId2: {
            userId1: smallerId,
            userId2: biggerId,
          },
        },
      });

      return friendship;
    } catch (error) {
      console.error('获取好友关系失败:', error);
      return null;
    }
  }

  /**
   * 获取关系状态
   * @param {string} currentUserId - 当前用户ID
   * @param {string} targetUserId - 目标用户ID
   * @returns {Promise<{isFollowing: boolean, isFollower: boolean, isFriend: boolean}>}
   */
  async getRelationshipStatus(currentUserId, targetUserId) {
    try {
      // 检查我是否关注了对方
      const isFollowing = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUserId,
          },
        },
      });

      // 检查对方是否关注了我
      const isFollower = await prisma.userFollow.findUnique({
        where: {
          followerId_followingId: {
            followerId: targetUserId,
            followingId: currentUserId,
          },
        },
      });

      // 检查是否是好友
      const friendship = await this.getFriendship(currentUserId, targetUserId);

      return {
        isFollowing: !!isFollowing,
        isFollower: !!isFollower,
        isFriend: !!friendship,
      };
    } catch (error) {
      console.error('获取关系状态失败:', error);
      return {
        isFollowing: false,
        isFollower: false,
        isFriend: false,
      };
    }
  }

  /**
   * 解除好友关系
   * @param {string} currentUserId - 当前用户ID
   * @param {string} targetUserId - 目标用户ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async unfriend(currentUserId, targetUserId) {
    try {
      if (!targetUserId) {
        return { success: false, error: '目标用户ID不能为空' };
      }

      if (currentUserId === targetUserId) {
        return { success: false, error: '不能解除自己与自己的好友关系' };
      }

      const friendship = await this.getFriendship(currentUserId, targetUserId);
      if (!friendship) {
        return { success: false, error: '当前不是好友关系' };
      }

      await prisma.$transaction([
        prisma.friendship.delete({
          where: { id: friendship.id }
        }),
        prisma.user.update({
          where: { id: currentUserId },
          data: { friendsCount: { decrement: 1 } }
        }),
        prisma.user.update({
          where: { id: targetUserId },
          data: { friendsCount: { decrement: 1 } }
        })
      ]);

      return {
        success: true,
        data: {
          targetUserId,
          relationStatus: 'none',
          isFriend: false,
          canMessage: false,
          conversationDeleted: true,
          historyDeleted: true
        }
      };
    } catch (error) {
      console.error('解除好友关系失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取关注列表
   * @param {string} userId - 用户ID
   * @param {object} options - 选项 {page, limit}
   * @returns {Promise<{users: array, total: number}>}
   */
  async getFollowing(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const [follows, total] = await Promise.all([
        prisma.userFollow.findMany({
          where: { followerId: userId },
          include: {
            following: {
              select: {
                id: true,
                username: true,
                avatar: true,
                role: true,
                followersCount: true,
                followingCount: true,
                friendsCount: true,
                profile: {
                  select: {
                    nickname: true,
                    bio: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.userFollow.count({ where: { followerId: userId } }),
      ]);

      return {
        users: follows.map(f => f.following),
        total,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('获取关注列表失败:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * 获取粉丝列表
   * @param {string} userId - 用户ID
   * @param {object} options - 选项 {page, limit}
   * @returns {Promise<{users: array, total: number}>}
   */
  async getFollowers(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      const [follows, total] = await Promise.all([
        prisma.userFollow.findMany({
          where: { followingId: userId },
          include: {
            follower: {
              select: {
                id: true,
                username: true,
                avatar: true,
                role: true,
                followersCount: true,
                followingCount: true,
                friendsCount: true,
                profile: {
                  select: {
                    nickname: true,
                    bio: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.userFollow.count({ where: { followingId: userId } }),
      ]);

      return {
        users: follows.map(f => f.follower),
        total,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('获取粉丝列表失败:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * 获取好友列表
   * @param {string} userId - 用户ID
   * @param {object} options - 选项 {page, limit}
   * @returns {Promise<{users: array, total: number}>}
   */
  async getFriends(userId, options = {}) {
    try {
      const { page = 1, limit = 20 } = options;
      const skip = (page - 1) * limit;

      // 查询好友关系（用户可能在 userId1 或 userId2 位置）
      const [friendships, total] = await Promise.all([
        prisma.friendship.findMany({
          where: {
            OR: [
              { userId1: userId },
              { userId2: userId },
            ],
          },
          include: {
            user1: {
              select: {
                id: true,
                username: true,
                avatar: true,
                role: true,
                followersCount: true,
                followingCount: true,
                friendsCount: true,
                profile: {
                  select: {
                    nickname: true,
                    bio: true,
                  },
                },
              },
            },
            user2: {
              select: {
                id: true,
                username: true,
                avatar: true,
                role: true,
                followersCount: true,
                followingCount: true,
                friendsCount: true,
                profile: {
                  select: {
                    nickname: true,
                    bio: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.friendship.count({
          where: {
            OR: [
              { userId1: userId },
              { userId2: userId },
            ],
          },
        }),
      ]);

      // 提取好友用户（排除自己）
      const users = friendships.map(friendship => {
        const friend = friendship.userId1 === userId ? friendship.user2 : friendship.user1;
        return {
          id: friend.id,
          username: friend.username,
          nickname: friend.profile?.nickname,
          avatar: friend.avatar,
          role: friend.role,
          followersCount: friend.followersCount,
          followingCount: friend.followingCount,
          friendsCount: friend.friendsCount,
          bio: friend.profile?.bio
        };
      });

      return {
        users,
        total,
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('获取好友列表失败:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * 获取推荐关注
   * @param {string} userId - 当前用户ID
   * @param {number} limit - 推荐数量
   * @returns {Promise<array>}
   */
  async getRecommendations(userId, limit = 10) {
    try {
      const recommendations = [];

      // 获取当前用户信息
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { classId: true },
      });

      // 获取已关注的用户ID列表
      const followingIds = await prisma.userFollow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingIdSet = new Set(followingIds.map(f => f.followingId));
      followingIdSet.add(userId); // 排除自己

      // 1. 优先级1：同班级同学
      if (currentUser.classId && recommendations.length < limit) {
        const classmates = await prisma.user.findMany({
          where: {
            classId: currentUser.classId,
            id: { notIn: Array.from(followingIdSet) },
          },
          select: {
            id: true,
            username: true,
            avatar: true,
            role: true,
            followersCount: true,
            followingCount: true,
            friendsCount: true,
            profile: {
              select: {
                nickname: true,
                bio: true,
              },
            },
          },
          take: limit - recommendations.length,
        });
        recommendations.push(...classmates.map(u => ({ ...u, reason: '同班同学' })));
      }

      // 2. 优先级2：共同关注（我关注的人也关注的人）
      if (recommendations.length < limit) {
        const commonFollows = await prisma.$queryRaw`
          SELECT u.id, u.username, u.avatar, u.role,
                 u.followers_count as "followersCount",
                 u.following_count as "followingCount",
                 u.friends_count as "friendsCount",
                 COUNT(*) as common_count
          FROM user_follows uf1
          JOIN user_follows uf2 ON uf1.following_id = uf2.follower_id
          JOIN users u ON uf2.following_id = u.id
          WHERE uf1.follower_id = ${userId}
            AND uf2.following_id != ${userId}
            AND uf2.following_id NOT IN (
              SELECT following_id FROM user_follows WHERE follower_id = ${userId}
            )
          GROUP BY u.id, u.username, u.avatar, u.role, u.followers_count, u.following_count, u.friends_count
          ORDER BY common_count DESC
          LIMIT ${limit - recommendations.length}
        `;

        for (const user of commonFollows) {
          if (!followingIdSet.has(user.id) && recommendations.length < limit) {
            const profile = await prisma.profile.findUnique({
              where: { userId: user.id },
              select: { nickname: true, bio: true },
            });
            recommendations.push({ ...user, profile, reason: '共同关注' });
            followingIdSet.add(user.id);
          }
        }
      }

      // 3. 优先级3：活跃用户（本周发布内容多）
      if (recommendations.length < limit) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const activeUsers = await prisma.dynamic.groupBy({
          by: ['authorId'],
          where: {
            createdAt: { gte: oneWeekAgo },
            authorId: { notIn: Array.from(followingIdSet) },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: limit - recommendations.length,
        });

        const activeUserIds = activeUsers.map(u => u.authorId);
        if (activeUserIds.length > 0) {
          const users = await prisma.user.findMany({
            where: { id: { in: activeUserIds } },
            select: {
              id: true,
              username: true,
              avatar: true,
              role: true,
              followersCount: true,
              followingCount: true,
              friendsCount: true,
              profile: {
                select: {
                  nickname: true,
                  bio: true,
                },
              },
            },
          });
          recommendations.push(...users.map(u => ({ ...u, reason: '活跃用户' })));
        }
      }

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error('获取推荐失败:', error);
      return [];
    }
  }
}

// 导出单例
const followService = new FollowService();
module.exports = followService;
