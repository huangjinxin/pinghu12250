/**
 * 教材阅读笔记路由
 * 用于保存用户在阅读PDF教材时的查字/搜索结果
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// 所有路由都需要登录
router.use(authenticate);

// 创建阅读笔记
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      textbookId, sessionId, sourceType, query, content, snippet, page,
      // EPUB 定位字段（新增）
      chapterId, paragraphId, textRange
    } = req.body;

    // 参数验证
    if (!textbookId || !sessionId || !sourceType || !query || !snippet) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数'
      });
    }

    // 创建笔记（同时支持 PDF 和 EPUB 定位）
    const note = await prisma.readingNote.create({
      data: {
        userId,
        textbookId,
        sessionId,
        sourceType,
        query,
        content: content || {},
        snippet,
        page: page || 1,
        // EPUB 定位字段
        chapterId: chapterId || null,
        paragraphId: paragraphId || null,
        textRange: textRange || null
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: note.id,
        createdAt: note.createdAt
      }
    });
  } catch (error) {
    console.error('创建阅读笔记失败:', error);
    res.status(500).json({
      success: false,
      error: '创建笔记失败'
    });
  }
});

// 删除阅读笔记
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // 检查笔记是否存在且属于当前用户
    const note = await prisma.readingNote.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        error: '笔记不存在'
      });
    }

    // 删除笔记
    await prisma.readingNote.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除阅读笔记失败:', error);
    res.status(500).json({
      success: false,
      error: '删除失败'
    });
  }
});

// 获取单条笔记详情
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const note = await prisma.readingNote.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        error: '笔记不存在'
      });
    }

    // 获取关联的教材信息（包含 EPUB 相关字段）
    let textbook = null;
    if (note.textbookId) {
      textbook = await prisma.textbook.findUnique({
        where: { id: note.textbookId },
        select: {
          id: true,
          title: true,
          subject: true,
          grade: true,
          semester: true,
          version: true,
          pdfUrl: true,
          contentType: true,
          epubUrl: true,
          epubMetadata: true
        }
      });
    }

    res.json({
      success: true,
      data: {
        ...note,
        textbook
      }
    });
  } catch (error) {
    console.error('获取笔记详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取详情失败'
    });
  }
});

// 更新笔记
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { content, snippet, query, isFavorite } = req.body;

    // 检查笔记是否存在且属于当前用户
    const existingNote = await prisma.readingNote.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingNote) {
      return res.status(404).json({
        success: false,
        error: '笔记不存在'
      });
    }

    // 构建更新数据
    const updateData = {};
    if (content !== undefined) updateData.content = content;
    if (snippet !== undefined) updateData.snippet = snippet;
    if (query !== undefined) updateData.query = query;
    if (isFavorite !== undefined) {
      updateData.isFavorite = isFavorite;
      updateData.favoriteAt = isFavorite ? new Date() : null;
    }

    const note = await prisma.readingNote.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    console.error('更新笔记失败:', error);
    res.status(500).json({
      success: false,
      error: '更新失败'
    });
  }
});

// 切换收藏状态
router.post('/:id/favorite', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // 检查笔记是否存在且属于当前用户
    const existingNote = await prisma.readingNote.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingNote) {
      return res.status(404).json({
        success: false,
        error: '笔记不存在'
      });
    }

    // 切换收藏状态
    const newFavoriteStatus = !existingNote.isFavorite;
    const note = await prisma.readingNote.update({
      where: { id },
      data: {
        isFavorite: newFavoriteStatus,
        favoriteAt: newFavoriteStatus ? new Date() : null
      }
    });

    res.json({
      success: true,
      data: {
        id: note.id,
        isFavorite: note.isFavorite,
        favoriteAt: note.favoriteAt
      }
    });
  } catch (error) {
    console.error('切换收藏状态失败:', error);
    res.status(500).json({
      success: false,
      error: '操作失败'
    });
  }
});

// 获取用户的阅读笔记列表
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      textbookId,
      sessionId,
      chapterId,  // EPUB 章节过滤（新增）
      page = 1,
      limit = 20,
      groupBy,
      search = '',
      sourceType = '',
      sortBy = 'latest',
      favoriteOnly = 'false'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = { userId };

    if (textbookId) {
      where.textbookId = textbookId;
    }

    if (sessionId) {
      where.sessionId = sessionId;
    }

    // EPUB 章节过滤
    if (chapterId) {
      where.chapterId = chapterId;
    }

    // 只看收藏
    if (favoriteOnly === 'true') {
      where.isFavorite = true;
    }

    // 搜索条件
    if (search && search.trim()) {
      where.OR = [
        { query: { contains: search.trim(), mode: 'insensitive' } },
        { snippet: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // 笔记类型筛选
    if (sourceType && sourceType.trim()) {
      where.sourceType = sourceType.trim();
    } else {
      // 默认排除批注类型（批注功能已废弃）
      where.sourceType = { not: 'annotation' };
    }

    // 排序：收藏置顶 + 时间排序
    let orderBy = [];
    // 收藏的笔记优先
    orderBy.push({ isFavorite: 'desc' });
    // 然后按时间排序
    if (sortBy === 'oldest') {
      orderBy.push({ createdAt: 'asc' });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }

    const [notes, total] = await Promise.all([
      prisma.readingNote.findMany({
        where,
        orderBy,
        skip,
        take: limitNum
      }),
      prisma.readingNote.count({ where })
    ]);

    // 获取所有相关教材的ID
    const textbookIds = [...new Set(notes.map(n => n.textbookId).filter(Boolean))];

    // 批量查询教材信息（包含 EPUB 相关字段）
    const textbooks = textbookIds.length > 0 ? await prisma.textbook.findMany({
      where: { id: { in: textbookIds } },
      select: {
        id: true,
        title: true,
        subject: true,
        grade: true,
        semester: true,
        version: true,
        pdfUrl: true,
        contentType: true,
        epubUrl: true,
        epubMetadata: true
      }
    }) : [];

    // 构建教材ID到教材信息的映射
    const textbookMap = {};
    textbooks.forEach(t => {
      textbookMap[t.id] = t;
    });

    // 为每条笔记附加教材信息
    const notesWithTextbook = notes.map(note => ({
      ...note,
      textbook: textbookMap[note.textbookId] || null
    }));

    // 如果请求按教材分组
    if (groupBy === 'textbook') {
      const grouped = {};
      notesWithTextbook.forEach(note => {
        const tbId = note.textbookId || 'unknown';
        if (!grouped[tbId]) {
          grouped[tbId] = {
            textbookId: tbId,
            textbook: note.textbook,
            notes: []
          };
        }
        grouped[tbId].notes.push(note);
      });

      return res.json({
        success: true,
        data: {
          groups: Object.values(grouped),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        notes: notesWithTextbook,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('获取阅读笔记列表失败:', error);
    res.status(500).json({
      success: false,
      error: '获取列表失败'
    });
  }
});

// ============================================
// 家长接口：查看孩子笔记（只读）
// ============================================

/**
 * 验证家长与孩子的关系
 */
