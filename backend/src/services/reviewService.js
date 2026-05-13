const prisma = require('../lib/prisma');
const creditService = require('./creditService');

const DIMENSIONS = ['MORALITY', 'INTELLIGENCE', 'PHYSIQUE', 'AESTHETICS', 'LABOR', 'SOCIETY'];
const DIMENSION_LABELS = {
  MORALITY: '品德', INTELLIGENCE: '智慧', PHYSIQUE: '体质',
  AESTHETICS: '审美', LABOR: '劳动', SOCIETY: '社交'
};

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
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
    status: { in: ['ACTIVE', 'PENDING'] },
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
        id: { not: currentUserId, notIn: excludeIds },
        status: { in: ['ACTIVE', 'PENDING'] },
        role: 'STUDENT'
      },
      select: { id: true, _count: { select: { PeerReview_PeerReview_toUserIdToUser: true } } },
      take: 20
    });
    candidates = [...candidates, ...fallback];
  }

  // Ultimate fallback: any active user
  if (candidates.length < limit) {
    const fallback2 = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        status: { in: ['ACTIVE', 'PENDING'] }
      },
      select: { id: true },
      take: limit
    });
    candidates = [...candidates, ...fallback2];
  }

  const uniqueCandidates = [];
  const seen = new Set();
  for (const c of candidates) {
    if (!seen.has(c.id)) {
      seen.add(c.id);
      uniqueCandidates.push(c);
    }
  }

  uniqueCandidates.sort((a, b) => {
    if (a._count?.PeerReview_PeerReview_toUserIdToUser !== b._count?.PeerReview_PeerReview_toUserIdToUser) {
      return a._count.PeerReview_PeerReview_toUserIdToUser - b._count.PeerReview_PeerReview_toUserIdToUser;
    }
    return Math.random() - 0.5;
  });

  return uniqueCandidates.slice(0, limit).map(u => u.id);
}

async function getOrCreateDailyTask(userId) {
  const today = getTodayStr();
  let task = await prisma.dailyReviewTask.findUnique({
    where: {
      userId_date_taskType: {
        userId,
        date: today,
        taskType: 'daily_task'
      }
    }
  });

  // If task exists but targets are stale, recreate
  if (task && task.completedCount < 2) {
    const validTargets = await prisma.user.findMany({
      where: { id: { in: task.targetUserIds } },
      select: { id: true }
    });
    const validIds = validTargets.map(u => u.id);
    if (validIds.length === 0) {
      await prisma.dailyReviewTask.delete({ where: { id: task.id } });
      task = null;
    } else if (validIds.length < task.targetUserIds.length) {
      task = await prisma.dailyReviewTask.update({
        where: { id: task.id },
        data: { targetUserIds: validIds }
      });
    }
  }

  if (!task) {
    const targets = await getRandomTargets(userId, [], 2);
    if (targets.length === 0) {
      const users = await prisma.user.findMany({
        where: { id: { not: userId }, status: { in: ['ACTIVE', 'PENDING'] } },
        select: { id: true },
        take: 2
      });
      targets.push(...users.map(u => u.id));
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
    }
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
    select: { toUserId: true, dimension: true }
  });

  const submittedByTarget = {};
  submittedToday.forEach(r => {
    if (!submittedByTarget[r.toUserId]) submittedByTarget[r.toUserId] = [];
    if (r.dimension) submittedByTarget[r.toUserId].push(r.dimension);
  });

  const submittedIds = Object.keys(submittedByTarget);
  const targets = await prisma.user.findMany({
    where: { id: { in: task.targetUserIds } },
    select: { id: true, username: true, realName: true, avatar: true }
  });

  return targets.map(t => ({
    ...t,
    reviewedDimensions: submittedByTarget[t.id] || [],
    remainingDimensions: DIMENSIONS.filter(d => !(submittedByTarget[t.id] || []).includes(d))
  }));
}

async function skipTarget(userId) {
  const task = await getOrCreateDailyTask(userId);
  const skipped = task.skippedUserIds || [];
  const allTargets = task.targetUserIds || [];

  const newTargetId = await getRandomTargets(userId, [...allTargets, ...skipped], 1);
  if (newTargetId.length === 0) {
    throw new Error('没有更多可评价的同学了');
  }

  const newTarget = await prisma.user.findUnique({
    where: { id: newTargetId[0] },
    select: { id: true, username: true, realName: true, avatar: true }
  });

  await prisma.dailyReviewTask.update({
    where: { id: task.id },
    data: {
      skippedUserIds: [...skipped, ...allTargets.filter(t => t !== newTargetId[0])],
      targetUserIds: { push: newTargetId[0] }
    }
  });

  return { ...newTarget, reviewedDimensions: [], remainingDimensions: [...DIMENSIONS] };
}

