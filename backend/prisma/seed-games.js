/**
 * 游戏系统测试数据
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化游戏数据...');

  // 清空游戏相关数据
  await prisma.gameReviewComment.deleteMany();
  await prisma.gameLongReviewLike.deleteMany();
  await prisma.gameLongReview.deleteMany();
  await prisma.gameShortReview.deleteMany();
  await prisma.userGameRecord.deleteMany();
  await prisma.game.deleteMany();

  // 清空用户数据
  await prisma.user.deleteMany();

  console.log('已清空旧数据');

  // 创建密码哈希
  const hashedPassword = await bcrypt.hash('123456', 10);
  const adminPassword = await bcrypt.hash('admin123', 10);

  // 创建管理员用户
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'admin',
      password: adminPassword,
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

  // 创建测试学生
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
          bio: '热爱游戏的学生',
          grade: '五年级',
          interests: ['游戏', '编程'],
          joinedDays: 30,
        },
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
          bio: '喜欢策略游戏',
          grade: '五年级',
          interests: ['策略游戏', '阅读'],
          joinedDays: 25,
        },
      },
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: 'student3@example.com',
      username: 'xiaogang',
      password: hashedPassword,
      role: 'STUDENT',
      status: 'ACTIVE',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaogang',
      profile: {
        create: {
          nickname: '小刚',
          bio: 'RPG玩家',
          grade: '六年级',
          interests: ['RPG', '冒险游戏'],
          joinedDays: 20,
        },
      },
    },
  });

  console.log('用户创建完成');

  // 创建5个测试游戏
  const game1 = await prisma.game.create({
    data: {
      name: '魔兽争霸3冰封王座',
      gameType: '即时战略',
      platform: 'PC',
      description: '经典的即时战略游戏，拥有丰富的单人战役和平衡的多人对战系统。',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg',
    },
  });

  const game2 = await prisma.game.create({
    data: {
      name: '文明6',
      gameType: '回合制策略',
      platform: 'PC',
      description: '建立并领导一个文明从石器时代走向信息时代，在人类历史的长河中竞争。',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3pwy.jpg',
    },
  });

  const game3 = await prisma.game.create({
    data: {
      name: '隐形守护者',
      gameType: '互动电影',
      platform: 'PC',
      description: '一款剧情驱动的互动电影游戏，讲述了抗日战争期间潜伏者的故事。',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2maa.jpg',
    },
  });

  const game4 = await prisma.game.create({
    data: {
      name: '中国式家长',
      gameType: '模拟养成',
      platform: 'PC',
      description: '体验中国式教育，从出生到成人的养成模拟游戏。',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1xbf.jpg',
    },
  });

  const game5 = await prisma.game.create({
    data: {
      name: '大航海时代4',
      gameType: '航海冒险',
      platform: 'PC',
      description: '探索未知的海域，建立贸易网络，成为伟大的航海家。',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3bxy.jpg',
    },
  });

  console.log('游戏创建完成');

  // 为学生创建游戏记录
  await prisma.userGameRecord.createMany({
    data: [
      { userId: student1.id, gameId: game1.id, status: 'COMPLETED', totalPlayTime: 3600 },
      { userId: student1.id, gameId: game2.id, status: 'PLAYING', totalPlayTime: 1200 },
      { userId: student1.id, gameId: game3.id, status: 'COMPLETED', totalPlayTime: 480 },

      { userId: student2.id, gameId: game2.id, status: 'PLAYING', totalPlayTime: 2400 },
      { userId: student2.id, gameId: game4.id, status: 'COMPLETED', totalPlayTime: 600 },

      { userId: student3.id, gameId: game3.id, status: 'COMPLETED', totalPlayTime: 500 },
      { userId: student3.id, gameId: game5.id, status: 'WANT_TO_PLAY', totalPlayTime: 0 },
    ],
  });

  console.log('用户游戏记录创建完成');

  // 创建短评
  await prisma.gameShortReview.createMany({
    data: [
      {
        userId: student1.id,
        gameId: game1.id,
        content: '经典的RTS游戏，平衡性非常好，各族特色鲜明！',
        score: 9,
        playTime: 180,
      },
      {
        userId: student1.id,
        gameId: game3.id,
        content: '剧情紧张刺激，选择很重要，每个决定都影响结局。',
        score: 8,
        playTime: 120,
      },
      {
        userId: student2.id,
        gameId: game2.id,
        content: '策略深度很高，文明发展路线很多，可玩性强。',
        score: 9,
        playTime: 200,
      },
      {
        userId: student2.id,
        gameId: game4.id,
        content: '很真实的中国式教育体验，有共鸣但也有些无奈。',
        score: 7,
        playTime: 90,
      },
      {
        userId: student3.id,
        gameId: game3.id,
        content: '电影质感很强，演员演技在线，推荐！',
        score: 9,
        playTime: 150,
      },
    ],
  });

  console.log('短评创建完成');

  // 创建长评
  const review1 = await prisma.gameLongReview.create({
    data: {
      userId: student1.id,
      gameId: game1.id,
      title: '魔兽争霸3：一代经典的RTS巅峰之作',
      content: `<h2>游戏概述</h2>
<p>魔兽争霸3冰封王座是暴雪娱乐开发的即时战略游戏，它不仅完善了前作的游戏性，还加入了更多战术深度。</p>

<h2>游戏特色</h2>
<ul>
  <li><strong>四族平衡</strong>：人族、兽族、亡灵族、暗夜精灵族各具特色，平衡性优秀</li>
  <li><strong>英雄系统</strong>：英雄单位的加入让战斗更加多样化</li>
  <li><strong>剧情模式</strong>：阿尔萨斯王子的堕落之路令人印象深刻</li>
</ul>

<h2>总结</h2>
<p>魔兽争霸3是一款值得反复游玩的经典游戏，即使在今天看来仍然很有趣。强烈推荐给喜欢RTS的玩家！</p>`,
      score: 9,
      playTime: 240,
      isPublic: true,
    },
  });

  const review2 = await prisma.gameLongReview.create({
    data: {
      userId: student2.id,
      gameId: game2.id,
      title: '文明6：策略游戏的新高度',
      content: `<h2>为什么推荐文明6</h2>
<p>作为一名策略游戏爱好者，文明6给我带来了非常棒的游戏体验。</p>

<h2>游戏亮点</h2>
<ol>
  <li><strong>城市规划</strong>：区域系统让城市建设更有策略性</li>
  <li><strong>外交系统</strong>：各国领袖有独特性格，外交互动更真实</li>
  <li><strong>科技树</strong>：从远古时代到未来，技术发展路线丰富</li>
</ol>

<h2>适合人群</h2>
<p>如果你喜欢深度策略游戏，文明6绝对不会让你失望。每局游戏都有不同的发展方向，可玩性极高。</p>`,
      score: 9,
      playTime: 300,
      isPublic: true,
    },
  });

  console.log('长评创建完成');

  // 为长评添加点赞
  await prisma.gameLongReviewLike.createMany({
    data: [
      { reviewId: review1.id, userId: student2.id },
      { reviewId: review1.id, userId: student3.id },
      { reviewId: review2.id, userId: student1.id },
      { reviewId: review2.id, userId: student3.id },
    ],
  });

  // 更新长评点赞数
  await prisma.gameLongReview.update({
    where: { id: review1.id },
    data: { likesCount: 2 },
  });
  await prisma.gameLongReview.update({
    where: { id: review2.id },
    data: { likesCount: 2 },
  });

  // 为长评添加评论
  await prisma.gameReviewComment.createMany({
    data: [
      {
        reviewId: review1.id,
        userId: student2.id,
        content: '写得真好！我也很喜欢魔兽争霸3，尤其是兽族的战术。',
      },
      {
        reviewId: review1.id,
        userId: student3.id,
        content: '同意！剧情模式真的很棒，玩了好多遍还是很有感觉。',
      },
      {
        reviewId: review2.id,
        userId: student1.id,
        content: '文明6确实很耐玩，我最喜欢科技胜利路线。',
      },
    ],
  });

  // 更新长评评论数
  await prisma.gameLongReview.update({
    where: { id: review1.id },
    data: { commentsCount: 2 },
  });
  await prisma.gameLongReview.update({
    where: { id: review2.id },
    data: { commentsCount: 1 },
  });

  console.log('长评点赞和评论创建完成');

  // 计算并更新游戏统计数据
  const games = await prisma.game.findMany();

  for (const game of games) {
    // 统计记录人数
    const recordCount = await prisma.userGameRecord.count({
      where: { gameId: game.id },
    });

    // 计算平均评分（短评+长评）
    const shortReviews = await prisma.gameShortReview.findMany({
      where: { gameId: game.id },
      select: { score: true },
    });
    const longReviews = await prisma.gameLongReview.findMany({
      where: { gameId: game.id },
      select: { score: true },
    });

    const allScores = [
      ...shortReviews.map(r => r.score),
      ...longReviews.map(r => r.score),
    ];

    const avgScore = allScores.length > 0
      ? allScores.reduce((a, b) => a + b, 0) / allScores.length
      : 0;

    await prisma.game.update({
      where: { id: game.id },
      data: {
        recordCount,
        avgScore: Math.round(avgScore * 10) / 10, // 保留一位小数
      },
    });
  }

  console.log('游戏统计数据更新完成');

  console.log('\n✅ 游戏测试数据初始化完成！');
  console.log('\n测试账号：');
  console.log('管理员 - 用户名: admin, 密码: admin123');
  console.log('学生1 - 用户名: xiaoming, 密码: 123456');
  console.log('学生2 - 用户名: xiaohong, 密码: 123456');
  console.log('学生3 - 用户名: xiaogang, 密码: 123456');
  console.log('\n已创建5个游戏、7条用户记录、5条短评、2条长评');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
