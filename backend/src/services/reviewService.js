const prisma = require('../lib/prisma');
const creditService = require('./creditService');

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function isValidChineseContent(content) {
  const chineseCharCount = (content.match(/[\u4e00-\u9fa5]/g) || []).length;
  return chineseCharCount >= 8;
}

function detectAbuse(content) {
  if (!content || content.trim().length < 8) return true;
  const charSet = new Set(content);
  if (charSet.size < 3 && content.length > 20) return true;
  const repeated = content.match(/(.)\1{5,}/g);
  if (repeated && repeated.join('').length > content.length * 0.5) return true;
  return false;
}

async function getRandomTargets(currentUserId, excludeIds = [], limit = 2) {
  const recentReviews = await prisma.peerReview.findMany({
    where: {
      fromUserId: currentUserId,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    select: { toUserId: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  const recentToIds = recentReviews.map(r => r.toUserId);

  const baseWhere = {
    id: { not: currentUserId, notIn: [...excludeIds, ...recentToIds] },
    status: 'ACTIVE',
    role: 'STUDENT'
  };

  let candidates = await prisma.user.findMany({
    where: baseWhere,
    select: { id: true, _count: { select: { PeerReview_PeerReview_toUserIdToUser: true } } },
    take: 50
  });

  if (candidates.length < limit) {
    const fallback = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        status: 'ACTIVE',
        role: 'STUDENT'
      },
      select: { id: true, _count: { select: { PeerReview_PeerReview_toUserIdToUser: true } } },
      take: 20
    });
    candidates = [...candidates, ...fallback];
  }

  // Deduplicate
  const uniqueCandidates = [];
  const seen = new Set();
  for (const c of candidates) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      uniqueCandidates.push(c);
    }
  }

  // Sort by PeerReview_PeerReview_toUserIdToUser ascending, then randomly
  uniqueCandidates.sort((a, b) => {
    if (a._count.PeerReview_PeerReview_toUserIdToUser !== b._count.PeerReview_PeerReview_toUserIdToUser) {
      return a._count.PeerReview_PeerReview_toUserIdToUser - b._count.PeerReview_PeerReview_toUserIdToUser;
    }
    return Math.random() - 0.5;
  });

  return uniqueCandidates.slice(0, limit).map(u => u.id);
}

async function getOrCreateDailyTask(userId) {
  const today = getTodayStr();
  console.log('[ReviewService] getOrCreateDailyTask for user:', userId, 'date:', today);
  
  let task = await prisma.dailyReviewTask.findUnique({
    where: {
      userId_date_taskType: {
        userId,
        date: today,
        taskType: 'daily_task'
      }
    }
  });

  if (!task) {
    console.log('[ReviewService] No task found, creating new one');
    const targets = await getRandomTargets(userId, [], 2);
    console.log('[ReviewService] Got random targets:', targets);
    
    if (targets.length === 0) {
      console.log('[ReviewService] No random targets, falling back to all students');
      const users = await prisma.user.findMany({
        where: { id: { not: userId }, status: 'ACTIVE', role: 'STUDENT' },
        select: { id: true },
        take: 2
      });
      targets.push(...users.map(u => u.id));
      console.log('[ReviewService] Fallback targets:', targets);
    }
    
    if (targets.length > 0) {
      task = await prisma.dailyReviewTask.create({
        data: {
          userId,
          date: today,
          taskType: 'daily_task',
          status: 'pending',
          targetUserIds: targets,
          completedCount: 0
        }
      });
      console.log('[ReviewService] Created task:', task.id);
    }
  } else {
    console.log('[ReviewService] Found existing task:', task.id, 'targets:', task.targetUserIds);
  }

  if (!task) {
    throw new Error('无法为该用户分配评价任务（可能系统中没有其他活跃学生）');
  }

  return task;
}

async function getTodayTaskStatus(userId) {
  const task = await getOrCreateDailyTask(userId);
  const isCompleted = task.completedCount >= 2;
  return {
    hasTask: true,
    isCompleted,
    completedCount: task.completedCount,
    targetCount: 2,
    targetUsers: task.targetUserIds,
    status: task.status
  };
}