async function verifyParentChildRelation(parentId, childId) {
  const relation = await prisma.studentParent.findFirst({
    where: { parentId, childId }
  });
  return !!relation;
}

// 家长获取孩子的笔记列表
router.get('/child/:childId', async (req, res) => {
  try {
    const parentId = req.user.id;
    const { childId } = req.params;

    // 验证家长身份
    if (req.user.role !== 'PARENT') {
      return res.status(403).json({ success: false, error: '只有家长可以访问此接口' });
    }

    // 验证家长与孩子的关系
    const isValid = await verifyParentChildRelation(parentId, childId);
    if (!isValid) {
      return res.status(403).json({ success: false, error: '无权查看该孩子的数据' });
    }

    const {
      textbookId,
      page = 1,
      limit = 20,
      search = '',
      sourceType = '',
      sortBy = 'latest',
      favoriteOnly = 'false'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = { userId: childId };

    if (textbookId) where.textbookId = textbookId;
    if (favoriteOnly === 'true') where.isFavorite = true;
    if (search && search.trim()) {
      where.OR = [
        { query: { contains: search.trim(), mode: 'insensitive' } },
        { snippet: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }
    if (sourceType && sourceType.trim()) where.sourceType = sourceType.trim();

    let orderBy = [{ isFavorite: 'desc' }];
    if (sortBy === 'oldest') {
      orderBy.push({ createdAt: 'asc' });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }

    const [notes, total] = await Promise.all([
      prisma.readingNote.findMany({ where, orderBy, skip, take: limitNum }),
      prisma.readingNote.count({ where })
    ]);

    // 批量查询教材信息
    const textbookIds = [...new Set(notes.map(n => n.textbookId).filter(Boolean))];
    const textbooks = textbookIds.length > 0 ? await prisma.textbook.findMany({
      where: { id: { in: textbookIds } },
      select: {
        id: true, title: true, subject: true, grade: true,
        semester: true, version: true, pdfUrl: true,
        contentType: true, epubUrl: true
      }
    }) : [];

    const textbookMap = {};
    textbooks.forEach(t => { textbookMap[t.id] = t; });

    const notesWithTextbook = notes.map(note => ({
      ...note,
      textbook: textbookMap[note.textbookId] || null
    }));

    res.json({
      success: true,
      data: {
        notes: notesWithTextbook,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('获取孩子笔记列表失败:', error);
    res.status(500).json({ success: false, error: '获取列表失败' });
  }
});

// 家长获取孩子的笔记详情
router.get('/child/:childId/:noteId', async (req, res) => {
  try {
    const parentId = req.user.id;
    const { childId, noteId } = req.params;

    if (req.user.role !== 'PARENT') {
      return res.status(403).json({ success: false, error: '只有家长可以访问此接口' });
    }

    const isValid = await verifyParentChildRelation(parentId, childId);
    if (!isValid) {
      return res.status(403).json({ success: false, error: '无权查看该孩子的数据' });
    }

    const note = await prisma.readingNote.findFirst({
      where: { id: noteId, userId: childId }
    });

    if (!note) {
      return res.status(404).json({ success: false, error: '笔记不存在' });
    }

    let textbook = null;
    if (note.textbookId) {
      textbook = await prisma.textbook.findUnique({
        where: { id: note.textbookId },
        select: {
          id: true, title: true, subject: true, grade: true,
          semester: true, version: true, pdfUrl: true,
          contentType: true, epubUrl: true
        }
      });
    }

    res.json({
      success: true,
      data: { ...note, textbook }
    });
  } catch (error) {
    console.error('获取孩子笔记详情失败:', error);
    res.status(500).json({ success: false, error: '获取详情失败' });
  }
});

module.exports = router;
