/**
 * 影视路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const movieController = require('../controllers/movieController');

// ========== 影视管理 ==========

// GET /api/movies/search - 搜索影视
router.get('/search', movieController.searchMovies);

// POST /api/movies - 添加影视到影视库
router.post('/', authenticate, movieController.addMovie);

// ========== 我的影视库 ==========

// GET /api/movies/library/my - 获取我的影视库
router.get('/library/my', authenticate, movieController.getMyMovieLibrary);

// POST /api/movies/library - 添加影视到我的影视库
router.post('/library', authenticate, movieController.addToMyMovieLibrary);

// PUT /api/movies/library/:id - 更新影视库中的影视状态
router.put('/library/:id', authenticate, movieController.updateMovieLibraryStatus);

// ========== 观后感记录 ==========

// GET /api/movies/logs - 获取观后感记录列表（观后感动态）
router.get('/logs', movieController.getMovieLogs);

// POST /api/movies/logs - 创建观后感记录
router.post('/logs', authenticate, movieController.createMovieLog);

// POST /api/movies/logs/:id/like - 点赞/点踩观后感记录
router.post('/logs/:id/like', authenticate, movieController.toggleMovieLogLike);

// DELETE /api/movies/logs/:id - 删除观后感记录
router.delete('/logs/:id', authenticate, movieController.deleteMovieLog);

// ========== 影视详情（必须放在最后，避免匹配上面的具体路径） ==========

// GET /api/movies/:id - 获取影视详情
router.get('/:id', movieController.getMovieDetail);

// PUT /api/movies/:id - 更新影视信息
router.put('/:id', authenticate, movieController.updateMovie);

// DELETE /api/movies/:id - 删除影视
router.delete('/:id', authenticate, movieController.deleteMovie);

module.exports = router;
