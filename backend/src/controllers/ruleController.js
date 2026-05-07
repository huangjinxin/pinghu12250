// 使用 Prisma 单例
const prisma = require('../lib/prisma');
const { randomUUID } = require('crypto');

// ========== 技术类型管理 ==========

async function getRuleTypes(req, res) {
  try {
    const types = await prisma.ruleType.findMany({
      where: { isEnabled: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ types });
  } catch (error) {
    console.error('获取技术类型失败:', error);
    res.status(500).json({ error: '获取技术类型失败' });
  }
}

async function createRuleType(req, res) {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: '名称不能为空' });
    }

    const type = await prisma.ruleType.create({
      data: { name: name.trim(), description }
    });
    res.json({ type });
  } catch (error) {
    console.error('创建技术类型失败:', error);
    res.status(500).json({ error: '创建技术类型失败' });
  }
}

async function updateRuleType(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const type = await prisma.ruleType.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        description
      }
    });
    res.json({ type });
  } catch (error) {
    console.error('更新技术类型失败:', error);
    res.status(500).json({ error: '更新技术类型失败' });
  }
}

async function deleteRuleType(req, res) {
  try {
    const { id } = req.params;

    const count = await prisma.ruleTemplate.count({
      where: { typeId: id }
    });

    if (count > 0) {
      return res.status(400).json({
        error: `无法删除，该类型下还有 ${count} 条规则`
      });
    }

    await prisma.ruleType.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除技术类型失败:', error);
    res.status(500).json({ error: '删除技术类型失败' });
  }
}

// ========== 展示标准管理 ==========

async function getRuleStandards(req, res) {
  try {
    const standards = await prisma.ruleStandard.findMany({
      where: { isEnabled: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ standards });
  } catch (error) {
    console.error('获取展示标准失败:', error);
    res.status(500).json({ error: '获取展示标准失败' });
  }
}

async function createRuleStandard(req, res) {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: '名称不能为空' });
    }

    const standard = await prisma.ruleStandard.create({
      data: { name: name.trim(), description }
    });
    res.json({ standard });
  } catch (error) {
    console.error('创建展示标准失败:', error);
    res.status(500).json({ error: '创建展示标准失败' });
  }
}

async function updateRuleStandard(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const standard = await prisma.ruleStandard.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        description
      }
    });
    res.json({ standard });
  } catch (error) {
    console.error('更新展示标准失败:', error);
    res.status(500).json({ error: '更新展示标准失败' });
  }
}

async function deleteRuleStandard(req, res) {
  try {
    const { id } = req.params;

    const count = await prisma.ruleTemplate.count({
      where: { standardId: id }
    });

    if (count > 0) {
      return res.status(400).json({
        error: `无法删除，该标准下还有 ${count} 条规则`
      });
    }

    await prisma.ruleStandard.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除展示标准失败:', error);
    res.status(500).json({ error: '删除展示标准失败' });
  }
}

// ========== 规则模板管理 ==========

async function getRuleTemplates(req, res) {
  try {
    const {
      page = 1,
      pageSize = 10,
      keyword,
      typeId,
      standardId,
      status
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const take = parseInt(pageSize);

    const where = {};
    if (keyword) {
      where.name = { contains: keyword };
    }
    if (typeId) where.typeId = typeId;
    if (standardId) where.standardId = standardId;
    if (status) where.status = status;

    const [total, rawTemplates] = await Promise.all([
      prisma.ruleTemplate.count({ where }),
      prisma.ruleTemplate.findMany({
        where,
        include: {
          type: true,
          RuleStandard: true,
          author: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      })
    ]);

    const templates = rawTemplates.map(t => {
      const { author, RuleStandard, ...rest } = t;
      return { ...rest, creator: author, standard: RuleStandard };
    });

    res.json({
      templates,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / parseInt(pageSize))
      }
    });
  } catch (error) {
    console.error('获取规则模板列表失败:', error);
    res.status(500).json({ error: '获取规则模板列表失败' });
  }
}

async function getRuleTemplate(req, res) {
  try {
    const { id } = req.params;

    const template = await prisma.ruleTemplate.findUnique({
      where: { id },
      include: {
        type: true
      }
    });

    if (!template) {
      return res.status(404).json({ error: '规则模板不存在' });
    }

    res.json({ template });
  } catch (error) {
    console.error('获取规则模板详情失败:', error);
    res.status(500).json({ error: '获取规则模板详情失败' });
  }
}

