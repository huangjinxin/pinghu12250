/**
 * Embedding 任务队列服务
 * 基于数据库的异步任务队列，支持重试和失败处理
 */

const prisma = require('../lib/prisma');
const { generateDiaryEmbedding, getEmbeddingConfig } = require('./embeddingService');

// 队列配置
const QUEUE_CONFIG = {
  MAX_RETRY: 3,           // 最大重试次数
  BATCH_SIZE: 5,          // 每批处理数量
  POLL_INTERVAL: 30000,   // 轮询间隔（毫秒）
  LOCK_TIMEOUT: 300000,   // 锁定超时（5分钟）
};

// 任务状态常量
const TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// 队列是否正在运行
let isProcessing = false;
let pollTimer = null;

/**
 * 添加日记到 Embedding 队列
 * @param {string} diaryId - 日记 ID
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object>} 任务对象
 */
async function enqueueDiary(diaryId, userId) {
  // 检查是否已有该日记的待处理任务
  const existing = await prisma.embeddingTask.findFirst({
    where: {
      diaryId,
      status: { in: [TASK_STATUS.PENDING, TASK_STATUS.PROCESSING] },
    },
  });

  if (existing) {
    return existing; // 已有任务，不重复添加
  }

  // 创建新任务
  const task = await prisma.embeddingTask.create({
    data: {
      diaryId,
      userId,
      status: TASK_STATUS.PENDING,
    },
  });

  console.log(`[EmbeddingQueue] 任务入队: ${task.id} (diary: ${diaryId})`);
  return task;
}

/**
 * 批量添加日记到队列
 * @param {Array<{diaryId: string, userId: string}>} items - 日记列表
 */
async function enqueueBatch(items) {
  for (const item of items) {
    await enqueueDiary(item.diaryId, item.userId);
  }
}

/**
 * 获取待处理任务
 * @returns {Promise<Array>} 任务列表
 */
async function getPendingTasks() {
  // 同时获取 pending 和 超时的 processing 任务
  const lockTimeout = new Date(Date.now() - QUEUE_CONFIG.LOCK_TIMEOUT);

  const tasks = await prisma.embeddingTask.findMany({
    where: {
      OR: [
        { status: TASK_STATUS.PENDING },
        {
          status: TASK_STATUS.PROCESSING,
          updatedAt: { lt: lockTimeout },
        },
      ],
      retryCount: { lt: QUEUE_CONFIG.MAX_RETRY },
    },
    orderBy: { createdAt: 'asc' },
    take: QUEUE_CONFIG.BATCH_SIZE,
  });

  return tasks;
}

/**
 * 锁定任务（开始处理）
 * @param {string} taskId - 任务 ID
 */
async function lockTask(taskId) {
  await prisma.embeddingTask.update({
    where: { id: taskId },
    data: {
      status: TASK_STATUS.PROCESSING,
      updatedAt: new Date(),
    },
  });
}

/**
 * 完成任务
 * @param {string} taskId - 任务 ID
 */
async function completeTask(taskId) {
  await prisma.embeddingTask.update({
    where: { id: taskId },
    data: {
      status: TASK_STATUS.COMPLETED,
      processedAt: new Date(),
    },
  });
}

/**
 * 标记任务失败
 * @param {string} taskId - 任务 ID
 * @param {string} errorMsg - 错误信息
 */
async function failTask(taskId, errorMsg) {
  const task = await prisma.embeddingTask.findUnique({
    where: { id: taskId },
  });

  if (!task) return;

  const newRetryCount = task.retryCount + 1;
  const isFinalFail = newRetryCount >= QUEUE_CONFIG.MAX_RETRY;

  await prisma.embeddingTask.update({
    where: { id: taskId },
    data: {
      status: isFinalFail ? TASK_STATUS.FAILED : TASK_STATUS.PENDING,
      retryCount: newRetryCount,
      errorMsg,
      processedAt: isFinalFail ? new Date() : null,
    },
  });
}

/**
 * 处理单个任务
 * @param {Object} task - 任务对象
 */
