/**
 * AI API 配置管理路由
 * 权限：TEACHER / ADMIN（管理）/ 已登录（查看激活配置）
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const aiService = require('../services/aiService');
const { getQueueStats, retryFailedTasks, cleanupCompletedTasks } = require('../services/embeddingQueueService');
const { getUserEmbeddingStats, searchSimilar } = require('../services/embeddingService');
const {
  getAutomationSettings,
  updateAutomationSettings,
  getTaskSummary,
  getTasks,
  retryTask
} = require('../services/aiAutomationService');

// 获取当前激活的 AI 配置（供客户端使用，只需登录）
router.get('/active', authenticate, async (req, res) => {
  try {
    // 获取默认启用的配置
    const config = await prisma.aiApiConfig.findFirst({
      where: {
        isEnabled: true,
        isDefault: true
      }
    });

    // 如果没有默认配置，尝试获取任意启用的配置
    const activeConfig = config || await prisma.aiApiConfig.findFirst({
      where: { isEnabled: true }
    });

    if (!activeConfig) {
      return res.json({
        success: true,
        data: { config: null },
        message: '暂未配置 AI API'
      });
    }

    // 返回配置（隐藏敏感信息）
    res.json({
      success: true,
      data: {
        config: {
          id: activeConfig.id,
          name: activeConfig.name,
          baseUrl: activeConfig.baseUrl,
          model: activeConfig.model,
          isDefault: activeConfig.isDefault,
          isEnabled: activeConfig.isEnabled
        }
      }
    });
  } catch (error) {
    console.error('获取激活 AI 配置失败:', error);
    res.status(500).json({ success: false, error: '获取配置失败' });
  }
});

// 获取 AI 配置列表
router.get('/', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const configs = await prisma.aiApiConfig.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // 隐藏 API Key（只返回是否已设置）
    const safeConfigs = configs.map(config => ({
      ...config,
      apiKey: config.apiKey ? '******' : null,
      hasApiKey: !!config.apiKey
    }));

    res.json({ success: true, data: safeConfigs });
  } catch (error) {
    console.error('获取 AI 配置列表失败:', error);
    res.status(500).json({ success: false, error: '获取配置列表失败' });
  }
});

// 创建 AI 配置
router.post('/', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const {
      name, baseUrl, apiKey, model, temperature, maxTokens, isDefault,
      configType, enablePsychologyRAG,
      // 双模型支持
      llmModel, embeddingModel
    } = req.body;

    if (!name || !baseUrl) {
      return res.status(400).json({ success: false, error: '名称和服务器地址必填' });
    }

    // 验证 configType
    const validTypes = ['llm', 'embedding', 'reranker'];
    const type = configType && validTypes.includes(configType) ? configType : 'llm';

    // 如果设为默认，先取消同类型的其他默认
    if (isDefault) {
      await prisma.aiApiConfig.updateMany({
        where: { isDefault: true, configType: type },
        data: { isDefault: false }
      });
    }

    // 确定主 model（向后兼容）
    const primaryModel = model || (type === 'llm' ? llmModel : embeddingModel) || 'default';

    const config = await prisma.aiApiConfig.create({
      data: {
        name,
        baseUrl,
        apiKey: apiKey || null,
        model: primaryModel,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 2000,
        isDefault: isDefault || false,
        createdBy: req.user.id,
        configType: type,
        enablePsychologyRAG: type === 'embedding' ? (enablePsychologyRAG || false) : false,
        // 双模型
        llmModel: llmModel || null,
        embeddingModel: embeddingModel || null
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...config,
        apiKey: config.apiKey ? '******' : null,
        hasApiKey: !!config.apiKey
      }
    });
  } catch (error) {
    console.error('创建 AI 配置失败:', error);
    res.status(500).json({ success: false, error: '创建配置失败' });
  }
});

// 更新 AI 配置
router.put('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, baseUrl, apiKey, model, temperature, maxTokens, isEnabled,
      configType, enablePsychologyRAG,
      // 双模型支持
      llmModel, embeddingModel
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (apiKey !== undefined) updateData.apiKey = apiKey || null;
    if (model !== undefined) updateData.model = model;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

    // 允许修改 configType
    if (configType !== undefined) {
      const validTypes = ['llm', 'embedding', 'reranker'];
      if (validTypes.includes(configType)) {
        updateData.configType = configType;
      }
    }
    if (enablePsychologyRAG !== undefined) {
      updateData.enablePsychologyRAG = enablePsychologyRAG;
    }

    // 双模型字段
    if (llmModel !== undefined) updateData.llmModel = llmModel || null;
    if (embeddingModel !== undefined) updateData.embeddingModel = embeddingModel || null;

    const config = await prisma.aiApiConfig.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: {
        ...config,
        apiKey: config.apiKey ? '******' : null,
        hasApiKey: !!config.apiKey
      }
    });
  } catch (error) {
    console.error('更新 AI 配置失败:', error);
    res.status(500).json({ success: false, error: '更新配置失败' });
  }
});

// 删除 AI 配置
router.delete('/:id', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.aiApiConfig.delete({
      where: { id }
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除 AI 配置失败:', error);
    res.status(500).json({ success: false, error: '删除配置失败' });
  }
});

// 设为默认
router.put('/:id/default', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // 先获取当前配置的类型
    const current = await prisma.aiApiConfig.findUnique({ where: { id } });
    if (!current) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }

    // 只取消同类型的其他默认配置
    await prisma.aiApiConfig.updateMany({
      where: {
        isDefault: true,
        configType: current.configType  // 按类型区分
      },
      data: { isDefault: false }
    });

    // 设置当前为默认
    const config = await prisma.aiApiConfig.update({
      where: { id },
      data: { isDefault: true, isEnabled: true }
    });

    res.json({
      success: true,
      data: {
        ...config,
        apiKey: config.apiKey ? '******' : null,
        hasApiKey: !!config.apiKey
      }
    });
  } catch (error) {
    console.error('设置默认配置失败:', error);
    res.status(500).json({ success: false, error: '设置默认失败' });
  }
});

// 启用/停用
router.put('/:id/toggle', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.aiApiConfig.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }

    const config = await prisma.aiApiConfig.update({
      where: { id },
      data: { isEnabled: !existing.isEnabled }
    });

    res.json({
      success: true,
      data: {
        ...config,
        apiKey: config.apiKey ? '******' : null,
        hasApiKey: !!config.apiKey
      }
    });
  } catch (error) {
    console.error('切换配置状态失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// 测试连接
router.post('/:id/test', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const config = await prisma.aiApiConfig.findUnique({ where: { id } });
    if (!config) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }

    const result = await aiService.testConnection(config);

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error) {
    console.error('测试连接失败:', error);
    res.status(500).json({ success: false, error: '测试失败' });
  }
});

// 获取可用模型列表（不需要保存配置，直接用输入的地址查询）
router.post('/fetch-models', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { baseUrl, apiKey } = req.body;

    if (!baseUrl) {
      return res.status(400).json({ success: false, error: '请输入服务器地址' });
    }

    const result = await aiService.fetchModels(baseUrl, apiKey);

    res.json({
      success: result.success,
      models: result.models,
      error: result.error
    });
  } catch (error) {
    console.error('获取模型列表失败:', error);
    res.status(500).json({ success: false, error: '获取模型列表失败' });
  }
});

// 根据已保存的配置 ID 获取模型列表
router.get('/:id/models', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const config = await prisma.aiApiConfig.findUnique({ where: { id } });
    if (!config) {
      return res.status(404).json({ success: false, error: '配置不存在' });
    }

    const result = await aiService.fetchModels(config.baseUrl, config.apiKey);

    res.json({
      success: result.success,
      models: result.models,
      error: result.error
    });
  } catch (error) {
    console.error('获取模型列表失败:', error);
    res.status(500).json({ success: false, error: '获取模型列表失败' });
  }
});

// ========== AI 自动化管理 ==========

router.get('/automation-settings', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const data = await getAutomationSettings();
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取 AI 自动化设置失败:', error);
    res.status(500).json({ success: false, error: '获取自动化设置失败' });
  }
});

router.put('/automation-settings', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const data = await updateAutomationSettings(req.body || {}, req.user.id);
    res.json({ success: true, data, message: '自动化设置已更新' });
  } catch (error) {
    console.error('更新 AI 自动化设置失败:', error);
    res.status(500).json({ success: false, error: '更新自动化设置失败' });
  }
});

router.get('/tasks/summary', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const data = await getTaskSummary();
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取 AI 任务汇总失败:', error);
    res.status(500).json({ success: false, error: '获取任务汇总失败' });
  }
});

router.get('/tasks', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const data = await getTasks(req.query || {});
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取 AI 任务列表失败:', error);
    res.status(500).json({ success: false, error: '获取任务列表失败' });
  }
});

router.post('/tasks/:id/retry', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const data = await retryTask(req.params.id);
    res.json({ success: true, data, message: '任务已重新加入队列' });
  } catch (error) {
    console.error('重试 AI 任务失败:', error);
    res.status(500).json({ success: false, error: error.message || '重试任务失败' });
  }
});

// ========== RAG / Embedding 管理 API ==========

// 获取 Embedding 队列统计
router.get('/embedding/queue-stats', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取队列统计失败:', error);
    res.status(500).json({ success: false, error: '获取队列统计失败' });
  }
});

// 获取当前用户的 Embedding 统计
router.get('/embedding/my-stats', authenticate, async (req, res) => {
  try {
    const stats = await getUserEmbeddingStats(req.user.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取用户 Embedding 统计失败:', error);
    res.status(500).json({ success: false, error: '获取统计失败' });
  }
});

// 重试失败的 Embedding 任务
router.post('/embedding/retry-failed', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { taskId } = req.body;
    const count = await retryFailedTasks(taskId || null);
    res.json({ success: true, data: { retriedCount: count } });
  } catch (error) {
    console.error('重试失败任务出错:', error);
    res.status(500).json({ success: false, error: '重试失败' });
  }
});

// 清理已完成的 Embedding 任务
router.post('/embedding/cleanup', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const count = await cleanupCompletedTasks();
    res.json({ success: true, data: { cleanedCount: count } });
  } catch (error) {
    console.error('清理任务出错:', error);
    res.status(500).json({ success: false, error: '清理失败' });
  }
});

// RAG 搜索测试（仅测试用）
router.post('/embedding/search-test', authenticate, authorize('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const { userId, query, weekId, limit, threshold } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, error: '请输入查询文本' });
    }

    const results = await searchSimilar(userId || req.user.id, query, {
      weekId,
      limit: limit || 5,
      threshold: threshold || 0.7
    });

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('RAG 搜索测试失败:', error);
    res.status(500).json({ success: false, error: error.message || '搜索失败' });
  }
});

// 获取启用的 Embedding 配置
router.get('/embedding/active-config', authenticate, async (req, res) => {
  try {
    const config = await prisma.aiApiConfig.findFirst({
      where: {
        configType: 'embedding',
        isEnabled: true,
        enablePsychologyRAG: true
      },
      select: {
        id: true,
        name: true,
        model: true,
        embeddingDimension: true,
        enablePsychologyRAG: true
      }
    });

    res.json({
      success: true,
      data: config ? {
        enabled: true,
        config
      } : {
        enabled: false,
        config: null
      }
    });
  } catch (error) {
    console.error('获取 Embedding 配置失败:', error);
    res.status(500).json({ success: false, error: '获取配置失败' });
  }
});

module.exports = router;
