/**
 * 电子课本控制器
 */

const prisma = require('../lib/prisma');

// ========== 教材管理 ==========

// 获取用户的教材列表
const getMyTextbooks = async (req, res) => {
  try {
    const userId = req.user.id;

    const textbooks = await prisma.textbook.findMany({
      where: { createdBy: userId },
      include: {
        units: {
          include: {
            lessons: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 计算每本教材的完成进度
    const textbooksWithProgress = textbooks.map(textbook => {
      let totalLessons = 0;
      let completedLessons = 0;

      textbook.units.forEach(unit => {
        totalLessons += unit.lessons.length;
        completedLessons += unit.lessons.filter(l =>
          l.status === 'PUBLISHED' || l.status === 'APPROVED'
        ).length;
      });

      return {
        ...textbook,
        totalLessons,
        completedLessons,
        progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      };
    });

    res.json({ textbooks: textbooksWithProgress });
  } catch (error) {
    console.error('获取教材列表失败:', error);
    res.status(500).json({ error: '获取教材列表失败' });
  }
};

// 创建教材
const createTextbook = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subject, grade, semester, version, title, totalPages } = req.body;

    // 检查是否已存在
    const existing = await prisma.textbook.findUnique({
      where: {
        subject_grade_semester_version: {
          subject,
          grade: parseInt(grade),
          semester,
          version: version || '人教版',
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: '该教材已存在' });
    }

    const textbook = await prisma.textbook.create({
      data: {
        subject,
        grade: parseInt(grade),
        semester,
        version: version || '人教版',
        title,
        totalPages: totalPages ? parseInt(totalPages) : null,
        createdBy: userId,
      },
    });

    res.status(201).json({ textbook });
  } catch (error) {
    console.error('创建教材失败:', error);
    res.status(500).json({ error: '创建教材失败' });
  }
};

// 获取教材详情（含单元和课文）
const getTextbookDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const textbook = await prisma.textbook.findUnique({
      where: { id },
      include: {
        units: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!textbook) {
      return res.status(404).json({ error: '教材不存在' });
    }

    res.json({ textbook });
  } catch (error) {
    console.error('获取教材详情失败:', error);
    res.status(500).json({ error: '获取教材详情失败' });
  }
};

// 更新教材基本信息
const updateTextbook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { subject, grade, semester, version, title, isHidden } = req.body;

    // 查找教材
    const textbook = await prisma.textbook.findUnique({ where: { id } });
    if (!textbook) {
      return res.status(404).json({ error: '教材不存在' });
    }

    // 权限检查
    if (textbook.createdBy !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: '无权修改此教材' });
    }

    // 构建更新数据
    const updateData = {};
    if (subject !== undefined) updateData.subject = subject;
    if (grade !== undefined) updateData.grade = parseInt(grade);
    if (semester !== undefined) updateData.semester = semester;
    if (version !== undefined) updateData.version = version;
    if (title !== undefined) updateData.title = title;
    if (isHidden !== undefined) updateData.isHidden = isHidden;

    const updated = await prisma.textbook.update({
      where: { id },
      data: updateData,
    });

    res.json({ textbook: updated });
  } catch (error) {
    console.error('更新教材失败:', error);
    res.status(500).json({ error: '更新教材失败' });
  }
};

// ========== 单元管理 ==========

// 添加单元
const createUnit = async (req, res) => {
  try {
    const { textbookId, unitNumber, title, theme, pageStart, pageEnd } = req.body;

    const unit = await prisma.textbookUnit.create({
      data: {
        textbookId,
        unitNumber: parseInt(unitNumber),
        title,
        theme,
        pageStart: pageStart ? parseInt(pageStart) : null,
        pageEnd: pageEnd ? parseInt(pageEnd) : null,
        sortOrder: parseInt(unitNumber),
      },
    });

    res.status(201).json({ unit });
  } catch (error) {
    console.error('创建单元失败:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '该单元序号已存在' });
    }
    res.status(500).json({ error: '创建单元失败' });
  }
};

// 更新单元
const updateUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, theme, pageStart, pageEnd } = req.body;

    const unit = await prisma.textbookUnit.update({
      where: { id },
      data: {
        title,
        theme,
        pageStart: pageStart ? parseInt(pageStart) : null,
        pageEnd: pageEnd ? parseInt(pageEnd) : null,
      },
    });

    res.json({ unit });
  } catch (error) {
    console.error('更新单元失败:', error);
    res.status(500).json({ error: '更新单元失败' });
  }
};

// 删除单元
const deleteUnit = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.textbookUnit.delete({
      where: { id },
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除单元失败:', error);
    res.status(500).json({ error: '删除单元失败' });
  }
};

