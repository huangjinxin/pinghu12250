/**
 * Embedding 向量生成服务
 * 负责调用配置的 Embedding API 生成向量，并存储到 pgvector
 */

const prisma = require('../lib/prisma');
const { chunkDiaryContent, getISOWeekId } = require('./chunkService');

/**
 * 获取启用的 Embedding API 配置
 * @returns {Promise<Object|null>} 配置对象或 null
 */
async function getEmbeddingConfig() {
  const config = await prisma.aiApiConfig.findFirst({
    where: {
      isEnabled: true,
    },
    orderBy: { isDefault: 'desc' },
  });

  return config;
}

/**
 * 调用 Embedding API 生成向量
 * @param {string[]} texts - 文本数组
 * @param {Object} config - API 配置
 * @returns {Promise<number[][]>} 向量数组
 */
async function callEmbeddingAPI(texts, config) {
  const { baseUrl, apiKey, model } = config;

  // 构建请求（兼容 OpenAI 格式）
  const response = await fetch(`${baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: model || 'text-embedding-ada-002',
      input: texts,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embedding API 调用失败: ${response.status} ${errorText}`);
  }

  const result = await response.json();

  // 提取向量
  const embeddings = result.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);

  return embeddings;
}

/**
 * 自动检测并更新向量维度
 * @param {Object} config - API 配置
 * @param {number[]} sampleEmbedding - 示例向量
 */
async function autoDetectDimension(config, sampleEmbedding) {
  if (config.embeddingDimension) {
    return; // 已有维度，无需更新
  }

  const dimension = sampleEmbedding.length;

  await prisma.aiApiConfig.update({
    where: { id: config.id },
    data: { embeddingDimension: dimension },
  });

  console.log(`[EmbeddingService] 自动检测向量维度: ${dimension}`);
}

/**
 * 将向量存储到 DiaryEmbedding 表
 * 使用原生 SQL 操作 pgvector
 * @param {Object} params - 存储参数
 */
async function storeEmbedding({
  userId,
  diaryId,
  weekId,
  chunkIndex,
  content,
  contentHash,
  embedding,
}) {
  // 将向量转换为 pgvector 格式字符串
  const vectorString = `[${embedding.join(',')}]`;

  // 使用 upsert 逻辑：先删除旧记录，再插入新记录
  await prisma.$executeRaw`
    DELETE FROM "DiaryEmbedding"
    WHERE "diaryId" = ${diaryId} AND "chunkIndex" = ${chunkIndex}
  `;

  await prisma.$executeRaw`
    INSERT INTO "DiaryEmbedding"
    ("id", "userId", "diaryId", "weekId", "chunkIndex", "content", "contentHash", "embedding", "createdAt", "updatedAt")
    VALUES (
      gen_random_uuid(),
      ${userId},
      ${diaryId},
      ${weekId},
      ${chunkIndex},
      ${content},
      ${contentHash},
      ${vectorString}::vector,
      NOW(),
      NOW()
    )
  `;
}

/**
 * 为日记生成 Embedding
 * @param {Object} diary - 日记对象 { id, authorId, content, createdAt }
 * @returns {Promise<{success: boolean, chunks: number, error?: string}>}
 */
