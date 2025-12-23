/**
 * 初始化看板测试数据
 */

// 使用 Prisma 单例
const prisma = require('../src/lib/prisma');

async function initBoardData() {
  try {
    // 查找管理员用户
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!admin) {
      console.error('未找到管理员用户');
      return;
    }

    console.log('找到管理员:', admin.username);

    // 创建一个项目管理看板
    const board = await prisma.board.create({
      data: {
        title: '项目管理看板',
        description: '用于管理项目任务和进度',
        color: '#3b82f6',
        creatorId: admin.id,
        members: {
          create: {
            userId: admin.id,
            role: 'OWNER',
          },
        },
      },
    });

    console.log('✅ 创建看板:', board.title);

    // 创建标准的 Trello 风格列表
    const lists = [
      { title: '待办事项', position: 0 },
      { title: '进行中', position: 1 },
      { title: '待审核', position: 2 },
      { title: '已完成', position: 3 },
    ];

    const createdLists = [];
    for (const listData of lists) {
      const list = await prisma.boardList.create({
        data: {
          ...listData,
          boardId: board.id,
        },
      });
      createdLists.push(list);
      console.log('  ✅ 创建列表:', list.title);
    }

    // 在"待办事项"列表中创建示例卡片
    const todoCards = [
      {
        title: '设计用户界面',
        description: '设计应用的主要用户界面，包括首页、列表页和详情页',
        labels: ['设计', '高优先级'],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
        position: 0,
      },
      {
        title: '编写API文档',
        description: '完善后端API文档，包括所有接口的请求和响应格式',
        labels: ['文档', '重要'],
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5天后
        position: 1,
      },
      {
        title: '数据库优化',
        description: '优化数据库查询性能，添加必要的索引',
        labels: ['优化', 'Bug'],
        position: 2,
      },
    ];

    for (const cardData of todoCards) {
      const card = await prisma.card.create({
        data: {
          ...cardData,
          listId: createdLists[0].id, // 待办事项列表
          creatorId: admin.id,
          members: {
            create: {
              userId: admin.id,
            },
          },
        },
      });
      console.log('    ✅ 创建卡片:', card.title);
    }

    // 在"进行中"列表中创建示例卡片
    const inProgressCards = [
      {
        title: '实现用户认证',
        description: '完成JWT认证功能，包括登录、注册和token刷新',
        labels: ['开发', '高优先级'],
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3天后
        position: 0,
      },
      {
        title: '开发任务看板功能',
        description: '实现类似Trello的看板系统，支持拖拽和实时协作',
        labels: ['开发', '功能'],
        position: 1,
      },
    ];

    for (const cardData of inProgressCards) {
      const card = await prisma.card.create({
        data: {
          ...cardData,
          listId: createdLists[1].id, // 进行中列表
          creatorId: admin.id,
          members: {
            create: {
              userId: admin.id,
            },
          },
        },
      });
      console.log('    ✅ 创建卡片:', card.title);

      // 为进行中的卡片添加一些评论
      await prisma.cardComment.create({
        data: {
          content: '已经完成了基本框架，正在添加拖拽功能',
          authorId: admin.id,
          cardId: card.id,
        },
      });
    }

    // 在"已完成"列表中创建示例卡片
    const completedCards = [
      {
        title: '项目初始化',
        description: '完成项目的初始化配置，包括数据库、依赖安装等',
        labels: ['完成'],
        completed: true,
        position: 0,
      },
      {
        title: '配置开发环境',
        description: '配置Docker、Node.js、PostgreSQL等开发环境',
        labels: ['完成'],
        completed: true,
        position: 1,
      },
    ];

    for (const cardData of completedCards) {
      const card = await prisma.card.create({
        data: {
          ...cardData,
          listId: createdLists[3].id, // 已完成列表
          creatorId: admin.id,
          members: {
            create: {
              userId: admin.id,
            },
          },
        },
      });
      console.log('    ✅ 创建卡片:', card.title);
    }

    // 创建另一个学习计划看板
    const learningBoard = await prisma.board.create({
      data: {
        title: '学习计划',
        description: '个人学习进度追踪',
        color: '#10b981',
        creatorId: admin.id,
        members: {
          create: {
            userId: admin.id,
            role: 'OWNER',
          },
        },
      },
    });

    console.log('✅ 创建看板:', learningBoard.title);

    // 为学习计划看板创建列表
    const learningLists = [
      { title: '本周学习', position: 0 },
      { title: '进行中', position: 1 },
      { title: '已掌握', position: 2 },
    ];

    const learningCreatedLists = [];
    for (const listData of learningLists) {
      const list = await prisma.boardList.create({
        data: {
          ...listData,
          boardId: learningBoard.id,
        },
      });
      learningCreatedLists.push(list);
      console.log('  ✅ 创建列表:', list.title);
    }

    // 添加学习卡片
    const learningCards = [
      {
        listIndex: 0,
        cards: [
          {
            title: 'Vue 3 Composition API',
            description: '学习 Vue 3 的组合式 API，包括 ref、reactive、computed 等',
            labels: ['Vue', '前端'],
            position: 0,
          },
          {
            title: 'TypeScript 基础',
            description: '掌握 TypeScript 的基本语法和类型系统',
            labels: ['TypeScript', '编程'],
            position: 1,
          },
        ],
      },
      {
        listIndex: 1,
        cards: [
          {
            title: 'Prisma ORM',
            description: '学习使用 Prisma 进行数据库操作',
            labels: ['数据库', '后端'],
            position: 0,
          },
        ],
      },
      {
        listIndex: 2,
        cards: [
          {
            title: 'JavaScript ES6+',
            description: '熟练掌握 ES6+ 的新特性',
            labels: ['JavaScript', '完成'],
            completed: true,
            position: 0,
          },
        ],
      },
    ];

    for (const listCards of learningCards) {
      for (const cardData of listCards.cards) {
        const { listIndex, ...card } = cardData;
        await prisma.card.create({
          data: {
            ...card,
            listId: learningCreatedLists[listCards.listIndex].id,
            creatorId: admin.id,
            members: {
              create: {
                userId: admin.id,
              },
            },
          },
        });
        console.log('    ✅ 创建卡片:', card.title);
      }
    }

    console.log('\n🎉 看板数据初始化完成！');
    console.log(`共创建了 2 个看板，${createdLists.length + learningCreatedLists.length} 个列表`);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initBoardData();