// ========== 课文管理 ==========

// 添加课文
const createLesson = async (req, res) => {
  try {
    const { unitId, lessonNumber, title, pageStart, pageEnd } = req.body;

    const lesson = await prisma.textbookLesson.create({
      data: {
        unitId,
        lessonNumber: parseInt(lessonNumber),
        title,
        pageStart: pageStart ? parseInt(pageStart) : null,
        pageEnd: pageEnd ? parseInt(pageEnd) : null,
        sortOrder: parseInt(lessonNumber),
      },
    });

    res.status(201).json({ lesson });
  } catch (error) {
    console.error('创建课文失败:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '该课文序号已存在' });
    }
    res.status(500).json({ error: '创建课文失败' });
  }
};

// 获取课文详情
const getLessonDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.textbookLesson.findUnique({
      where: { id },
      include: {
        unit: {
          include: {
            textbook: true,
          },
        },
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: '课文不存在' });
    }

    res.json({ lesson });
  } catch (error) {
    console.error('获取课文详情失败:', error);
    res.status(500).json({ error: '获取课文详情失败' });
  }
};

// 更新课文（保存草稿）
const updateLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, pageStart, pageEnd, htmlContent, status } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (pageStart !== undefined) updateData.pageStart = pageStart ? parseInt(pageStart) : null;
    if (pageEnd !== undefined) updateData.pageEnd = pageEnd ? parseInt(pageEnd) : null;
    if (htmlContent !== undefined) {
      updateData.htmlContent = htmlContent;
      updateData.inputBy = userId;
      // 如果之前是空的，现在有内容了，改为草稿状态
      if (htmlContent && htmlContent.trim()) {
        const existing = await prisma.textbookLesson.findUnique({ where: { id } });
        if (existing && existing.status === 'EMPTY') {
          updateData.status = 'DRAFT';
        }
      }
    }
    if (status !== undefined) updateData.status = status;

    const lesson = await prisma.textbookLesson.update({
      where: { id },
      data: updateData,
    });

    res.json({ lesson });
  } catch (error) {
    console.error('更新课文失败:', error);
    res.status(500).json({ error: '更新课文失败' });
  }
};

// 提交课文审核
const submitLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const lesson = await prisma.textbookLesson.findUnique({ where: { id } });

    if (!lesson) {
      return res.status(404).json({ error: '课文不存在' });
    }

    if (!lesson.htmlContent || !lesson.htmlContent.trim()) {
      return res.status(400).json({ error: '请先填写课文内容' });
    }

    const updated = await prisma.textbookLesson.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        inputBy: userId,
      },
    });

    res.json({ lesson: updated });
  } catch (error) {
    console.error('提交审核失败:', error);
    res.status(500).json({ error: '提交审核失败' });
  }
};

// 删除课文
const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.textbookLesson.delete({
      where: { id },
    });

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除课文失败:', error);
    res.status(500).json({ error: '删除课文失败' });
  }
};

// ========== 管理员审核 ==========

// 获取待审核列表
const getPendingLessons = async (req, res) => {
  try {
    const lessons = await prisma.textbookLesson.findMany({
      where: { status: 'SUBMITTED' },
      include: {
        unit: {
          include: {
            textbook: true,
          },
        },
      },
      orderBy: { updatedAt: 'asc' },
    });

    res.json({ lessons });
  } catch (error) {
    console.error('获取待审核列表失败:', error);
    res.status(500).json({ error: '获取待审核列表失败' });
  }
};

// 获取审核统计
const getAdminStats = async (req, res) => {
  try {
    const [pending, approved, published, total] = await Promise.all([
      prisma.textbookLesson.count({ where: { status: 'SUBMITTED' } }),
      prisma.textbookLesson.count({ where: { status: 'APPROVED' } }),
      prisma.textbookLesson.count({ where: { status: 'PUBLISHED' } }),
      prisma.textbookLesson.count(),
    ]);

    res.json({
      stats: {
        pending,
        approved,
        published,
        total,
      },
    });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ error: '获取统计失败' });
  }
};

