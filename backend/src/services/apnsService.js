/**
 * APNs推送服务
 */

const apn = require('apn');
const prisma = require('../lib/prisma');

const APNS_TOPIC = process.env.APNS_BUNDLE_ID || 'pinghu.pinghu12250';
const APNS_PRODUCTION = process.env.APNS_PRODUCTION
  ? process.env.APNS_PRODUCTION === 'true'
  : true;

let apnProvider = null;

/**
 * 初始化APNs Provider
 */
function initAPNs() {
  const { APNS_KEY_PATH, APNS_KEY_ID, APNS_TEAM_ID } = process.env;

  if (!APNS_KEY_PATH || !APNS_KEY_ID || !APNS_TEAM_ID) {
    console.warn('[APNs] 缺少配置，推送功能将不可用');
    return;
  }

  try {
    apnProvider = new apn.Provider({
      token: {
        key: APNS_KEY_PATH,
        keyId: APNS_KEY_ID,
        teamId: APNS_TEAM_ID
      },
      production: APNS_PRODUCTION
    });

    console.log(`[APNs] 推送服务已初始化 topic=${APNS_TOPIC} production=${APNS_PRODUCTION}`);
  } catch (error) {
    console.error('[APNs] 初始化失败:', error.message);
  }
}

async function getUnreadBadgeCount(userId) {
  return prisma.message.count({
    where: {
      toUserId: userId,
      messageType: 'CHAT',
      isRead: false,
      deletedAt: null
    }
  });
}

async function getActiveIOSDevices(userId) {
  return prisma.syncDevice.findMany({
    where: {
      userId,
      deviceType: 'ios',
      isActive: true,
      pushToken: { not: null }
    },
    select: {
      id: true,
      deviceId: true,
      pushToken: true,
      deviceName: true
    }
  });
}

async function invalidateFailedTokens(failed = []) {
  const invalidReasons = new Set([
    'BadDeviceToken',
    'DeviceTokenNotForTopic',
    'Unregistered'
  ]);

  const invalidTokens = failed
    .filter(item => invalidReasons.has(item?.response?.reason) && item.device)
    .map(item => item.device);

  if (!invalidTokens.length) {
    return;
  }

  await prisma.syncDevice.updateMany({
    where: { pushToken: { in: invalidTokens } },
    data: {
      pushToken: null,
      isActive: false,
      updatedAt: new Date()
    }
  });
}

/**
 * 发送推送通知（多设备）
 */
async function sendPushNotification(userId, notification) {
  if (!apnProvider) {
    console.warn('[APNs] 推送服务未初始化，跳过发送');
    return { success: false, reason: 'APNs未配置' };
  }

  try {
    const devices = await getActiveIOSDevices(userId);

    if (!devices.length) {
      console.warn(`[APNs] 未找到活跃 iOS 设备 userId=${userId}`);
      return { success: false, reason: '用户未设置可用设备token' };
    }

    const note = new apn.Notification({
      topic: APNS_TOPIC,
      alert: notification.alert,
      sound: notification.sound || 'default',
      badge: notification.badge || 0,
      payload: notification.payload || {},
      pushType: 'alert',
      priority: 10
    });

    const tokens = devices.map(device => device.pushToken).filter(Boolean);
    console.log('[APNs] send', JSON.stringify({
      userId,
      topic: note.topic,
      production: APNS_PRODUCTION,
      deviceIds: devices.map(device => device.deviceId),
      badge: note.badge,
      alert: note.alert,
      payload: note.payload
    }));

    const result = await apnProvider.send(note, tokens);

    if (result.failed.length > 0) {
      console.error('[APNs] failed', JSON.stringify(result.failed.map(item => ({
        device: item.device,
        status: item.status,
        response: item.response,
        error: item.error?.message
      }))));
      await invalidateFailedTokens(result.failed);
    }

    console.log(`[APNs] 推送完成: userId=${userId}, sent=${result.sent.length}, failed=${result.failed.length}`);
    return {
      success: result.sent.length > 0,
      sent: result.sent.length,
      failed: result.failed.length,
      reason: result.sent.length > 0 ? undefined : (result.failed[0]?.response?.reason || '推送失败')
    };
  } catch (error) {
    console.error('[APNs] 发送推送失败:', error);
    return { success: false, reason: error.message };
  }
}

/**
 * 发送新消息推送
 */
async function sendMessagePush(userId, message) {
  const senderName = message.fromUser?.username || '新消息';
  const badge = await getUnreadBadgeCount(userId);
  const conversationId = message.conversationId || message.fromUserId;

  return sendPushNotification(userId, {
    alert: {
      title: senderName,
      body: message.content?.slice(0, 120) || '你收到一条新消息'
    },
    badge,
    payload: {
      type: 'im_message',
      conversationId,
      fromUserId: message.fromUserId,
      messageId: message.id,
      senderName,
      badge
    }
  });
}

module.exports = {
  initAPNs,
  sendPushNotification,
  sendMessagePush,
  getUnreadBadgeCount
};
