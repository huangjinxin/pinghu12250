/**
 * 同步服务 - 处理多设备离线同步逻辑
 */

const prisma = require('../lib/prisma');
const crypto = require('crypto');

/**
 * 计算内容哈希值
 * @param {string} content - 内容字符串
 * @returns {string} SHA256 哈希值
 */
const calculateChecksum = (content) => {
  if (!content) return null;
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
};

/**
 * 注册/更新设备
 * @param {string} userId - 用户ID
 * @param {Object} deviceInfo - 设备信息
 */
const registerDevice = async (userId, deviceInfo) => {
  const { deviceId, deviceName, deviceType, pushToken } = deviceInfo;

  const device = await prisma.syncDevice.upsert({
    where: { deviceId },
    update: {
      deviceName,
      deviceType,
      pushToken,
      lastSyncAt: new Date(),
      isActive: true,
      updatedAt: new Date()
    },
    create: {
      userId,
      deviceId,
      deviceName,
      deviceType,
      pushToken,
      isActive: true
    }
  });

  return device;
};

/**
 * 获取服务器端变更（增量同步）
 * @param {string} userId - 用户ID
 * @param {Date} since - 上次同步时间
 * @param {string[]} entityTypes - 实体类型列表
 * @param {number} limit - 每次获取数量限制
 * @param {string} cursor - 分页游标
 */
const getChangesSince = async (userId, since, entityTypes = ['Diary'], limit = 100, cursor = null) => {
  const changes = [];
  let hasMore = false;
  let nextCursor = null;

  // 处理日记变更
  if (entityTypes.includes('Diary')) {
    const diaryWhere = {
      authorId: userId,
      OR: [
        { updatedAt: { gt: since } },
        { deletedAt: { gt: since } }
      ]
    };

    // 如果有游标，添加游标条件
    if (cursor) {
      const [cursorType, cursorId] = cursor.split(':');
      if (cursorType === 'Diary') {
        diaryWhere.id = { gt: cursorId };
      }
    }

    const diaries = await prisma.diary.findMany({
      where: diaryWhere,
      orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
      take: limit + 1, // 多取一条判断是否有更多
      select: {
        id: true,
        title: true,
        content: true,
        mood: true,
        weather: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        version: true,
        localId: true,
        deletedAt: true,
        checksum: true
      }
    });

    // 检查是否有更多数据
    if (diaries.length > limit) {
      hasMore = true;
      diaries.pop(); // 移除多余的一条
      const lastDiary = diaries[diaries.length - 1];
      nextCursor = `Diary:${lastDiary.id}`;
    }

    // 转换为变更记录
    for (const diary of diaries) {
      changes.push({
        entityType: 'Diary',
        entityId: diary.id,
        action: diary.deletedAt ? 'delete' : 'update',
        version: diary.version,
        data: diary.deletedAt ? null : {
          id: diary.id,
          localId: diary.localId,
          title: diary.title,
          content: diary.content,
          mood: diary.mood,
          weather: diary.weather,
          isPublic: diary.isPublic,
          createdAt: diary.createdAt.toISOString(),
          updatedAt: diary.updatedAt.toISOString(),
          checksum: diary.checksum
        },
        syncedAt: diary.updatedAt.toISOString()
      });
    }
  }

  return {
    changes,
    hasMore,
    nextCursor,
    serverTime: new Date().toISOString()
  };
};

/**
 * 推送本地变更到服务器
 * @param {string} userId - 用户ID
 * @param {string} deviceId - 设备ID
 * @param {Object[]} changes - 变更列表
 */
const pushChanges = async (userId, deviceId, changes) => {
  const results = [];

  for (const change of changes) {
    try {
      const result = await processChange(userId, deviceId, change);
      results.push(result);
    } catch (error) {
      results.push({
        localId: change.localId,
        serverId: change.serverId,
        status: 'error',
        error: error.message
      });
    }
  }

  // 更新设备最后同步时间
  await prisma.syncDevice.updateMany({
    where: { deviceId, userId },
    data: { lastSyncAt: new Date() }
  });

  return {
    results,
    serverTime: new Date().toISOString()
  };
};

/**
 * 处理单个变更
 */
const processChange = async (userId, deviceId, change) => {
  const { entityType, localId, serverId, action, version, data, checksum } = change;

  if (entityType !== 'Diary') {
    throw new Error(`不支持的实体类型: ${entityType}`);
  }

  switch (action) {
    case 'create':
      return await handleCreate(userId, deviceId, localId, data);
    case 'update':
      return await handleUpdate(userId, deviceId, localId, serverId, version, data);
    case 'delete':
      return await handleDelete(userId, deviceId, localId, serverId, version);
    default:
      throw new Error(`不支持的操作: ${action}`);
  }
};

/**
 * 处理创建操作
 */
const handleCreate = async (userId, deviceId, localId, data) => {
  // 检查是否已存在（通过 localId）
  const existing = await prisma.diary.findUnique({
    where: { localId }
  });

  if (existing) {
    // 已存在，返回现有记录
    return {
      localId,
      serverId: existing.id,
      status: 'success',
      version: existing.version
    };
  }

  // 创建新记录
  const diary = await prisma.diary.create({
    data: {
      authorId: userId,
      localId,
      title: data.title,
      content: data.content,
      mood: data.mood,
      weather: data.weather,
      isPublic: data.isPublic ?? false,
      version: 1,
      deviceId,
      syncedAt: new Date(),
      checksum: calculateChecksum(data.content)
    }
  });

  return {
    localId,
    serverId: diary.id,
    status: 'success',
    version: diary.version
  };
};

