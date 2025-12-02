/**
 * 日常记录控制器
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 获取记录列表
exports.getRecords = async (req, res, next) => {
  try {
    const { studentId, classId, teacherId, recordType, startDate, endDate, page = 1, limit = 20 } = req.query;

    const where = {};
    if (studentId) where.studentId = studentId;
    if (classId) where.classId = classId;
    if (teacherId) where.teacherId = teacherId;
    if (recordType) where.recordType = recordType;
    if (startDate || endDate) {
      where.recordDate = {};
      if (startDate) where.recordDate.gte = new Date(startDate);
      if (endDate) where.recordDate.lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [records, total] = await Promise.all([
      prisma.dailyRecord.findMany({
        where,
        include: {
          student: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } },
            },
          },
          teacher: {
            select: {
              id: true,
              username: true,
              avatar: true,
              profile: { select: { nickname: true } },
            },
          },
          class: {
            select: { id: true, name: true },
          },
        },
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: parseInt(limit),
      }),
      prisma.dailyRecord.count({ where }),
    ]);

    res.json({
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// 获取学生某日的所有记录（按日期聚合）
exports.getStudentDayRecords = async (req, res, next) => {
  try {
    const { studentId, date } = req.params;

    const recordDate = new Date(date);

    const records = await prisma.dailyRecord.findMany({
      where: {
        studentId,
        recordDate,
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
      orderBy: { createdAt: 'asc' },
    });

    // 按类型分组
    const grouped = {
      attendance: records.filter(r => r.recordType === 'ATTENDANCE'),
      meal: records.filter(r => r.recordType === 'MEAL'),
      nap: records.filter(r => r.recordType === 'NAP'),
      activity: records.filter(r => r.recordType === 'ACTIVITY'),
      note: records.filter(r => r.recordType === 'NOTE'),
    };

    res.json({
      date: date,
      records: grouped,
      total: records.length,
    });
  } catch (error) {
    next(error);
  }
};

// 获取学生记录列表（按日期聚合）
exports.getStudentRecords = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // 获取有记录的日期列表
    const dates = await prisma.dailyRecord.groupBy({
      by: ['recordDate'],
      where: { studentId },
      orderBy: { recordDate: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    });

    // 获取每个日期的记录
    const recordsByDate = await Promise.all(
      dates.map(async ({ recordDate }) => {
        const records = await prisma.dailyRecord.findMany({
          where: {
            studentId,
            recordDate,
          },
          include: {
            teacher: {
              select: {
                id: true,
                username: true,
                profile: { select: { nickname: true } },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        });

        return {
          date: recordDate,
          records,
        };
      })
    );

    const total = await prisma.dailyRecord.groupBy({
      by: ['recordDate'],
      where: { studentId },
    });

    res.json({
      recordsByDate,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.length,
        totalPages: Math.ceil(total.length / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// 创建记录
exports.createRecord = async (req, res, next) => {
  try {
    const { studentId, classId, recordType, recordDate, content } = req.body;
    const teacherId = req.user.id;

    if (!studentId || !classId || !recordType || !recordDate || !content) {
      return res.status(400).json({ error: '所有字段为必填项' });
    }

    const record = await prisma.dailyRecord.create({
      data: {
        studentId,
        teacherId,
        classId,
        recordType,
        recordDate: new Date(recordDate),
        content,
      },
      include: {
        student: {
          select: {
            id: true,
            username: true,
            profile: { select: { nickname: true } },
          },
        },
        teacher: {
          select: {
            id: true,
            username: true,
            profile: { select: { nickname: true } },
          },
        },
      },
    });

    res.status(201).json({
      message: '记录创建成功',
      record,
    });
  } catch (error) {
    next(error);
  }
};

// 更新记录
exports.updateRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const record = await prisma.dailyRecord.update({
      where: { id },
      data: { content },
    });

    res.json({
      message: '记录更新成功',
      record,
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '记录不存在' });
    }
    next(error);
  }
};

// 删除记录
exports.deleteRecord = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.dailyRecord.delete({
      where: { id },
    });

    res.json({ message: '记录删除成功' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: '记录不存在' });
    }
    next(error);
  }
};

// 获取统计数据
exports.getStatistics = async (req, res, next) => {
  try {
    const { campusId, classId, startDate, endDate } = req.query;

    const where = {};
    if (classId) where.classId = classId;
    if (startDate || endDate) {
      where.recordDate = {};
      if (startDate) where.recordDate.gte = new Date(startDate);
      if (endDate) where.recordDate.lte = new Date(endDate);
    }

    // 按班级统计
    const classStats = await prisma.dailyRecord.groupBy({
      by: ['classId', 'recordType'],
      where,
      _count: true,
    });

    // 按老师统计
    const teacherStats = await prisma.dailyRecord.groupBy({
      by: ['teacherId', 'recordType'],
      where,
      _count: true,
    });

    res.json({
      byClass: classStats,
      byTeacher: teacherStats,
    });
  } catch (error) {
    next(error);
  }
};
