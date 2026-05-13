/**
 * 书写作品路由
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, optionalAuth } = require('../middleware/auth');
const aiService = require('../services/aiService');
const pointService = require('../services/pointService');
const achievementEmitter = require('../lib/achievementEmitter');
const { createCalligraphyAutomationTask } = require('../services/aiAutomationService');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { calligraphyPreviewDir, calligraphyCharDir } = require('../middleware/upload');

const calligraphyListSelect = {
  id: true,
  title: true,
  content: true,
  preview: true,
  previewUrl: true,
  previewThumbUrl: true,
  charCount: true,
  createdAt: true,
  status: true,
  evaluationScore: true,
  authorId: true,
  author: {
    select: {
      id: true,
      username: true,
      avatar: true,
      profile: { select: { nickname: true } }
    }
  },
  _count: { select: { CalligraphyLike: true } }
};

function extractListPreviewItems(work) {
  if (!Array.isArray(work?.content)) {
    return [];
  }

  return work.content
    .slice(0, 4)
    .map(item => ({
      character: item?.character || '',
      preview: item?.preview || null
    }));
}

function getWorkPreviewUrl(work) {
  return work.previewUrl || work.preview || null;
}

function serializeCalligraphyListWork(work, likedWorkIds = []) {
  const previewItems = extractListPreviewItems(work);
  const hasCharPreview = previewItems.some(item => item.preview);

  return {
    id: work.id,
    title: work.title,
    content: work.content,
    charCount: work.charCount,
    createdAt: work.createdAt,
    status: work.status,
    evaluationScore: work.evaluationScore,
    authorId: work.authorId,
    author: work.author,
    likesCount: work._count?.CalligraphyLike || 0,
    isLiked: likedWorkIds.includes(work.id),
    previewItems,
    preview: hasCharPreview ? null : getWorkPreviewUrl(work),
    previewUrl: work.previewUrl || null
  };
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }

  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64')
  };
}

function getImageExtension(mimeType = '') {
  const map = {
    'image/png': '.png',
    'image/webp': '.webp',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/gif': '.gif'
  };
  return map[mimeType.toLowerCase()] || '.png';
}

async function writeDataUrlImage(dataUrl, dir, prefix) {
  if (typeof dataUrl !== 'string') {
    return dataUrl || null;
  }
  if (dataUrl.startsWith('/uploads/')) {
    return dataUrl;
  }

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return dataUrl;
  }

  const hash = crypto.createHash('sha1').update(parsed.buffer).digest('hex');
  const ext = getImageExtension(parsed.mimeType);
  const fileName = `${prefix}-${hash}${ext}`;
  const filePath = path.join(dir, fileName);

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, parsed.buffer);
  }

  const relativeDir = path.relative(path.resolve(process.env.UPLOAD_DIR || './uploads'), dir).replace(/\\/g, '/');
  return `/uploads/${relativeDir}/${fileName}`;
}

async function persistCalligraphyAssets({ workId, preview, content }) {
  const previewUrl = await writeDataUrlImage(preview, calligraphyPreviewDir, workId || 'preview');

  let normalizedContent = content;
  if (Array.isArray(content)) {
    normalizedContent = await Promise.all(content.map(async (item, index) => ({
      ...item,
      preview: await writeDataUrlImage(item?.preview, calligraphyCharDir, `${workId || 'char'}-${index}`)
    })));
  }

  return { previewUrl, content: normalizedContent };
}

function getPreviewSource(work) {
  return work.previewUrl || work.preview || null;
}

/**
 * 将图片 URL 转换为 base64
 * @param {string} imageUrl - 图片路径（相对路径如 /uploads/xxx.jpg）
 */
async function fetchImageAsBase64(imageUrl) {
  if (!imageUrl) return null;

  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  // 如果是相对路径，转换为本地文件路径
  if (imageUrl.startsWith('/uploads/')) {
    const filePath = path.join(__dirname, '../../..', imageUrl);
    const buffer = await fs.readFile(filePath);
    const ext = path.extname(imageUrl).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }

  // 如果是完整 URL，通过 fetch 获取
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
  }

  return null;
}

