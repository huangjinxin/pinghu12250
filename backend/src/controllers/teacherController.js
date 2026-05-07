const prisma = require('../lib/prisma');

// 绑定老师
exports.bindTeacher = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ error: '必须提供 teacherId' });
    }

    if (studentId === teacherId) {
      return res.status(400).json({ error: '不能绑定自己为老师' });
    }

    // 检查目标用户是否存在
    const teacherUser = await prisma.user.findUnique({ where: { id: teacherId } });
    if (!teacherUser) {
      return res.status(404).json({ error: '老师用户不存在' });
    }

    // 检查是否已有活跃绑定
    const currentStudentsCount = await prisma.teacherBinding.count({
      where: {
        teacherId,
        status: 'ACTIVE'
      }
    });

    if (currentStudentsCount >= 5) {
      return res.status(400).json({ error: '该老师名下绑定的学生已达到上限（5人）' });
    }

    const existingBinding = await prisma.teacherBinding.findFirst({
      where: {
        studentId,
        status: 'ACTIVE'
      }
    });

    if (existingBinding) {
      // 检查30天限制
      const daysSinceBound = (new Date() - new Date(existingBinding.boundAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceBound < 30) {
        return res.status(400).json({ 
          error: '绑定老师30天内不可更换', 
          remainingDays: Math.ceil(30 - daysSinceBound)
        });
      }

      if (existingBinding.teacherId === teacherId) {
        return res.status(400).json({ error: '已经绑定了该老师' });
      }

      // 将旧绑定设为 INACTIVE
      await prisma.teacherBinding.update({
        where: { id: existingBinding.id },
        data: { status: 'INACTIVE' }
      });
    }

    // 创建新绑定
    const newBinding = await prisma.teacherBinding.create({
      data: {
        studentId,
        teacherId,
        status: 'ACTIVE',
        boundAt: new Date()
      }
    });

    res.json({ success: true, data: newBinding });
  } catch (error) {
    next(error);
  }
};

// 获取我的绑定信息（老师或学生）
exports.getMyBindings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 获取我绑定的老师
    const myTeacherBinding = await prisma.teacherBinding.findFirst({
      where: { studentId: userId, status: 'ACTIVE' }
    });

    let myTeacher = null;
    let daysSinceBound = 0;
    if (myTeacherBinding) {
      myTeacher = await prisma.user.findUnique({
        where: { id: myTeacherBinding.teacherId },
        select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } }
      });
      daysSinceBound = (new Date() - new Date(myTeacherBinding.boundAt)) / (1000 * 60 * 60 * 24);
    }

    // 获取绑定我的学生
    const myStudentBindings = await prisma.teacherBinding.findMany({
      where: { teacherId: userId, status: 'ACTIVE' }
    });

    const studentIds = myStudentBindings.map(b => b.studentId);
    const myStudents = await prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } }
    });

    res.json({
      success: true,
      data: {
        myTeacher,
        myTeacherBinding,
        canChangeTeacher: !myTeacherBinding || daysSinceBound >= 30,
        remainingDays: myTeacherBinding ? Math.max(0, Math.ceil(30 - daysSinceBound)) : 0,
        myStudents
      }
    });
  } catch (error) {
    next(error);
  }
};

// 解绑老师
exports.unbindTeacher = async (req, res, next) => {
  try {
    const studentId = req.user.id;

    const binding = await prisma.teacherBinding.findFirst({
      where: { studentId, status: 'ACTIVE' }
    });

    if (!binding) {
      return res.status(400).json({ error: '当前没有绑定老师' });
    }

    const daysSinceBound = (new Date() - new Date(binding.boundAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceBound < 30) {
      return res.status(400).json({ 
        error: '绑定老师30天内不可解绑', 
        remainingDays: Math.ceil(30 - daysSinceBound)
      });
    }

    await prisma.teacherBinding.update({
      where: { id: binding.id },
      data: { status: 'INACTIVE' }
    });

    res.json({ success: true, message: '解绑成功' });
  } catch (error) {
    next(error);
  }
};

// 获取老师的激励统计数据
exports.getStats = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    let stats = await prisma.teacherStats.findUnique({
      where: { teacherId }
    });
    
    if (!stats) {
      stats = { score: 0, level: 1, totalReviews: 0, correctReviews: 0, wrongReviews: 0, consecutiveWrong: 0 };
    }

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// 获取老师排行榜
exports.getLeaderboard = async (req, res, next) => {
  try {
    const stats = await prisma.teacherStats.findMany({
      orderBy: { score: 'desc' },
      take: 20
    });

    // 拼装老师信息
    const teacherIds = stats.map(s => s.teacherId);
    let users = [];
    if (teacherIds.length > 0) {
      users = await prisma.user.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, username: true, avatar: true, profile: { select: { nickname: true } } }
      });
    }

    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    const data = stats.map(s => ({
      ...s,
      user: userMap[s.teacherId] || { username: '未知用户' }
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