async function submitReview(fromUserId, toUserId, dimension, score, detail = {}) {
  if (!DIMENSIONS.includes(dimension)) {
    throw new Error('无效的评价维度');
  }
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error('评分必须在1-5之间');
  }

  const task = await getOrCreateDailyTask(fromUserId);
  if (!task.targetUserIds.includes(toUserId)) {
    throw new Error('今日评价任务中不包含该用户');
  }

  const existingToday = await prisma.peerReview.findFirst({
    where: {
      fromUserId,
      toUserId,
      dimension,
      createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
    }
  });
  if (existingToday) {
    throw new Error('今日已评价过该用户的此项维度');
  }

  const review = await prisma.peerReview.create({
    data: { fromUserId, toUserId, dimension, score, detail, content: detail.content || '' },
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

  await creditService.recordBehavior(fromUserId, 'SOCIAL', 'PEER_REVIEW', {
    description: `评价了用户 ${review.toUser?.username || toUserId} 的${DIMENSION_LABELS[dimension]}`,
    sourceId: review.id
  }).catch(err => console.error('Credit error:', err));

  return review;
}

function aggregateDimensionStats(reviews) {
  const dimScores = {};
  DIMENSIONS.forEach(d => { dimScores[d] = []; });

  reviews.forEach(r => {
    if (r.dimension && r.score != null) {
      const dim = r.dimension;
      if (dimScores[dim]) dimScores[dim].push(r.score);
    }
  });

  const averages = {};
  DIMENSIONS.forEach(d => {
    const scores = dimScores[d];
    if (scores.length > 0) {
      averages[d] = Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
    }
  });

  const totalReviews = reviews.filter(r => r.dimension != null).length;
  const dimensionReviewCount = {};
  DIMENSIONS.forEach(d => {
    dimensionReviewCount[d] = dimScores[d].length;
  });

  return { averages, total: totalReviews, dimensionReviewCount };
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

  const allReviews = await prisma.peerReview.findMany({
    where: { toUserId: userId },
    select: { dimension: true, score: true }
  });

  const stats = aggregateDimensionStats(allReviews);
  const total = await prisma.peerReview.count({ where: { toUserId: userId } });

  return { reviews, isAnonymous: true, stats, hasMore: offset + reviews.length < total };
}

async function getAllStudentReviews({ status, schoolId, classId, page = 1, limit = 24 }) {
  const skip = (page - 1) * limit;
  const where = { role: 'STUDENT' };
  if (status && status !== 'ALL') where.status = status;
  if (schoolId) where.schoolId = schoolId;
  if (classId) where.classId = classId;

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, realName: true, username: true, avatar: true, status: true,
        school: { select: { name: true } },
        class: { select: { grade: true, name: true } },
        _count: { select: { PeerReview_PeerReview_toUserIdToUser: true } }
      },
      skip, take: limit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  const studentIds = students.map(s => s.id);
  const allReviews = await prisma.peerReview.findMany({
    where: { toUserId: { in: studentIds } },
    select: { toUserId: true, dimension: true, score: true, updatedAt: true }
  });

  const reviewsByUser = {};
  for (const r of allReviews) {
    if (!reviewsByUser[r.toUserId]) reviewsByUser[r.toUserId] = [];
    reviewsByUser[r.toUserId].push(r);
  }

  const result = students.map(s => ({
    id: s.id,
    realName: s.realName,
    username: s.username,
    avatar: s.avatar,
    status: s.status,
    school: s.school,
    class: s.class,
    reviewCount: s._count.PeerReview_PeerReview_toUserIdToUser,
    reviewStats: aggregateDimensionStats(reviewsByUser[s.id] || []),
    lastReviewedAt: reviewsByUser[s.id]?.length > 0
      ? reviewsByUser[s.id].reduce((max, r) => r.updatedAt > max ? r.updatedAt : max, reviewsByUser[s.id][0].updatedAt)
      : null
  }));

  return { students: result, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function getStudentReviewDetail(studentId, limit = 20, offset = 0) {
  const [reviews, allReviews, total] = await Promise.all([
    prisma.peerReview.findMany({
      where: { toUserId: studentId },
      include: { fromUser: { select: { id: true, username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit, skip: offset
    }),
    prisma.peerReview.findMany({
      where: { toUserId: studentId },
      select: { dimension: true, score: true }
    }),
    prisma.peerReview.count({ where: { toUserId: studentId } })
  ]);

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, realName: true, username: true, avatar: true, status: true,
      school: { select: { name: true } },
      class: { select: { grade: true, name: true } } }
  });

  return {
    student,
    reviews,
    stats: aggregateDimensionStats(allReviews),
    total,
    hasMore: offset + reviews.length < total
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
  skipTarget,
  submitReview,
  getMyReviews,
  getAllStudentReviews,
  getStudentReviewDetail,
  recordViewAction,
  DIMENSIONS,
  DIMENSION_LABELS
};
