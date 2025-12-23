/**
 * 学习追踪系统测试数据脚本
 * 创建5个测试项目和10条学习记录
 */

// 使用 Prisma 单例
const prisma = require('../src/lib/prisma');

// 测试项目数据
const testProjects = [
  {
    name: '可汗学院数学',
    category: '数学',
    color: '#3B82F6',
  },
  {
    name: '多邻国英语',
    category: '语言',
    color: '#10B981',
  },
  {
    name: 'Scratch编程',
    category: '编程',
    color: '#8B5CF6',
  },
  {
    name: '课外阅读',
    category: '阅读',
    color: '#F59E0B',
  },
  {
    name: 'LeetCode刷题',
    category: '编程',
    color: '#EF4444',
  },
];

// 生成学习记录数据
const generateSession = (projectId, durationMinutes, daysAgo = 0) => {
  const now = new Date();
  const endTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const startTime = new Date(endTime.getTime() - durationMinutes * 60 * 1000);

  const contents = [
    '今天学习了很多新知识，感觉收获满满。遇到了一些难点，但通过反复练习逐渐掌握了。老师讲解得很清楚，例题也很有代表性。',
    '这次学习效率很高，完成了预定的学习任务。对重点内容进行了深入理解，做了相关的练习题，正确率还不错，需要继续保持。',
    '今天状态不错，专注力很强。把之前不太理解的部分又复习了一遍，现在感觉清晰多了。准备明天继续深入学习下一章节的内容。',
    '学习过程中遇到了一些挑战，有些概念比较抽象，需要多花时间消化。做了笔记整理，方便以后复习。总体来说进度还算顺利。',
    '非常充实的学习时间！通过大量的练习巩固了基础知识，发现自己在某些方面还有提升空间。计划接下来加强这部分的训练。',
    '今天主要是复习之前学过的内容，查漏补缺。发现有几个知识点记忆模糊了，重新学习了一遍。温故而知新，收获很大。',
    '学习效果超出预期！新的学习方法很有效，理解速度明显提升。做题的正确率也有所提高，对接下来的学习充满信心。',
    '遇到了比较难的部分，花了不少时间才理解透彻。虽然进度慢了一些，但是把基础打牢了，感觉很踏实。继续加油！',
    '今天的学习节奏很好，既有新知识的学习，也有旧知识的复习。通过对比学习，加深了对知识体系的整体理解。',
    '完成了本周的学习目标，感觉很有成就感。把学到的知识进行了系统整理，建立了思维导图，方便日后查阅和复习。',
  ];

  const progresses = [
    '第1章',
    '第2-3章',
    '第50-80页',
    '练习题1-20',
    '视频课程第5节',
    '第4章复习',
    null,
    '课后习题',
    '单元测试准备',
    '期末复习',
  ];

  const tagsSets = [
    ['重点难点', '需要复习'],
    ['轻松愉快', '进步明显'],
    ['高效学习', '专注力强'],
    ['遇到挑战', '持续努力'],
    ['温故知新', '查漏补缺'],
    ['新知识', '理解深入'],
    ['练习巩固', '基础扎实'],
    ['系统复习'],
    [],
    ['成就感满满', '目标完成'],
  ];

  const contentIndex = Math.floor(Math.random() * contents.length);

  return {
    startTime,
    endTime,
    duration: durationMinutes,
    mode: Math.random() > 0.5 ? 'FREE' : 'POMODORO',
    content: contents[contentIndex],
    progress: progresses[contentIndex],
    tags: tagsSets[contentIndex],
    isPublic: true,
    likesCount: Math.floor(Math.random() * 10),
  };
};

