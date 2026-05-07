/**
 * 同步 API 路由
 * 处理多设备离线同步
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const syncService = require('../services/syncService');

/**
 * POST /api/sync/register-device
 * 注册/更新同步设备
 */
router.post('/register-device', authenticate, async (req, res) => {
  try {
    const { deviceId, deviceName, deviceType, pushToken } = req.body;

    if (!deviceId || !deviceName || !deviceType) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: deviceId, deviceName, deviceType'
      });
    }

    const device = await syncService.registerDevice(req.user.id, {
      deviceId,
      deviceName,
      deviceType,
      pushToken
    });

    res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        serverTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('设备注册失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '设备注册失败'
    });
  }
});

/**
 * GET /api/sync/changes
 * 获取服务器端变更（增量同步）
 *
 * Query params:
 * - since: ISO8601 时间戳，获取该时间之后的变更
 * - types: 逗号分隔的实体类型列表，如 "Diary,ReadingNote"
 * - limit: 每次获取数量限制，默认 100
 * - cursor: 分页游标
 */
router.get('/changes', authenticate, async (req, res) => {
  try {
    const { since, types, limit, cursor } = req.query;

    if (!since) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: since'
      });
    }

    const sinceDate = new Date(since);
    if (isNaN(sinceDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: '无效的时间格式'
      });
    }

    const entityTypes = types ? types.split(',').map(t => t.trim()) : ['Diary'];
    const limitNum = Math.min(parseInt(limit) || 100, 500);

    const result = await syncService.getChangesSince(
      req.user.id,
      sinceDate,
      entityTypes,
      limitNum,
      cursor
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取变更失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取变更失败'
    });
  }
});

/**
 * POST /api/sync/push
 * 推送本地变更到服务器
 *
 * Body:
 * {
 *   deviceId: string,
 *   changes: [{
 *     entityType: "Diary",
 *     localId: string,
 *     serverId?: string,
 *     action: "create" | "update" | "delete",
 *     version: number,
 *     data: object,
 *     checksum?: string
 *   }]
 * }
 */
router.post('/push', authenticate, async (req, res) => {
  try {
    const { deviceId, changes } = req.body;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: deviceId'
      });
    }

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({
        success: false,
        error: '变更列表为空或格式错误'
      });
    }

    // 限制单次推送数量
    if (changes.length > 50) {
      return res.status(400).json({
        success: false,
        error: '单次推送不能超过50条变更'
      });
    }

    const result = await syncService.pushChanges(req.user.id, deviceId, changes);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('推送变更失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '推送变更失败'
    });
  }
});

/**
 * POST /api/sync/resolve-conflict
 * 解决同步冲突
 *
 * Body:
 * {
 *   conflictId: string,
 *   resolution: "keep_local" | "keep_server" | "merged",
 *   mergedData?: object  // 仅 merged 时需要
 * }
 */
router.post('/resolve-conflict', authenticate, async (req, res) => {
  try {
    const { conflictId, resolution, mergedData } = req.body;

    if (!conflictId || !resolution) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数: conflictId, resolution'
      });
    }

    const validResolutions = ['keep_local', 'keep_server', 'merged'];
    if (!validResolutions.includes(resolution)) {
      return res.status(400).json({
        success: false,
        error: '无效的解决方式，可选: keep_local, keep_server, merged'
      });
    }

    const result = await syncService.resolveConflict(
      conflictId,
      req.user.id,
      resolution,
      mergedData
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('解决冲突失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '解决冲突失败'
    });
  }
});

/**
 * GET /api/sync/status
 * 获取同步状态
 *
 * Query params:
 * - deviceId: 设备ID
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.query;

    const status = await syncService.getSyncStatus(req.user.id, deviceId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('获取同步状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取同步状态失败'
    });
  }
});

/**
 * GET /api/sync/conflicts
 * 获取未解决的冲突列表
 */
router.get('/conflicts', authenticate, async (req, res) => {
  try {
    const conflicts = await syncService.getConflicts(req.user.id);

    res.json({
      success: true,
      data: {
        conflicts,
        count: conflicts.length
      }
    });
  } catch (error) {
    console.error('获取冲突列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '获取冲突列表失败'
    });
  }
});

/**
 * DELETE /api/sync/device/:deviceId
 * 注销设备
 */
router.delete('/device/:deviceId', authenticate, async (req, res) => {
  try {
    const { deviceId } = req.params;

    await require('../lib/prisma').syncDevice.updateMany({
      where: {
        userId: req.user.id,
        deviceId
      },
      data: {
        isActive: false
      }
    });

    res.json({
      success: true,
      message: '设备已注销'
    });
  } catch (error) {
    console.error('注销设备失败:', error);
    res.status(500).json({
      success: false,
      error: error.message || '注销设备失败'
    });
  }
});

module.exports = router;
