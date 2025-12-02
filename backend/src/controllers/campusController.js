/**
 * 校区控制器
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 获取所有校区
exports.getCampuses = async (req, res, next) => {
  try {
    const campuses = await prisma.campus.findMany({
      include: {
        _count: {
          select: {
            classes: true,
            users: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ campuses });
  } catch (error) {
    next(error);
  }
};

// 获取单个校区
exports.getCampus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const campus = await prisma.campus.findUnique({
      where: { id },
      include: {
        classes: {
          include: {
            _count: {
              select: { students: true },
            },
          },
        },
        _count: {
          select: {
            classes: true,
            users: true,
          },
        },
      },
    });

    if (!campus) {
      return res.status(404).json({ error: '校区不存在' });
    }

    res.json(campus);
  } catch (error) {
    next(error);
  }
};

// 创建校区
exports.createCampus = async (req, res, next) => {
  try {
    const { name, address, phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: '校区名称为必填项' });
    }

    const campus = await prisma.campus.create({
      data: { name, address, phone },
    });

    res.status(201).json({
      message: '校区创建成功',
      campus,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '校区名称已存在' });
    }
    next(error);
  }
};

// 更新校区
exports.updateCampus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, address, phone } = req.body;

    const campus = await prisma.campus.update({
      where: { id },
      data: { name, address, phone },
    });

    res.json({
      message: '校区更新成功',
      campus,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '校区不存在' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '校区名称已存在' });
    }
    next(error);
  }
};

// 删除校区
exports.deleteCampus = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.campus.delete({
      where: { id },
    });

    res.json({ message: '校区删除成功' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '校区不存在' });
    }
    next(error);
  }
};