async function getTaskTargets(userId) {
  const task = await getOrCreateDailyTask(userId);
  if (task.completedCount >= 2) return [];

  const submittedToday = await prisma.peerReview.findMany({
    where: {
      fromUserId: userId,
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    },
    select: { toUserId: true }
  });
  const submittedIds = submittedToday.map(r => r.toUserId);

  const targets = await prisma.user.findMany({
    where: { id: { in: task.targetUserIds, notIn: submittedIds } },
    select: { id: true, username: true, avatar: true }
  });

  return targets;
}

async function submitReview(fromUserId, toUserId, content, tags = [], scores = null, category = null) {
  if (!isValidChineseContent(content)) {
    throw new Error('评价内容至少需要8个中文字符');
  }
  if (detectAbuse(content)) {
    throw new Error('内容检测异常，请重新输入');
  }

  const task = await getOrCreateDailyTask(fromUserId);
  if (!task.targetUserIds.includes(toUserId)) {
    throw new Error('今日评价任务中不包含该用户');
  }

  const existing = await prisma.peerReview.findFirst({
    where: {
      fromUserId,
      toUserId,
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    }
  });
  if (existing) {
    throw new Error('今日已评价过该用户');
  }

  const review = await prisma.peerReview.create({
    data: { fromUserId, toUserId, content, tags, scores, category },
    include: { toUser: { select: { id: true, username: true, avatar: true } } }
  });

  const updatedTask = await prisma.dailyReviewTask.update({
    where: { id: task.id },
    data: { completedCount: { increment: 1 } }
  });

  if (updatedTask.completedCount >= 2) {
    await prisma.dailyReviewTask.update({
      where: { id: task.id },
      data: { status: 'completed' }
    });
  }

  await prisma.reviewSession.create({
    data: { fromUserId, toUserId, reviewId: review.id, action: 'submit' }
  });

  // 触发信用评分 (Task 4)
  await creditService.recordBehavior(fromUserId, 'SOCIAL', 'PEER_REVIEW', {
    description: `评价了用户 ${review.toUser?.username || toUserId}`,
    sourceId: review.id
  }).catch(err => console.error('Credit error:', err));

  return review;
}

async function getMyReviews(userId, limit = 20, offset = 0) {
  const reviews = await prisma.peerReview.findMany({
    where: { toUserId: userId },
    include: {
      fromUser: { select: { id: true, username: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  });

  const anonymousReviews = reviews.map(r => ({
    ...r,
    fromUser: { id: 'anonymous', username: '匿名同学', avatar: null }
  }));

  const allReviews = await prisma.peerReview.findMany({
    where: { toUserId: userId },
    select: {
      tags: true,
      scores: true
    }
  });
  
  const stats = calculateReviewStats(allReviews);
  const total = await prisma.peerReview.count({ where: { toUserId: userId } });

  return { reviews: anonymousReviews, isAnonymous: true, stats, hasMore: offset + reviews.length < total };
}

function calculateReviewStats(reviews) {
  if (reviews.length === 0) {
    return { total: 0, tagsCount: {}, averageScores: {} };
  }

  const tagsCount = {};
  const scoreSums = { attitude: 0, cooperation: 0 };
  let validScoreCount = 0;

  reviews.forEach(r => {
    // 统计标签
    if (Array.isArray(r.tags)) {
      r.tags.forEach(tag => {
        tagsCount[tag] = (tagsCount[tag] || 0) + 1;
      });
    }

    // 统计评分
    if (r.scores && typeof r.scores === 'object') {
      if (r.scores.attitude) scoreSums.attitude += r.scores.attitude;
      if (r.scores.cooperation) scoreSums.cooperation += r.scores.cooperation;
      validScoreCount++;
    }
  });

  const averageScores = {};
  if (validScoreCount > 0) {
    averageScores.attitude = Number((scoreSums.attitude / validScoreCount).toFixed(1));
    averageScores.cooperation = Number((scoreSums.cooperation / validScoreCount).toFixed(1));
  }

  return {
    total: reviews.length,
    tagsCount,
    averageScores
  };
}

async function recordViewAction(userId) {
  const task = await getOrCreateDailyTask(userId);
  if (task.completedCount < 2) return false;

  await prisma.reviewSession.create({
    data: { fromUserId: userId, toUserId: userId, action: 'view' }
  });
  return true;
}

module.exports = {
  getTodayTaskStatus,
  getTaskTargets,
  submitReview,
  getMyReviews,
  recordViewAction
};