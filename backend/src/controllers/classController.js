/**
 * 班级控制器
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 获取所有班级
exports.getClasses = async (req, res, next) => {
  try {
    const { campusId } = req.query;

    const where = {};
    if (campusId) {
      where.campusId = campusId;
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        campus: true,
        teachers: {
          include: {
            teacher: {
              select: {
                id: true,
                username: true,
                avatar: true,
                profile: { select: { nickname: true } },
              },
            },
          },
        },
        _count: {
          select: { students: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ classes });
  } catch (error) {
    next(error);
  }
};

// 获取单个班级（含学生列表）
exports.getClass = async (req, res, next) => {
  try {
    const { id } = req.params;

    const classData = await prisma.class.findUnique({
      where: { id },
      include: {
        campus: true,
        students: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: {
              select: { nickname: true, bio: true },
            },
          },
        },
        teachers: {
          include: {
            teacher: {
              select: {
                id: true,
                username: true,
                avatar: true,
                profile: { select: { nickname: true } },
              },
            },
          },
        },
      },
    });

    if (!classData) {
      return res.status(404).json({ error: '班级不存在' });
    }

    res.json(classData);
  } catch (error) {
    next(error);
  }
};

// 创建班级
exports.createClass = async (req, res, next) => {
  try {
    const { name, grade, campusId } = req.body;

    if (!name || !campusId) {
      return res.status(400).json({ error: '班级名称和校区为必填项' });
    }

    const classData = await prisma.class.create({
      data: { name, grade, campusId },
      include: { campus: true },
    });

    res.status(201).json({
      message: '班级创建成功',
      class: classData,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '该校区下班级名称已存在' });
    }
    next(error);
  }
};

// 更新班级
exports.updateClass = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, grade, campusId } = req.body;

    const classData = await prisma.class.update({
      where: { id },
      data: { name, grade, campusId },
      include: { campus: true },
    });

    res.json({
      message: '班级更新成功',
      class: classData,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '班级不存在' });
    }
    next(error);
  }
};

// 删除班级
exports.deleteClass = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.class.delete({
      where: { id },
    });

    res.json({ message: '班级删除成功' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '班级不存在' });
    }
    next(error);
  }
};

// 分配老师到班级
exports.assignTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { teacherId, role } = req.body;

    if (!teacherId) {
      return res.status(400).json({ error: '老师ID为必填项' });
    }

    const teacherClass = await prisma.teacherClass.create({
      data: {
        classId: id,
        teacherId,
        role,
      },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: { select: { nickname: true } },
          },
        },
      },
    });

    res.status(201).json({
      message: '老师分配成功',
      teacherClass,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: '该老师已分配到此班级' });
    }
    next(error);
  }
};

// 移除班级老师
exports.removeTeacher = async (req, res, next) => {
  try {
    const { id, teacherId } = req.params;

    await prisma.teacherClass.delete({
      where: {
        teacherId_classId: {
          teacherId,
          classId: id,
        },
      },
    });

    res.json({ message: '老师移除成功' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '老师未分配到此班级' });
    }
    next(error);
  }
};

// 获取老师的班级列表
exports.getTeacherClasses = async (req, res, next) => {
  try {
    const teacherId = req.user.id;

    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId },
      include: {
        class: {
          include: {
            campus: true,
            _count: {
              select: { students: true },
            },
          },
        },
      },
    });

    const classes = teacherClasses.map(tc => ({
      ...tc.class,
      role: tc.role,
    }));

    res.json({ classes });
  } catch (error) {
    next(error);
  }
};
