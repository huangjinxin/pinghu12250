/**
 * 栏目管理控制器
 */
const prisma = require('../lib/prisma');

// 获取所有启用的栏目（公开）
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        points: true,
        sortOrder: true,
        _count: {
          select: {
            works: {
              where: { status: 'APPROVED' },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: categories.map((cat) => ({
        ...cat,
        worksCount: cat._count.works,
        _count: undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// 获取所有栏目（管理员，含禁用的）
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { works: true },
        },
      },
    });

    res.json({
      success: true,
      data: categories.map((cat) => ({
        ...cat,
        worksCount: cat._count.works,
        _count: undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
};

// 创建栏目（管理员）
exports.createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, icon, points, sortOrder, isActive } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ success: false, error: '名称和标识为必填项' });
    }

    // 检查 slug 唯一性
    const existing = await prisma.category.findUnique({ where: { slug } });
    if (existing) {
      return res.status(400).json({ success: false, error: '标识已存在' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        icon: icon || null,
        points: points || 5,
        sortOrder: sortOrder || 0,
        isActive: isActive !== false,
      },
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// 更新栏目（管理员）
exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, slug, description, icon, points, sortOrder, isActive } = req.body;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: '栏目不存在' });
    }

    // 如果修改 slug，检查唯一性
    if (slug && slug !== existing.slug) {
      const slugExists = await prisma.category.findUnique({ where: { slug } });
      if (slugExists) {
        return res.status(400).json({ success: false, error: '标识已存在' });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existing.name,
        slug: slug !== undefined ? slug : existing.slug,
        description: description !== undefined ? description : existing.description,
        icon: icon !== undefined ? icon : existing.icon,
        points: points !== undefined ? points : existing.points,
        sortOrder: sortOrder !== undefined ? sortOrder : existing.sortOrder,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

// 删除栏目（管理员）
exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { works: true } } },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: '栏目不存在' });
    }

    if (existing._count.works > 0) {
      return res.status(400).json({
        success: false,
        error: `该栏目下有 ${existing._count.works} 个作品，无法删除`,
      });
    }

    await prisma.category.delete({ where: { id } });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    next(error);
  }
};
