/**
 * 数据库种子数据
 * 用于初始化测试数据
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据...');

  // 清空现有数据（开发环境）
  if (process.env.NODE_ENV === 'development') {
    await prisma.pointLog.deleteMany();
    await prisma.userPoints.deleteMany();
    await prisma.pointRule.deleteMany();
    await prisma.like.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.taskSubmission.deleteMany();
    await prisma.task.deleteMany();
    await prisma.calendarEvent.deleteMany();
    await prisma.contentTag.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.dynamic.deleteMany();
    await prisma.hTMLWork.deleteMany();
    await prisma.readingLog.deleteMany();
    await prisma.readingLogLike.deleteMany();
    await prisma.userBookshelf.deleteMany();
    await prisma.book.deleteMany();
    await prisma.note.deleteMany();
    await prisma.homework.deleteMany();
    await prisma.diary.deleteMany();
    await prisma.studentParent.deleteMany();
    await prisma.student.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
  }

  // ========== 创建积分规则 ==========
  console.log('创建积分规则...');

  // 日记模块积分规则 (D001-D009)
  await prisma.pointRule.createMany({
    data: [
      {
        id: 'D001',
        category: 'diary',
        action: 'create',
        name: '发布日记-入门级',
        description: '发布字数≥800的日记可获得5积分',
        conditionType: 'word_count',
        conditionValue: 800,
        points: 5,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'D002',
        category: 'diary',
        action: 'create',
        name: '发布日记-良好级',
        description: '发布字数≥1000的日记可获得10积分',
        conditionType: 'word_count',
        conditionValue: 1000,
        points: 10,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'D003',
        category: 'diary',
        action: 'create',
        name: '发布日记-优秀级',
        description: '发布字数≥1200的日记可获得15积分',
        conditionType: 'word_count',
        conditionValue: 1200,
        points: 15,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'D004',
        category: 'diary',
        action: 'create',
        name: '发布日记-卓越级',
        description: '发布字数≥1500的日记可获得20积分',
        conditionType: 'word_count',
        conditionValue: 1500,
        points: 20,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'D005',
        category: 'diary',
        action: 'create',
        name: '发布日记-大师级',
        description: '发布字数≥2000的日记可获得30积分',
        conditionType: 'word_count',
        conditionValue: 2000,
        points: 30,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'D006',
        category: 'diary',
        action: 'create',
        name: '发布日记-不合格',
        description: '发布字数<800的日记扣2积分',
        conditionType: 'word_count',
        conditionValue: 800,
        points: -2,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'D007',
        category: 'diary',
        action: 'like',
        name: '日记被点赞',
        description: '日记被其他用户点赞获得1积分',
        conditionType: 'none',
        points: 1,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'D008',
        category: 'diary',
        action: 'dislike',
        name: '日记被点踩',
        description: '日记被其他用户点踩扣1积分',
        conditionType: 'none',
        points: -1,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'D009',
        category: 'diary',
        action: 'delete',
        name: '删除日记',
        description: '删除日记时扣除该日记获得的所有积分',
        conditionType: 'none',
        points: 0,
        dailyLimit: 0,
        isEnabled: true,
      },
    ],
  });

  // 读书笔记模块积分规则 (R001-R006)
  await prisma.pointRule.createMany({
    data: [
      {
        id: 'R001',
        category: 'reading',
        action: 'create',
        name: '添加书籍',
        description: '添加书籍到书架获得2积分',
        conditionType: 'none',
        points: 2,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'R002',
        category: 'reading',
        action: 'create',
        name: '发布阅读记录',
        description: '发布阅读记录获得5积分',
        conditionType: 'none',
        points: 5,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'R003',
        category: 'reading',
        action: 'like',
        name: '阅读记录被点赞',
        description: '阅读记录被其他用户点赞获得1积分',
        conditionType: 'none',
        points: 1,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'R004',
        category: 'reading',
        action: 'dislike',
        name: '阅读记录被点踩',
        description: '阅读记录被其他用户点踩扣1积分',
        conditionType: 'none',
        points: -1,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'R005',
        category: 'reading',
        action: 'finish',
        name: '读完一本书',
        description: '完成一本书的阅读获得20积分',
        conditionType: 'status',
        points: 20,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'R006',
        category: 'reading',
        action: 'delete',
        name: '删除阅读记录',
        description: '删除阅读记录扣5积分',
        conditionType: 'none',
        points: -5,
        dailyLimit: 0,
        isEnabled: true,
      },
    ],
  });

  // 作业模块积分规则 (H001-H002)
  await prisma.pointRule.createMany({
    data: [
      {
        id: 'H001',
        category: 'homework',
        action: 'create',
        name: '提交作业',
        description: '提交作业获得5积分',
        conditionType: 'none',
        points: 5,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'H002',
        category: 'homework',
        action: 'excellent',
        name: '作业被评为优秀',
        description: '作业被老师评为优秀额外获得10积分',
        conditionType: 'none',
        points: 10,
        dailyLimit: 0,
        isEnabled: true,
      },
    ],
  });

  // 作品模块积分规则 (W001-W005)
  await prisma.pointRule.createMany({
    data: [
      {
        id: 'W001',
        category: 'work',
        action: 'create',
        name: '发布HTML作品',
        description: '发布HTML作品获得10积分',
        conditionType: 'none',
        points: 10,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'W002',
        category: 'work',
        action: 'like',
        name: '作品被点赞',
        description: '作品被其他用户点赞获得2积分',
        conditionType: 'none',
        points: 2,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'W003',
        category: 'work',
        action: 'dislike',
        name: '作品被点踩',
        description: '作品被其他用户点踩扣2积分',
        conditionType: 'none',
        points: -2,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'W004',
        category: 'work',
        action: 'fork',
        name: '作品被Fork',
        description: '作品被其他用户Fork获得5积分',
        conditionType: 'none',
        points: 5,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'W005',
        category: 'work',
        action: 'delete',
        name: '删除作品',
        description: '删除作品扣10积分',
        conditionType: 'none',
        points: -10,
        dailyLimit: 0,
        isEnabled: true,
      },
    ],
  });

  // 游戏评测模块积分规则 (G001-G004)
  await prisma.pointRule.createMany({
    data: [
      {
        id: 'G001',
        category: 'game',
        action: 'create',
        name: '发布游戏短评',
        description: '发布游戏短评获得3积分',
        conditionType: 'none',
        points: 3,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'G002',
        category: 'game',
        action: 'create',
        name: '发布游戏长评',
        description: '发布游戏长评获得10积分',
        conditionType: 'none',
        points: 10,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'G003',
        category: 'game',
        action: 'like',
        name: '长评被点赞',
        description: '游戏长评被其他用户点赞获得1积分',
        conditionType: 'none',
        points: 1,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'G004',
        category: 'game',
        action: 'create',
        name: '添加游戏到游戏库',
        description: '添加游戏到游戏库获得2积分',
        conditionType: 'none',
        points: 2,
        dailyLimit: 0,
        isEnabled: true,
      },
    ],
  });

  // 社交互动模块积分规则 (S001-S002)
  await prisma.pointRule.createMany({
    data: [
      {
        id: 'S001',
        category: 'social',
        action: 'like',
        name: '给他人点赞',
        description: '给他人内容点赞获得1积分（每日最多5次）',
        conditionType: 'none',
        points: 1,
        dailyLimit: 5,
        isEnabled: true,
      },
      {
        id: 'S002',
        category: 'social',
        action: 'comment',
        name: '发表评论',
        description: '发表评论获得2积分（每日最多10次）',
        conditionType: 'none',
        points: 2,
        dailyLimit: 10,
        isEnabled: true,
      },
    ],
  });

  // 登录模块积分规则 (L001-L003)
  await prisma.pointRule.createMany({
    data: [
      {
        id: 'L001',
        category: 'login',
        action: 'login',
        name: '每日首次登录',
        description: '每日首次登录获得1积分',
        conditionType: 'none',
        points: 1,
        dailyLimit: 1,
        isEnabled: true,
      },
      {
        id: 'L002',
        category: 'login',
        action: 'streak',
        name: '连续登录7天',
        description: '连续登录7天获得10积分奖励',
        conditionType: 'count',
        conditionValue: 7,
        points: 10,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'L003',
        category: 'login',
        action: 'break_streak',
        name: '中断连续登录',
        description: '连续登录中断扣5积分',
        conditionType: 'none',
        points: -5,
        dailyLimit: 0,
        isEnabled: true,
      },
    ],
  });

  // 学习追踪模块积分规则 (L101-L106)
  await prisma.pointRule.createMany({
    data: [
      {
        id: 'L101',
        category: 'learning_tracker',
        action: 'complete',
        name: '学习10分钟',
        description: '学习时长≥10分钟可获得2积分',
        conditionType: 'duration',
        conditionValue: 10,
        points: 2,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'L102',
        category: 'learning_tracker',
        action: 'complete',
        name: '学习30分钟',
        description: '学习时长≥30分钟可获得5积分',
        conditionType: 'duration',
        conditionValue: 30,
        points: 5,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'L103',
        category: 'learning_tracker',
        action: 'complete',
        name: '学习1小时',
        description: '学习时长≥60分钟可获得10积分',
        conditionType: 'duration',
        conditionValue: 60,
        points: 10,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'L104',
        category: 'learning_tracker',
        action: 'complete',
        name: '学习2小时',
        description: '学习时长≥120分钟可获得20积分',
        conditionType: 'duration',
        conditionValue: 120,
        points: 20,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'L105',
        category: 'learning_tracker',
        action: 'streak',
        name: '连续学习7天',
        description: '连续7天有学习记录获得30积分',
        conditionType: 'count',
        conditionValue: 7,
        points: 30,
        dailyLimit: 0,
        isEnabled: true,
      },
      {
        id: 'L106',
        category: 'learning_tracker',
        action: 'like',
        name: '学习记录被点赞',
        description: '学习记录被其他用户点赞获得1积分',
        conditionType: 'none',
        points: 1,
        dailyLimit: 0,
        isEnabled: true,
      },
    ],
  });

  console.log('积分规则创建完成！');

  // 创建密码哈希
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 创建管理员用户
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      profile: {
        create: {
          nickname: '系统管理员',
          bio: '平湖少儿空间管理员',
        },
      },
    },
  });

  // 创建学生用户
  const student1 = await prisma.user.create({
    data: {
      email: 'student1@example.com',
      username: 'xiaoming',
      password: hashedPassword,
      role: 'STUDENT',
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
      profile: {
        create: {
          nickname: '小明',
          bio: '我喜欢编程和阅读！',
          grade: '五年级',
          interests: ['编程', '阅读', '数学'],
          joinedDays: 30,
        },
      },
      student: {
        create: {},
      },
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'student2@example.com',
      username: 'xiaohong',
      password: hashedPassword,
      role: 'STUDENT',
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaohong',
      profile: {
        create: {
          nickname: '小红',
          bio: '热爱艺术和创作',
          grade: '五年级',
          interests: ['绘画', '音乐', '写作'],
          joinedDays: 25,
        },
      },
      student: {
        create: {},
      },
    },
  });

  // 创建家长用户
  const parent1 = await prisma.user.create({
    data: {
      email: 'parent1@example.com',
      username: 'parent_ming',
      password: hashedPassword,
      role: 'PARENT',
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=parent1',
      profile: {
        create: {
          nickname: '小明家长',
          bio: '关注孩子成长',
        },
      },
    },
  });

  // 创建老师用户
  const teacher1 = await prisma.user.create({
    data: {
      email: 'teacher1@example.com',
      username: 'teacher_wang',
      password: hashedPassword,
      role: 'TEACHER',
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=teacher1',
      profile: {
        create: {
          nickname: '王老师',
          bio: '计算机科学教师',
        },
      },
    },
  });

  // 创建学生-家长关联
  const studentRecord = await prisma.student.findUnique({
    where: { userId: student1.id },
  });

  await prisma.studentParent.create({
    data: {
      studentId: studentRecord.id,
      parentId: parent1.id,
      childId: student1.id,
    },
  });

  // 创建标签
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'HTML', color: '#E34F26' } }),
    prisma.tag.create({ data: { name: 'CSS', color: '#1572B6' } }),
    prisma.tag.create({ data: { name: 'JavaScript', color: '#F7DF1E' } }),
    prisma.tag.create({ data: { name: '数学', color: '#4CAF50' } }),
    prisma.tag.create({ data: { name: '语文', color: '#FF9800' } }),
  ]);

  // 创建日记
  const diary1 = await prisma.diary.create({
    data: {
      authorId: student1.id,
      title: '今天学会了制作网页',
      content: '<p>今天我学会了如何使用HTML和CSS制作一个简单的网页，真的太有趣了！</p>',
      mood: '开心',
      weather: '晴天',
      tags: {
        create: [{ tagId: tags[0].id }, { tagId: tags[1].id }],
      },
    },
  });

  // 创建作业记录
  const homework1 = await prisma.homework.create({
    data: {
      authorId: student1.id,
      title: '数学练习题',
      subject: '数学',
      content: '完成了第三章的所有练习题',
      difficulty: 4,
      timeSpent: 60,
      tags: {
        create: [{ tagId: tags[3].id }],
      },
    },
  });

  // 创建HTML作品
  const htmlWork1 = await prisma.hTMLWork.create({
    data: {
      authorId: student1.id,
      title: '我的第一个网页',
      description: '这是我制作的第一个个人主页',
      htmlCode: `<!DOCTYPE html>
<html>
<head>
  <title>我的主页</title>
</head>
<body>
  <h1>欢迎来到我的主页</h1>
  <p>我是小明，这是我的第一个网页！</p>
</body>
</html>`,
      cssCode: `body {
  font-family: Arial, sans-serif;
  text-align: center;
  padding: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

h1 {
  font-size: 3em;
}`,
      jsCode: `console.log('Hello, World!');`,
    },
  });

  // 创建动态
  await prisma.dynamic.create({
    data: {
      authorId: student1.id,
      content: '今天完成了我的第一个HTML作品，好开心！',
      isPublic: true,
    },
  });

  await prisma.dynamic.create({
    data: {
      authorId: student1.id,
      content: '今天的数学作业有点难，但是我都完成了！',
      isPublic: true,
    },
  });

  // 创建任务
  const task1 = await prisma.task.create({
    data: {
      creatorId: teacher1.id,
      title: '完成HTML基础学习',
      description: '学习HTML基本标签，并制作一个简单的个人介绍页面',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
      submissions: {
        create: [
          { studentId: student1.id, status: 'COMPLETED', completedAt: new Date() },
          { studentId: student2.id, status: 'PENDING' },
        ],
      },
    },
  });

  // 创建日历事件
  await prisma.calendarEvent.create({
    data: {
      userId: student1.id,
      title: '期末考试',
      description: '数学和语文期末考试',
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14天后
      color: '#FF5722',
    },
  });

  // 创建学习项目
  const project1 = await prisma.learningProject.create({
    data: {
      userId: student1.id,
      name: '可汗学院数学',
      category: '数学',
      color: '#10B981',
      totalDuration: 0,
      sessionCount: 0,
    },
  });

  const project2 = await prisma.learningProject.create({
    data: {
      userId: student1.id,
      name: '多邻国英语',
      category: '语言',
      color: '#3B82F6',
      totalDuration: 0,
      sessionCount: 0,
    },
  });

  const project3 = await prisma.learningProject.create({
    data: {
      userId: student1.id,
      name: 'Scratch编程',
      category: '编程',
      color: '#F59E0B',
      totalDuration: 0,
      sessionCount: 0,
    },
  });

  const project4 = await prisma.learningProject.create({
    data: {
      userId: student1.id,
      name: '课外阅读',
      category: '阅读',
      color: '#8B5CF6',
      totalDuration: 0,
      sessionCount: 0,
    },
  });

  const project5 = await prisma.learningProject.create({
    data: {
      userId: student1.id,
      name: 'LeetCode刷题',
      category: '编程',
      color: '#EF4444',
      totalDuration: 0,
      sessionCount: 0,
    },
  });

  // 创建学习记录（不同时长测试积分）
  const now = new Date();

  // 学习记录1: 15分钟 (应得2分 L101)
  await prisma.learningSession.create({
    data: {
      userId: student1.id,
      projectId: project1.id,
      startTime: new Date(now.getTime() - 15 * 60 * 1000),
      endTime: now,
      duration: 15,
      mode: 'FREE',
      content: '今天学习了二次方程的解法，掌握了因式分解和配方法两种方法。通过练习题加深了理解，对这部分内容有了更清晰的认识。',
      progress: '完成第3章练习',
      tags: ['数学', '代数'],
      isPublic: true,
    },
  });

  // 学习记录2: 35分钟 (应得5分 L102)
  await prisma.learningSession.create({
    data: {
      userId: student1.id,
      projectId: project2.id,
      startTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 35 * 60 * 1000),
      endTime: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      duration: 35,
      mode: 'POMODORO',
      content: '使用番茄钟学习英语，完成了一个单元的课程。学习了新的单词和语法，通过对话练习提高了口语能力，感觉进步很大。',
      progress: 'Unit 5完成',
      tags: ['英语', '单词'],
      isPublic: true,
    },
  });

  // 学习记录3: 65分钟 (应得10分 L103)
  await prisma.learningSession.create({
    data: {
      userId: student1.id,
      projectId: project3.id,
      startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000 - 65 * 60 * 1000),
      endTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      duration: 65,
      mode: 'FREE',
      content: '今天制作了一个简单的打砖块游戏，学会了如何使用碰撞检测和计分系统。通过这个项目，对Scratch的事件机制有了更深入的理解，编程思维得到了很好的锻炼。',
      progress: '项目进度60%',
      tags: ['编程', 'Scratch', '游戏'],
      isPublic: true,
    },
  });

  // 学习记录4: 125分钟 (应得20分 L104)
  await prisma.learningSession.create({
    data: {
      userId: student1.id,
      projectId: project4.id,
      startTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000 - 125 * 60 * 1000),
      endTime: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      duration: 125,
      mode: 'FREE',
      content: '今天花了两个多小时阅读《小王子》，这本书真的很有意思。通过小王子的星际旅行，让我明白了很多关于友谊、爱和责任的道理。特别是小王子和玫瑰花的故事，让我懂得了珍惜身边的人和事。阅读过程中我做了详细的笔记，记录了自己的感悟和思考。这种深度阅读的体验让我受益匪浅，不仅提高了阅读能力，也让我的心灵得到了成长。',
      progress: '读完第1-8章',
      tags: ['阅读', '名著', '感悟'],
      isPublic: true,
    },
  });

  // 学习记录5: 45分钟 (应得5分 L102)
  await prisma.learningSession.create({
    data: {
      userId: student1.id,
      projectId: project5.id,
      startTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 - 45 * 60 * 1000),
      endTime: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      duration: 45,
      mode: 'POMODORO',
      content: '今天刷了3道LeetCode题目，主要练习数组和字符串相关的算法。通过不断练习，对数据结构的理解更加深入了，解题思路也变得更加清晰。',
      progress: '完成3题',
      tags: ['算法', 'LeetCode', '数据结构'],
      isPublic: true,
    },
  });

  // 更新项目统计
  await prisma.learningProject.update({
    where: { id: project1.id },
    data: { totalDuration: 15, sessionCount: 1 },
  });

  await prisma.learningProject.update({
    where: { id: project2.id },
    data: { totalDuration: 35, sessionCount: 1 },
  });

  await prisma.learningProject.update({
    where: { id: project3.id },
    data: { totalDuration: 65, sessionCount: 1 },
  });

  await prisma.learningProject.update({
    where: { id: project4.id },
    data: { totalDuration: 125, sessionCount: 1 },
  });

  await prisma.learningProject.update({
    where: { id: project5.id },
    data: { totalDuration: 45, sessionCount: 1 },
  });

  console.log('数据初始化完成！');
  console.log('\n测试账号：');
  console.log('管理员 - 用户名: admin, 密码: 123456');
  console.log('学生1 - 用户名: xiaoming, 密码: 123456');
  console.log('学生2 - 用户名: xiaohong, 密码: 123456');
  console.log('家长 - 用户名: parent_ming, 密码: 123456');
  console.log('老师 - 用户名: teacher_wang, 密码: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