// 不同时长的学习记录配置（用于测试不同的积分规则）
const sessionConfigs = [
  { duration: 15, daysAgo: 0 },   // L101: +2分 (10分钟)
  { duration: 35, daysAgo: 0 },   // L102: +5分 (30分钟)
  { duration: 45, daysAgo: 1 },   // L102: +5分 (30分钟)
  { duration: 65, daysAgo: 1 },   // L103: +10分 (60分钟)
  { duration: 70, daysAgo: 2 },   // L103: +10分 (60分钟)
  { duration: 90, daysAgo: 2 },   // L103: +10分 (60分钟)
  { duration: 125, daysAgo: 3 },  // L104: +20分 (120分钟)
  { duration: 135, daysAgo: 4 },  // L104: +20分 (120分钟)
  { duration: 50, daysAgo: 5 },   // L102: +5分 (30分钟)
  { duration: 80, daysAgo: 6 },   // L103: +10分 (60分钟)
];

async function main() {
  console.log('🌱 开始生成学习追踪测试数据...');

  try {
    // 1. 获取第一个用户（用于创建测试数据）
    const user = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!user) {
      console.error('❌ 未找到用户，请先创建用户');
      process.exit(1);
    }

    console.log(`📝 使用用户: ${user.username} (${user.id})`);

    // 2. 创建测试项目
    console.log('\n📚 创建5个学习项目...');
    const createdProjects = [];

    for (let i = 0; i < testProjects.length; i++) {
      const projectData = testProjects[i];

      // 检查项目是否已存在
      const existing = await prisma.learningProject.findFirst({
        where: {
          userId: user.id,
          name: projectData.name,
        },
      });

      if (existing) {
        console.log(`   ⏭️  项目 "${projectData.name}" 已存在，跳过`);
        createdProjects.push(existing);
        continue;
      }

      const project = await prisma.learningProject.create({
        data: {
          userId: user.id,
          ...projectData,
        },
      });

      console.log(`   ✅ 创建项目: ${project.name} (${project.category})`);
      createdProjects.push(project);
    }

    // 3. 创建学习记录
    console.log('\n⏱️  创建10条学习记录...');
    const pointService = require('../src/services/pointService');

    for (let i = 0; i < sessionConfigs.length; i++) {
      const config = sessionConfigs[i];
      const project = createdProjects[i % createdProjects.length];
      const sessionData = generateSession(project.id, config.duration, config.daysAgo);

      const session = await prisma.learningSession.create({
        data: {
          userId: user.id,
          projectId: project.id,
          ...sessionData,
        },
      });

      // 更新项目统计
      await prisma.learningProject.update({
        where: { id: project.id },
        data: {
          totalDuration: { increment: config.duration },
          sessionCount: { increment: 1 },
        },
      });

      // 计算并奖励积分
      let ruleId = null;
      let points = 0;

      if (config.duration >= 120) {
        ruleId = 'L104';
        points = 20;
      } else if (config.duration >= 60) {
        ruleId = 'L103';
        points = 10;
      } else if (config.duration >= 30) {
        ruleId = 'L102';
        points = 5;
      } else if (config.duration >= 10) {
        ruleId = 'L101';
        points = 2;
      }

      if (ruleId) {
        await pointService.addPoints(ruleId, user.id, {
          targetType: 'learningSession',
          targetId: session.id,
        });
      }

      console.log(`   ✅ 创建记录 #${i + 1}: ${project.name} - ${config.duration}分钟 (+${points}积分) [${config.daysAgo}天前]`);
    }

    // 4. 显示统计
    console.log('\n📊 测试数据统计:');

    const totalSessions = await prisma.learningSession.count({
      where: { userId: user.id },
    });

    const totalDuration = await prisma.learningSession.aggregate({
      where: { userId: user.id },
      _sum: { duration: true },
    });

    const totalProjects = await prisma.learningProject.count({
      where: { userId: user.id },
    });

    const userPoints = await prisma.userPoints.findUnique({
      where: { userId: user.id },
    });

    console.log(`   - 学习项目: ${totalProjects} 个`);
    console.log(`   - 学习记录: ${totalSessions} 条`);
    console.log(`   - 总学习时长: ${totalDuration._sum.duration || 0} 分钟`);
    console.log(`   - 累计积分: ${userPoints?.totalPoints || 0} 分`);

    console.log('\n✨ 测试数据生成完成！');
    console.log('\n🚀 现在可以访问 http://localhost:12250/learning-tracker 查看效果');
  } catch (error) {
    console.error('❌ 生成测试数据失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
