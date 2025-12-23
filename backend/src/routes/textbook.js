/**
 * 电子课本路由
 */

const express = require('express');
const router = express.Router();
const textbookController = require('../controllers/textbookController');
const { authenticate, authorize } = require('../middleware/auth');
const { pdfUpload } = require('../middleware/upload');

// ========== 公开接口（无需登录） ==========

// GET /api/textbooks/public - 获取已发布的教材列表
router.get('/public', textbookController.getPublicTextbooks);

// GET /api/textbooks/public/:id/toc - 获取教材目录
router.get('/public/:id/toc', textbookController.getPublicTextbookToc);

// GET /api/textbooks/public/lesson/:id - 获取公开课文详情
router.get('/public/lesson/:id', textbookController.getPublicLesson);

// ========== 管理员接口 ==========

// GET /api/textbooks/admin/pending - 获取待审核列表
router.get('/admin/pending', authenticate, authorize('ADMIN'), textbookController.getPendingLessons);

// GET /api/textbooks/admin/stats - 获取统计数据
router.get('/admin/stats', authenticate, authorize('ADMIN'), textbookController.getAdminStats);

// PUT /api/textbooks/admin/lesson/:id/review - 审核课文
router.put('/admin/lesson/:id/review', authenticate, authorize('ADMIN'), textbookController.reviewLesson);

// ========== 用户接口（需登录） ==========

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

// ========== 封面管理 ==========

// POST /api/textbooks/:id/cover - 上传封面缩略图
router.post('/:id/cover', authenticate, textbookController.uploadCover);

module.exports = router;
