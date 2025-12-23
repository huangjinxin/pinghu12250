// 使用 Prisma 单例
const prisma = require('../lib/prisma');
const pointService = require('../services/pointService');

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
      where: { id: templateId },
      include: { type: true, standard: true }
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

    // 创建提交记录
    const submission = await prisma.ruleSubmission.create({
      data: {
        userId,
        templateId,
        content: content || '',
        images: Array.isArray(imageArray) ? imageArray : [],
        audios: Array.isArray(audioArray) ? audioArray : [],
        link: link || null,
        quantity: finalQuantity,
        status: 'PENDING'
      },
      include: {
        template: {
          include: {
            type: true,
            standard: true
          }
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
              standard: true
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
            standard: true
          }
        }
      }
    });

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
        username: { contains: username }
      };
    }

    // 规则模板名称搜索或技术类型筛选
    if (templateName || typeId) {
      where.template = {};
      if (templateName) {
        where.template.name = { contains: templateName };
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
              standard: true
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
          { profile: { nickname: { contains: username, mode: 'insensitive' } } }
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
              standard: true
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
          include: {
            type: true,
            standard: true
          }
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
      } catch (error) {
        console.error('调整积分失败:', error);
      }
    }

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
      data: { userId, templateId }
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
              standard: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    // 返回模板列表（带收藏标记）
    const templates = favorites.map(f => ({
      ...f.template,
      isFavorite: true,
      favoriteId: f.id
    }));

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
            include: {
              type: true,
              standard: true
            }
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
  adminDeleteSubmission
};