/**
 * 处理更新操作
 */
const handleUpdate = async (userId, deviceId, localId, serverId, clientVersion, data) => {
  // 查找现有记录
  const existing = await prisma.diary.findFirst({
    where: {
      OR: [
        { id: serverId },
        { localId }
      ],
      authorId: userId
    }
  });

  if (!existing) {
    throw new Error('记录不存在');
  }

  // 版本冲突检测
  if (existing.version > clientVersion) {
    // 创建冲突记录
    await prisma.syncConflict.create({
      data: {
        userId,
        entityType: 'Diary',
        entityId: existing.id,
        localVersion: clientVersion,
        serverVersion: existing.version,
        localData: data,
        serverData: {
          id: existing.id,
          title: existing.title,
          content: existing.content,
          mood: existing.mood,
          weather: existing.weather,
          isPublic: existing.isPublic,
          createdAt: existing.createdAt.toISOString(),
          updatedAt: existing.updatedAt.toISOString()
        }
      }
    });

    return {
      localId,
      serverId: existing.id,
      status: 'conflict',
      version: existing.version,
      conflict: {
        serverVersion: existing.version,
        serverData: {
          title: existing.title,
          content: existing.content,
          mood: existing.mood,
          weather: existing.weather,
          updatedAt: existing.updatedAt.toISOString()
        }
      }
    };
  }

  // 无冲突，执行更新
  const updated = await prisma.diary.update({
    where: { id: existing.id },
    data: {
      title: data.title,
      content: data.content,
      mood: data.mood,
      weather: data.weather,
      isPublic: data.isPublic,
      version: existing.version + 1,
      deviceId,
      syncedAt: new Date(),
      checksum: calculateChecksum(data.content)
    }
  });

  return {
    localId,
    serverId: updated.id,
    status: 'success',
    version: updated.version
  };
};

/**
 * 处理删除操作
 */
const handleDelete = async (userId, deviceId, localId, serverId, clientVersion) => {
  const existing = await prisma.diary.findFirst({
    where: {
      OR: [
        { id: serverId },
        { localId }
      ],
      authorId: userId
    }
  });

  if (!existing) {
    // 已删除，视为成功
    return {
      localId,
      serverId,
      status: 'success',
      version: 0
    };
  }

  // 版本冲突检测
  if (existing.version > clientVersion) {
    return {
      localId,
      serverId: existing.id,
      status: 'conflict',
      version: existing.version,
      conflict: {
        serverVersion: existing.version,
        message: '服务器版本已更新，请确认是否仍要删除'
      }
    };
  }

  // 软删除
  await prisma.diary.update({
    where: { id: existing.id },
    data: {
      deletedAt: new Date(),
      version: existing.version + 1,
      deviceId
    }
  });

  return {
    localId,
    serverId: existing.id,
    status: 'success',
    version: existing.version + 1
  };
};

/**
 * 解决同步冲突
 * @param {string} conflictId - 冲突记录ID
 * @param {string} userId - 用户ID
 * @param {string} resolution - 解决方式 (keep_local / keep_server / merged)
 * @param {Object} mergedData - 合并后的数据（仅 merged 时使用）
 */
const resolveConflict = async (conflictId, userId, resolution, mergedData = null) => {
  const conflict = await prisma.syncConflict.findFirst({
    where: { id: conflictId, userId }
  });

  if (!conflict) {
    throw new Error('冲突记录不存在');
  }

  if (conflict.resolution) {
    throw new Error('冲突已解决');
  }

  let finalData;
  switch (resolution) {
    case 'keep_local':
      finalData = conflict.localData;
      break;
    case 'keep_server':
      finalData = conflict.serverData;
      break;
    case 'merged':
      if (!mergedData) {
        throw new Error('合并解决方式需要提供合并后的数据');
      }
      finalData = mergedData;
      break;
    default:
      throw new Error('无效的解决方式');
  }

  // 更新实体
  if (conflict.entityType === 'Diary') {
    const existing = await prisma.diary.findUnique({
      where: { id: conflict.entityId }
    });

    if (existing) {
      await prisma.diary.update({
        where: { id: conflict.entityId },
        data: {
          title: finalData.title,
          content: finalData.content,
          mood: finalData.mood,
          weather: finalData.weather,
          isPublic: finalData.isPublic,
          version: existing.version + 1,
          syncedAt: new Date(),
          checksum: calculateChecksum(finalData.content)
        }
      });
    }
  }

  // 标记冲突已解决
  await prisma.syncConflict.update({
    where: { id: conflictId },
    data: {
      resolution,
      resolvedAt: new Date()
    }
  });

  return { success: true };
};

/**
 * 获取同步状态
 */
const getSyncStatus = async (userId, deviceId) => {
  const device = await prisma.syncDevice.findFirst({
    where: { userId, deviceId }
  });

  const pendingConflicts = await prisma.syncConflict.count({
    where: { userId, resolution: null }
  });

  return {
    device: device ? {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      lastSyncAt: device.lastSyncAt.toISOString(),
      isActive: device.isActive
    } : null,
    pendingConflicts,
    serverTime: new Date().toISOString()
  };
};

/**
 * 获取用户的所有冲突
 */
const getConflicts = async (userId) => {
  const conflicts = await prisma.syncConflict.findMany({
    where: { userId, resolution: null },
    orderBy: { createdAt: 'desc' }
  });

  return conflicts;
};

module.exports = {
  calculateChecksum,
  registerDevice,
  getChangesSince,
  pushChanges,
  resolveConflict,
  getSyncStatus,
  getConflicts
};