// 获取公开作品列表（可选登录）
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'latest', search = '' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const keyword = String(search || '').trim();

    const orderBy = sort === 'popular'
      ? [{ CalligraphyLike: { _count: 'desc' } }, { createdAt: 'desc' }]
      : { createdAt: 'desc' };

    const where = {
      status: 'APPROVED',
      ...(keyword ? {
        author: {
          OR: [
            { username: { contains: keyword, mode: 'insensitive' } },
            { profile: { is: { nickname: { contains: keyword, mode: 'insensitive' } } } }
          ]
        }
      } : {})
    };

    const [works, total] = await Promise.all([
      prisma.calligraphyWork.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        select: calligraphyListSelect
      }),
      prisma.calligraphyWork.count({ where })
    ]);

    let likedWorkIds = [];
    if (req.user && works.length > 0) {
      const likes = await prisma.calligraphyLike.findMany({
        where: {
          userId: req.user.id,
          workId: { in: works.map(w => w.id) }
        },
        select: { workId: true }
      });
      likedWorkIds = likes.map(l => l.workId);
    }

    res.json({
      success: true,
      data: {
        works: works.map(work => serializeCalligraphyListWork(work, likedWorkIds)),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('获取作品列表失败:', error);
    res.status(500).json({ success: false, error: '获取作品列表失败' });
  }
});

// 获取我的作品列表（需要登录）
router.get('/my', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', sort = 'latest' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const keyword = String(search || '').trim();

    const orderBy = sort === 'popular'
      ? [{ CalligraphyLike: { _count: 'desc' } }, { createdAt: 'desc' }]
      : { createdAt: 'desc' };

    const where = {
      authorId: req.user.id,
      ...(keyword ? {
        title: { contains: keyword, mode: 'insensitive' }
      } : {})
    };

    const [works, total] = await Promise.all([
      prisma.calligraphyWork.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        select: calligraphyListSelect
      }),
      prisma.calligraphyWork.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        works: works.map(work => serializeCalligraphyListWork(work)),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('获取我的作品失败:', error);
    res.status(500).json({ success: false, error: '获取我的作品失败' });
  }
});


// 获取作品详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const work = await prisma.calligraphyWork.findUnique({
      where: { id: req.params.id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: { select: { nickname: true } }
          }
        },
        _count: { select: { CalligraphyLike: true } }
      }
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    // 检查是否点赞
    let isLiked = false;
    if (req.user) {
      const like = await prisma.calligraphyLike.findUnique({
        where: {
          userId_workId: { userId: req.user.id, workId: work.id }
        }
      });
      isLiked = !!like;
    }

    res.json({
      success: true,
      data: {
        ...work,
        preview: getWorkPreviewUrl(work),
        previewUrl: work.previewUrl || null,
        likesCount: work._count.CalligraphyLike,
        isLiked,
        _count: undefined
      }
    });
  } catch (error) {
    console.error('获取作品详情失败:', error);
    res.status(500).json({ success: false, error: '获取作品详情失败' });
  }
});

// 创建作品（需要登录）
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, content, preview, fontId, charCount } = req.body;

    if (!title || !content || !preview) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    // 验证字体（如果提供）- 字体是共享的，只需验证存在即可
    if (fontId) {
      const font = await prisma.userFont.findUnique({
        where: { id: fontId }
      });
      if (!font) {
        return res.status(400).json({ success: false, error: '字体不存在' });
      }
    }

    const persisted = await persistCalligraphyAssets({
      workId: req.user.id,
      preview,
      content
    });

    const work = await prisma.calligraphyWork.create({
      data: {
        authorId: req.user.id,
        title,
        content: persisted.content,
        preview,
        previewUrl: persisted.previewUrl,
        fontId,
        charCount: charCount || title.length
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: { select: { nickname: true } }
          }
        }
      }
    });

    achievementEmitter.emit('task:completed', {
      userId: req.user.id,
      taskType: 'calligraphy',
      data: { title, charCount: charCount || 0 },
    });

    res.json({ success: true, data: work });
  } catch (error) {
    console.error('创建作品失败:', error);
    res.status(500).json({ success: false, error: '创建作品失败' });
  }
});

