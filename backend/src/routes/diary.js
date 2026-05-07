/**
 * 日记路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const pointService = require('../services/pointService');
const challengeService = require('../services/challengeService');
const achievementService = require('../services/achievementService');
const { sendCommentNotification } = require('../services/notificationService');

// 日记游戏化服务
const { getDiaryLevel, calculateWordCount } = require('../config/diaryLevels');
const { getLogicalDate, getLogicalDateTime, isBackfill } = require('../services/diaryDateService');
const diaryStatsService = require('../services/diaryStatsService');
const diaryAchievementService = require('../services/diaryAchievementService');

// RAG 嵌入服务
const { enqueueDiary: enqueueEmbedding } = require('../services/embeddingQueueService');
const { deleteDiaryEmbeddings } = require('../services/embeddingService');

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

// 日记内容验证函数
function validateDiaryContent(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, message: '日记内容不能为空~' };
  }

  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: '日记内容不能为空~' };
  }

  if (trimmed.length < 1200) {
    return { valid: false, message: '日记字数需要达到1200字以上才能提交审核~' };
  }

  if (/(.)\1{4,}/u.test(trimmed)) {
    return { valid: false, message: '检测到重复字符，请换个表达方式~' };
  }

  const timeWords = ['早上', '上午', '中午', '下午', '晚上', '夜里', '吃饭', '玩', '睡觉', '天气'];
  const hasTimeWord = timeWords.some(w => trimmed.includes(w));
  if (!hasTimeWord) {
    return { valid: false, message: '请在日记中加入时间词（如早上、晚上、天气等）~' };
  }

  return { valid: true };
}

// GET /api/diaries - 获取日记列表
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { userId, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = userId ? { authorId: userId } : { authorId: req.user.id };

    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where,
        include: {
          author: {
            select: { id: true, username: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.diary.count({ where }),
    ]);

    res.json({ diaries, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    next(error);
  }
});

// POST /api/diaries - 创建日记
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, content, mood, weather, tags = [], price, diaryDate, isPublic = true, wordStats, duplicateStats } = req.body;
    const userId = req.user.id;

    // 检查今天是否已提交过日记
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayDiaries = await prisma.diary.findMany({
      where: {
        authorId: userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        // 只有已通过的才计数，被退回的可以重新提交
        OR: [
          { status: 'APPROVED' },
          { status: null },
        ],
      },
      select: { id: true },
    });

    if (todayDiaries.length > 0) {
      return res.status(400).json({
        success: false,
        error: '今天已提交过日记，每人每天只能提交一次',
      });
    }

    const validation = validateDiaryContent(content);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.message });
    }

    // 计算字数和级别
    const wordCount = calculateWordCount(content);
    const levelInfo = getDiaryLevel(wordCount);

    // 计算日期相关字段
    const now = new Date();
    const submittedAt = now;
    const actualDiaryDate = diaryDate ? new Date(diaryDate) : now;
    const isBackfillDiary = diaryDate ? isBackfill(submittedAt, actualDiaryDate) : false;
    const logicalDate = getLogicalDateTime(actualDiaryDate);

    // 准备创建数据
    const createData = {
      authorId: req.user.id,
      title,
      content,
      mood,
      weather,
      isPublic,
      wordCount,
      wordLevel: levelInfo.level,
      logicalDate,
      isBackfill: isBackfillDiary,
      submittedAt,
      tags: {
        create: tags.map(tagId => ({ tagId })),
      },
    };

    // 保存提交时的字数统计和查重快照
    if (wordStats) createData.wordStats = wordStats;
    if (duplicateStats) createData.duplicateStats = duplicateStats;

    // 如果提供了自定义日期，使用它；否则使用默认的now()
    if (diaryDate) {
      createData.createdAt = actualDiaryDate;
    }

    const diary = await prisma.diary.create({
      data: createData,
    });

    // 如果设置了价格，创建付费内容记录
    if (price !== undefined && price !== null) {
      const priceValue = parseInt(price);
      if (priceValue >= 0 && priceValue <= 100) {
        await prisma.paidContent.create({
          data: {
            contentType: 'diary',
            contentId: diary.id,
            userId: req.user.id,
            price: priceValue,
          },
        });
      }
    }

    // 游戏化统计更新
    let statsResult = null;
    let newAchievements = [];

    try {
      // 更新日记统计
      statsResult = await diaryStatsService.updateStatsOnDiaryCreate(req.user.id, diary);

      // 检查成就
      newAchievements = await diaryAchievementService.checkAchievementsOnDiaryCreate(
        req.user.id,
        diary,
        statsResult.stats
      );

      // 如果段位升级，额外检查段位成就
      if (statsResult.rankChanged) {
        const rankAchievements = await diaryAchievementService.checkAchievementsOnRankUp(
          req.user.id,
          statsResult.newRank,
          statsResult.stats
        );
        newAchievements = [...newAchievements, ...rankAchievements];
      }
    } catch (error) {
      console.error('[Diary] 游戏化统计更新失败:', error);
    }

    // 根据字数奖励积分 (使用新的级别配置)
    try {
      const pointResult = await pointService.addPoints(levelInfo.ruleId, req.user.id, {
        targetType: 'diary',
        targetId: diary.id,
        description: `发布${wordCount}字日记（${levelInfo.name}级）`,
      });

      if (pointResult.success) {
        diary.earnedPoints = pointResult.log.points;
        diary.newTotalPoints = pointResult.totalPoints;
      }

      // 更新每日挑战进度
      challengeService.checkAndUpdateProgress(req.user.id, 'diary_create', {
        wordCount,
        count: 1,
      });

      // 检查通用成就
      achievementService.checkAchievements(req.user.id, 'diary_published', {
        count: 1,
      });
      achievementService.checkAchievements(req.user.id, 'diary_streak', {});
    } catch (error) {
      console.error('积分奖励失败:', error);
    }

    // 构建响应
    const response = {
      message: '日记创建成功',
      diary: {
        ...diary,
        wordCount,
        levelInfo,
      },
    };

    // 添加游戏化信息
    if (statsResult) {
      response.gameStats = {
        currentStreak: statsResult.stats.currentStreak,
        rank: statsResult.stats.rank,
        rankChanged: statsResult.rankChanged,
        oldRank: statsResult.oldRank,
        newRank: statsResult.newRank,
        streakIncreased: statsResult.streakIncreased,
      };
    }

    if (newAchievements.length > 0) {
      response.newAchievements = newAchievements.map(a => ({
        code: a.code,
        name: a.name,
        emoji: a.emoji,
        rewardPoints: a.rewardPoints,
      }));
    }

    // RAG: 将日记加入 Embedding 队列（后台异步，不影响响应）
    enqueueEmbedding(diary.id, req.user.id).catch(err => {
      console.error('[Diary] Embedding 入队失败:', err);
    });

    // 自动提交到奖罚管理审核
    let submissionResult = null;
    try {
      // 查找"日记(审批前提项/日)"规则模板
      const diaryTemplate = await prisma.ruleTemplate.findFirst({
        where: {
          name: '日记(审批前提项/日)',
          status: 'ENABLED',
        },
      });

      if (diaryTemplate) {
        // 生成日记公共链接
        const baseUrl = process.env.PUBLIC_URL || 'https://kids.706tech.cn';
        const diaryLink = `${baseUrl}/diary/${diary.id}`;

        // 格式化日期
        const dateStr = new Date().toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        });

        // 创建提交记录
        const submission = await prisma.ruleSubmission.create({
          data: {
            userId: req.user.id,
            templateId: diaryTemplate.id,
            content: `${title} ${wordCount}个字 ${dateStr}`,
            link: diaryLink,
            quantity: 1,
            status: 'PENDING',
          },
        });

        submissionResult = {
          submissionId: submission.id,
          templateName: diaryTemplate.name,
          points: diaryTemplate.points,
        };
      }
    } catch (error) {
      console.error('[Diary] 自动提交到奖罚管理失败:', error);
    }

    // 添加提交信息到响应
    if (submissionResult) {
      response.submission = submissionResult;
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// PUT /api/diaries/:id - 更新日记
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, mood, weather, isPublic, diaryDate } = req.body;

    const diary = await prisma.diary.findUnique({ where: { id } });

    if (!diary) return res.status(404).json({ error: '日记不存在' });
    if (diary.authorId !== req.user.id) return res.status(403).json({ error: '无权修改' });

    const updateData = { title, content, mood, weather };
    if (isPublic !== undefined) {
      updateData.isPublic = isPublic;
    }
    if (diaryDate) {
      const newDate = new Date(diaryDate);
      updateData.createdAt = newDate;
      updateData.logicalDate = getLogicalDateTime(newDate);
    }

    const updated = await prisma.diary.update({
      where: { id },
      data: updateData,
    });

    // RAG: 内容变化时重新入队生成 Embedding
    if (content && content !== diary.content) {
      enqueueEmbedding(id, req.user.id).catch(err => {
        console.error('[Diary] Embedding 入队失败:', err);
      });
    }

    res.json({ message: '更新成功', diary: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/diaries/:id - 删除日记
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    const diary = await prisma.diary.findUnique({ where: { id } });

    if (!diary) return res.status(404).json({ error: '日记不存在' });
    if (diary.authorId !== req.user.id) return res.status(403).json({ error: '无权删除' });

    // 扣除该日记相关的所有积分 (D009)
    try {
      await pointService.deductPointsOnDelete('diary', id);
    } catch (error) {
      console.error('扣除积分失败:', error);
    }

    // RAG: 删除对应的 Embedding
    deleteDiaryEmbeddings(id).catch(err => {
      console.error('[Diary] 删除 Embedding 失败:', err);
    });

    await prisma.diary.delete({ where: { id } });

    res.json({ message: '删除成功' });
  } catch (error) {
    next(error);
  }
});

// GET /api/diaries/:id/public - 公开访问日记详情（无需登录）
router.get('/:id/public', async (req, res, next) => {
  try {
    const { id } = req.params;

    const diary = await prisma.diary.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    // 获取匿名评论
    const comments = await prisma.diaryComment.findMany({
      where: { diaryId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ diary, comments });
  } catch (error) {
    next(error);
  }
});

// POST /api/diaries/:id/comments - 匿名评论（无需登录）
router.post('/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, nickname } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: '评论内容不能为空' });
    }

    // 检查日记是否存在
    const diary = await prisma.diary.findUnique({
      where: { id },
    });

    if (!diary) {
      return res.status(404).json({ error: '日记不存在' });
    }

    // 创建匿名评论
    const comment = await prisma.diaryComment.create({
      data: {
        diaryId: id,
        content: content.trim().slice(0, 500),
        nickname: (nickname || '匿名用户').slice(0, 20),
      },
    });

    // 发送通知给日记作者
    try {
      await sendCommentNotification(diary.authorId, { username: comment.nickname }, diary);
    } catch (error) {
      console.error('发送评论通知失败:', error);
    }

    res.status(201).json({ message: '评论成功', comment });
  } catch (error) {
    next(error);
  }
});

// POST /api/diaries/check-duplicate - 查重检测
router.post('/check-duplicate', authenticate, async (req, res, next) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || content.length < 800) {
      return res.status(400).json({
        success: false,
        error: '内容需要超过800字才能进行查重',
      });
    }

    // 获取用户所有日记
    const diaries = await prisma.diary.findMany({
      where: { authorId: userId },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (diaries.length === 0) {
      return res.json({
        success: true,
        data: {
          overallRate: 0,
          duplicates: [],
          message: '这是您的第一篇日记，无需查重',
        },
      });
    }

    // ========== 新策略：只检测大段落复制 ==========
    // 1. 按段落分割（双换行或单换行+标点）
    const paragraphs = content
      .split(/\n\n+|\n(?=[【\[])|(?<=[。！？])\n/)
      .map(p => p.trim())
      .filter(p => p.length >= 50); // 只检查50字以上的段落

    const duplicates = [];
    let totalDuplicateChars = 0;

    // 2. 检查每个段落是否在历史日记中出现
    for (const paragraph of paragraphs) {
      // 清理段落：移除时间标记如【早上】【中午】等
      const cleanParagraph = paragraph
        .replace(/【[^】]{1,6}】/g, '')
        .replace(/\[[^\]]{1,6}\]/g, '')
        .trim();

      // 清理后仍需50字以上
      if (cleanParagraph.length < 50) continue;

      for (const diary of diaries) {
        // 同样清理历史日记内容进行比对
        const cleanDiaryContent = diary.content
          .replace(/【[^】]{1,6}】/g, '')
          .replace(/\[[^\]]{1,6}\]/g, '');

        if (cleanDiaryContent.includes(cleanParagraph)) {
          // 找到重复段落
          const existingDup = duplicates.find(d => d.text === cleanParagraph);
          if (!existingDup) {
            duplicates.push({
              text: cleanParagraph.length > 100
                ? cleanParagraph.substring(0, 100) + '...'
                : cleanParagraph,
              fullText: cleanParagraph,
              length: cleanParagraph.length,
              foundIn: [{
                diaryId: diary.id,
                diaryTitle: diary.title,
                diaryDate: diary.createdAt,
              }],
            });
            totalDuplicateChars += cleanParagraph.length;
          } else {
            if (!existingDup.foundIn.find(f => f.diaryId === diary.id)) {
              existingDup.foundIn.push({
                diaryId: diary.id,
                diaryTitle: diary.title,
                diaryDate: diary.createdAt,
              });
            }
          }
          break;
        }
      }
    }

    // ========== 新增：自身重复检测（连续6字以上相同） ==========
    const selfRepeats = [];
    const minRepeatLength = 6; // 最小重复长度
    const seenPhrases = new Map(); // 记录已出现的短语及其位置

    // 滑动窗口检测重复短语
    for (let len = minRepeatLength; len <= 20; len++) { // 检测6-20字的重复
      for (let i = 0; i <= content.length - len; i++) {
        const phrase = content.substring(i, i + len);
        // 跳过纯标点或空白
        if (/^[\s，。！？、；：""''（）【】《》…—,.!?;:'\"()\[\]<>\n\r]+$/.test(phrase)) {
          continue;
        }

        if (seenPhrases.has(phrase)) {
          const firstPos = seenPhrases.get(phrase);
          // 确保不是重叠的位置
          if (i >= firstPos + len) {
            // 检查是否已经被更长的重复包含
            const alreadyCovered = selfRepeats.some(r =>
              (i >= r.positions[0] && i + len <= r.positions[0] + r.length) ||
              (i >= r.positions[1] && i + len <= r.positions[1] + r.length)
            );
            if (!alreadyCovered) {
              selfRepeats.push({
                text: phrase,
                length: len,
                positions: [firstPos, i],
                count: 2,
              });
            }
          }
        } else {
          seenPhrases.set(phrase, i);
        }
      }
    }

    // 合并重叠的重复项，保留最长的
    const mergedSelfRepeats = [];
    const sortedRepeats = selfRepeats.sort((a, b) => b.length - a.length);
    for (const repeat of sortedRepeats) {
      const isSubset = mergedSelfRepeats.some(r =>
        r.text.includes(repeat.text) ||
        (Math.abs(r.positions[0] - repeat.positions[0]) < r.length &&
         Math.abs(r.positions[1] - repeat.positions[1]) < r.length)
      );
      if (!isSubset) {
        mergedSelfRepeats.push(repeat);
      }
    }

    // 计算自身重复的字符数
    let selfRepeatChars = 0;
    for (const repeat of mergedSelfRepeats) {
      selfRepeatChars += repeat.length;
    }

    // ========== 新增：全站查重（检测与其他用户日记的重复） ==========
    const globalDuplicates = [];
    let totalGlobalDuplicateChars = 0;

    // 获取其他用户的日记（最近180天，限制100篇以控制性能）
    const allDiaries = await prisma.diary.findMany({
      where: {
        authorId: { not: userId },
        createdAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        title: true,
        authorId: true,
        content: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // 对每个段落进行全站比对
    for (const paragraph of paragraphs) {
      const cleanParagraph = paragraph
        .replace(/【[^】]{1,6}】/g, '')
        .replace(/\[[^\]]{1,6}\]/g, '')
        .trim();

      if (cleanParagraph.length < 50) continue;

      for (const diary of allDiaries) {
        const cleanDiaryContent = diary.content
          .replace(/【[^】]{1,6}】/g, '')
          .replace(/\[[^\]]{1,6}\]/g, '');

        if (cleanDiaryContent.includes(cleanParagraph)) {
          const existingDup = globalDuplicates.find(d => d.text === cleanParagraph);
          if (!existingDup) {
            globalDuplicates.push({
              text: cleanParagraph.length > 100
                ? cleanParagraph.substring(0, 100) + '...'
                : cleanParagraph,
              fullText: cleanParagraph,
              length: cleanParagraph.length,
              foundIn: [{
                diaryId: diary.id,
                diaryTitle: diary.title,
                diaryDate: diary.createdAt,
              }],
            });
            totalGlobalDuplicateChars += cleanParagraph.length;
          } else {
            if (!existingDup.foundIn.find(f => f.diaryId === diary.id)) {
              existingDup.foundIn.push({
                diaryId: diary.id,
                diaryTitle: diary.title,
                diaryDate: diary.createdAt,
              });
            }
          }
          break;
        }
      }
    }

    // 按重复长度排序，取前3个
    globalDuplicates.sort((a, b) => b.length - a.length);
    const topGlobalDuplicates = globalDuplicates.slice(0, 3).map(d => ({
      text: d.text,
      length: d.length,
      foundIn: d.foundIn,
    }));

    const globalRepeatRate = Math.round((totalGlobalDuplicateChars / content.length) * 100);

    // 计算重复率（基于段落级别的重复 + 自身重复 + 全站重复）
    const totalDuplicateWithSelf = totalDuplicateChars + selfRepeatChars + totalGlobalDuplicateChars;
    const overallRate = Math.round((totalDuplicateWithSelf / content.length) * 100);
    const selfRepeatRate = Math.round((selfRepeatChars / content.length) * 100);

    // 按重复长度排序，取前5个（段落级别不需要太多）
    duplicates.sort((a, b) => b.length - a.length);
    const topDuplicates = duplicates.slice(0, 5).map(d => ({
      text: d.text,
      length: d.length,
      foundIn: d.foundIn,
    }));

    // 取前5个自身重复
    const topSelfRepeats = mergedSelfRepeats.slice(0, 5).map(r => ({
      text: r.text,
      length: r.length,
      count: r.count,
    }));

    res.json({
      success: true,
      data: {
        overallRate,
        selfRepeatRate,
        globalRepeatRate,
        totalChars: content.length,
        duplicateChars: totalDuplicateChars,
        selfRepeatChars,
        globalDuplicateChars: totalGlobalDuplicateChars,
        duplicates: topDuplicates,
        selfRepeats: topSelfRepeats,
        globalDuplicates: topGlobalDuplicates,
        checkedDiaries: diaries.length,
        checkedGlobalDiaries: allDiaries.length,
        checkedParagraphs: paragraphs.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
