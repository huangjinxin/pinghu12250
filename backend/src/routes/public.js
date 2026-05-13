/**
 * 公开路由 - 无需登录即可访问
 */
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// 每日挑战的3个固定模板名称（基于 ruleSubmission）
const DAILY_CHALLENGE_TEMPLATES = [
  '日记(审批前提项/日)',
  '可汗学院数学进度',
  '背诗'
];

// 挑战项目配置（与前端保持一致）
const CHALLENGE_ITEMS = [
  { id: 'diary', name: '写日记', templateName: '日记(审批前提项/日)', color: 'purple' },
  { id: 'math', name: '数学学习', templateName: '可汗学院数学进度', color: 'blue' },
  { id: 'poetry', name: '背诵古诗', templateName: '背诗', color: 'orange' },
  { id: 'calligraphy', name: '书写练习', color: 'pink', isCalligraphy: true },
  { id: 'moments', name: '发朋友圈', color: 'teal', isSocial: 'moments' },
  { id: 'questions', name: '勤学好问', color: 'violet', isSocial: 'questions' },
  { id: 'typing', name: '打字训练', color: 'indigo', isTyping: true },
  { id: 'pinyin', name: '拼音练习', color: 'sky', isPinyin: true },
];

// 状态分值（用于排序）
const STATUS_SCORE = {
  NOT_SUBMITTED: 0,
  PENDING: 1,
  APPROVED: 2,
  REJECTED: 0,  // 已退回等同于未提交
};

/**
 * 获取8点边界的时间范围
 */
function getDayBoundary(timezoneOffset = -480) {
  const now = new Date();
  const localNow = new Date(now.getTime() - timezoneOffset * 60 * 1000);

  // 以8点为边界
  const hour = localNow.getUTCHours();
  let todayStart = new Date(localNow);
  todayStart.setUTCHours(8, 0, 0, 0);

  if (hour < 8) {
    todayStart.setUTCDate(todayStart.getUTCDate() - 1);
  }

  const queryStart = new Date(todayStart.getTime() + timezoneOffset * 60 * 1000);
  const queryEnd = new Date(queryStart.getTime() + 24 * 60 * 60 * 1000);

  return { todayStart, queryStart, queryEnd };
}

