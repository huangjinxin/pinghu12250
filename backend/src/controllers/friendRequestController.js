/**
 * 好友申请控制器
 */

const prisma = require('../lib/prisma');

/**
 * 发送好友申请
 */
exports.sendRequest = async (req, res, next) => {
  try {
    const fromUserId = req.user.id;
    const { toUserId, message } = req.body;

    if (!toUserId) {
      return res.status(400).json({ error: '接收者ID不能为空' });
    }

    if (fromUserId === toUserId) {
      return res.status(400).json({ error: '不能向自己发送好友申请' });
    }

    // 检查是否已是好友
    const [smallerId, biggerId] = [fromUserId, toUserId].sort();
    const friendship = await prisma.friendship.findUnique({
      where: { userId1_userId2: { userId1: smallerId, userId2: biggerId } }
    });

    if (friendship) {
      return res.status(400).json({ error: '已经是好友了' });
    }

    // 检查是否有待处理的申请
    const existingRequest = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { fromUserId, toUserId, status: 'PENDING' },
          { fromUserId: toUserId, toUserId: fromUserId, status: 'PENDING' }
        ]
      }
    });

    if (existingRequest) {
      return res.status(400).json({ error: '已有待处理的好友申请' });
    }

    // 创建好友申请（30天后过期）
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 30);

    // 检查接收者是否开启自动通过
    const toUser = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { autoAcceptFriend: true }
    });

    if (toUser?.autoAcceptFriend) {
      // 自动通过：直接创建好友关系
      const [smallerId, biggerId] = [fromUserId, toUserId].sort();

      const result = await prisma.$transaction(async (tx) => {
        const request = await tx.friendRequest.create({
          data: { fromUserId, toUserId, message, expiredAt, status: 'ACCEPTED' }
        });

        const friendship = await tx.friendship.create({
          data: { userId1: smallerId, userId2: biggerId, sourceRequestId: request.id }
        });

        await tx.conversation.create({
          data: { friendshipId: friendship.id }
        });

        await tx.user.update({
          where: { id: fromUserId },
          data: { friendsCount: { increment: 1 } }
        });
        await tx.user.update({
          where: { id: toUserId },
          data: { friendsCount: { increment: 1 } }
        });

        return request;
      });

      return res.json({
        success: true,
        data: { id: result.id, status: 'ACCEPTED', autoAccepted: true }
      });
    }

    const request = await prisma.friendRequest.create({
      data: {
        fromUserId,
        toUserId,
        message,
        expiredAt,
        status: 'PENDING'
      }
    });

    res.json({
      success: true,
      data: {
        id: request.id,
        status: request.status,
        expiredAt: request.expiredAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取收到的好友申请
 */
exports.getReceivedRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      prisma.friendRequest.findMany({
        where: {
          toUserId: userId,
          status: 'PENDING',
          expiredAt: { gt: new Date() }
        },
        include: {
          fromUser: {
            select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.friendRequest.count({
        where: {
          toUserId: userId,
          status: 'PENDING',
          expiredAt: { gt: new Date() }
        }
      })
    ]);

    res.json({ success: true, data: requests, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取发出的好友申请
 */
exports.getSentRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      prisma.friendRequest.findMany({
        where: { fromUserId: userId },
        include: {
          toUser: {
            select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.friendRequest.count({ where: { fromUserId: userId } })
    ]);

    res.json({ success: true, data: requests, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    next(error);
  }
};

/**
 * 接受好友申请
 */
exports.acceptRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return res.status(404).json({ error: '好友申请不存在' });
    }

    if (request.toUserId !== userId) {
      return res.status(403).json({ error: '无权操作此申请' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: '申请已处理' });
    }

    if (request.expiredAt < new Date()) {
      return res.status(400).json({ error: '申请已过期' });
    }

    // 创建好友关系和会话
    const [smallerId, biggerId] = [request.fromUserId, request.toUserId].sort();

    const result = await prisma.$transaction(async (tx) => {
      // 更新申请状态
      await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' }
      });

      // 创建好友关系
      const friendship = await tx.friendship.create({
        data: {
          userId1: smallerId,
          userId2: biggerId,
          sourceRequestId: requestId
        }
      });

      // 创建会话
      const conversation = await tx.conversation.create({
        data: { friendshipId: friendship.id }
      });

      // 更新好友计数
      await tx.user.update({
        where: { id: request.fromUserId },
        data: { friendsCount: { increment: 1 } }
      });
      await tx.user.update({
        where: { id: request.toUserId },
        data: { friendsCount: { increment: 1 } }
      });

      return { friendship, conversation };
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * 拒绝好友申请
 */
exports.rejectRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = await prisma.friendRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return res.status(404).json({ error: '好友申请不存在' });
    }

    if (request.toUserId !== userId) {
      return res.status(403).json({ error: '无权操作此申请' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: '申请已处理' });
    }

    await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