// 删除作品（需要登录，只能删除自己的）
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const work = await prisma.calligraphyWork.findFirst({
      where: { id: req.params.id, authorId: req.user.id }
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在或无权删除' });
    }

    await prisma.calligraphyWork.delete({ where: { id: work.id } });

    res.json({ success: true });
  } catch (error) {
    console.error('删除作品失败:', error);
    res.status(500).json({ success: false, error: '删除作品失败' });
  }
});

// 点赞/取消点赞（需要登录）
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const work = await prisma.calligraphyWork.findUnique({
      where: { id: req.params.id }
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    // 检查是否已点赞
    const existingLike = await prisma.calligraphyLike.findUnique({
      where: {
        userId_workId: { userId: req.user.id, workId: work.id }
      }
    });

    if (existingLike) {
      // 取消点赞
      await prisma.calligraphyLike.delete({ where: { id: existingLike.id } });
      const likeCount = await prisma.calligraphyLike.count({ where: { workId: work.id } });
      res.json({ success: true, data: { liked: false, likeCount } });
    } else {
      // 点赞
      await prisma.calligraphyLike.create({
        data: {
          userId: req.user.id,
          workId: work.id
        }
      });
      const likeCount = await prisma.calligraphyLike.count({ where: { workId: work.id } });
      res.json({ success: true, data: { liked: true, likeCount } });
    }
  } catch (error) {
    console.error('点赞操作失败:', error);
    res.status(500).json({ success: false, error: '点赞操作失败' });
  }
});

// 获取待审核作品列表（管理员）
router.get('/review/list', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER') {
      return res.status(403).json({ success: false, error: '无权限' });
    }

    const { page = 1, limit = 20, status = 'all' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = status === 'all' ? {} : { status: status === 'PENDING' ? 'PENDING' : status };

    const [works, total] = await Promise.all([
      prisma.calligraphyWork.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        select: calligraphyListSelect
      }),
      prisma.calligraphyWork.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        works: works.map(work => serializeCalligraphyListWork(work)),
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('获取审核列表失败:', error);
    res.status(500).json({ success: false, error: '获取审核列表失败' });
  }
});


// 审核作品（管理员）
router.post('/:id/review', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER') {
      return res.status(403).json({ success: false, error: '无权限' });
    }

    const { status, reviewNote, points = 0 } = req.body;
    if (!['APPROVED', 'REJECTED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ success: false, error: '无效状态' });
    }

    const work = await prisma.calligraphyWork.findUnique({
      where: { id: req.params.id }
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    const updated = await prisma.calligraphyWork.update({
      where: { id: work.id },
      data: {
        status,
        reviewNote,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      }
    });

    // 审核通过时发放积分
    if (status === 'APPROVED' && points > 0) {
      await pointService.adjustPointsByAdmin(
        work.authorId,
        points,
        req.user.id,
        '书写作品审核通过奖励',
        'CalligraphyWork',
        work.id
      );
    }

    if (status === 'APPROVED') {
      await createCalligraphyAutomationTask(work.id);
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('审核失败:', error);
    res.status(500).json({ success: false, error: '审核失败' });
  }
});

// 批量审核（管理员）
router.post('/review/batch', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER') {
      return res.status(403).json({ success: false, error: '无权限' });
    }

    const { ids, status, reviewNote, points = 0 } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请选择作品' });
    }
    if (!['APPROVED', 'REJECTED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ success: false, error: '无效状态' });
    }

    // 获取作品列表（用于发放积分）
    const works = await prisma.calligraphyWork.findMany({
      where: { id: { in: ids } },
      select: { id: true, authorId: true }
    });

    const result = await prisma.calligraphyWork.updateMany({
      where: { id: { in: ids } },
      data: {
        status,
        reviewNote,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
      }
    });

    // 审核通过时发放积分
    if (status === 'APPROVED' && points > 0) {
      for (const work of works) {
        await pointService.adjustPointsByAdmin(
          work.authorId,
          points,
          req.user.id,
          '书写作品审核通过奖励',
          'CalligraphyWork',
          work.id
        );
      }
    }

    if (status === 'APPROVED') {
      for (const work of works) {
        await createCalligraphyAutomationTask(work.id);
      }
    }

    res.json({ success: true, data: { count: result.count } });
  } catch (error) {
    console.error('批量审核失败:', error);
    res.status(500).json({ success: false, error: '批量审核失败' });
  }
});