async function generateDiaryEmbedding(diary) {
  try {
    // 1. 获取 Embedding 配置
    const config = await getEmbeddingConfig();
    if (!config) {
      return { success: false, chunks: 0, error: '未配置启用的 Embedding API' };
    }

    // 2. 分段
    const chunks = chunkDiaryContent(diary.content);
    if (chunks.length === 0) {
      return { success: true, chunks: 0 };
    }

    // 3. 检查是否需要更新（基于 contentHash）
    const existingEmbeddings = await prisma.$queryRaw`
      SELECT "chunkIndex", "contentHash" FROM "DiaryEmbedding"
      WHERE "diaryId" = ${diary.id}
    `;

    const existingMap = new Map(
      existingEmbeddings.map((e) => [e.chunkIndex, e.contentHash])
    );

    // 筛选需要更新的分段
    const chunksToUpdate = chunks.filter((chunk) => {
      const existingHash = existingMap.get(chunk.index);
      return existingHash !== chunk.hash;
    });

    if (chunksToUpdate.length === 0) {
      return { success: true, chunks: 0, message: '内容未变化，无需更新' };
    }

    // 4. 批量调用 Embedding API
    const texts = chunksToUpdate.map((c) => c.content);
    const embeddings = await callEmbeddingAPI(texts, config);

    // 5. 自动检测维度（首次）
    if (embeddings.length > 0) {
      await autoDetectDimension(config, embeddings[0]);
    }

    // 6. 存储向量
    const weekId = getISOWeekId(new Date(diary.createdAt));

    for (let i = 0; i < chunksToUpdate.length; i++) {
      const chunk = chunksToUpdate[i];
      await storeEmbedding({
        userId: diary.authorId,
        diaryId: diary.id,
        weekId,
        chunkIndex: chunk.index,
        content: chunk.content,
        contentHash: chunk.hash,
        embedding: embeddings[i],
      });
    }

    // 7. 删除不再需要的旧分段（如果内容变短了）
    const maxIndex = chunks.length - 1;
    await prisma.$executeRaw`
      DELETE FROM "DiaryEmbedding"
      WHERE "diaryId" = ${diary.id} AND "chunkIndex" > ${maxIndex}
    `;

    return { success: true, chunks: chunksToUpdate.length };
  } catch (error) {
    console.error('[EmbeddingService] 生成 Embedding 失败:', error);
    return { success: false, chunks: 0, error: error.message };
  }
}

/**
 * 删除日记的所有 Embedding
 * @param {string} diaryId - 日记 ID
 */
async function deleteDiaryEmbeddings(diaryId) {
  await prisma.$executeRaw`
    DELETE FROM "DiaryEmbedding" WHERE "diaryId" = ${diaryId}
  `;
}

/**
 * 相似度检索（用于 RAG）
 * @param {string} userId - 用户 ID
 * @param {string} queryText - 查询文本
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 相似片段列表
 */
async function searchSimilar(userId, queryText, options = {}) {
  const {
    weekId = null,     // 限定周
    limit = 5,         // 返回条数
    threshold = 0.7,   // 相似度阈值
  } = options;

  // 1. 获取 Embedding 配置
  const config = await getEmbeddingConfig();
  if (!config) {
    throw new Error('未配置启用的 Embedding API');
  }

  // 2. 生成查询向量
  const [queryEmbedding] = await callEmbeddingAPI([queryText], config);
  const vectorString = `[${queryEmbedding.join(',')}]`;

  // 3. 执行向量相似度检索
  let results;

  if (weekId) {
    results = await prisma.$queryRaw`
      SELECT
        "id", "diaryId", "weekId", "chunkIndex", "content",
        1 - ("embedding" <=> ${vectorString}::vector) as similarity
      FROM "DiaryEmbedding"
      WHERE "userId" = ${userId} AND "weekId" = ${weekId}
      ORDER BY "embedding" <=> ${vectorString}::vector
      LIMIT ${limit}
    `;
  } else {
    results = await prisma.$queryRaw`
      SELECT
        "id", "diaryId", "weekId", "chunkIndex", "content",
        1 - ("embedding" <=> ${vectorString}::vector) as similarity
      FROM "DiaryEmbedding"
      WHERE "userId" = ${userId}
      ORDER BY "embedding" <=> ${vectorString}::vector
      LIMIT ${limit}
    `;
  }

  // 4. 过滤低相似度结果
  return results.filter((r) => r.similarity >= threshold);
}

/**
 * 获取用户的 Embedding 统计
 * @param {string} userId - 用户 ID
 * @returns {Promise<Object>} 统计信息
 */
async function getUserEmbeddingStats(userId) {
  const stats = await prisma.$queryRaw`
    SELECT
      COUNT(DISTINCT "diaryId") as "diaryCount",
      COUNT(*) as "chunkCount",
      COUNT(DISTINCT "weekId") as "weekCount"
    FROM "DiaryEmbedding"
    WHERE "userId" = ${userId}
  `;

  return stats[0] || { diaryCount: 0, chunkCount: 0, weekCount: 0 };
}

module.exports = {
  getEmbeddingConfig,
  generateDiaryEmbedding,
  deleteDiaryEmbeddings,
  searchSimilar,
  getUserEmbeddingStats,
};
