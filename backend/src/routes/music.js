/**
 * 音乐路由
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const musicController = require('../controllers/musicController');

// ========== 音乐管理 ==========

// GET /api/music/search - 搜索音乐
router.get('/search', musicController.searchMusic);

// POST /api/music - 添加音乐到音乐库
router.post('/', authenticate, musicController.addMusic);

// ========== 我的音乐库 ==========

// GET /api/music/library/my - 获取我的音乐库
router.get('/library/my', authenticate, musicController.getMyMusicLibrary);

// POST /api/music/library - 添加音乐到我的音乐库
router.post('/library', authenticate, musicController.addToMyMusicLibrary);

// PUT /api/music/library/:id - 更新音乐库中的音乐状态
router.put('/library/:id', authenticate, musicController.updateMusicLibraryStatus);

// ========== 听后感记录 ==========

// GET /api/music/logs - 获取听后感记录列表（听后感动态）
router.get('/logs', musicController.getMusicLogs);

// POST /api/music/logs - 创建听后感记录
router.post('/logs', authenticate, musicController.createMusicLog);

// POST /api/music/logs/:id/like - 点赞/点踩听后感记录
router.post('/logs/:id/like', authenticate, musicController.toggleMusicLogLike);

// DELETE /api/music/logs/:id - 删除听后感记录
router.delete('/logs/:id', authenticate, musicController.deleteMusicLog);

// ========== 音乐详情（必须放在最后，避免匹配上面的具体路径） ==========

// GET /api/music/:id - 获取音乐详情
router.get('/:id', musicController.getMusicDetail);

// PUT /api/music/:id - 更新音乐信息
router.put('/:id', authenticate, musicController.updateMusic);

// DELETE /api/music/:id - 删除音乐
router.delete('/:id', authenticate, musicController.deleteMusic);

module.exports = router;