// AI评分（管理员/老师可分析任意作品，普通用户仅可分析自己的作品）
router.post('/:id/evaluate', authenticate, async (req, res) => {
  try {
    const work = await prisma.calligraphyWork.findUnique({
      where: { id: req.params.id }
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    const isStaff = req.user.role === 'ADMIN' || req.user.role === 'TEACHER';
    if (!isStaff && work.authorId !== req.user.id) {
      return res.status(403).json({ success: false, error: '无权限操作' });
    }

    // 获取 AI 配置
    const aiConfig = await aiService.getDefaultConfig('llm');
    if (!aiConfig) {
      return res.status(500).json({ success: false, error: '未配置 AI 模型' });
    }

    // 将图片 URL 转换为 base64
    let imageBase64 = null;
    if (work.preview) {
      try {
        imageBase64 = await fetchImageAsBase64(work.preview);
      } catch (imgError) {
        console.error('获取图片失败:', imgError);
        // 继续执行，但不传图片
      }
    }

    // 获取自定义提示词或使用默认
    let promptTemplate = await prisma.aiPrompt.findUnique({ where: { key: 'calligraphy_eval' } });
    const systemPrompt = buildCalligraphyPrompt(work.title, work.charCount, promptTemplate?.content);
    const userPrompt = `请基于这份书法作品内容进行评分。\n作品标题：${work.title}\n字数：${work.charCount}`;

    // 调用 AI（纯文本模式，超时20分钟）
    const result = await aiService.callApi(
      aiConfig,
      '',
      `${systemPrompt}\n\n${userPrompt}`,
      null,
      1200000
    );

    if (!result.success) {
      return res.status(500).json({ success: false, error: 'AI 分析失败' });
    }

    // 解析响应
    const evaluation = parseCalligraphyResponse(result.content);

    // 更新作品评分
    const updated = await prisma.calligraphyWork.update({
      where: { id: work.id },
      data: {
        evaluationScore: evaluation.overallScore,
        evaluationData: evaluation,
        evaluatedAt: new Date(),
        evaluatedBy: req.user.id
      }
    });

    res.json({ success: true, data: { score: evaluation.overallScore, evaluation } });
  } catch (error) {
    console.error('AI评分失败:', error);
    res.status(500).json({ success: false, error: 'AI评分失败' });
  }
});

/**
 * 提取文本中的汉字
 */
function extractChineseChars(text) {
  if (!text) return [];
  return text.match(/[\u4e00-\u9fa5]/g) || [];
}

/**
 * 构建书法作品评分提示词
 */
function buildCalligraphyPrompt(text, charCount, customPrompt) {
  // 只提取汉字进行评分
  const chineseChars = extractChineseChars(text);
  const chineseText = chineseChars.join('');
  const actualCharCount = chineseChars.length;

  if (customPrompt) {
    return customPrompt
      .replace(/\{\{text\}\}/g, chineseText)
      .replace(/\{\{charCount\}\}/g, actualCharCount);
  }

  // 为每个字生成评分模板
  const charTemplate = chineseChars.map(c => `{"c":"${c}","s":0.50,"r":"横画偏短","imp":["注意横画长度","加强结构练习"]}`).join(',');

  return `你是一位极其严格的书法评审专家，对小学生书法评分必须非常苛刻。

要评分的汉字：${chineseText}

【评分原则-必须严格遵守】
1. 评分必须压低，大部分作品总分不超过60分
2. 重点找问题，不要给鼓励性分数
3. 每个字都要单独评价，给出具体的改进建议
4. 发现问题要直接指出，不要委婉

【评分标准-严格打分】

字形相似度（满分50分）：
- 90%以上相似：40-50分（极少给）
- 75-89%相似：25-39分
- 60-74%相似：15-24分
- 40-59%相似：5-14分
- 40%以下或认不出：0-4分

笔画质量（满分30分）：
- 完美流畅：25-30分
- 基本流畅但有问题：15-24分
- 明显不流畅：5-14分
- 很差：0-4分

整体美观（满分20分）：
- 很美观：15-20分
- 一般：8-14分
- 较差：0-7分

【输出格式】只输出JSON：
{"chars":[${charTemplate}],"stroke":{"s":15,"r":"笔画整体评价"},"beauty":{"s":10,"r":"美观整体评价"},"summary":"总评","tips":["建议1","建议2"]}

【关键要求】
1. chars数组中每个字必须有：s(相似度0-1)、r(具体分析)、imp(改进建议数组)
2. similarity分数必须严格压低，大部分不超过0.6
3. overallScore总分必须压低，大部分作品不超过60分

【r字段示例】
- "横画不平，向右上倾斜约15度"
- "撇画过短，与捺画不协调"
- "结构松散，各部分间距过大"
- "笔画抖动明显，不够流畅"
- "整体向左倾斜，重心不稳"

【imp字段示例】
- "注意横画长度比例"
- "加强竖钩力度练习"
- "控制书写速度"
- "减少笔画抖动"

必须为每个字写具体的r和imp！不能省略！`;
}

/**
 * 清理和修复 JSON 字符串
 */
function sanitizeJsonString(str) {
  if (!str) return str;

  // 移除 BOM 和控制字符
  str = str.replace(/^\uFEFF/, '');
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 修复常见的 AI 输出错误
  // 1. "similarity": of 0.50 -> "similarity": 0.50
  str = str.replace(/:\s*of\s+(\d)/g, ': $1');

  // 2. 移除数组/对象末尾多余的逗号
  str = str.replace(/,(\s*[}\]])/g, '$1');

  // 3. 修复缺少逗号的情况
  str = str.replace(/\}(\s*)\{/g, '}, {');
  str = str.replace(/\](\s*)\[/g, '], [');

  // 4. 修复属性名没有引号的情况
  str = str.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');

  // 5. 修复单引号
  str = str.replace(/'/g, '"');

  // 6. 移除注释
  str = str.replace(/\/\/[^\n]*/g, '');
  str = str.replace(/\/\*[\s\S]*?\*\//g, '');

  // 7. 修复多余的引号
  str = str.replace(/""+/g, '"');

  // 8. 修复 "s": .50 -> "s": 0.50
  str = str.replace(/:\s*\.(\d)/g, ': 0.$1');

  return str;
}

/**
 * 尝试多种方式解析 JSON
 */
function tryParseJson(content) {
  // 方法1：直接解析
  try {
    return JSON.parse(content);
  } catch (e) {
    console.log('[书法评分] 直接解析失败:', e.message);
  }

  // 方法2：提取代码块
  const codeBlockMatch = content.match(/```(?:json)?[\s\n]*(\{[\s\S]*?\})[\s\n]*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(sanitizeJsonString(codeBlockMatch[1]));
    } catch (e) {
      console.log('[书法评分] 代码块解析失败:', e.message);
    }
  }

  // 方法3：提取 JSON 对象
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd > jsonStart) {
    let jsonStr = content.substring(jsonStart, jsonEnd + 1);
    jsonStr = sanitizeJsonString(jsonStr);

    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.log('[书法评分] 提取对象解析失败:', e.message);

      // 方法4：更激进的清理
      jsonStr = jsonStr
        .replace(/\n/g, ' ')
        .replace(/\r/g, '')
        .replace(/\t/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/,\s*,/g, ',')
        .replace(/\[\s*,/g, '[')
        .replace(/,\s*\]/g, ']')
        .replace(/\{\s*,/g, '{')
        .replace(/,\s*\}/g, '}');

      try {
        return JSON.parse(jsonStr);
      } catch (e2) {
        console.log('[书法评分] 激进清理后仍失败:', e2.message);
      }
    }
  }

  return null;
}

/**
 * 解析书法评分响应
 */
function parseCalligraphyResponse(content) {
  console.log('[书法评分] 原始响应长度:', content?.length || 0);
  console.log('[书法评分] 原始响应前500字:', content?.substring(0, 500));

  const parsed = tryParseJson(content);

  if (!parsed) {
    console.error('[书法评分] 所有解析方法都失败');
    return getDefaultEvaluation('JSON解析失败，请重试');
  }

  console.log('[书法评分] 解析成功，字段:', Object.keys(parsed));

  try {
    // 支持新旧两种格式
    // 新格式：{ chars: [...], stroke: {s, r}, beauty: {s, r} }
    // 旧格式：{ shapeMatch: { chars: [...] }, stroke: {...}, beauty: {...} }

    let charScores = [];
    let shapeComment = '';

    // 获取字符评分数组
    if (parsed.chars && Array.isArray(parsed.chars)) {
      // 新格式：chars 在顶层
      charScores = parsed.chars;
    } else if (parsed.shapeMatch) {
      charScores = parsed.shapeMatch.chars || parsed.shapeMatch.charScores || [];
      shapeComment = parsed.shapeMatch.comment || '';
    }

    console.log('[书法评分] 字符数量:', charScores.length);
    if (charScores.length > 0) {
      console.log('[书法评分] 第一个字符数据:', JSON.stringify(charScores[0]));
    }

    // 计算字形分数
    let shapeScore = 0;
    if (charScores.length > 0) {
      let totalSim = 0;
      let validCount = 0;

      for (const item of charScores) {
        let sim = item.s ?? item.similarity ?? item.score ?? 0;
        if (typeof sim === 'string') sim = parseFloat(sim) || 0;
        if (sim > 1) sim = sim / 100;
        sim = Math.max(0, Math.min(1, sim));
        totalSim += sim;
        validCount++;
      }

      if (validCount > 0) {
        const avgSim = totalSim / validCount;
        shapeScore = Math.round(avgSim * 50);
        console.log('[书法评分] 平均相似度:', avgSim.toFixed(2), '字形分:', shapeScore);
      }
    }

    // 笔画分数（支持新旧格式）
    const strokeData = parsed.stroke || parsed.strokeQuality || {};
    let strokeScore = Number(strokeData.s ?? strokeData.score) || 0;
    strokeScore = Math.min(30, Math.max(0, Math.round(strokeScore)));
    const strokeComment = strokeData.r || strokeData.comment || '';

    // 美观分数（支持新旧格式）
    const beautyData = parsed.beauty || parsed.aesthetics || {};
    let beautyScore = Number(beautyData.s ?? beautyData.score) || 0;
    beautyScore = Math.min(20, Math.max(0, Math.round(beautyScore)));
    const beautyComment = beautyData.r || beautyData.comment || '';

    // 总分
    const overallScore = shapeScore + strokeScore + beautyScore;

    // 等级（严格标准，大部分不超过60分）
    let level = 'needsWork';
    if (overallScore >= 60) level = 'excellent';
    else if (overallScore >= 40) level = 'good';

    console.log(`[书法评分] 最终: 字形=${shapeScore} 笔画=${strokeScore} 美观=${beautyScore} 总分=${overallScore}`);

    return {
      overallScore,
      level,
      shapeMatch: {
        score: shapeScore,
        charScores: charScores.map(c => {
          let sim = c.s ?? c.similarity ?? 0;
          if (typeof sim === 'string') sim = parseFloat(sim) || 0;
          if (sim > 1) sim = sim / 100;
          const reason = c.r || c.reason || c.analysis || c.comment || '';
          const improvements = c.imp || c.improvements || c.suggestions || [];
          console.log(`[书法评分] 字"${c.c || c.char}": 相似度=${sim}, 理由="${reason}", 改进建议=${JSON.stringify(improvements)}`);
          return {
            char: c.c || c.char || '?',
            similarity: sim,
            reason: reason,
            improvements: Array.isArray(improvements) ? improvements : []
          };
        }),
        comment: shapeComment
      },
      strokeQuality: {
        score: strokeScore,
        comment: strokeComment
      },
      aesthetics: {
        score: beautyScore,
        comment: beautyComment
      },
      summary: parsed.summary || '',
      improvements: parsed.tips || parsed.improvements || parsed.suggestions || []
    };
  } catch (error) {
    console.error('[书法评分] 数据处理错误:', error.message);
    return getDefaultEvaluation('数据处理错误: ' + error.message);
  }
}

/**
 * 获取默认评价结果
 */
function getDefaultEvaluation(errorMsg) {
  return {
    overallScore: 0,
    level: 'needsWork',
    shapeMatch: { score: 0, charScores: [], comment: '' },
    strokeQuality: { score: 0, comment: '' },
    aesthetics: { score: 0, comment: '' },
    summary: errorMsg || '评分失败',
    improvements: []
  };
}

// 管理员删除作品
router.delete('/admin/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'TEACHER') {
      return res.status(403).json({ success: false, error: '无权限' });
    }

    const work = await prisma.calligraphyWork.findUnique({
      where: { id: req.params.id }
    });

    if (!work) {
      return res.status(404).json({ success: false, error: '作品不存在' });
    }

    // 删除相关点赞记录
    await prisma.calligraphyLike.deleteMany({
      where: { workId: work.id }
    });

    // 删除作品
    await prisma.calligraphyWork.delete({ where: { id: work.id } });

    res.json({ success: true });
  } catch (error) {
    console.error('管理员删除作品失败:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

/**
 * 获取今日书写状态
 * GET /api/calligraphy/my/today-status
 */
router.get('/my/today-status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const timezoneOffset = parseInt(req.query.timezoneOffset) || -480;

    // 计算今日时间范围（以8点为边界）
    const now = new Date();
    const localNow = new Date(now.getTime() - timezoneOffset * 60 * 1000);
    const hour = localNow.getUTCHours();
    let todayStart = new Date(localNow);
    todayStart.setUTCHours(8, 0, 0, 0);
    if (hour < 8) {
      todayStart.setUTCDate(todayStart.getUTCDate() - 1);
    }
    const queryStart = new Date(todayStart.getTime() + timezoneOffset * 60 * 1000);
    const queryEnd = new Date(queryStart.getTime() + 24 * 60 * 60 * 1000);

    // 查询今日最新的书写作品
    const latestWork = await prisma.calligraphyWork.findFirst({
      where: {
        authorId: userId,
        createdAt: {
          gte: queryStart,
          lt: queryEnd
        }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        createdAt: true
      }
    });

    // 映射状态
    let status = 'NOT_SUBMITTED';
    if (latestWork) {
      const statusMap = {
        PENDING: 'PENDING',
        APPROVED: 'APPROVED',
        REJECTED: 'REJECTED',
        ARCHIVED: 'APPROVED'
      };
      status = statusMap[latestWork.status] || 'NOT_SUBMITTED';
    }

    res.json({
      success: true,
      data: {
        status,
        workId: latestWork?.id || null,
        createdAt: latestWork?.createdAt || null
      }
    });
  } catch (error) {
    console.error('获取今日书写状态失败:', error);
    res.status(500).json({ success: false, error: '获取今日书写状态失败' });
  }
});

// 获取个人书写分析数据
router.get('/my/analysis', authenticate, async (req, res) => {
  try {
    const authorId = req.user.id;
    const days = parseInt(req.query.days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // 获取所有作品
    const works = await prisma.calligraphyWork.findMany({
      where: { authorId, createdAt: { gte: since } },
      select: {
        id: true,
        title: true,
        charCount: true,
        content: true,
        evaluationScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // 计算每个作品的笔画数
    const worksWithStrokes = works.map(work => {
      let strokeCount = 0;
      if (Array.isArray(work.content)) {
        work.content.forEach(char => {
          if (char.strokeData?.strokes) {
            strokeCount += char.strokeData.strokes.length;
          }
        });
      }
      return { ...work, strokeCount };
    });

    // 基础统计
    const totalWorks = works.length;
    const totalChars = works.reduce((sum, w) => sum + w.charCount, 0);
    const totalStrokes = worksWithStrokes.reduce((sum, w) => sum + w.strokeCount, 0);
    const avgScore = works.filter(w => w.evaluationScore != null).length > 0
      ? Math.round(works.filter(w => w.evaluationScore != null).reduce((sum, w) => sum + w.evaluationScore, 0) / works.filter(w => w.evaluationScore != null).length)
      : null;

    // 极值统计
    const maxCharsPerWork = works.length > 0 ? Math.max(...works.map(w => w.charCount)) : 0;
    const maxStrokesPerWork = worksWithStrokes.length > 0 ? Math.max(...worksWithStrokes.map(w => w.strokeCount)) : 0;
    const bestScore = works.filter(w => w.evaluationScore != null).length > 0
      ? Math.max(...works.filter(w => w.evaluationScore != null).map(w => w.evaluationScore))
      : null;

    // 每日统计
    const dailyMap = {};
    worksWithStrokes.forEach(work => {
      const day = work.createdAt.toISOString().slice(0, 10);
      if (!dailyMap[day]) {
        dailyMap[day] = { chars: 0, strokes: 0, works: 0, scores: [] };
      }
      dailyMap[day].chars += work.charCount;
      dailyMap[day].strokes += work.strokeCount;
      dailyMap[day].works += 1;
      if (work.evaluationScore != null) {
        dailyMap[day].scores.push(work.evaluationScore);
      }
    });

    const dailyStats = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const data = dailyMap[key];
      dailyStats.push({
        date: key,
        chars: data?.chars || 0,
        strokes: data?.strokes || 0,
        works: data?.works || 0,
        avgScore: data?.scores.length > 0 ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) : null,
      });
    }

    // 字数分布
    const charCountRanges = [
      { label: '1-3字', min: 1, max: 3 },
      { label: '4-6字', min: 4, max: 6 },
      { label: '7-10字', min: 7, max: 10 },
      { label: '11-20字', min: 11, max: 20 },
      { label: '20字以上', min: 21, max: Infinity },
    ];
    const charCountDist = charCountRanges.map(r => ({
      label: r.label,
      count: works.filter(w => w.charCount >= r.min && w.charCount <= r.max).length,
    }));

    // 评分分布
    const scoreRanges = [
      { label: '优秀(85+)', min: 85, max: 100 },
      { label: '良好(60-84)', min: 60, max: 84 },
      { label: '待提高(<60)', min: 0, max: 59 },
    ];
    const scoreDist = scoreRanges.map(r => ({
      label: r.label,
      count: works.filter(w => w.evaluationScore != null && w.evaluationScore >= r.min && w.evaluationScore <= r.max).length,
    }));

    // 练习频率（按星期）
    const weekDayMap = { 0: '周日', 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六' };
    const weekDayDist = [0, 1, 2, 3, 4, 5, 6].map(day => ({
      label: weekDayMap[day],
      count: works.filter(w => w.createdAt.getDay() === day).length,
    }));

    res.json({
      success: true,
      data: {
        overview: {
          totalWorks,
          totalChars,
          totalStrokes,
          avgScore,
          maxCharsPerWork,
          maxStrokesPerWork,
          bestScore,
        },
        dailyStats,
        charCountDist,
        scoreDist,
        weekDayDist,
      },
    });
  } catch (error) {
    console.error('获取书写分析数据失败:', error);
    res.status(500).json({ success: false, error: '获取书写分析数据失败' });
  }
});

module.exports = router;
