/**
 * 读书笔记路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const bookController = require('../controllers/bookController');

// ========== 书籍管理 ==========

// GET /api/books/search - 搜索书籍
router.get('/search', bookController.searchBooks);

// POST /api/books - 添加书籍到书库
router.post('/', authenticate, bookController.addBook);

// ========== 我的书架 ==========

// GET /api/books/bookshelf/my - 获取我的书架
router.get('/bookshelf/my', authenticate, bookController.getMyBookshelf);

// POST /api/books/bookshelf - 添加书籍到我的书架
router.post('/bookshelf', authenticate, bookController.addToMyBookshelf);

// PUT /api/books/bookshelf/:id - 更新书架中的书籍状态
router.put('/bookshelf/:id', authenticate, bookController.updateBookshelfStatus);

// ========== 阅读记录 ==========

// GET /api/books/reading-logs - 获取阅读记录列表（阅读动态）
router.get('/reading-logs', bookController.getReadingLogs);

// POST /api/books/reading-logs - 创建阅读记录
router.post('/reading-logs', authenticate, bookController.createReadingLog);

// POST /api/books/reading-logs/:id/like - 点赞/点踩阅读记录
router.post('/reading-logs/:id/like', authenticate, bookController.toggleReadingLogLike);

// DELETE /api/books/reading-logs/:id - 删除阅读记录
router.delete('/reading-logs/:id', authenticate, bookController.deleteReadingLog);

// ========== 书籍详情（必须放在最后，避免匹配上面的具体路径） ==========

// GET /api/books/:id - 获取书籍详情
router.get('/:id', bookController.getBookDetail);

// PUT /api/books/:id - 更新书籍信息
router.put('/:id', authenticate, bookController.updateBook);

// DELETE /api/books/:id - 删除书籍
router.delete('/:id', authenticate, bookController.deleteBook);

module.exports = router;
