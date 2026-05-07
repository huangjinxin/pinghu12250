const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

router.post('/register', authenticate, async (req, res) => {
  try {
    const { token, platform = 'ios', deviceId, deviceName, environment } = req.body;

    if (!token || !deviceId) {
      return res.status(400).json({ success: false, error: '缺少必要参数: token, deviceId' });
    }

    const normalizedPlatform = String(platform).toLowerCase();
    if (normalizedPlatform !== 'ios') {
      return res.status(400).json({ success: false, error: '当前仅支持 iOS push token 注册' });
    }

    console.log('[push-token] register', JSON.stringify({
      userId: req.user.id,
      deviceId,
      platform: normalizedPlatform,
      deviceName: deviceName || 'iOS Device',
      environment: environment || null,
      tokenSuffix: token.slice(-12)
    }));

    const device = await prisma.syncDevice.upsert({
      where: { deviceId },
      update: {
        userId: req.user.id,
        deviceType: normalizedPlatform,
        deviceName: deviceName || 'iOS Device',
        pushToken: token,
        isActive: true,
        lastSyncAt: new Date(),
        updatedAt: new Date()
      },
      create: {
        userId: req.user.id,
        deviceId,
        deviceType: normalizedPlatform,
        deviceName: deviceName || 'iOS Device',
        pushToken: token,
        isActive: true
      }
    });

    console.log('[push-token] stored', JSON.stringify({
      id: device.id,
      userId: device.userId,
      deviceId: device.deviceId,
      platform: device.deviceType,
      hasToken: Boolean(device.pushToken),
      isActive: device.isActive
    }));

    res.json({
      success: true,
      data: {
        deviceId: device.deviceId,
        platform: device.deviceType,
        tokenRegistered: true
      }
    });
  } catch (error) {
    console.error('注册 push token 失败:', error);
    res.status(500).json({ success: false, error: '注册 push token 失败' });
  }
});

router.post('/unregister', authenticate, async (req, res) => {
  try {
    const { token, deviceId } = req.body;

    if (!token && !deviceId) {
      return res.status(400).json({ success: false, error: '请提供 token 或 deviceId' });
    }

    console.log('[push-token] unregister', JSON.stringify({
      userId: req.user.id,
      deviceId: deviceId || null,
      tokenSuffix: token ? token.slice(-12) : null
    }));

    const where = {
      userId: req.user.id,
      ...(deviceId ? { deviceId } : {}),
      ...(token ? { pushToken: token } : {})
    };

    const result = await prisma.syncDevice.updateMany({
      where,
      data: {
        pushToken: null,
        isActive: false,
        updatedAt: new Date()
      }
    });

    console.log('[push-token] unregistered', JSON.stringify({
      userId: req.user.id,
      count: result.count
    }));

    res.json({
      success: true,
      data: {
        count: result.count,
        tokenUnregistered: true
      }
    });
  } catch (error) {
    console.error('注销 push token 失败:', error);
    res.status(500).json({ success: false, error: '注销 push token 失败' });
  }
});

module.exports = router;
