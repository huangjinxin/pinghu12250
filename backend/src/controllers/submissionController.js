// 使用 Prisma 单例
const prisma = require('../lib/prisma');
const { randomUUID } = require('crypto');
const pointService = require('../services/pointService');
const { createSubmissionAutomationTask } = require('../services/aiAutomationService');
const delegatedReviewController = require('./delegatedReviewController');
const teacherIncentiveService = require('../services/teacherIncentiveService');

// ========== 用户提交管理 ==========

// 用户创建提交
async function createSubmission(req, res) {
  try {
    const { templateId, content, images, audios, link, quantity } = req.body;
    const userId = req.user.id;

    if (!templateId) {
      return res.status(400).json({ error: '规则模板ID不能为空' });
    }

    // 获取规则模板
    const template = await prisma.ruleTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return res.status(404).json({ error: '规则模板不存在' });
    }

    if (template.status !== 'ENABLED') {
      return res.status(400).json({ error: '该规则已被禁用' });
    }

    // 验证必填字段
    if (template.requireText && (!content || !content.trim())) {
      return res.status(400).json({ error: '文本说明为必填项' });
    }

    if (template.requireImage && (!images || images.length === 0)) {
      return res.status(400).json({ error: '图片为必填项' });
    }

    // 兼容旧数据：如果字段不存在，默认为false
    if (template.requireAudio === true && (!audios || audios.length === 0)) {
      return res.status(400).json({ error: '音频为必填项' });
    }

    if (template.requireLink && (!link || !link.trim())) {
      return res.status(400).json({ error: '链接为必填项' });
    }

    // 验证文本长度
    if (content && content.length > template.textMaxLength) {
      return res.status(400).json({
        error: `文本说明不能超过 ${template.textMaxLength} 字`
      });
    }

    // 限制图片数量（最多9张）
    const imageArray = images || [];
    if (imageArray.length > 9) {
      return res.status(400).json({ error: '最多只能上传9张图片' });
    }

    // 限制音频数量
    const audioArray = audios || [];
    if (audioArray.length > 3) {
      return res.status(400).json({ error: '最多只能上传3个音频' });
    }

    // 验证数量（兼容旧数据）
    const finalQuantity = (template.allowQuantity === true && quantity > 0) ? parseInt(quantity) : 1;
    if (finalQuantity > 100) {
      return res.status(400).json({ error: '数量不能超过100' });
    }

    // 检查每日提交限制
    if (template.dailyLimit > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayCount = await prisma.ruleSubmission.count({
        where: {
          userId,
          templateId,
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
          status: { not: 'REJECTED' }
        }
      });

      if (todayCount >= template.dailyLimit) {
        return res.status(400).json({
          error: `今日已超过提交次数限制（${template.dailyLimit}次），明天再来吧`
        });
      }
    }

    // 创建提交记录
    const submission = await prisma.ruleSubmission.create({
      data: {
        id: randomUUID(),
        userId,
        templateId,
        content: content ? content.trim() : '',
        images: Array.isArray(imageArray) ? imageArray : [],
        audios: Array.isArray(audioArray) ? audioArray : [],
        link: link || null,
        quantity: finalQuantity,
        status: 'PENDING'
      },
      include: {
        template: {
          include: { type: true }
        },
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    // 触发代办任务创建（异步不阻塞）
    delegatedReviewController.createDelegatedReviewTask(submission.id, userId);

    res.json({ submission });
  } catch (error) {
    console.error('创建提交失败:', error);
    res.status(500).json({ error: '创建提交失败' });
  }
}

// 用户获取自己的提交记录
async function getMySubmissions(req, res) {
  try {
    const userId = req.user.id;
    const { status, page = 1, pageSize = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = { userId };
    if (status) where.status = status;

    const [total, submissions] = await Promise.all([
      prisma.ruleSubmission.count({ where }),
      prisma.ruleSubmission.findMany({
        where,
        include: {
          template: {
            include: { 
              type: true,
              RuleStandard: true
            }
          },
          reviewer: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    // 补充查询 teacherReview 信息
    const submissionIds = submissions.map(s => s.id);
    let teacherReviews = [];
    if (submissionIds.length > 0) {
      teacherReviews = await prisma.delegatedReview.findMany({
        where: { submissionId: { in: submissionIds } }
      });
    }
    const reviewMap = {};
    teacherReviews.forEach(tr => { reviewMap[tr.submissionId] = tr; });

    const mappedSubmissions = submissions.map(s => {
      if (s.template) {
        const { RuleStandard, ...restTemplate } = s.template;
        s.template = { ...restTemplate, standard: RuleStandard };
      }
      const dr = reviewMap[s.id];
      if (dr) {
        s.teacher_review_status = dr.status;
        s.reviewed_by = s.reviewedBy === dr.teacherId ? '老师' : (s.reviewedBy ? 'Admin' : null);
      }
      return s;
    });

    res.json({
      submissions: mappedSubmissions,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取我的提交记录失败:', error);
    res.status(500).json({ error: '获取我的提交记录失败' });
  }
}

// 用户更新自己的提交（仅待审核状态）
async function updateMySubmission(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { content, images, audios, link, quantity } = req.body;

    // 检查提交记录
    const submission = await prisma.ruleSubmission.findFirst({
      where: { id, userId },
      include: { template: true }
    });

    if (!submission) {
      return res.status(404).json({ error: '提交记录不存在' });
    }

    if (submission.status !== 'PENDING') {
      return res.status(400).json({ error: '只能修改待审核的提交' });
    }

    // 验证必填字段
    const template = submission.template;
    if (template.requireText && (!content || !content.trim())) {
      return res.status(400).json({ error: '文本说明为必填项' });
    }

    if (template.requireImage && (!images || images.length === 0)) {
      return res.status(400).json({ error: '图片为必填项' });
    }

    if (template.requireAudio === true && (!audios || audios.length === 0)) {
      return res.status(400).json({ error: '音频为必填项' });
    }

    if (template.requireLink && (!link || !link.trim())) {
      return res.status(400).json({ error: '链接为必填项' });
    }

    // 验证文本长度
    if (content && content.length > template.textMaxLength) {
      return res.status(400).json({
        error: `文本说明不能超过 ${template.textMaxLength} 字`
      });
    }

    // 验证数量
    const finalQuantity = quantity !== undefined ? parseInt(quantity) : submission.quantity;
    if (finalQuantity > 100) {
      return res.status(400).json({ error: '数量不能超过100' });
    }

    // 更新提交
    const updated = await prisma.ruleSubmission.update({
      where: { id },
      data: {
        content: content !== undefined ? content : submission.content,
        images: images !== undefined ? (Array.isArray(images) ? images : []) : submission.images,
        audios: audios !== undefined ? (Array.isArray(audios) ? audios : []) : submission.audios,
        link: link !== undefined ? link : submission.link,
        quantity: finalQuantity
      },
      include: {
        template: {
          include: { 
            type: true,
            RuleStandard: true
          }
        }
      }
    });

    if (updated.template) {
      const { RuleStandard, ...restTemplate } = updated.template;
      updated.template = { ...restTemplate, standard: RuleStandard };
    }

    res.json({ submission: updated });
  } catch (error) {
    console.error('更新提交失败:', error);
    res.status(500).json({ error: '更新提交失败' });
  }
}

// 用户删除自己的提交（仅待审核状态）
async function deleteMySubmission(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const submission = await prisma.ruleSubmission.findFirst({
      where: { id, userId }
    });

    if (!submission) {
      return res.status(404).json({ error: '提交记录不存在' });
    }

    if (submission.status !== 'PENDING') {
      return res.status(400).json({ error: '只能删除待审核的提交' });
    }

    await prisma.ruleSubmission.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除提交失败:', error);
    res.status(500).json({ error: '删除提交失败' });
  }
}

// ========== 管理员审核管理 ==========

// 获取所有提交记录（管理员）
async function getAllSubmissions(req, res) {
  try {
    const {
      status,
      userId,
      templateId,
      typeId,
      username,
      templateName,
      startDate,
      endDate,
      page = 1,
      pageSize = 10
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (templateId) where.templateId = templateId;

    // 用户名模糊搜索
    if (username) {
      where.user = {
        OR: [
          { username: { contains: username, mode: 'insensitive' } },
          { profile: { is: { nickname: { contains: username, mode: 'insensitive' } } } }
        ]
      };
    }

    // 规则模板名称搜索或技术类型筛选
    if (templateName || typeId) {
      where.template = {};
      if (templateName) {
        where.template.name = { contains: templateName, mode: 'insensitive' };
      }
      if (typeId) {
        where.template.typeId = typeId;
      }
    }

    // 时间范围筛选
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const [total, submissions] = await Promise.all([
      prisma.ruleSubmission.count({ where }),
      prisma.ruleSubmission.findMany({
        where,
        include: {
          template: {
            include: { 
              type: true,
              RuleStandard: true
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              role: true
            }
          },
          reviewer: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    const mappedSubmissions = submissions.map(s => {
      if (s.template) {
        const { RuleStandard, ...restTemplate } = s.template;
        s.template = { ...restTemplate, standard: RuleStandard };
      }
      return s;
    });

    res.json({
      submissions: mappedSubmissions,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取所有提交记录失败:', error);
    res.status(500).json({ error: '获取所有提交记录失败' });
  }
}

// 获取待审核的提交（管理员）
async function getPendingSubmissions(req, res) {
  try {
    const { page = 1, pageSize = 20, userId, username } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    // 构建查询条件
    const where = { status: 'PENDING' };

    // 支持按用户ID筛选
    if (userId) {
      where.userId = userId;
    }

    // 支持按用户名模糊搜索
    if (username) {
      where.user = {
        OR: [
          { username: { contains: username, mode: 'insensitive' } },
          { profile: { is: { nickname: { contains: username, mode: 'insensitive' } } } }
        ]
      };
    }

    const [total, submissions] = await Promise.all([
      prisma.ruleSubmission.count({ where }),
      prisma.ruleSubmission.findMany({
        where,
        include: {
          template: {
            include: { 
              type: true,
              RuleStandard: true
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              role: true,
              profile: {
                select: { nickname: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take
      })
    ]);

    const mappedSubmissions = submissions.map(s => {
      if (s.template) {
        const { RuleStandard, ...restTemplate } = s.template;
        s.template = { ...restTemplate, standard: RuleStandard };
      }
      return s;
    });

    res.json({
      submissions: mappedSubmissions,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取待审核提交失败:', error);
    res.status(500).json({ error: '获取待审核提交失败' });
  }
}

// 审核提交（管理员）
async function reviewSubmission(req, res) {
  try {
    const { id } = req.params;
    const { action, reviewNote, customPoints } = req.body;
    const reviewerId = req.user.id;

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: '审核操作无效' });
    }

    // 获取提交记录
    const submission = await prisma.ruleSubmission.findUnique({
      where: { id },
      include: { template: true, user: true }
    });

    if (!submission) {
      return res.status(404).json({ error: '提交记录不存在' });
    }

    if (submission.status !== 'PENDING') {
      return res.status(400).json({ error: '该提交已被审核' });
    }

    // 计算实际积分：如果传入了 customPoints，使用自定义积分；否则使用模板积分 × 数量
    let actualPoints = null;
    if (action === 'APPROVED') {
      if (customPoints !== undefined && customPoints !== null) {
        actualPoints = parseInt(customPoints);
      } else {
        actualPoints = submission.template.points * (submission.quantity || 1);
      }
    }

    // 更新提交状态
    const updated = await prisma.ruleSubmission.update({
      where: { id },
      data: {
        status: action,
        reviewNote,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        pointsAwarded: actualPoints
      },
      include: {
        template: {
          include: { type: true }
        },
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    // 如果审核通过，调整用户积分（奖罚模块不受每日限制）
    if (action === 'APPROVED') {
      try {
        // 使用 adjustPointsByAdmin 方法，奖罚模块的积分直接发放，不受每日上限限制
        // 积分 = 模板积分 × 数量
        await pointService.adjustPointsByAdmin(
          submission.userId,
          actualPoints,
          reviewerId,
          `奖罚：${submission.template.name}`,
          'rule_submission',
          id
        );
        await createSubmissionAutomationTask(id);

        // 触发信用评分引擎
        const creditService = require('../services/creditService');
        await creditService.recordBehavior(
          submission.userId,
          'APPROVED_SUBMISSION',
          submission.template.action || submission.template.id,
          {
            points: actualPoints,
            templateId: submission.templateId,
            description: `审核通过: ${submission.template.name}`,
            sourceId: submission.id
          }
        );
      } catch (error) {
        console.error('审核后续处理失败:', error);
      }
    }

    // 调用激励系统：对小老师的审核进行复核
    await teacherIncentiveService.processAdminReview(id, action);

    res.json({ submission: updated });
  } catch (error) {
    console.error('审核提交失败:', error);
    res.status(500).json({ error: '审核提交失败' });
  }
}

// 获取统计信息（管理员）
async function getSubmissionStats(req, res) {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      prisma.ruleSubmission.count(),
      prisma.ruleSubmission.count({ where: { status: 'PENDING' } }),
      prisma.ruleSubmission.count({ where: { status: 'APPROVED' } }),
      prisma.ruleSubmission.count({ where: { status: 'REJECTED' } })
    ]);

    res.json({
      stats: {
        total,
        pending,
        approved,
        rejected
      }
    });
  } catch (error) {
    console.error('获取统计信息失败:', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
}

// 获取有待审核提交的用户列表（管理员）
async function getPendingUsers(req, res) {
  try {
    // 获取所有有待审核提交的用户
    const submissions = await prisma.ruleSubmission.findMany({
      where: { status: 'PENDING' },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: { nickname: true }
            }
          }
        }
      },
      distinct: ['userId']
    });

    // 统计每个用户的待审核数量
    const userCounts = await prisma.ruleSubmission.groupBy({
      by: ['userId'],
      where: { status: 'PENDING' },
      _count: { id: true }
    });

    const countMap = {};
    userCounts.forEach(item => {
      countMap[item.userId] = item._count.id;
    });

    // 格式化用户列表
    const users = submissions.map(s => ({
      id: s.user.id,
      username: s.user.username,
      nickname: s.user.profile?.nickname,
      displayName: s.user.profile?.nickname || s.user.username,
      pendingCount: countMap[s.userId] || 0
    }));

    // 按待审核数量降序排列
    users.sort((a, b) => b.pendingCount - a.pendingCount);

    res.json({ users });
  } catch (error) {
    console.error('获取待审核用户列表失败:', error);
    res.status(500).json({ error: '获取待审核用户列表失败' });
  }
}

// ========== 收藏功能 ==========

// 添加收藏
async function addFavorite(req, res) {
  try {
    const { templateId } = req.body;
    const userId = req.user.id;

    // 检查模板是否存在
    const template = await prisma.ruleTemplate.findUnique({
      where: { id: templateId }
    });

    if (!template) {
      return res.status(404).json({ error: '规则模板不存在' });
    }

    // 检查是否已收藏
    const existing = await prisma.templateFavorite.findUnique({
      where: {
        userId_templateId: { userId, templateId }
      }
    });

    if (existing) {
      return res.status(400).json({ error: '已收藏该模板' });
    }

    const favorite = await prisma.templateFavorite.create({
      data: { 
        id: randomUUID(),
        userId, 
        templateId 
      }
    });

    res.json({ favorite, message: '收藏成功' });
  } catch (error) {
    console.error('收藏失败:', error);
    res.status(500).json({ error: '收藏失败' });
  }
}

// 取消收藏
async function removeFavorite(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const favorite = await prisma.templateFavorite.findUnique({
      where: {
        userId_templateId: { userId, templateId }
      }
    });

    if (!favorite) {
      return res.status(404).json({ error: '未收藏该模板' });
    }

    await prisma.templateFavorite.delete({
      where: { id: favorite.id }
    });

    res.json({ message: '取消收藏成功' });
  } catch (error) {
    console.error('取消收藏失败:', error);
    res.status(500).json({ error: '取消收藏失败' });
  }
}

// 获取我的收藏列表
async function getMyFavorites(req, res) {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const [total, favorites] = await Promise.all([
      prisma.templateFavorite.count({ where: { userId } }),
      prisma.templateFavorite.findMany({
        where: { userId },
        include: {
          template: {
            include: { 
              type: true,
              RuleStandard: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    // 返回模板列表（带收藏标记）
    const templates = favorites.map(f => {
      const { RuleStandard, ...restTemplate } = f.template;
      return {
        ...restTemplate,
        standard: RuleStandard,
        isFavorite: true,
        favoriteId: f.id
      };
    });

    res.json({
      templates,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取收藏列表失败:', error);
    res.status(500).json({ error: '获取收藏列表失败' });
  }
}

// 检查是否已收藏（批量）
async function checkFavorites(req, res) {
  try {
    const userId = req.user.id;
    const { templateIds } = req.body;

    if (!Array.isArray(templateIds)) {
      return res.status(400).json({ error: 'templateIds 必须是数组' });
    }

    const favorites = await prisma.templateFavorite.findMany({
      where: {
        userId,
        templateId: { in: templateIds }
      },
      select: { templateId: true }
    });

    const favoriteMap = {};
    favorites.forEach(f => {
      favoriteMap[f.templateId] = true;
    });

    res.json({ favorites: favoriteMap });
  } catch (error) {
    console.error('检查收藏状态失败:', error);
    res.status(500).json({ error: '检查收藏状态失败' });
  }
}

// ========== 家长查看孩子提交记录 ==========

// 家长获取孩子的提交记录
async function getChildrenSubmissions(req, res) {
  try {
    const parentId = req.user.id;
    const { childId, status, page = 1, pageSize = 10 } = req.query;

    // 验证用户是家长角色
    if (req.user.role !== 'PARENT') {
      return res.status(403).json({ error: '只有家长可以查看孩子的提交记录' });
    }

    // 获取家长关联的所有孩子ID
    const parentRelations = await prisma.studentParent.findMany({
      where: { parentId },
      select: { childId: true }
    });

    const childrenIds = parentRelations.map(r => r.childId);

    if (childrenIds.length === 0) {
      return res.json({
        submissions: [],
        pagination: {
          page: 1,
          pageSize: parseInt(pageSize),
          total: 0,
          totalPages: 0
        }
      });
    }

    // 构建查询条件
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {
      userId: childId ? childId : { in: childrenIds }
    };

    // 如果指定了孩子ID，验证是否是家长的孩子
    if (childId && !childrenIds.includes(childId)) {
      return res.status(403).json({ error: '无权查看该用户的提交记录' });
    }

    if (status) where.status = status;

    const [total, submissions] = await Promise.all([
      prisma.ruleSubmission.count({ where }),
      prisma.ruleSubmission.findMany({
        where,
        include: {
          template: {
            include: { type: true }
          },
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: {
                select: { nickname: true }
              }
            }
          },
          reviewer: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    res.json({
      submissions,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取孩子提交记录失败:', error);
    res.status(500).json({ error: '获取孩子提交记录失败' });
  }
}

// 家长获取待审核提交列表
async function getParentPendingSubmissions(req, res) {
  try {
    const parentId = req.user.id;
    const { childId, page = 1, pageSize = 20 } = req.query;

    // 验证用户是家长角色
    if (req.user.role !== 'PARENT') {
      return res.status(403).json({ error: '只有家长可以访问此接口' });
    }

    // 获取家长关联的所有孩子ID
    const parentRelations = await prisma.studentParent.findMany({
      where: { parentId },
      select: { childId: true }
    });

    const childrenIds = parentRelations.map(r => r.childId);

    if (childrenIds.length === 0) {
      return res.json({
        submissions: [],
        stats: { total: 0, pending: 0 },
        pagination: { page: 1, pageSize: parseInt(pageSize), total: 0, totalPages: 0 }
      });
    }

    // 如果指定了孩子ID，验证是否是家长的孩子
    if (childId && !childrenIds.includes(childId)) {
      return res.status(403).json({ error: '无权查看该用户的提交记录' });
    }

    const targetChildrenIds = childId ? [childId] : childrenIds;

    // 构建查询条件 - 只查待审核的
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {
      userId: { in: targetChildrenIds },
      status: 'PENDING'
    };

    // 并行查询统计和列表
    const [pendingCount, totalCount, approvedCount, rejectedCount, submissions] = await Promise.all([
      prisma.ruleSubmission.count({ where }),
      prisma.ruleSubmission.count({ where: { userId: { in: targetChildrenIds } } }),
      prisma.ruleSubmission.count({ where: { userId: { in: targetChildrenIds }, status: 'APPROVED' } }),
      prisma.ruleSubmission.count({ where: { userId: { in: targetChildrenIds }, status: 'REJECTED' } }),
      prisma.ruleSubmission.findMany({
        where,
        include: {
          template: {
            include: { type: true }
          },
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: {
                select: { nickname: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    res.json({
      submissions,
      stats: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount
      },
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total: pendingCount,
        totalPages: Math.ceil(pendingCount / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取家长待审核列表失败:', error);
    res.status(500).json({ error: '获取待审核列表失败' });
  }
}

// 家长审核孩子的提交
async function parentReviewSubmission(req, res) {
  try {
    const { id } = req.params;
    const { action, reviewNote } = req.body;
    const parentId = req.user.id;

    // 验证用户是家长角色
    if (req.user.role !== 'PARENT') {
      return res.status(403).json({ error: '只有家长可以进行审核' });
    }

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return res.status(400).json({ error: '审核操作无效' });
    }

    // 获取提交记录
    const submission = await prisma.ruleSubmission.findUnique({
      where: { id },
      include: { template: true, user: true }
    });

    if (!submission) {
      return res.status(404).json({ error: '提交记录不存在' });
    }

    if (submission.status !== 'PENDING') {
      return res.status(400).json({ error: '该提交已被审核' });
    }

    // 验证提交者是否是家长的孩子
    const parentRelation = await prisma.studentParent.findFirst({
      where: {
        parentId,
        childId: submission.userId
      }
    });

    if (!parentRelation) {
      return res.status(403).json({ error: '无权审核该提交' });
    }

    // 计算实际积分
    let actualPoints = null;
    if (action === 'APPROVED') {
      actualPoints = submission.template.points * (submission.quantity || 1);
    }

    // 更新提交状态
    const updated = await prisma.ruleSubmission.update({
      where: { id },
      data: {
        status: action,
        reviewNote,
        reviewedBy: parentId,
        reviewedAt: new Date(),
        pointsAwarded: actualPoints
      },
      include: {
        template: {
          include: { type: true }
        },
        user: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        }
      }
    });

    // 如果审核通过，发放积分
    if (action === 'APPROVED') {
      try {
        await pointService.adjustPointsByAdmin(
          submission.userId,
          actualPoints,
          parentId,
          `奖罚：${submission.template.name}（家长审核）`,
          'rule_submission',
          id
        );
        await createSubmissionAutomationTask(id);
      } catch (error) {
        console.error('调整积分失败:', error);
      }
    }

    res.json({ success: true, submission: updated });
  } catch (error) {
    console.error('家长审核提交失败:', error);
    res.status(500).json({ error: '审核提交失败' });
  }
}

// 管理员删除提交（用于审核出错的情况，会回滚积分）
async function adminDeleteSubmission(req, res) {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // 获取提交记录
    const submission = await prisma.ruleSubmission.findUnique({
      where: { id },
      include: { template: true, user: true }
    });

    if (!submission) {
      return res.status(404).json({ error: '提交记录不存在' });
    }

    // 如果是已通过的提交，需要回滚积分
    if (submission.status === 'APPROVED' && submission.pointsAwarded) {
      try {
        // 回滚积分（扣除之前发放的积分）
        await pointService.adjustPointsByAdmin(
          submission.userId,
          -submission.pointsAwarded,
          adminId,
          `删除奖罚记录回滚：${submission.template.name}`,
          'rule_submission_delete',
          id
        );
      } catch (error) {
        console.error('回滚积分失败:', error);
        return res.status(500).json({ error: '回滚积分失败，删除操作已取消' });
      }
    }

    // 删除提交记录
    await prisma.ruleSubmission.delete({ where: { id } });

    res.json({ message: '删除成功', pointsRolledBack: submission.pointsAwarded || 0 });
  } catch (error) {
    console.error('管理员删除提交失败:', error);
    res.status(500).json({ error: '删除提交失败' });
  }
}

// ========== Dashboard API ==========

// 工具函数：计算"今天"的开始时间（早上9点为一天的开始）
// 这样凌晨学习的内容会算在前一天
function getDayBoundary(timezoneOffset = -480) {
  const DAY_START_HOUR = 9; // 一天从早上9点开始

  const now = new Date();
  // 转换为用户本地时间
  const localNow = new Date(now.getTime() - timezoneOffset * 60 * 1000);

  // 获取当前本地日期的8点
  const todayStart = new Date(localNow);
  todayStart.setUTCHours(DAY_START_HOUR, 0, 0, 0);

  // 如果现在还没到8点，则"今天"应该从昨天8点开始
  if (localNow.getUTCHours() < DAY_START_HOUR) {
    todayStart.setUTCDate(todayStart.getUTCDate() - 1);
  }

  const todayEnd = new Date(todayStart);
  todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);

  // 转回 UTC 用于数据库查询
  const queryStart = new Date(todayStart.getTime() + timezoneOffset * 60 * 1000);
  const queryEnd = new Date(todayEnd.getTime() + timezoneOffset * 60 * 1000);

  return { todayStart, todayEnd, queryStart, queryEnd };
}

// 获取今日打卡状态
async function getTodayStatus(req, res) {
  try {
    const userId = req.user.id;
    const { templateNames } = req.query;

    if (!templateNames) {
      return res.status(400).json({ error: 'templateNames 参数不能为空' });
    }

    // 解析模板名称列表
    const names = templateNames.split(',').map(n => n.trim());

    // 使用8点边界计算今天的时间范围
    const timezoneOffset = parseInt(req.query.timezoneOffset) || -480; // 默认东八区
    const { todayStart, queryStart, queryEnd } = getDayBoundary(timezoneOffset);

    // 查询今日提交的记录
    const submissions = await prisma.ruleSubmission.findMany({
      where: {
        userId,
        createdAt: {
          gte: queryStart,
          lt: queryEnd
        },
        template: {
          name: { in: names }
        }
      },
      include: {
        template: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 构建结果：每个模板取最新的一条
    const result = {};
    const processedTemplates = new Set();

    for (const sub of submissions) {
      const templateName = sub.template.name;
      if (!processedTemplates.has(templateName)) {
        processedTemplates.add(templateName);
        result[templateName] = {
          status: sub.status,
          submissionId: sub.id,
          createdAt: sub.createdAt
        };
      }
    }

    // 未提交的模板设为 null
    for (const name of names) {
      if (!result[name]) {
        result[name] = null;
      }
    }

    // todayStart 代表用户本地日期的零点（以UTC形式存储），用它来获取正确的本地日期
    res.json({ todayStatus: result, queryDate: todayStart.toISOString().split('T')[0] });
  } catch (error) {
    console.error('获取今日打卡状态失败:', error);
    res.status(500).json({ error: '获取今日打卡状态失败' });
  }
}

// 获取历史统计数据
async function getMyDashboardStats(req, res) {
  try {
    const userId = req.user.id;
    const { templateNames, days = 30 } = req.query;

    if (!templateNames) {
      return res.status(400).json({ error: 'templateNames 参数不能为空' });
    }

    const names = templateNames.split(',').map(n => n.trim());
    const daysNum = Math.min(parseInt(days) || 30, 365);

    // 使用8点边界计算时间范围
    const timezoneOffset = parseInt(req.query.timezoneOffset) || -480;
    const { todayStart } = getDayBoundary(timezoneOffset);

    // N天前的开始（从今天8点往前推）
    const rangeStart = new Date(todayStart);
    rangeStart.setUTCDate(rangeStart.getUTCDate() - daysNum + 1);

    // 转回 UTC
    const queryStart = new Date(rangeStart.getTime() + timezoneOffset * 60 * 1000);
    const queryEnd = new Date(todayStart.getTime() + timezoneOffset * 60 * 1000);
    queryEnd.setUTCDate(queryEnd.getUTCDate() + 1);

    // 获取所有提交记录
    const submissions = await prisma.ruleSubmission.findMany({
      where: {
        userId,
        createdAt: {
          gte: queryStart,
          lt: queryEnd
        },
        template: {
          name: { in: names }
        }
      },
      include: {
        template: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 统计汇总
    const summary = {
      total: submissions.length,
      approved: 0,
      pending: 0,
      rejected: 0
    };

    // 按模板统计
    const byTemplate = {};
    for (const name of names) {
      byTemplate[name] = { approved: 0, pending: 0, rejected: 0, total: 0 };
    }

    // 按日期统计（用于趋势图）
    const byDate = {};

    // 用于计算连续完成天数（每天3项挑战都通过）
    const completedDates = new Set();

    for (const sub of submissions) {
      const templateName = sub.template.name;
      const status = sub.status;

      // 汇总统计
      if (status === 'APPROVED') summary.approved++;
      else if (status === 'PENDING') summary.pending++;
      else if (status === 'REJECTED') summary.rejected++;

      // 按模板统计
      if (byTemplate[templateName]) {
        byTemplate[templateName].total++;
        if (status === 'APPROVED') byTemplate[templateName].approved++;
        else if (status === 'PENDING') byTemplate[templateName].pending++;
        else if (status === 'REJECTED') byTemplate[templateName].rejected++;
      }

      // 按日期统计
      const subLocalTime = new Date(sub.createdAt.getTime() - timezoneOffset * 60 * 1000);
      const dateKey = subLocalTime.toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { submitted: 0, approved: 0, pending: 0, rejected: 0, approvedTemplates: new Set() };
      }
      byDate[dateKey].submitted++;
      if (status === 'APPROVED') {
        byDate[dateKey].approved++;
        byDate[dateKey].approvedTemplates.add(templateName);
      } else if (status === 'PENDING') {
        byDate[dateKey].pending++;
      } else if (status === 'REJECTED') {
        byDate[dateKey].rejected++;
      }
    }

    // 标记3项挑战都完成的日期
    for (const [dateKey, dayData] of Object.entries(byDate)) {
      if (dayData.approvedTemplates.size >= 3) {
        completedDates.add(dateKey);
      }
    }

    // 计算连续完成天数（如果不含今天，则从昨天开始算）
    let streak = 0;
    let checkDate = new Date(todayStart);
    const todayKey = checkDate.toISOString().split('T')[0];
    
    // 如果今天没完成，尝试从昨天开始接续
    if (!completedDates.has(todayKey)) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    while (true) {
      const dateKey = checkDate.toISOString().split('T')[0];
      if (completedDates.has(dateKey)) {
        streak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    }

    // 构建趋势数据（最近7天）
    const trend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setUTCDate(d.getUTCDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayData = byDate[dateKey];
      trend.push({
        date: dateKey,
        submitted: dayData?.submitted || 0,
        approved: dayData?.approved || 0,
        pending: dayData?.pending || 0,
        rejected: dayData?.rejected || 0,
        completed: completedDates.has(dateKey) // 标记该天是否3项全部完成
      });
    }

    // 计算通过率
    const passRate = summary.total > 0
      ? Math.round((summary.approved / summary.total) * 100)
      : 0;

    // 计算应提交天数和缺失天数
    const expectedDays = daysNum * names.length;
    const missing = expectedDays - summary.total;

    res.json({
      summary: {
        ...summary,
        missing: Math.max(0, missing),
        passRate
      },
      byTemplate,
      byDate: Object.fromEntries(
        Object.entries(byDate).map(([k, v]) => [k, {
          submitted: v.submitted,
          approved: v.approved,
          pending: v.pending,
          rejected: v.rejected,
          // 前端期望 completed 是对象格式：{ "模板名": true, ... }
          completed: Object.fromEntries([...v.approvedTemplates].map(name => [name, true])),
          points: 0 // 积分在领取奖励时计算
        }])
      ),
      trend,
      streak,
      streakDays: streak, // 兼容前端字段名
      queryRange: {
        start: queryStart.toISOString().split('T')[0],
        end: new Date(queryEnd.getTime() - 1).toISOString().split('T')[0],
        days: daysNum
      }
    });
  } catch (error) {
    console.error('获取Dashboard统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
}

// 获取全量仪表盘统计数据（所有参与过的项目）
async function getMyFullDashboardStats(req, res) {
  try {
    const userId = req.user.id;
    const { range = '30d' } = req.query; // 7d, 30d, 90d, 365d, all
    const timezoneOffset = parseInt(req.query.timezoneOffset) || -480;

    // 使用8点边界计算时间范围
    const { todayStart } = getDayBoundary(timezoneOffset);

    // 根据 range 计算查询范围
    let queryStart = null;
    let daysNum = 0;
    if (range === 'all') {
      queryStart = new Date(0); // 从最早开始
      daysNum = 0;
    } else {
      daysNum = parseInt(range) || 30;
      const rangeStart = new Date(todayStart);
      rangeStart.setUTCDate(rangeStart.getUTCDate() - daysNum + 1);
      queryStart = new Date(rangeStart.getTime() + timezoneOffset * 60 * 1000);
    }

    const queryEnd = new Date(todayStart.getTime() + timezoneOffset * 60 * 1000);
    queryEnd.setUTCDate(queryEnd.getUTCDate() + 1);

    // 获取用户注册时间，动态计算加入天数
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true }
    });

    // 动态计算加入天数（基于用户注册时间）
    const now = new Date();
    let joinedDays = 0;
    if (user?.createdAt) {
      joinedDays = Math.floor((now - user.createdAt) / (1000 * 60 * 60 * 24)) + 1; // +1 包含注册当天
    }

    // 获取用户的所有提交记录
    const whereClause = { userId };
    if (range !== 'all') {
      whereClause.createdAt = { gte: queryStart, lt: queryEnd };
    }

    const submissions = await prisma.ruleSubmission.findMany({
      where: whereClause,
      include: {
        template: {
          include: { type: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // ===== 1. 汇总统计 =====
    const summary = {
      total: submissions.length,
      approved: 0,
      pending: 0,
      rejected: 0,
      totalPoints: 0
    };

    // ===== 2. 按模板统计 =====
    const byTemplate = {};

    // ===== 3. 按类型统计（requireImage/Audio/Link/Text）=====
    const byRequirement = {
      image: { total: 0, approved: 0, points: 0 },
      audio: { total: 0, approved: 0, points: 0 },
      link: { total: 0, approved: 0, points: 0 },
      text: { total: 0, approved: 0, points: 0 }
    };

    // ===== 4. 按技术类型统计 =====
    const byRuleType = {};

    // ===== 5. 按日期统计（用于趋势图和热力图）=====
    const byDate = {};

    // ===== 6. 用于计算连续通过天数 =====
    const approvedDates = new Set();

    // ===== 7. 时间维度统计 =====
    // 使用日期字符串计算，避免UTC方法导致的时区问题
    const todayDateKey = todayStart.toISOString().split('T')[0];
    const [year, month, day] = todayDateKey.split('-').map(Number);

    // 基于本地日期创建正确的时间点
    const todayLocalDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = todayLocalDate.getUTCDay(); // 现在是用户本地日期的星期几

    // 本周开始（周日为一周开始）
    const weekStart = new Date(todayLocalDate);
    weekStart.setUTCDate(todayLocalDate.getUTCDate() - dayOfWeek);
    const weekStartKey = weekStart.toISOString().split('T')[0];

    // 本月开始
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthStartKey = `${year}-${String(month).padStart(2, '0')}-01`;

    // 今年开始
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearStartKey = `${year}-01-01`;

    const timeStats = {
      today: { submitted: 0, approved: 0, points: 0 },
      thisWeek: { submitted: 0, approved: 0, points: 0 },
      thisMonth: { submitted: 0, approved: 0, points: 0 },
      thisYear: { submitted: 0, approved: 0, points: 0 }
    };

    // 遍历所有提交记录进行统计
    for (const sub of submissions) {
      const template = sub.template;
      const templateName = template.name;
      const typeName = template.type?.name || '未分类';
      const status = sub.status;
      const points = sub.pointsAwarded || 0;

      // 汇总统计
      if (status === 'APPROVED') {
        summary.approved++;
        summary.totalPoints += points;
      } else if (status === 'PENDING') {
        summary.pending++;
      } else if (status === 'REJECTED') {
        summary.rejected++;
      }

      // 按模板统计
      if (!byTemplate[templateName]) {
        byTemplate[templateName] = {
          templateId: template.id,
          approved: 0, pending: 0, rejected: 0, total: 0, points: 0
        };
      }
      byTemplate[templateName].total++;
      if (status === 'APPROVED') {
        byTemplate[templateName].approved++;
        byTemplate[templateName].points += points;
      } else if (status === 'PENDING') {
        byTemplate[templateName].pending++;
      } else if (status === 'REJECTED') {
        byTemplate[templateName].rejected++;
      }

      // 按提交类型统计
      if (template.requireImage && sub.images?.length > 0) {
        byRequirement.image.total++;
        if (status === 'APPROVED') {
          byRequirement.image.approved++;
          byRequirement.image.points += points;
        }
      }
      if (template.requireAudio && sub.audios?.length > 0) {
        byRequirement.audio.total++;
        if (status === 'APPROVED') {
          byRequirement.audio.approved++;
          byRequirement.audio.points += points;
        }
      }
      if (template.requireLink && sub.link) {
        byRequirement.link.total++;
        if (status === 'APPROVED') {
          byRequirement.link.approved++;
          byRequirement.link.points += points;
        }
      }
      if (template.requireText && sub.content) {
        byRequirement.text.total++;
        if (status === 'APPROVED') {
          byRequirement.text.approved++;
          byRequirement.text.points += points;
        }
      }

      // 按技术类型统计
      if (!byRuleType[typeName]) {
        byRuleType[typeName] = {
          typeId: template.type?.id,
          approved: 0, pending: 0, rejected: 0, total: 0, points: 0
        };
      }
      byRuleType[typeName].total++;
      if (status === 'APPROVED') {
        byRuleType[typeName].approved++;
        byRuleType[typeName].points += points;
      } else if (status === 'PENDING') {
        byRuleType[typeName].pending++;
      } else if (status === 'REJECTED') {
        byRuleType[typeName].rejected++;
      }

      // 按日期统计
      const subLocalTime = new Date(sub.createdAt.getTime() - timezoneOffset * 60 * 1000);
      const dateKey = subLocalTime.toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { submitted: 0, approved: 0, pending: 0, rejected: 0, points: 0 };
      }
      byDate[dateKey].submitted++;
      if (status === 'APPROVED') {
        byDate[dateKey].approved++;
        byDate[dateKey].points += points;
        approvedDates.add(dateKey);
      } else if (status === 'PENDING') {
        byDate[dateKey].pending++;
      } else if (status === 'REJECTED') {
        byDate[dateKey].rejected++;
      }

      // 时间维度统计（使用日期字符串比较，避免时区问题）
      if (dateKey === todayDateKey) {
        timeStats.today.submitted++;
        if (status === 'APPROVED') {
          timeStats.today.approved++;
          timeStats.today.points += points;
        }
      }
      if (dateKey >= weekStartKey) {
        timeStats.thisWeek.submitted++;
        if (status === 'APPROVED') {
          timeStats.thisWeek.approved++;
          timeStats.thisWeek.points += points;
        }
      }
      if (dateKey >= monthStartKey) {
        timeStats.thisMonth.submitted++;
        if (status === 'APPROVED') {
          timeStats.thisMonth.approved++;
          timeStats.thisMonth.points += points;
        }
      }
      if (dateKey >= yearStartKey) {
        timeStats.thisYear.submitted++;
        if (status === 'APPROVED') {
          timeStats.thisYear.approved++;
          timeStats.thisYear.points += points;
        }
      }
    }

    // 计算连续通过天数（如果不含今天，则从昨天开始算）
    let approvalStreak = 0;
    let checkDate = new Date(todayStart);
    const todayKey = checkDate.toISOString().split('T')[0];

    // 如果今天没有通过记录，尝试从昨天开始接续
    if (!approvedDates.has(todayKey)) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    while (true) {
      const dateKey = checkDate.toISOString().split('T')[0];
      if (approvedDates.has(dateKey)) {
        approvalStreak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    }

    // 构建趋势数据（根据 range 决定天数）
    const trendDays = range === 'all' ? 30 : Math.min(daysNum, 30);
    const trend = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setUTCDate(d.getUTCDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      trend.push({
        date: dateKey,
        ...(byDate[dateKey] || { submitted: 0, approved: 0, pending: 0, rejected: 0, points: 0 })
      });
    }

    // 构建热力图数据（最近365天）
    const heatmapDays = Math.min(range === 'all' ? 365 : daysNum, 365);
    const heatmap = [];
    for (let i = heatmapDays - 1; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setUTCDate(d.getUTCDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayData = byDate[dateKey];
      heatmap.push({
        date: dateKey,
        count: dayData?.submitted || 0,
        approved: dayData?.approved || 0
      });
    }

    // 计算通过率
    const passRate = summary.total > 0
      ? Math.round((summary.approved / summary.total) * 100)
      : 0;

    res.json({
      // 用户信息
      userInfo: {
        joinedDays,
        approvalStreak
      },
      // 汇总统计
      summary: {
        ...summary,
        passRate
      },
      // 按模板统计
      byTemplate,
      // 按提交类型统计
      byRequirement,
      // 按技术类型统计
      byRuleType,
      // 时间维度统计
      timeStats,
      // 趋势数据
      trend,
      // 热力图数据
      heatmap,
      // 查询范围
      queryRange: {
        range,
        start: range === 'all' ? null : queryStart.toISOString().split('T')[0],
        end: todayDateKey
      }
    });
  } catch (error) {
    console.error('获取全量Dashboard统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
}

// ========== 家长接口：查看孩子数据 ==========

/**
 * 验证家长与孩子的关系
 */
async function verifyParentChildRelation(parentId, childId) {
  const relation = await prisma.studentParent.findFirst({
    where: {
      parentId,
      childId,
    },
  });
  return !!relation;
}

/**
 * 家长获取孩子的今日打卡状态
 */
async function getChildTodayStatus(req, res) {
  try {
    const parentId = req.user.id;
    const { childId } = req.params;
    const { templateNames } = req.query;

    // 验证家长身份
    if (req.user.role !== 'PARENT') {
      return res.status(403).json({ error: '只有家长可以访问此接口' });
    }

    // 验证家长与孩子的关系
    const isValidRelation = await verifyParentChildRelation(parentId, childId);
    if (!isValidRelation) {
      return res.status(403).json({ error: '无权查看该孩子的数据' });
    }

    if (!templateNames) {
      return res.status(400).json({ error: 'templateNames 参数不能为空' });
    }

    const names = templateNames.split(',').map(n => n.trim());
    const timezoneOffset = parseInt(req.query.timezoneOffset) || -480;
    const { todayStart, queryStart, queryEnd } = getDayBoundary(timezoneOffset);

    const submissions = await prisma.ruleSubmission.findMany({
      where: {
        userId: childId,
        createdAt: { gte: queryStart, lt: queryEnd },
        template: { name: { in: names } }
      },
      include: {
        template: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = {};
    const processedTemplates = new Set();
    for (const sub of submissions) {
      const templateName = sub.template.name;
      if (!processedTemplates.has(templateName)) {
        result[templateName] = {
          status: sub.status,
          submissionId: sub.id,
          createdAt: sub.createdAt
        };
        processedTemplates.add(templateName);
      }
    }

    for (const name of names) {
      if (!result[name]) {
        result[name] = null;
      }
    }

    res.json({
      todayStatus: result,
      queryDate: todayStart.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('获取孩子今日状态失败:', error);
    res.status(500).json({ error: '获取数据失败' });
  }
}

/**
 * 家长获取孩子的全量仪表盘统计
 */
async function getChildFullDashboardStats(req, res) {
  try {
    const parentId = req.user.id;
    const { childId } = req.params;
    const { range = '30' } = req.query;
    const timezoneOffset = parseInt(req.query.timezoneOffset) || -480;

    // 验证家长身份
    if (req.user.role !== 'PARENT') {
      return res.status(403).json({ error: '只有家长可以访问此接口' });
    }

    // 验证家长与孩子的关系
    const isValidRelation = await verifyParentChildRelation(parentId, childId);
    if (!isValidRelation) {
      return res.status(403).json({ error: '无权查看该孩子的数据' });
    }

    // 以下逻辑与 getMyFullDashboardStats 相同，只是使用 childId 替代 req.user.id
    // 使用8点边界计算时间范围
    const { todayStart } = getDayBoundary(timezoneOffset);

    let queryStart = null;
    let daysNum = 0;
    if (range === 'all') {
      queryStart = new Date(0);
      daysNum = 0;
    } else {
      daysNum = parseInt(range) || 30;
      const rangeStart = new Date(todayStart);
      rangeStart.setUTCDate(rangeStart.getUTCDate() - daysNum + 1);
      queryStart = new Date(rangeStart.getTime() + timezoneOffset * 60 * 1000);
    }

    const queryEnd = new Date(todayStart.getTime() + timezoneOffset * 60 * 1000);
    queryEnd.setUTCDate(queryEnd.getUTCDate() + 1);

    // 获取孩子注册时间
    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { createdAt: true, username: true, profile: { select: { nickname: true } } }
    });

    const now = new Date();
    let joinedDays = 0;
    if (child?.createdAt) {
      joinedDays = Math.floor((now - child.createdAt) / (1000 * 60 * 60 * 24)) + 1;
    }

    // 获取提交记录
    const whereClause = { userId: childId };
    if (range !== 'all') {
      whereClause.createdAt = { gte: queryStart, lt: queryEnd };
    }

    const submissions = await prisma.ruleSubmission.findMany({
      where: whereClause,
      include: {
        template: {
          include: { type: { select: { id: true, name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 统计逻辑（与 getMyFullDashboardStats 相同）
    const summary = { total: submissions.length, approved: 0, pending: 0, rejected: 0, totalPoints: 0 };
    const byTemplate = {};
    const byRequirement = {
      image: { total: 0, approved: 0, points: 0 },
      audio: { total: 0, approved: 0, points: 0 },
      link: { total: 0, approved: 0, points: 0 },
      text: { total: 0, approved: 0, points: 0 }
    };
    const byRuleType = {};
    const byDate = {};
    const approvedDates = new Set();

    const todayDateKey = todayStart.toISOString().split('T')[0];
    const [year, month, day] = todayDateKey.split('-').map(Number);

    // 基于本地日期创建正确的时间点
    const todayLocalDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = todayLocalDate.getUTCDay();

    // 本周开始（周日为一周开始）
    const weekStart = new Date(todayLocalDate);
    weekStart.setUTCDate(todayLocalDate.getUTCDate() - dayOfWeek);
    const weekStartKey = weekStart.toISOString().split('T')[0];

    // 本月开始
    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthStartKey = `${year}-${String(month).padStart(2, '0')}-01`;

    // 今年开始
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearStartKey = `${year}-01-01`;

    const timeStats = {
      today: { submitted: 0, approved: 0, points: 0 },
      thisWeek: { submitted: 0, approved: 0, points: 0 },
      thisMonth: { submitted: 0, approved: 0, points: 0 },
      thisYear: { submitted: 0, approved: 0, points: 0 }
    };

    for (const sub of submissions) {
      const template = sub.template;
      const templateName = template.name;
      const typeName = template.type?.name || '未分类';
      const status = sub.status;
      const points = sub.pointsAwarded || 0;

      if (status === 'APPROVED') {
        summary.approved++;
        summary.totalPoints += points;
      } else if (status === 'PENDING') {
        summary.pending++;
      } else if (status === 'REJECTED') {
        summary.rejected++;
      }

      if (!byTemplate[templateName]) {
        byTemplate[templateName] = { templateId: template.id, approved: 0, pending: 0, rejected: 0, total: 0, points: 0 };
      }
      byTemplate[templateName].total++;
      if (status === 'APPROVED') {
        byTemplate[templateName].approved++;
        byTemplate[templateName].points += points;
      } else if (status === 'PENDING') {
        byTemplate[templateName].pending++;
      } else if (status === 'REJECTED') {
        byTemplate[templateName].rejected++;
      }

      if (template.requireImage && sub.images?.length > 0) {
        byRequirement.image.total++;
        if (status === 'APPROVED') { byRequirement.image.approved++; byRequirement.image.points += points; }
      }
      if (template.requireAudio && sub.audios?.length > 0) {
        byRequirement.audio.total++;
        if (status === 'APPROVED') { byRequirement.audio.approved++; byRequirement.audio.points += points; }
      }
      if (template.requireLink && sub.link) {
        byRequirement.link.total++;
        if (status === 'APPROVED') { byRequirement.link.approved++; byRequirement.link.points += points; }
      }
      if (template.requireText && sub.content) {
        byRequirement.text.total++;
        if (status === 'APPROVED') { byRequirement.text.approved++; byRequirement.text.points += points; }
      }

      if (!byRuleType[typeName]) {
        byRuleType[typeName] = { typeId: template.type?.id, approved: 0, pending: 0, rejected: 0, total: 0, points: 0 };
      }
      byRuleType[typeName].total++;
      if (status === 'APPROVED') {
        byRuleType[typeName].approved++;
        byRuleType[typeName].points += points;
      } else if (status === 'PENDING') {
        byRuleType[typeName].pending++;
      } else if (status === 'REJECTED') {
        byRuleType[typeName].rejected++;
      }

      const subLocalTime = new Date(sub.createdAt.getTime() - timezoneOffset * 60 * 1000);
      const dateKey = subLocalTime.toISOString().split('T')[0];
      if (!byDate[dateKey]) {
        byDate[dateKey] = { submitted: 0, approved: 0, pending: 0, rejected: 0, points: 0 };
      }
      byDate[dateKey].submitted++;
      if (status === 'APPROVED') {
        byDate[dateKey].approved++;
        byDate[dateKey].points += points;
        approvedDates.add(dateKey);
      } else if (status === 'PENDING') {
        byDate[dateKey].pending++;
      } else if (status === 'REJECTED') {
        byDate[dateKey].rejected++;
      }

      if (dateKey === todayDateKey) {
        timeStats.today.submitted++;
        if (status === 'APPROVED') { timeStats.today.approved++; timeStats.today.points += points; }
      }
      if (dateKey >= weekStartKey) {
        timeStats.thisWeek.submitted++;
        if (status === 'APPROVED') { timeStats.thisWeek.approved++; timeStats.thisWeek.points += points; }
      }
      if (dateKey >= monthStartKey) {
        timeStats.thisMonth.submitted++;
        if (status === 'APPROVED') { timeStats.thisMonth.approved++; timeStats.thisMonth.points += points; }
      }
      if (dateKey >= yearStartKey) {
        timeStats.thisYear.submitted++;
        if (status === 'APPROVED') { timeStats.thisYear.approved++; timeStats.thisYear.points += points; }
      }
    }

    // 计算连续通过天数（如果不含今天，则从昨天开始算）
    let approvalStreak = 0;
    let checkDate = new Date(todayStart);
    const todayKey = checkDate.toISOString().split('T')[0];

    // 如果今天没有通过记录，尝试从昨天开始接续
    if (!approvedDates.has(todayKey)) {
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    }

    while (true) {
      const dateKey = checkDate.toISOString().split('T')[0];
      if (approvedDates.has(dateKey)) {
        approvalStreak++;
        checkDate.setUTCDate(checkDate.getUTCDate() - 1);
      } else {
        break;
      }
    }

    // 趋势数据
    const trendDays = range === 'all' ? 30 : Math.min(daysNum, 30);
    const trend = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setUTCDate(d.getUTCDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      trend.push({
        date: dateKey,
        ...(byDate[dateKey] || { submitted: 0, approved: 0, pending: 0, rejected: 0, points: 0 })
      });
    }

    // 热力图数据
    const heatmapDays = Math.min(range === 'all' ? 365 : daysNum, 365);
    const heatmap = [];
    for (let i = heatmapDays - 1; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setUTCDate(d.getUTCDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayData = byDate[dateKey];
      heatmap.push({
        date: dateKey,
        count: dayData?.submitted || 0,
        approved: dayData?.approved || 0
      });
    }

    const passRate = summary.total > 0 ? Math.round((summary.approved / summary.total) * 100) : 0;

    res.json({
      childInfo: {
        id: childId,
        username: child?.username,
        nickname: child?.profile?.nickname
      },
      userInfo: { joinedDays, approvalStreak },
      summary: { ...summary, passRate },
      byTemplate,
      byRequirement,
      byRuleType,
      timeStats,
      trend,
      heatmap,
      queryRange: {
        range,
        start: range === 'all' ? null : queryStart.toISOString().split('T')[0],
        end: todayDateKey
      }
    });
  } catch (error) {
    console.error('获取孩子Dashboard统计数据失败:', error);
    res.status(500).json({ error: '获取统计数据失败' });
  }
}

module.exports = {
  createSubmission,
  getMySubmissions,
  updateMySubmission,
  deleteMySubmission,
  getAllSubmissions,
  getPendingSubmissions,
  getPendingUsers,
  reviewSubmission,
  getSubmissionStats,
  addFavorite,
  removeFavorite,
  getMyFavorites,
  checkFavorites,
  getChildrenSubmissions,
  adminDeleteSubmission,
  getTodayStatus,
  getMyDashboardStats,
  getMyFullDashboardStats,
  // 家长接口
  getChildTodayStatus,
  getChildFullDashboardStats,
  getParentPendingSubmissions,
  parentReviewSubmission,
  // 每日挑战奖励
  getChallengeConfig,
  updateChallengeConfig,
  claimDailyReward,
  getDailyRewardStatus
};

// ========== 每日挑战完成奖励配置 ==========

// 默认配置
const DEFAULT_CHALLENGE_CONFIG = {
  basePoints: 300,         // 每日完成3项基础奖励
  streakBonus: 88,         // 连续天数单位奖励
  streakMaxDays: 100       // 连续天数封顶
};

// 每日挑战的3个固定模板名称（必须与前端 Challenges.vue 中的 templateName 一致）
const DAILY_CHALLENGE_TEMPLATES = [
  '日记(审批前提项/日)',
  '可汗学院数学进度',
  '背诗'
];

// 获取挑战配置
async function getChallengeConfig(req, res) {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'challenge_reward_config' }
    });

    const config = setting ? JSON.parse(setting.value) : DEFAULT_CHALLENGE_CONFIG;

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('获取挑战配置失败:', error);
    res.status(500).json({ error: '获取配置失败' });
  }
}

// 更新挑战配置（管理员）
async function updateChallengeConfig(req, res) {
  try {
    const { basePoints, streakBonus, streakMaxDays } = req.body;

    // 验证参数
    if (basePoints !== undefined && (basePoints < 0 || basePoints > 10000)) {
      return res.status(400).json({ error: '基础奖励积分范围: 0-10000' });
    }
    if (streakBonus !== undefined && (streakBonus < 0 || streakBonus > 1000)) {
      return res.status(400).json({ error: '连续奖励积分范围: 0-1000' });
    }
    if (streakMaxDays !== undefined && (streakMaxDays < 1 || streakMaxDays > 365)) {
      return res.status(400).json({ error: '封顶天数范围: 1-365' });
    }

    // 获取现有配置
    const existing = await prisma.systemSetting.findUnique({
      where: { key: 'challenge_reward_config' }
    });

    const currentConfig = existing ? JSON.parse(existing.value) : DEFAULT_CHALLENGE_CONFIG;

    // 合并更新
    const newConfig = {
      basePoints: basePoints !== undefined ? basePoints : currentConfig.basePoints,
      streakBonus: streakBonus !== undefined ? streakBonus : currentConfig.streakBonus,
      streakMaxDays: streakMaxDays !== undefined ? streakMaxDays : currentConfig.streakMaxDays
    };

    // 保存配置
    await prisma.systemSetting.upsert({
      where: { key: 'challenge_reward_config' },
      create: {
        key: 'challenge_reward_config',
        value: JSON.stringify(newConfig),
        type: 'json',
        description: '每日挑战完成奖励配置'
      },
      update: {
        value: JSON.stringify(newConfig)
      }
    });

    res.json({
      success: true,
      data: newConfig,
      message: '配置已更新'
    });
  } catch (error) {
    console.error('更新挑战配置失败:', error);
    res.status(500).json({ error: '更新配置失败' });
  }
}

// 获取每日奖励领取状态
async function getDailyRewardStatus(req, res) {
  try {
    const userId = req.user.id;
    const timezoneOffset = parseInt(req.query.timezoneOffset) || -480;

    // 计算今天的日期（考虑时区和8点边界）
    const { todayStart, todayDateKey } = getRewardDayBoundary(timezoneOffset);

    // 获取配置
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'challenge_reward_config' }
    });
    const config = setting ? JSON.parse(setting.value) : DEFAULT_CHALLENGE_CONFIG;

    // 检查今天是否已领取
    const todayReward = await prisma.dailyCompletionReward.findUnique({
      where: {
        userId_date: { userId, date: todayDateKey }
      }
    });

    // 统计今天通过审核的提交数量（只统计3个特定挑战模板）
    const approvedCount = await prisma.ruleSubmission.count({
      where: {
        userId,
        status: 'APPROVED',
        reviewedAt: {
          gte: todayStart,
          lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
        },
        template: {
          name: { in: DAILY_CHALLENGE_TEMPLATES }
        }
      }
    });

    // 计算连续天数（不包括今天）
    const streakDays = await calculateStreakDays(userId, todayDateKey, timezoneOffset);

    // 判断是否可以领取
    const canClaim = approvedCount >= 3 && !todayReward;

    // 计算预计奖励
    let estimatedReward = null;
    if (canClaim) {
      const effectiveStreak = Math.min(streakDays, config.streakMaxDays);
      const streakPoints = config.streakBonus * effectiveStreak;
      estimatedReward = {
        basePoints: config.basePoints,
        streakDays: effectiveStreak,
        streakPoints,
        totalPoints: config.basePoints + streakPoints
      };
    }

    res.json({
      success: true,
      data: {
        date: todayDateKey,
        approvedCount,
        requiredCount: 3,
        canClaim,
        claimed: !!todayReward,
        claimedReward: todayReward ? {
          basePoints: todayReward.basePoints,
          streakDays: todayReward.streakDays,
          streakPoints: todayReward.streakPoints,
          totalPoints: todayReward.totalPoints,
          claimedAt: todayReward.createdAt
        } : null,
        estimatedReward,
        config
      }
    });
  } catch (error) {
    console.error('获取每日奖励状态失败:', error);
    res.status(500).json({ error: '获取状态失败' });
  }
}

// 领取每日完成奖励
async function claimDailyReward(req, res) {
  try {
    const userId = req.user.id;
    const timezoneOffset = parseInt(req.body.timezoneOffset) || -480;

    // 计算今天的日期
    const { todayStart, todayDateKey } = getRewardDayBoundary(timezoneOffset);

    // 检查是否已领取
    const existingReward = await prisma.dailyCompletionReward.findUnique({
      where: {
        userId_date: { userId, date: todayDateKey }
      }
    });

    if (existingReward) {
      return res.status(400).json({ error: '今日奖励已领取' });
    }

    // 统计今天通过审核的提交数量（只统计3个特定挑战模板）
    const approvedCount = await prisma.ruleSubmission.count({
      where: {
        userId,
        status: 'APPROVED',
        reviewedAt: {
          gte: todayStart,
          lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
        },
        template: {
          name: { in: DAILY_CHALLENGE_TEMPLATES }
        }
      }
    });

    if (approvedCount < 3) {
      return res.status(400).json({
        error: `需要完成3项审核通过的任务才能领取，当前已完成 ${approvedCount} 项`
      });
    }

    // 获取配置
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'challenge_reward_config' }
    });
    const config = setting ? JSON.parse(setting.value) : DEFAULT_CHALLENGE_CONFIG;

    // 计算连续天数（从第二天开始算）
    const streakDays = await calculateStreakDays(userId, todayDateKey, timezoneOffset);
    const effectiveStreak = Math.min(streakDays, config.streakMaxDays);

    // 计算奖励
    const basePoints = config.basePoints;
    const streakPoints = config.streakBonus * effectiveStreak;
    const totalPoints = basePoints + streakPoints;

    // 事务：创建领取记录 + 发放积分
    const result = await prisma.$transaction(async (tx) => {
      // 创建领取记录
      const reward = await tx.dailyCompletionReward.create({
        data: {
          userId,
          date: todayDateKey,
          streakDays: effectiveStreak,
          basePoints,
          streakPoints,
          totalPoints
        }
      });

      // 发放积分
      await pointService.adjustPointsByAdmin(
        userId,
        totalPoints,
        null, // 系统发放
        `每日挑战完成奖励（连续${effectiveStreak}天）`,
        'daily_completion_reward',
        reward.id
      );

      return reward;
    });

    res.json({
      success: true,
      data: {
        basePoints,
        streakDays: effectiveStreak,
        streakPoints,
        totalPoints,
        message: `恭喜领取成功！获得 ${totalPoints} 积分`
      }
    });
  } catch (error) {
    console.error('领取每日奖励失败:', error);
    res.status(500).json({ error: '领取失败，请稍后重试' });
  }
}

// 计算连续完成天数（不包括今天）
// 从昨天开始往前数，检查每一天是否都有领取记录
async function calculateStreakDays(userId, todayDateKey, timezoneOffset) {
  // 获取历史领取记录
  const rewards = await prisma.dailyCompletionReward.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 101 // 最多100天
  });

  if (rewards.length === 0) {
    return 0;
  }

  // 构建已领取日期的 Set
  const rewardDates = new Set(rewards.map(r => r.date));

  // 从昨天开始检查连续性
  // 解析今天的日期
  const [year, month, day] = todayDateKey.split('-').map(Number);

  // 创建昨天的日期（纯日期计算，不涉及时区）
  const checkDate = new Date(Date.UTC(year, month - 1, day));
  checkDate.setUTCDate(checkDate.getUTCDate() - 1); // 从昨天开始

  let streak = 0;

  while (true) {
    const dateKey = checkDate.toISOString().split('T')[0];
    if (rewardDates.has(dateKey)) {
      streak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// 辅助函数：获取当天边界用于奖励计算（返回日期字符串）
// 每日挑战以早上9点为边界，9点前算前一天
function getRewardDayBoundary(timezoneOffset) {
  const DAY_START_HOUR = 9; // 一天从早上9点开始

  const now = new Date();
  // 计算用户本地时间：UTC时间 + 时区偏移（timezoneOffset 是分钟数，东八区为 -480）
  const localTimeMs = now.getTime() - timezoneOffset * 60 * 1000;
  const localNow = new Date(localTimeMs);

  // 获取用户本地的小时数（通过 UTC 方法，因为我们已经做了时区转换）
  const localHour = localNow.getUTCHours();

  // 获取用户本地的日期
  let localDate = new Date(localNow);

  // 如果当前本地时间在8点之前，算作前一天
  if (localHour < DAY_START_HOUR) {
    localDate.setUTCDate(localDate.getUTCDate() - 1);
  }

  // 提取年月日（用户本地日期）
  const year = localDate.getUTCFullYear();
  const month = localDate.getUTCMonth();
  const day = localDate.getUTCDate();

  // 计算用户本地的当天8点对应的 UTC 时间
  // 用户本地8点 = UTC时间 + timezoneOffset，所以 UTC时间 = 本地时间 - timezoneOffset
  const localDayStart = Date.UTC(year, month, day, DAY_START_HOUR, 0, 0, 0);
  const todayStartUtc = localDayStart + timezoneOffset * 60 * 1000;
  const todayStart = new Date(todayStartUtc);

  // 日期键使用用户本地日期
  const todayDateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { todayStart, todayDateKey };
}
