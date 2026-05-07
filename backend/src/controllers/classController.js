/**
 * 班级控制器
 */

// 使用 Prisma 单例
const prisma = require('../lib/prisma');

function formatTeacherClass(teacherClass) {
  if (!teacherClass) return teacherClass;

  return {
    ...teacherClass,
    teacher: teacherClass.teacher?.user
      ? {
          id: teacherClass.teacher.id,
          userId: teacherClass.teacher.user.id,
          username: teacherClass.teacher.user.username,
          avatar: teacherClass.teacher.user.avatar,
          profile: teacherClass.teacher.user.profile,
        }
      : teacherClass.teacher,
  };
}

function formatClass(classData) {
  if (!classData) return classData;

  const school = classData.school || null;
  const users = classData.User || [];
  const studentRecords = classData.Student || [];

  const seenUserIds = new Set();
  const students = [];

  for (const sr of studentRecords) {
    const uid = sr.user?.id || sr.id;
    seenUserIds.add(uid);
    students.push({
      id: uid,
      studentId: sr.id,
      username: sr.user?.username || sr.username,
      avatar: sr.user?.avatar || sr.avatar,
      profile: sr.user?.profile || null,
    });
  }

  for (const user of users) {
    if (!seenUserIds.has(user.id)) {
      students.push({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        profile: user.profile,
      });
    }
  }

  return {
    ...classData,
    schoolId: classData.schoolId,
    campusId: classData.schoolId,
    school,
    campus: school,
    students,
    teachers: (classData.teachers || []).map(formatTeacherClass),
    _count: classData._count
      ? {
          ...classData._count,
          students: classData._count.User ?? classData._count.Student ?? students.length,
        }
      : undefined,
  };
}

// 获取所有班级
exports.getClasses = async (req, res, next) => {
  try {
    const { campusId, schoolId } = req.query;
    const targetSchoolId = schoolId || campusId;

    const where = {};
    if (targetSchoolId) {
      where.schoolId = targetSchoolId;
    }

    const classes = await prisma.class.findMany({
      where,
      include: {
        school: true,
        teachers: {
          include: {
            teacher: {
              include: {
                user: {
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
        },
        _count: {
          select: { User: true, Student: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ classes: classes.map(formatClass) });
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
        school: true,
        User: {
          where: { role: 'STUDENT' },
          select: {
            id: true,
            username: true,
            avatar: true,
            profile: {
              select: { nickname: true, bio: true },
            },
          },
        },
        Student: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                profile: {
                  select: { nickname: true, bio: true },
                },
              },
            },
          },
        },
        teachers: {
          include: {
            teacher: {
              include: {
                user: {
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
        },
      },
    });

    if (!classData) {
      return res.status(404).json({ error: '班级不存在' });
    }

    res.json(formatClass(classData));
  } catch (error) {
    next(error);
  }
};

// 创建班级
exports.createClass = async (req, res, next) => {
  try {
    const { name, grade, campusId, schoolId } = req.body;
    const targetSchoolId = schoolId || campusId;

    if (!name || !targetSchoolId) {
      return res.status(400).json({ error: '班级名称和校区为必填项' });
    }

    const classData = await prisma.class.create({
      data: { name, grade, schoolId: targetSchoolId },
      include: { school: true },
    });

    res.status(201).json({
      message: '班级创建成功',
      class: formatClass(classData),
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
    const { name, grade, campusId, schoolId } = req.body;
    const targetSchoolId = schoolId || campusId;

    const classData = await prisma.class.update({
      where: { id },
      data: { name, grade, schoolId: targetSchoolId },
      include: { school: true },
    });

    res.json({
      message: '班级更新成功',
      class: formatClass(classData),
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
          include: {
            user: {
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

    res.status(201).json({
      message: '老师分配成功',
      teacherClass: formatTeacherClass(teacherClass),
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
    const teacher = await prisma.teacher.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });

    if (!teacher) {
      return res.json({ classes: [] });
    }

    const teacherClasses = await prisma.teacherClass.findMany({
      where: { teacherId: teacher.id },
      include: {
        class: {
          include: {
            school: true,
            _count: {
              select: { users: true },
            },
          },
        },
      },
    });

    const classes = teacherClasses.map(tc => ({
      ...tc,
      class: formatClass(tc.class),
    }));

    res.json({ classes });
  } catch (error) {
    next(error);
  }
};
