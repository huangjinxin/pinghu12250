/**
 * AI API 配置管理路由
 * 权限：TEACHER / ADMIN
 */

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const aiService = require('../services/aiService');

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
    const { name, baseUrl, apiKey, model, temperature, maxTokens, isDefault } = req.body;

    if (!name || !baseUrl) {
      return res.status(400).json({ success: false, error: '名称和服务器地址必填' });
    }

    // 如果设为默认，先取消其他默认
    if (isDefault) {
      await prisma.aiApiConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const config = await prisma.aiApiConfig.create({
      data: {
        name,
        baseUrl,
        apiKey: apiKey || null,
        model: model || 'default',
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 2000,
        isDefault: isDefault || false,
        createdBy: req.user.id
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
    const { name, baseUrl, apiKey, model, temperature, maxTokens, isEnabled } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (apiKey !== undefined) updateData.apiKey = apiKey || null;
    if (model !== undefined) updateData.model = model;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (maxTokens !== undefined) updateData.maxTokens = maxTokens;
    if (isEnabled !== undefined) updateData.isEnabled = isEnabled;

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

    // 取消其他默认
    await prisma.aiApiConfig.updateMany({
      where: { isDefault: true },
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

module.exports = router;
