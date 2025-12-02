/**
 * 创建演示数据脚本
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoData() {
  try {
    console.log('🌱 开始创建演示数据...\n');

    // 1. 创建测试用户
    console.log('👤 创建测试用户...');
    const hashedPassword = await bcrypt.hash('123456', 10);

    const user1 = await prisma.user.upsert({
      where: { email: 'student1@example.com' },
      update: {},
      create: {
        email: 'student1@example.com',
        username: 'student1',
        password: hashedPassword,
        role: 'STUDENT',
        status: 'ACTIVE',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student1',
        profile: {
          create: {
            nickname: '小明',
            bio: '我是小明，喜欢阅读和编程',
            joinedDays: 0,
          },
        },
      },
    });

    const user2 = await prisma.user.upsert({
      where: { email: 'student2@example.com' },
      update: {},
      create: {
        email: 'student2@example.com',
        username: 'student2',
        password: hashedPassword,
        role: 'STUDENT',
        status: 'ACTIVE',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student2',
        profile: {
          create: {
            nickname: '小红',
            bio: '热爱学习，每天进步一点点',
            joinedDays: 0,
          },
        },
      },
    });

    console.log(`  ✅ 创建用户: ${user1.username}, ${user2.username}`);

    // 2. 创建书籍
    console.log('\n📚 创建书籍数据...');
    const book1 = await prisma.book.create({
      data: {
        title: '小王子',
        author: '安托万·德·圣埃克苏佩里',
        coverUrl: 'https://img1.doubanio.com/view/subject/s/public/s1237549.jpg',
        sourceType: 'paper',
        sourceUrl: 'https://book.douban.com/subject/1084336/',
        totalPages: 96,
        description: '一部写给大人的童话，讲述了小王子在星际旅行中的所见所闻。',
        createdBy: user1.id,
      },
    });

    const book2 = await prisma.book.create({
      data: {
        title: '活着',
        author: '余华',
        coverUrl: 'https://img2.doubanio.com/view/subject/s/public/s1076959.jpg',
        sourceType: 'ebook',
        sourceUrl: 'https://book.douban.com/subject/1082154/',
        totalPages: 191,
        description: '讲述了一个人和他命运之间的友谊，这是最为感人的友谊。',
        createdBy: user2.id,
      },
    });

    const book3 = await prisma.book.create({
      data: {
        title: 'JavaScript高级程序设计',
        author: 'Matt Frisbie',
        coverUrl: 'https://img2.doubanio.com/view/subject/s/public/s33831715.jpg',
        sourceType: 'ebook',
        sourceUrl: 'https://book.douban.com/subject/35175321/',
        totalPages: 888,
        description: 'JavaScript技术的经典之作，全面介绍JavaScript语言的各个方面。',
        createdBy: user1.id,
      },
    });

    console.log(`  ✅ 创建了 3 本书籍`);

    // 3. 添加书籍到书架
    console.log('\n📖 添加书籍到书架...');
    await prisma.userBookshelf.create({
      data: {
        userId: user1.id,
        bookId: book1.id,
        status: 'READING',
        totalReadPages: 30,
      },
    });

    await prisma.userBookshelf.create({
      data: {
        userId: user1.id,
        bookId: book3.id,
        status: 'READING',
        totalReadPages: 120,
      },
    });

    await prisma.userBookshelf.create({
      data: {
        userId: user2.id,
        bookId: book2.id,
        status: 'COMPLETED',
        totalReadPages: 191,
      },
    });

    console.log(`  ✅ 添加了 3 条书架记录`);

    // 4. 创建阅读记录
    console.log('\n📝 创建阅读记录...');
    const readingLog1 = await prisma.readingLog.create({
      data: {
        userId: user1.id,
        bookId: book1.id,
        chapterInfo: '第1-3章',
        readPages: 30,
        content: '小王子这本书真的很有趣！虽然是童话，但是蕴含着很深刻的道理。今天读了前三章，讲述了小王子离开他的星球开始旅行。作者通过小王子的眼睛，让我们重新审视这个世界。期待后续的内容！',
        isPublic: true,
        likesCount: 0,
        dislikesCount: 0,
      },
    });

    await prisma.readingLog.create({
      data: {
        userId: user1.id,
        bookId: book3.id,
        chapterInfo: '第1-4章：变量、作用域与内存',
        readPages: 80,
        content: '今天学习了JavaScript的变量和作用域相关内容。这本书讲得非常详细，从基础概念到高级应用都有涉及。通过学习理解了原始值和引用值的区别，以及执行上下文的工作原理。需要多加练习才能真正掌握这些知识点。继续加油！',
        isPublic: true,
        likesCount: 2,
        dislikesCount: 0,
      },
    });

    await prisma.readingLog.create({
      data: {
        userId: user2.id,
        bookId: book2.id,
        chapterInfo: '全书',
        readPages: 191,
        content: '《活着》这本书读完了，感触很深。余华用朴实的语言讲述了一个平凡人的一生。主人公福贵经历了那么多苦难，但依然选择活着，这种生命力让人感动。这本书让我明白了生命的意义和价值，强烈推荐！',
        isPublic: true,
        likesCount: 5,
        dislikesCount: 0,
      },
    });

    console.log(`  ✅ 创建了 3 条阅读记录`);

    // 5. 创建日记
    console.log('\n📔 创建日记...');
    await prisma.diary.create({
      data: {
        authorId: user1.id,
        title: '充实的一天',
        content: '今天是充实的一天。早上起来读了《小王子》，下午继续学习JavaScript。晚上整理了今天学到的知识点，写了学习笔记。虽然有些累，但感觉很充实。学习编程真的很有意思，每天都能学到新东西。今天理解了闭包的概念，之前一直觉得很难，现在终于搞懂了。希望明天也能保持这种学习的热情！今天读书和编程的时间都很充足，这样的生活很有意义。继续加油，相信自己一定能成为一个优秀的程序员！每天进步一点点，积累起来就会有很大的变化。今天还帮助同学解决了一个编程问题，分享知识的感觉真好。明天要继续努力学习，不能松懈。学习就像爬山，虽然累但是风景很美。相信通过不断努力，一定能达到自己的目标。加油加油！今天的日记就写到这里，明天见！这篇日记已经超过300字了，记录了今天的学习和生活。每天写日记是个好习惯，可以帮助我回顾和总结一天的收获。继续保持这个习惯，相信会有更多的成长和进步。晚安，明天又是新的一天，充满了无限可能！',
        mood: '充实',
        weather: '晴天',
      },
    });

    await prisma.diary.create({
      data: {
        authorId: user2.id,
        title: '读完《活着》的感想',
        content: '今天终于读完了《活着》这本书，心情久久不能平复。余华老师用质朴的文字讲述了一个普通人的一生，从地主少爷到贫苦农民，福贵经历了太多的苦难。失去了所有的亲人，但他依然选择活着。这本书让我深刻地理解了生命的意义。活着本身就是一种胜利，无论遭遇什么困难，只要还活着就有希望。这本书给了我很大的启发，让我更加珍惜现在的生活。我们现在的生活条件比书中的时代好太多了，更应该好好珍惜，努力学习，不辜负这美好的时代。读书真的能让人成长，不同的书给人不同的启发。《活着》教会我坚强，教会我珍惜。以后要多读一些好书，让自己的精神世界更加丰富。今天写这篇日记，记录下读完这本书的感受，希望以后重读时能想起今天的心情。生活还要继续，明天要继续努力学习！这本书推荐给所有人，相信每个人读完都会有自己的感悟。感谢余华老师写出这么好的作品！',
        mood: '感动',
        weather: '阴天',
      },
    });

    console.log(`  ✅ 创建了 2 篇日记`);

    // 6. 创建动态
    console.log('\n🌟 创建动态...');
    await prisma.dynamic.create({
      data: {
        authorId: user1.id,
        content: '今天学习了JavaScript的闭包概念，终于理解了！分享一个小技巧：通过实际的代码示例来理解抽象概念会更容易。大家有什么好的学习方法吗？',
        images: [],
        isPublic: true,
      },
    });

    await prisma.dynamic.create({
      data: {
        authorId: user2.id,
        content: '刚读完《活着》，推荐给大家！这是一本很有深度的书，让人思考生命的意义。',
        images: [],
        isPublic: true,
      },
    });

    console.log(`  ✅ 创建了 2 条动态`);

    console.log('\n✨ 演示数据创建完成！');
    console.log('\n==========================================');
    console.log('📊 数据统计：');
    console.log(`   用户: 2 个 (student1, student2)`);
    console.log(`   书籍: 3 本`);
    console.log(`   阅读记录: 3 条`);
    console.log(`   日记: 2 篇`);
    console.log(`   动态: 2 条`);
    console.log('==========================================');
    console.log('\n🔐 测试账号：');
    console.log(`   用户名: student1 / student2`);
    console.log(`   密码: 123456`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('❌ 创建演示数据失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行脚本
createDemoData()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