/**
 * 公开排行榜 - 获取所有学生的今日挑战状态
 * GET /api/public/leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const timezoneOffset = parseInt(req.query.timezoneOffset) || -480;
    const { queryStart, queryEnd } = getDayBoundary(timezoneOffset);

    // 1. 获取所有学生用户
    const students = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        profile: {
          select: {
            nickname: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // 2. 获取今日所有学生的提交记录（ruleSubmission）
    const submissions = await prisma.ruleSubmission.findMany({
      where: {
        userId: { in: students.map(s => s.id) },
        createdAt: {
          gte: queryStart,
          lt: queryEnd
        },
        template: {
          name: { in: DAILY_CHALLENGE_TEMPLATES }
        }
      },
      include: {
        template: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. 获取今日所有学生的书写作品（calligraphyWork）
    const studentIds = students.map(s => s.id);
    const calligraphyWorks = await prisma.calligraphyWork.findMany({
      where: {
        authorId: { in: studentIds },
        createdAt: { gte: queryStart, lt: queryEnd }
      },
      select: { authorId: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    // 3.5 获取今日社交任务数据（发朋友圈、勤学好问）
    const [dynamics, senderMappings] = await Promise.all([
      prisma.dynamic.findMany({
        where: { authorId: { in: studentIds }, createdAt: { gte: queryStart, lt: queryEnd } },
        select: { authorId: true }
      }),
      prisma.imessageSenderMapping.findMany({
        where: { userId: { in: studentIds } },
        select: { userId: true, sender: true }
      })
    ]);

    // 朋友圈：有dynamic即完成
    const momentsByUser = new Set();
    dynamics.forEach(d => momentsByUser.add(d.authorId));

    // 勤学好问：查iMessage记录
    const questionsByUser = new Set();
    if (senderMappings.length > 0) {
      const senderToUser = {};
      senderMappings.forEach(m => { senderToUser[m.sender] = m.userId; });
      const senders = senderMappings.map(m => m.sender);
      const qResults = await prisma.$queryRaw`
        SELECT DISTINCT "sender" FROM "ImessageChatLog"
        WHERE role = 'user' AND "sender" = ANY(${senders}) AND "createdAt" >= ${queryStart} AND "createdAt" < ${queryEnd}`;
      qResults.forEach(r => {
        if (senderToUser[r.sender]) questionsByUser.add(senderToUser[r.sender]);
      });
    }

    // 查询今日打字训练（有任意练习记录即视为完成）
    const typingPractices = await prisma.typingPractice.findMany({
      where: {
        authorId: { in: studentIds },
        createdAt: { gte: queryStart, lt: queryEnd }
      },
      select: { authorId: true },
    });

    // 查询今日拼音练习（charCount >= 20, accuracy >= 80 视为有效练习）
    const pinyinPractices = await prisma.pinyinPractice.findMany({
      where: {
        authorId: { in: studentIds },
        charCount: { gte: 20 },
        accuracy: { gte: 80 },
        createdAt: { gte: queryStart, lt: queryEnd }
      },
      select: { authorId: true },
    });

    const typingByUser = new Set();
    typingPractices.forEach(p => typingByUser.add(p.authorId));

    const pinyinByUser = new Set();
    pinyinPractices.forEach(p => pinyinByUser.add(p.authorId));

    // 4. 按用户分组提交记录
    const submissionsByUser = {};
    for (const sub of submissions) {
      if (!submissionsByUser[sub.userId]) {
        submissionsByUser[sub.userId] = {};
      }
      // 每个模板只取最新的状态
      const templateName = sub.template.name;
      if (!submissionsByUser[sub.userId][templateName]) {
        submissionsByUser[sub.userId][templateName] = sub.status;
      }
    }

    // 5. 按用户分组书写作品状态（每个用户只取最新的一条）
    const calligraphyByUser = {};
    for (const work of calligraphyWorks) {
      if (!calligraphyByUser[work.authorId]) {
        // 将 CalligraphyStatus 映射到统一的状态
        const statusMap = {
          PENDING: 'PENDING',
          APPROVED: 'APPROVED',
          REJECTED: 'REJECTED',
          ARCHIVED: 'APPROVED'  // 归档视为已通过
        };
        calligraphyByUser[work.authorId] = statusMap[work.status] || 'NOT_SUBMITTED';
      }
    }

    // 6. 构建用户排行榜数据
    const leaderboard = students.map(student => {
      const userSubmissions = submissionsByUser[student.id] || {};
      const calligraphyStatus = calligraphyByUser[student.id] || 'NOT_SUBMITTED';

      // 构建挑战状态
      const challenges = CHALLENGE_ITEMS.map(item => {
        let status;
        if (item.isCalligraphy) {
          status = calligraphyStatus;
        } else if (item.isSocial === 'moments') {
          status = momentsByUser.has(student.id) ? 'APPROVED' : 'NOT_SUBMITTED';
        } else if (item.isSocial === 'questions') {
          status = questionsByUser.has(student.id) ? 'APPROVED' : 'NOT_SUBMITTED';
        } else if (item.isTyping) {
          status = typingByUser.has(student.id) ? 'APPROVED' : 'NOT_SUBMITTED';
        } else if (item.isPinyin) {
          status = pinyinByUser.has(student.id) ? 'APPROVED' : 'NOT_SUBMITTED';
        } else {
          status = userSubmissions[item.templateName] || 'NOT_SUBMITTED';
        }
        return {
          id: item.id,
          name: item.name,
          color: item.color,
          status,
          score: STATUS_SCORE[status] || 0,
        };
      });

      // 计算总分
      const totalScore = challenges.reduce((sum, c) => sum + c.score, 0);
      const approvedCount = challenges.filter(c => c.status === 'APPROVED').length;
      const pendingCount = challenges.filter(c => c.status === 'PENDING').length;

      return {
        id: student.id,
        name: student.profile?.nickname || student.username,
        avatar: student.avatar,
        challenges,
        totalScore,
        approvedCount,
        pendingCount,
      };
    });

    // 7. 按总分降序排序（分数相同按通过数量）
    leaderboard.sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      return b.approvedCount - a.approvedCount;
    });

    res.json({
      success: true,
      data: {
        leaderboard,
        totalStudents: leaderboard.length,
        updateTime: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    res.status(500).json({ success: false, error: '获取排行榜失败' });
  }
});

/**
 * 统一动态 Feed - 聚合所有类型内容按时间排序
 * GET /api/public/unified-feed
 *
 * 包含：普通动态、照片、画廊作品、朗诵作品、日记分析、唐诗宋词
 */