// 审核课文
const reviewLesson = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status, reviewNote } = req.body;

    if (!['APPROVED', 'REJECTED', 'PUBLISHED'].includes(status)) {
      return res.status(400).json({ error: '无效的状态' });
    }

    const lesson = await prisma.textbookLesson.update({
      where: { id },
      data: {
        status,
        reviewNote,
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    res.json({ lesson });
  } catch (error) {
    console.error('审核失败:', error);
    res.status(500).json({ error: '审核失败' });
  }
};

// ========== 公开展示 ==========

// 获取公开教材列表（显示所有有PDF且未隐藏的教材）
const getPublicTextbooks = async (req, res) => {
  try {
    const textbooks = await prisma.textbook.findMany({
      where: {
        isHidden: false,
        pdfUrl: { not: null },  // 只显示有PDF的教材
      },
      include: {
        units: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                lessonNumber: true,
                title: true,
                pageStart: true,
                pageEnd: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: [{ subject: 'asc' }, { grade: 'asc' }, { semester: 'asc' }],
    });

    res.json({ textbooks });
  } catch (error) {
    console.error('获取公开教材列表失败:', error);
    res.status(500).json({ error: '获取公开教材列表失败' });
  }
};

// 获取公开课文详情
const getPublicLesson = async (req, res) => {
  try {
    const { id } = req.params;

    const lesson = await prisma.textbookLesson.findUnique({
      where: { id },
      include: {
        unit: {
          include: {
            textbook: true,
            lessons: {
              where: { status: 'PUBLISHED' },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                lessonNumber: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!lesson || lesson.status !== 'PUBLISHED') {
      return res.status(404).json({ error: '课文不存在或未发布' });
    }

    res.json({ lesson });
  } catch (error) {
    console.error('获取公开课文详情失败:', error);
    res.status(500).json({ error: '获取公开课文详情失败' });
  }
};

// 获取教材完整目录（公开）
const getPublicTextbookToc = async (req, res) => {
  try {
    const { id } = req.params;

    const textbook = await prisma.textbook.findUnique({
      where: { id },
      include: {
        units: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              where: { status: 'PUBLISHED' },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                lessonNumber: true,
                title: true,
                pageStart: true,
                pageEnd: true,
              },
            },
          },
        },
      },
    });

    if (!textbook) {
      return res.status(404).json({ error: '教材不存在' });
    }

    res.json({ textbook });
  } catch (error) {
    console.error('获取教材目录失败:', error);
    res.status(500).json({ error: '获取教材目录失败' });
  }
};

// 上传教材PDF
const uploadPdf = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('📄 PDF上传请求:', { id, file: req.file });

    if (!req.file) {
      return res.status(400).json({ error: '请选择PDF文件' });
    }

    console.log('📄 文件信息:', {
      filename: req.file.filename,
      path: req.file.path,
      destination: req.file.destination,
      size: req.file.size,
    });

    // 检查教材是否存在
    const textbook = await prisma.textbook.findUnique({ where: { id } });
    if (!textbook) {
      return res.status(404).json({ error: '教材不存在' });
    }

    // 更新PDF路径
    const pdfUrl = `/pdfs/${req.file.filename}`;
    const updated = await prisma.textbook.update({
      where: { id },
      data: { pdfUrl },
    });

    console.log('✅ PDF上传成功:', pdfUrl);
    res.json({ textbook: updated, pdfUrl });
  } catch (error) {
    console.error('上传PDF失败:', error);
    res.status(500).json({ error: '上传PDF失败' });
  }
};

// 上传教材封面缩略图
const uploadCover = async (req, res) => {
  try {
    const { id } = req.params;
    const { coverData } = req.body; // base64 encoded image

    if (!coverData) {
      return res.status(400).json({ error: '请提供封面数据' });
    }

    // 检查教材是否存在
    const textbook = await prisma.textbook.findUnique({ where: { id } });
    if (!textbook) {
      return res.status(404).json({ error: '教材不存在' });
    }

    const fs = require('fs');
    const path = require('path');

    // 封面存储目录
    const coverDir = path.join(__dirname, '../../uploads/covers');
    if (!fs.existsSync(coverDir)) {
      fs.mkdirSync(coverDir, { recursive: true });
    }

    // 解析 base64 数据
    const matches = coverData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: '无效的图片数据格式' });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const filename = `cover-${id}-${Date.now()}.${ext}`;
    const filePath = path.join(coverDir, filename);

    // 删除旧封面（如果存在）
    if (textbook.coverImage) {
      const oldFilename = textbook.coverImage.replace('/uploads/covers/', '');
      const oldFilePath = path.join(coverDir, oldFilename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log('🗑️ 旧封面已删除:', oldFilePath);
      }
    }

    // 保存新封面
    fs.writeFileSync(filePath, base64Data, 'base64');
    console.log('✅ 封面已保存:', filePath);

    // 更新数据库
    const coverImage = `/uploads/covers/${filename}`;
    const updated = await prisma.textbook.update({
      where: { id },
      data: { coverImage },
    });

    res.json({ textbook: updated, coverImage });
  } catch (error) {
    console.error('上传封面失败:', error);
    res.status(500).json({ error: '上传封面失败' });
  }
};