async function processTask(task) {
  console.log(`[EmbeddingQueue] 处理任务: ${task.id} (diary: ${task.diaryId})`);

  try {
    // 锁定任务
    await lockTask(task.id);

    // 获取日记内容
    const diary = await prisma.diary.findUnique({
      where: { id: task.diaryId },
      select: {
        id: true,
        authorId: true,
        content: true,
        createdAt: true,
      },
    });

    if (!diary) {
      // 日记不存在，标记完成
      await completeTask(task.id);
      console.log(`[EmbeddingQueue] 日记不存在，跳过: ${task.diaryId}`);
      return;
    }

    // 生成 Embedding
    const result = await generateDiaryEmbedding(diary);

    if (result.success) {
      await completeTask(task.id);
      console.log(`[EmbeddingQueue] 任务完成: ${task.id}, 处理 ${result.chunks} 个分段`);
    } else {
      await failTask(task.id, result.error);
      console.log(`[EmbeddingQueue] 任务失败: ${task.id}, 错误: ${result.error}`);
    }
  } catch (error) {
    await failTask(task.id, error.message);
    console.error(`[EmbeddingQueue] 任务异常: ${task.id}`, error);
  }
}

/**
 * 处理队列中的任务
 */
async function processQueue() {
  if (isProcessing) {
    return; // 避免并发处理
  }

  // 检查是否有启用的 Embedding 配置
  const config = await getEmbeddingConfig();
  if (!config) {
    return; // 无配置，不处理
  }

  isProcessing = true;

  try {
    const tasks = await getPendingTasks();

    if (tasks.length === 0) {
      return;
    }

    console.log(`[EmbeddingQueue] 开始处理 ${tasks.length} 个任务`);

    // 串行处理任务（避免 API 并发限制）
    for (const task of tasks) {
      await processTask(task);
    }
  } catch (error) {
    console.error('[EmbeddingQueue] 队列处理错误:', error);
  } finally {
    isProcessing = false;
  }
}

/**
 * 启动队列消费者
 */
function startQueueConsumer() {
  if (pollTimer) {
    return; // 已启动
  }

  console.log('[EmbeddingQueue] 启动队列消费者');

  // 立即执行一次
  processQueue();

  // 定时轮询
  pollTimer = setInterval(() => {
    processQueue();
  }, QUEUE_CONFIG.POLL_INTERVAL);
}

/**
 * 停止队列消费者
 */
function stopQueueConsumer() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('[EmbeddingQueue] 停止队列消费者');
  }
}

/**
 * 获取队列统计信息
 * @returns {Promise<Object>} 统计信息
 */
async function getQueueStats() {
  const stats = await prisma.embeddingTask.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const result = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };

  stats.forEach((s) => {
    result[s.status] = s._count.id;
  });

  return result;
}

/**
 * 清理已完成的任务（保留最近 7 天）
 */
async function cleanupCompletedTasks() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const deleted = await prisma.embeddingTask.deleteMany({
    where: {
      status: TASK_STATUS.COMPLETED,
      processedAt: { lt: cutoff },
    },
  });

  if (deleted.count > 0) {
    console.log(`[EmbeddingQueue] 清理 ${deleted.count} 个已完成任务`);
  }

  return deleted.count;
}

/**
 * 重试失败的任务
 * @param {string} taskId - 任务 ID（可选，不传则重试所有）
 */
async function retryFailedTasks(taskId = null) {
  const where = {
    status: TASK_STATUS.FAILED,
    ...(taskId ? { id: taskId } : {}),
  };

  const updated = await prisma.embeddingTask.updateMany({
    where,
    data: {
      status: TASK_STATUS.PENDING,
      retryCount: 0,
      errorMsg: null,
      processedAt: null,
    },
  });

  console.log(`[EmbeddingQueue] 重置 ${updated.count} 个失败任务`);
  return updated.count;
}

module.exports = {
  enqueueDiary,
  enqueueBatch,
  processQueue,
  startQueueConsumer,
  stopQueueConsumer,
  getQueueStats,
  cleanupCompletedTasks,
  retryFailedTasks,
  TASK_STATUS,
};