async function createRuleTemplate(req, res) {
  try {
    const {
      name,
      description,
      typeId,
      standardId,
      requireImage,
      requireText,
      requireLink,
      requireAudio,
      textMaxLength,
      audioUrl,
      points,
      allowQuantity
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: '规则名称不能为空' });
    }
    if (!typeId || !standardId) {
      return res.status(400).json({ error: '技术类型和展示标准不能为空' });
    }
    if (points === undefined || points === null) {
      return res.status(400).json({ error: '积分不能为空' });
    }

    const template = await prisma.ruleTemplate.create({
      data: {
        id: randomUUID(),
        name: name.trim(),
        description: description?.trim() || null,
        typeId,
        standardId,
        requireImage: !!requireImage,
        requireText: requireText !== false,
        requireLink: !!requireLink,
        requireAudio: !!requireAudio,
        textMaxLength: textMaxLength || 500,
        audioUrl: audioUrl || null,
        points: parseInt(points),
        allowQuantity: !!allowQuantity,
        createdBy: req.user.id
      },
      include: {
        type: true,
        RuleStandard: true,
        author: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    const { author, RuleStandard, ...rest } = template;
    res.json({ template: { ...rest, creator: author, standard: RuleStandard } });
  } catch (error) {
    console.error('创建规则模板失败:', error);
    res.status(500).json({ error: '创建规则模板失败' });
  }
}

async function updateRuleTemplate(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      typeId,
      standardId,
      requireImage,
      requireText,
      requireLink,
      requireAudio,
      textMaxLength,
      audioUrl,
      points,
      allowQuantity,
      dailyLimit
    } = req.body;

    const data = {};
    if (name?.trim()) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (typeId) data.typeId = typeId;
    if (standardId) data.standardId = standardId;
    if (requireImage !== undefined) data.requireImage = !!requireImage;
    if (requireText !== undefined) data.requireText = !!requireText;
    if (requireLink !== undefined) data.requireLink = !!requireLink;
    if (requireAudio !== undefined) data.requireAudio = !!requireAudio;
    if (textMaxLength) data.textMaxLength = parseInt(textMaxLength);
    if (audioUrl !== undefined) data.audioUrl = audioUrl || null;
    if (points !== undefined) data.points = parseInt(points);
    if (allowQuantity !== undefined) data.allowQuantity = !!allowQuantity;
    if (dailyLimit !== undefined) data.dailyLimit = parseInt(dailyLimit) || 0;

    const template = await prisma.ruleTemplate.update({
      where: { id },
      data,
      include: {
        type: true,
        RuleStandard: true,
        author: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    const { author, RuleStandard, ...rest } = template;
    res.json({ template: { ...rest, creator: author, standard: RuleStandard } });
  } catch (error) {
    console.error('更新规则模板失败:', error);
    res.status(500).json({ error: '更新规则模板失败' });
  }
}

async function deleteRuleTemplate(req, res) {
  try {
    const { id } = req.params;

    const submissionCount = await prisma.ruleSubmission.count({
      where: { templateId: id }
    });

    if (submissionCount > 0) {
      return res.status(400).json({
        error: `无法删除，该规则下还有 ${submissionCount} 条提交记录`
      });
    }

    await prisma.ruleTemplate.delete({ where: { id } });
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除规则模板失败:', error);
    res.status(500).json({ error: '删除规则模板失败' });
  }
}

async function toggleRuleStatus(req, res) {
  try {
    const { id } = req.params;

    const template = await prisma.ruleTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({ error: '规则模板不存在' });
    }

    const newStatus = template.status === 'ENABLED' ? 'DISABLED' : 'ENABLED';

    const updated = await prisma.ruleTemplate.update({
      where: { id },
      data: { status: newStatus },
      include: {
        type: true,
        RuleStandard: true,
        author: {
          select: { id: true, username: true, avatar: true }
        }
      }
    });

    const { author, RuleStandard, ...rest } = updated;
    res.json({ template: { ...rest, creator: author, standard: RuleStandard } });
  } catch (error) {
    console.error('切换规则状态失败:', error);
    res.status(500).json({ error: '切换规则状态失败' });
  }
}

// 获取所有启用的规则模板（用户端）
async function getActiveTemplates(req, res) {
  try {
    const rawTemplates = await prisma.ruleTemplate.findMany({
      where: { status: 'ENABLED' },
      include: {
        type: true,
        RuleStandard: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const templates = rawTemplates.map(t => {
      const { RuleStandard, ...rest } = t;
      return { ...rest, standard: RuleStandard };
    });

    res.json({ templates });
  } catch (error) {
    console.error('获取启用的规则模板失败:', error);
    res.status(500).json({ error: '获取启用的规则模板失败' });
  }
}

module.exports = {
  getRuleTypes,
  createRuleType,
  updateRuleType,
  deleteRuleType,
  getRuleStandards,
  createRuleStandard,
  updateRuleStandard,
  deleteRuleStandard,
  getRuleTemplates,
  getRuleTemplate,
  createRuleTemplate,
  updateRuleTemplate,
  deleteRuleTemplate,
  toggleRuleStatus,
  getActiveTemplates
};