// 删除教材PDF
const deletePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const fs = require('fs');
    const path = require('path');

    const textbook = await prisma.textbook.findUnique({ where: { id } });
    if (!textbook) {
      return res.status(404).json({ error: '教材不存在' });
    }

    // 删除PDF文件
    if (textbook.pdfUrl) {
      const pdfDir = process.env.PDF_STORAGE_DIR || '/Volumes/2TB-BC01/pinghu/books-ai';
      const filename = textbook.pdfUrl.replace('/pdfs/', '');
      const filePath = path.join(pdfDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ PDF文件已删除:', filePath);
      }
    }

    // 删除封面文件
    if (textbook.coverImage) {
      const coverDir = path.join(__dirname, '../../uploads/covers');
      const coverFilename = textbook.coverImage.replace('/uploads/covers/', '');
      const coverFilePath = path.join(coverDir, coverFilename);

      if (fs.existsSync(coverFilePath)) {
        fs.unlinkSync(coverFilePath);
        console.log('🗑️ 封面文件已删除:', coverFilePath);
      }
    }

    // 清除数据库记录
    await prisma.textbook.update({
      where: { id },
      data: { pdfUrl: null, coverImage: null },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('删除PDF失败:', error);
    res.status(500).json({ error: '删除PDF失败' });
  }
};

// 删除整本教材（包括所有单元、课文和PDF）
const deleteTextbook = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const fs = require('fs');
    const path = require('path');

    // 查找教材
    const textbook = await prisma.textbook.findUnique({
      where: { id },
      include: {
        units: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!textbook) {
      return res.status(404).json({ error: '教材不存在' });
    }

    // 权限检查：只有创建者或管理员可以删除
    if (textbook.createdBy !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ error: '无权删除此教材' });
    }

    // 1. 删除PDF文件（如果存在）
    if (textbook.pdfUrl) {
      const pdfDir = process.env.PDF_STORAGE_DIR || '/Volumes/2TB-BC01/pinghu/books-ai';
      const filename = textbook.pdfUrl.replace('/pdfs/', '');
      const filePath = path.join(pdfDir, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ PDF文件已删除:', filePath);
      }
    }

    // 1.5 删除封面文件（如果存在）
    if (textbook.coverImage) {
      const coverDir = path.join(__dirname, '../../uploads/covers');
      const coverFilename = textbook.coverImage.replace('/uploads/covers/', '');
      const coverFilePath = path.join(coverDir, coverFilename);

      if (fs.existsSync(coverFilePath)) {
        fs.unlinkSync(coverFilePath);
        console.log('🗑️ 封面文件已删除:', coverFilePath);
      }
    }

    // 2. 删除所有课文
    for (const unit of textbook.units) {
      if (unit.lessons.length > 0) {
        await prisma.lesson.deleteMany({
          where: { unitId: unit.id },
        });
      }
    }

    // 3. 删除所有单元
    await prisma.unit.deleteMany({
      where: { textbookId: id },
    });

    // 4. 删除教材
    await prisma.textbook.delete({
      where: { id },
    });

    console.log('✅ 教材已完全删除:', textbook.title);
    res.json({ success: true, message: '教材已删除' });
  } catch (error) {
    console.error('删除教材失败:', error);
    res.status(500).json({ error: '删除教材失败' });
  }
};

// 获取PDF文件（用于阅读器）
const getPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const textbook = await prisma.textbook.findUnique({
      where: { id },
      select: { id: true, title: true, pdfUrl: true },
    });

    if (!textbook) {
      return res.status(404).json({ error: '教材不存在' });
    }

    if (!textbook.pdfUrl) {
      return res.status(404).json({ error: '该教材暂无PDF文件' });
    }

    res.json({ textbook });
  } catch (error) {
    console.error('获取PDF失败:', error);
    res.status(500).json({ error: '获取PDF失败' });
  }
};

module.exports = {
  // 教材
  getMyTextbooks,
  createTextbook,
  getTextbookDetail,
  updateTextbook,
  deleteTextbook,
  // 单元
  createUnit,
  updateUnit,
  deleteUnit,
  // 课文
  createLesson,
  getLessonDetail,
  updateLesson,
  submitLesson,
  deleteLesson,
  // 管理员
  getPendingLessons,
  getAdminStats,
  reviewLesson,
  // 公开
  getPublicTextbooks,
  getPublicLesson,
  getPublicTextbookToc,
  // PDF
  uploadPdf,
  deletePdf,
  getPdf,
  // 封面
  uploadCover,
};
