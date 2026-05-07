const prisma = require('../lib/prisma');

// 根据分数计算等级
const calculateLevel = (score) => {
  if (score >= 800) return 4;
  if (score >= 300) return 3;
  if (score >= 100) return 2;
  return 1;
};

// 获取或创建老师的统计数据
const getOrCreateTeacherStats = async (teacherId) => {
  let stats = await prisma.teacherStats.findUnique({
    where: { teacherId }
  });

  if (!stats) {
    stats = await prisma.teacherStats.create({
      data: { teacherId }
    });
  }
  return stats;
};

// 记录老师日常审核（+2分基础分）
exports.recordTeacherReview = async (teacherId) => {
  try {
    const stats = await getOrCreateTeacherStats(teacherId);
    
    const newScore = stats.score + 2;
    const newLevel = calculateLevel(newScore);

    await prisma.teacherStats.update({
      where: { teacherId },
      data: {
        score: newScore,
        level: newLevel,
        totalReviews: stats.totalReviews + 1
      }
    });
    console.log(`[TeacherIncentive] Teacher ${teacherId} earned 2 points for reviewing.`);
  } catch (err) {
    console.error('[TeacherIncentive] Error recording teacher review:', err);
  }
};

// 处理管理员的复核逻辑
exports.processAdminReview = async (submissionId, adminAction) => {
  try {
    // 检查是否有小老师的审核记录
    const delegatedReview = await prisma.delegatedReview.findFirst({
      where: { submissionId, status: { in: ['APPROVED', 'REJECTED'] } }
    });

    if (!delegatedReview) return; // 如果老师没审过，或还没审完，忽略

    const teacherId = delegatedReview.teacherId;
    const teacherAction = delegatedReview.status; // 'APPROVED' or 'REJECTED'
    
    // 如果管理员的动作不在预期的范围（比如被软删），也忽略
    if (!['APPROVED', 'REJECTED'].includes(adminAction)) return;

    const isConsistent = (teacherAction === adminAction);
    const pointsDelta = isConsistent ? 5 : -3;

    // 记录复核日志
    await prisma.reviewQualityLog.create({
      data: {
        teacherId,
        submissionId,
        teacherAction,
        adminAction,
        isConsistent,
        pointsDelta
      }
    });

    // 更新老师统计
    const stats = await getOrCreateTeacherStats(teacherId);
    let newScore = Math.max(0, stats.score + pointsDelta); // 分数不降为负数
    let newConsecutiveWrong = isConsistent ? 0 : stats.consecutiveWrong + 1;
    let newCorrectReviews = stats.correctReviews + (isConsistent ? 1 : 0);
    let newWrongReviews = stats.wrongReviews + (isConsistent ? 0 : 1);
    let newLevel = calculateLevel(newScore);

    // 防作弊惩罚机制：连续5次错误，强制降级并清零连错计数
    if (newConsecutiveWrong >= 5) {
      newLevel = Math.max(1, newLevel - 1);
      newConsecutiveWrong = 0;
      // 分数也相应扣减到上一级的门槛（比如惩罚性扣分）
      // 这里暂且只扣级数，分数保持现有逻辑即可，或者进一步扣减。为了简单起见，仅改变Level，或让Score直接减去50。
      console.log(`[TeacherIncentive] Teacher ${teacherId} downgraded due to 5 consecutive mistakes.`);
    }

    await prisma.teacherStats.update({
      where: { teacherId },
      data: {
        score: newScore,
        level: newLevel,
        correctReviews: newCorrectReviews,
        wrongReviews: newWrongReviews,
        consecutiveWrong: newConsecutiveWrong
      }
    });

    console.log(`[TeacherIncentive] Processed admin review for teacher ${teacherId}: isConsistent=${isConsistent}, delta=${pointsDelta}`);
  } catch (err) {
    console.error('[TeacherIncentive] Error processing admin review:', err);
  }
};