router.get('/unified-feed', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 并行获取所有类型的数据
    const [posts, photos, galleryWorks, recitationWorks, diaryAnalysis, poetryWorks] = await Promise.all([
      // 1. 普通动态 (公开的，dynamicType = 'post' 或者为空)
      prisma.dynamic.findMany({
        where: {
          isPublic: true,
          OR: [
            { dynamicType: 'post' },
            { dynamicType: null }
          ],
          images: { isEmpty: true } // 无图片的动态为普通文字动态
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          },
          _count: { select: { Like: true, Comment: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // 2. 照片动态 (公开的，dynamicType = 'photo' 或有图片)
      prisma.dynamic.findMany({
        where: {
          isPublic: true,
          OR: [
            { dynamicType: 'photo' },
            { images: { isEmpty: false } }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          },
          _count: { select: { Like: true, Comment: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // 3. 画廊作品 (平面设计类型)
      prisma.ruleSubmission.findMany({
        where: {
          status: 'APPROVED',
          images: { isEmpty: false },
          template: { type: { name: '平面设计' } }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          },
          template: { select: { id: true, name: true, type: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // 4. 朗诵作品 (朗读背诵类型)
      prisma.ruleSubmission.findMany({
        where: {
          status: 'APPROVED',
          audios: { isEmpty: false },
          template: { type: { name: '朗读背诵' } }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          },
          template: { select: { id: true, name: true, type: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // 5. 日记 AI 分析
      prisma.diaryAnalysis.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // 6. 唐诗宋词作品 (poetry 栏目)
      prisma.creativeWork.findMany({
        where: {
          status: 'APPROVED',
          Category: {
          slug: 'poetry'
        }
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          },
          Category: { select: { name: true, icon: true, slug: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // 转换为统一格式
    const feedItems = [];

    // 普通动态
    for (const post of posts) {
      feedItems.push({
        id: post.id,
        type: 'post',
        content: post.content,
        images: post.images || [],
        mood: post.mood,
        author: {
          id: post.user.id,
          name: post.user.profile?.nickname || post.user.username,
          avatar: post.user.avatar
        },
        likesCount: post._count?.Like || 0,
        commentsCount: post._count?.Comment || 0,
        createdAt: post.createdAt
      });
    }

    // 照片动态
    for (const photo of photos) {
      feedItems.push({
        id: photo.id,
        type: 'photo',
        content: photo.content,
        images: photo.images || [],
        mood: photo.mood,
        photoType: photo.photoType,
        author: {
          id: photo.user.id,
          name: photo.user.profile?.nickname || photo.user.username,
          avatar: photo.user.avatar
        },
        likesCount: photo._count?.Like || 0,
        commentsCount: photo._count?.Comment || 0,
        createdAt: photo.createdAt
      });
    }

    // 画廊作品
    for (const work of galleryWorks) {
      feedItems.push({
        id: work.id,
        type: 'gallery',
        title: work.template?.name || '画廊作品',
        preview: work.images?.[0] || null,
        images: work.images || [],
        content: work.content || null,
        author: {
          id: work.user.id,
          name: work.user.profile?.nickname || work.user.username,
          avatar: work.user.avatar
        },
        meta: {
          typeName: work.template?.type?.name,
        },
        createdAt: work.createdAt,
        link: `/works?tab=gallery&id=${work.id}`
      });
    }

    // 朗诵作品
    for (const work of recitationWorks) {
      feedItems.push({
        id: work.id,
        type: 'recitation',
        title: work.template?.name || '朗诵作品',
        preview: null,
        audio: work.audios?.[0] || null,
        audios: work.audios || [],
        content: work.content || null,
        author: {
          id: work.user.id,
          name: work.user.profile?.nickname || work.user.username,
          avatar: work.user.avatar
        },
        meta: {
          typeName: work.template?.type?.name,
        },
        createdAt: work.createdAt,
        link: `/works?tab=recitation&id=${work.id}`
      });
    }

    // 日记 AI 分析
    for (const analysis of diaryAnalysis) {
      feedItems.push({
        id: analysis.id,
        type: 'diary-analysis',
        title: analysis.isBatch ? `${analysis.period || '本周'}日记分析` : '日记AI分析',
        preview: null,
        content: analysis.analysis?.substring(0, 100) || null,
        analysis: analysis.analysis,
        diarySnapshot: analysis.diarySnapshot,
        author: {
          id: analysis.user.id,
          name: analysis.user.profile?.nickname || analysis.user.username,
          avatar: analysis.user.avatar
        },
        meta: {
          grade: analysis.grade,
          totalScore: analysis.totalScore,
          diaryCount: analysis.diaryCount,
          isBatch: analysis.isBatch,
          period: analysis.period,
          modelName: analysis.modelName,
          tokensUsed: analysis.tokensUsed
        },
        createdAt: analysis.createdAt,
        link: `/works?tab=diary-analysis&id=${analysis.id}`
      });
    }

    // 唐诗宋词作品
    for (const work of poetryWorks) {
      feedItems.push({
        id: work.id,
        type: 'poetry',
        title: work.title,
        htmlCode: work.htmlCode,
        preview: null,
        content: null,
        author: {
          id: work.author.id,
          name: work.author.profile?.nickname || work.author.username,
          avatar: work.author.avatar
        },
        meta: {
          category: work.Category?.name,
          categorySlug: work.Category?.slug,
          categoryIcon: work.Category?.icon
        },
        createdAt: work.createdAt,
        link: `/works?tab=poetry&id=${work.id}`
      });
    }

    // 按 createdAt 倒序排序
    feedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 分页
    const total = feedItems.length;
    const paginatedItems = feedItems.slice(skip, skip + limit);

    res.json({
      success: true,
      data: {
        items: paginatedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取统一动态失败:', error);
    res.status(500).json({ success: false, error: '获取统一动态失败' });
  }
});

/**
 * 统一作品动态 Feed - 聚合作品广场各类内容
 * GET /api/public/works-feed
 *
 * 这是作品广场所有公开内容的统一视图，必须与各 Tab 数据完全一致
 */
router.get('/works-feed', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // 并行获取所有公开作品（不裁剪，保证数据完整）
    const [galleryWorks, recitationWorks, diaryAnalysis, poetryWorks] = await Promise.all([
      // 1. 画廊作品 (平面设计类型，与 GalleryTab 一致)
      prisma.ruleSubmission.findMany({
        where: {
          status: 'APPROVED',
          images: { isEmpty: false },
          template: {
            type: { name: '平面设计' }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          },
          template: {
            select: { id: true, name: true, type: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // 2. 朗诵作品 (与 RecitationTab 一致，类型名为"朗读背诵")
      prisma.ruleSubmission.findMany({
        where: {
          status: 'APPROVED',
          audios: { isEmpty: false },
          template: {
            type: { name: '朗读背诵' }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          },
          template: {
            select: { id: true, name: true, type: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // 3. 日记 AI 分析 (与 DiaryAnalysisTab 一致)
      prisma.diaryAnalysis.findMany({
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // 4. 唐诗宋词作品 (只查询 poetry 栏目，与 Works 页面一致)
      prisma.creativeWork.findMany({
        where: {
          status: 'APPROVED',
          Category: {
          slug: 'poetry'
        }
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } }
            }
          },
          Category: {
            select: { name: true, icon: true, slug: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // 转换为统一格式
    const feedItems = [];

    // 画廊作品
    for (const work of galleryWorks) {
      feedItems.push({
        id: work.id,
        type: 'gallery',
        title: work.template?.name || '画廊作品',
        preview: work.images?.[0] || null,
        images: work.images || [], // 返回所有图片用于弹窗
        content: work.content || null,
        author: {
          id: work.user.id,
          name: work.user.profile?.nickname || work.user.username,
          avatar: work.user.avatar
        },
        meta: {
          typeName: work.template?.type?.name,
        },
        createdAt: work.createdAt,
        link: `/works?tab=gallery&id=${work.id}`
      });
    }

    // 朗诵作品
    for (const work of recitationWorks) {
      feedItems.push({
        id: work.id,
        type: 'recitation',
        title: work.template?.name || '朗诵作品',
        preview: null,
        audio: work.audios?.[0] || null,
        audios: work.audios || [], // 返回所有音频
        content: work.content || null,
        author: {
          id: work.user.id,
          name: work.user.profile?.nickname || work.user.username,
          avatar: work.user.avatar
        },
        meta: {
          typeName: work.template?.type?.name,
        },
        createdAt: work.createdAt,
        link: `/works?tab=recitation&id=${work.id}`
      });
    }

    // 日记 AI 分析
    for (const analysis of diaryAnalysis) {
      feedItems.push({
        id: analysis.id,
        type: 'diary-analysis',
        title: analysis.isBatch ? `${analysis.period || '本周'}日记分析` : '日记AI分析',
        preview: null,
        content: analysis.analysis?.substring(0, 100) || null,
        analysis: analysis.analysis, // 完整分析内容用于弹窗
        diarySnapshot: analysis.diarySnapshot, // 日记快照
        author: {
          id: analysis.user.id,
          name: analysis.user.profile?.nickname || analysis.user.username,
          avatar: analysis.user.avatar
        },
        meta: {
          grade: analysis.grade,
          totalScore: analysis.totalScore,
          diaryCount: analysis.diaryCount,
          isBatch: analysis.isBatch,
          period: analysis.period,
          modelName: analysis.modelName,
          tokensUsed: analysis.tokensUsed,
          responseTime: analysis.responseTime
        },
        createdAt: analysis.createdAt,
        link: `/works?tab=diary-analysis&id=${analysis.id}`
      });
    }

    // 唐诗宋词作品
    for (const work of poetryWorks) {
      feedItems.push({
        id: work.id,
        type: 'poetry',
        title: work.title,
        htmlCode: work.htmlCode, // 返回 HTML 代码用于弹窗预览
        preview: null,
        content: null,
        author: {
          id: work.author.id,
          name: work.author.profile?.nickname || work.author.username,
          avatar: work.author.avatar
        },
        meta: {
          category: work.Category?.name,
          categorySlug: work.Category?.slug,
          categoryIcon: work.Category?.icon
        },
        createdAt: work.createdAt,
        link: `/works?tab=poetry&id=${work.id}`
      });
    }

    // 按 createdAt 倒序排序
    feedItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 分页
    const total = feedItems.length;
    const paginatedItems = feedItems.slice(skip, skip + limit);

    res.json({
      success: true,
      data: {
        items: paginatedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('获取作品动态失败:', error);
    res.status(500).json({ success: false, error: '获取作品动态失败' });
  }
});

module.exports = router;
