/**
 * 电子课本路由
 */

const express = require('express');
const router = express.Router();
const textbookController = require('../controllers/textbookController');
const { authenticate, authorize } = require('../middleware/auth');
const { pdfUpload, epubUpload } = require('../middleware/upload');

// ========== 公开接口（无需登录） ==========

// GET /api/textbooks/options - 获取所有教材的属性选项（科目、年级、学期）
router.get('/options', textbookController.getTextbookOptions);

// GET /api/textbooks/upload-settings - 获取教材上传设置（管理员配置的选项）
router.get('/upload-settings', textbookController.getUploadSettings);

// GET /api/textbooks/public - 获取已发布的教材列表
router.get('/public', textbookController.getPublicTextbooks);

// GET /api/textbooks/public/:id/toc - 获取教材目录
router.get('/public/:id/toc', textbookController.getPublicTextbookToc);

// GET /api/textbooks/public/lesson/:id - 获取公开课文详情
router.get('/public/lesson/:id', textbookController.getPublicLesson);

// GET /api/textbooks/public/:id - 获取公开教材详情（放在最后避免匹配冲突）
router.get('/public/:id', textbookController.getPublicTextbookDetail);

// ========== 管理员接口 ==========

// GET /api/textbooks/admin/pending - 获取待审核列表
router.get('/admin/pending', authenticate, authorize('ADMIN'), textbookController.getPendingLessons);

// GET /api/textbooks/admin/stats - 获取统计数据
router.get('/admin/stats', authenticate, authorize('ADMIN'), textbookController.getAdminStats);

// PUT /api/textbooks/admin/lesson/:id/review - 审核课文
router.put('/admin/lesson/:id/review', authenticate, authorize('ADMIN'), textbookController.reviewLesson);

// POST /api/textbooks/upload-settings - 保存教材上传设置（管理员专用）
router.post('/upload-settings', authenticate, authorize('ADMIN'), textbookController.saveUploadSettings);

// ========== 用户接口（需登录） ==========

// GET /api/textbooks/favorites - 获取我的收藏列表
router.get('/favorites', authenticate, textbookController.getFavorites);

// POST /api/textbooks/favorites/:id - 收藏教材
router.post('/favorites/:id', authenticate, textbookController.addFavorite);

// DELETE /api/textbooks/favorites/:id - 取消收藏
router.delete('/favorites/:id', authenticate, textbookController.removeFavorite);

// GET /api/textbooks/my - 获取我的教材列表
router.get('/my', authenticate, textbookController.getMyTextbooks);

// POST /api/textbooks - 创建教材
router.post('/', authenticate, textbookController.createTextbook);

// GET /api/textbooks/:id - 获取教材详情
router.get('/:id', authenticate, textbookController.getTextbookDetail);

// PUT /api/textbooks/:id - 更新教材基本信息
router.put('/:id', authenticate, textbookController.updateTextbook);

// DELETE /api/textbooks/:id - 删除整本教材
router.delete('/:id', authenticate, textbookController.deleteTextbook);

// ========== 单元管理 ==========

// POST /api/textbooks/units - 创建单元
router.post('/units', authenticate, textbookController.createUnit);

// PUT /api/textbooks/units/:id - 更新单元
router.put('/units/:id', authenticate, textbookController.updateUnit);

// DELETE /api/textbooks/units/:id - 删除单元
router.delete('/units/:id', authenticate, textbookController.deleteUnit);

// ========== 课文管理 ==========

// POST /api/textbooks/lessons - 创建课文
router.post('/lessons', authenticate, textbookController.createLesson);

// GET /api/textbooks/lessons/:id - 获取课文详情
router.get('/lessons/:id', authenticate, textbookController.getLessonDetail);

// PUT /api/textbooks/lessons/:id - 更新课文
router.put('/lessons/:id', authenticate, textbookController.updateLesson);

// POST /api/textbooks/lessons/:id/submit - 提交审核
router.post('/lessons/:id/submit', authenticate, textbookController.submitLesson);

// DELETE /api/textbooks/lessons/:id - 删除课文
router.delete('/lessons/:id', authenticate, textbookController.deleteLesson);

// ========== PDF管理 ==========

// POST /api/textbooks/:id/pdf - 上传教材PDF
router.post('/:id/pdf', authenticate, pdfUpload.single('pdf'), textbookController.uploadPdf);

// DELETE /api/textbooks/:id/pdf - 删除教材PDF
router.delete('/:id/pdf', authenticate, textbookController.deletePdf);

// GET /api/textbooks/:id/pdf - 获取教材PDF信息
router.get('/:id/pdf', authenticate, textbookController.getPdf);

// ========== EPUB管理 ==========

// POST /api/textbooks/:id/epub - 上传教材EPUB
router.post('/:id/epub', authenticate, epubUpload.single('epub'), textbookController.uploadEpub);

// DELETE /api/textbooks/:id/epub - 删除教材EPUB
router.delete('/:id/epub', authenticate, textbookController.deleteEpub);

// GET /api/textbooks/:id/epub/toc - 获取EPUB目录
router.get('/:id/epub/toc', authenticate, textbookController.getEpubToc);

// GET /api/textbooks/:id/epub/chapter/:chapterId - 获取EPUB章节内容
router.get('/:id/epub/chapter/:chapterId', authenticate, textbookController.getEpubChapter);

// ========== 封面管理 ==========

// POST /api/textbooks/:id/cover - 上传封面缩略图
router.post('/:id/cover', authenticate, textbookController.uploadCover);

module.exports = router;
