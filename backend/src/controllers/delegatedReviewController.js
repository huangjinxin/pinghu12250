const prisma = require('../lib/prisma');
const pointService = require('../services/pointService'); // Assuming this exists to grant points
const teacherIncentiveService = require('../services/teacherIncentiveService');

// 内部钩子：为刚提交的 submission 创建代办审核任务
exports.createDelegatedReviewTask = async (submissionId, studentId) => {
  try {
    // 查询学生是否绑定了老师
    const binding = await prisma.teacherBinding.findFirst({
      where: { studentId, status: 'ACTIVE' }
    });

    if (binding) {
      await prisma.delegatedReview.create({
        data: {
          submissionId,
          teacherId: binding.teacherId,
          status: 'PENDING'
        }
      });
      console.log(`[DelegatedReview] Created review task for submission ${submissionId} assigned to teacher ${binding.teacherId}`);
    }
  } catch (err) {
    console.error('[DelegatedReview] Failed to create review task:', err);
  }
};

// 获取待我审核的列表
exports.getPendingReviews = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const [reviews, total] = await Promise.all([
      prisma.delegatedReview.findMany({
        where: { teacherId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.delegatedReview.count({
        where: { teacherId, status: 'PENDING' }
      })
    ]);

    // 需要手动拼装 Submission 和 Student 信息，因为我们没有使用 Prisma @relation
    const submissionIds = reviews.map(r => r.submissionId);
    
    let submissions = [];
    if (submissionIds.length > 0) {
      submissions = await prisma.ruleSubmission.findMany({
        where: { id: { in: submissionIds } },
        include: {
          user: { select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } } },
          template: true
        }
      });
    }

    const subMap = {};
    submissions.forEach(s => subMap[s.id] = s);

    const data = reviews.map(r => ({
      ...r,
      submission: subMap[r.submissionId] || null
    })).filter(r => r.submission !== null); // 过滤掉被物理删除的 submission

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    next(error);
  }
};

// 老师进行审核
exports.reviewSubmission = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { id } = req.params; // DelegatedReview.id
    const { action, comment } = req.body; // action: 'APPROVE' or 'REJECT'

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ error: '无效的审核动作' });
    }

    const reviewTask = await prisma.delegatedReview.findUnique({
      where: { id }
    });

    if (!reviewTask) {
      return res.status(404).json({ error: '审核任务不存在' });
    }

    if (reviewTask.teacherId !== teacherId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '无权审核该任务' });
    }

    if (reviewTask.status !== 'PENDING') {
      return res.status(400).json({ error: '该任务已经审核过' });
    }

    // 1. 更新 DelegatedReview 状态
    const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await prisma.delegatedReview.update({
      where: { id },
      data: {
        status: newStatus,
        reviewComment: comment || '',
        reviewedAt: new Date()
      }
    });

    // 2. 同步更新 RuleSubmission 状态（以取代管理员审核）
    const submission = await prisma.ruleSubmission.findUnique({
      where: { id: reviewTask.submissionId },
      include: { template: true }
    });

    if (submission && submission.status === 'PENDING') {
      await prisma.ruleSubmission.update({
        where: { id: submission.id },
        data: {
          status: newStatus,
          reviewedBy: teacherId,
          reviewedAt: new Date(),
          rejectReason: newStatus === 'REJECTED' ? (comment || '老师审核拒绝') : null
        }
      });

      // 3. 如果通过，发放积分
      if (newStatus === 'APPROVED' && submission.template && pointService) {
        const points = submission.template.points * submission.quantity;
        if (points > 0) {
          try {
             await pointService.addPoints(
               submission.userId,
               points,
               'rule_submission',
               `规则模板提交审核通过: ${submission.template.name}`,
               submission.id
             );
          } catch (e) {
             console.error('[DelegatedReview] Failed to add points:', e);
          }
        }
      }
    }

    // 4. 调用激励系统记录老师审核（+2 基础分）
    await teacherIncentiveService.recordTeacherReview(teacherId);

    res.json({ success: true, message: '审核完成' });
  } catch (error) {
    next(error);
  }
};
