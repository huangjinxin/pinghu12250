/**
 * 日记模板路由
 * 支持用户创建和共享写作模板
 */
const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// 获取所有模板（包括系统预设和用户共享的）
router.get('/', authenticate, async (req, res) => {
  try {
    const templates = await prisma.diaryTemplate.findMany({
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: [
        { isSystem: 'desc' },  // 系统模板优先
        { useCount: 'desc' },  // 按使用次数排序
        { createdAt: 'desc' },
      ],
    });

    res.json({
      success: true,
      data: templates.map(t => ({
        id: t.id,
        name: t.name,
        icon: t.icon,
        description: t.description,
        title: t.title,
        content: t.content,
        isSystem: t.isSystem,
        useCount: t.useCount,
        authorId: t.authorId,
        authorName: t.author.username,
        createdAt: t.createdAt,
      })),
    });
  } catch (error) {
    console.error('获取模板列表失败:', error);
    res.status(500).json({ success: false, error: '获取模板列表失败' });
  }
});

// 创建模板（保存当前内容为模板）
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, icon, description, title, content } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: '请输入模板名称' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: '模板内容不能为空' });
    }

    const template = await prisma.diaryTemplate.create({
      data: {
        authorId: userId,
        name: name.trim(),
        icon: icon || '📝',
        description: description?.trim() || null,
        title: title?.trim() || '',
        content: content.trim(),
        isSystem: false,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        icon: template.icon,
        description: template.description,
        title: template.title,
        content: template.content,
        isSystem: template.isSystem,
        useCount: template.useCount,
        authorId: template.authorId,
        authorName: template.author.username,
        createdAt: template.createdAt,
      },
    });
  } catch (error) {
    console.error('创建模板失败:', error);
    res.status(500).json({ success: false, error: '创建模板失败' });
  }
});

// 使用模板（增加使用次数）
router.post('/:id/use', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.diaryTemplate.update({
      where: { id },
      data: { useCount: { increment: 1 } },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('记录模板使用失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// 删除模板（只能删除自己创建的）
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const template = await prisma.diaryTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ success: false, error: '模板不存在' });
    }

    if (template.authorId !== userId && template.isSystem) {
      return res.status(403).json({ success: false, error: '无权删除此模板' });
    }

    await prisma.diaryTemplate.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('删除模板失败:', error);
    res.status(500).json({ success: false, error: '删除模板失败' });
  }
});

module.exports = router;
