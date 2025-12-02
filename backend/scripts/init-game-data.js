/**
 * 初始化游戏测试数据
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function initGameData() {
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

    // 创建示例游戏（模拟从RAWG API获取的数据）
    const games = [
      {
        rawgId: 3498,
        name: 'Grand Theft Auto V',
        nameEn: 'Grand Theft Auto V',
        coverImage: 'https://media.rawg.io/media/games/20a/20aa03a10cda45239fe22d035c0ebe64.jpg',
        backgroundImage: 'https://media.rawg.io/media/games/20a/20aa03a10cda45239fe22d035c0ebe64.jpg',
        description: '洛圣都是一个阳光普照的繁华都市，充满了自我救赎的大师和过气名人，以及奋力求生的西海岸明星。这座城市曾经是西方世界的骄傲，但现在却在经济危机和现实电视的重压下摇摇欲坠。',
        genres: ['动作', '冒险'],
        platforms: ['PC', 'PlayStation 4', 'Xbox One'],
        releaseDate: new Date('2013-09-17'),
        rating: 4.47,
        metacritic: 96,
      },
      {
        rawgId: 3328,
        name: 'The Witcher 3: Wild Hunt',
        nameEn: 'The Witcher 3: Wild Hunt',
        coverImage: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg',
        backgroundImage: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg',
        description: '作为一名职业的怪物猎人，你需要在一个开放世界的奇幻宇宙中追踪命运之子的预言。',
        genres: ['动作', 'RPG', '冒险'],
        platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
        releaseDate: new Date('2015-05-18'),
        rating: 4.66,
        metacritic: 92,
      },
      {
        rawgId: 4200,
        name: 'Portal 2',
        nameEn: 'Portal 2',
        coverImage: 'https://media.rawg.io/media/games/328/3283617cb7d75d67257fc58339188742.jpg',
        backgroundImage: 'https://media.rawg.io/media/games/328/3283617cb7d75d67257fc58339188742.jpg',
        description: 'Portal 2是第一人称解谜平台游戏的续作。',
        genres: ['射击', '解谜', '平台'],
        platforms: ['PC', 'PlayStation 3', 'Xbox 360'],
        releaseDate: new Date('2011-04-18'),
        rating: 4.61,
        metacritic: 95,
      },
      {
        rawgId: 5286,
        name: 'Tomb Raider',
        nameEn: 'Tomb Raider',
        coverImage: 'https://media.rawg.io/media/games/021/021c4e21a1824d2526f925eff6324653.jpg',
        backgroundImage: 'https://media.rawg.io/media/games/021/021c4e21a1824d2526f925eff6324653.jpg',
        description: '古墓丽影重启之作，讲述了劳拉·克罗夫特成为古墓探险家的起源故事。',
        genres: ['动作', '冒险'],
        platforms: ['PC', 'PlayStation 4', 'Xbox One'],
        releaseDate: new Date('2013-03-05'),
        rating: 4.05,
        metacritic: 86,
      },
      {
        rawgId: 13536,
        name: 'Portal',
        nameEn: 'Portal',
        coverImage: 'https://media.rawg.io/media/games/7fa/7fa0b586293c5861ee32490e953a4996.jpg',
        backgroundImage: 'https://media.rawg.io/media/games/7fa/7fa0b586293c5861ee32490e953a4996.jpg',
        description: '利用传送门解谜的经典第一人称游戏。',
        genres: ['射击', '解谜', '平台'],
        platforms: ['PC', 'PlayStation 3', 'Xbox 360'],
        releaseDate: new Date('2007-10-09'),
        rating: 4.51,
        metacritic: 90,
      },
    ];

    const createdGames = [];
    for (const gameData of games) {
      const game = await prisma.game.create({
        data: gameData,
      });
      createdGames.push(game);
      console.log('✅ 创建游戏:', game.name);
    }

    // 为管理员创建游戏记录
    const records = [
      {
        gameIndex: 0, // GTA V
        content: '这是一款非常优秀的开放世界游戏！故事情节引人入胜，三位主角各有特色。洛圣都的城市设计非常真实，细节丰富。线上模式也非常有趣，可以和朋友一起完成各种任务。强烈推荐！',
        rating: 10,
        playTime: 120,
        status: 'COMPLETED',
      },
      {
        gameIndex: 1, // Witcher 3
        content: '巫师3是我玩过最好的RPG游戏之一。剧情深刻，角色塑造饱满，支线任务质量极高。昆特牌也很有趣，让人欲罢不能。唯一的缺点是有些地方的战斗系统感觉有点重复。',
        rating: 10,
        playTime: 200,
        status: 'COMPLETED',
      },
      {
        gameIndex: 2, // Portal 2
        content: '非常棒的解谜游戏！谜题设计巧妙，难度适中。GLaDOS的幽默感十足，剧情也很吸引人。合作模式和朋友一起玩非常有趣。',
        rating: 9,
        playTime: 15,
        status: 'COMPLETED',
      },
      {
        gameIndex: 3, // Tomb Raider
        content: '作为系列重启之作，这一代的劳拉更加真实可信。游戏的生存元素做得很好，探索和解谜也很有趣。不过剧情稍显单薄。',
        rating: 8,
        playTime: 25,
        status: 'PLAYING',
      },
      {
        gameIndex: 4, // Portal
        content: '经典的解谜游戏，虽然流程不长，但谜题设计非常精妙。GLaDOS是游戏史上最好的反派之一。',
        rating: 9,
        playTime: 5,
        status: 'COMPLETED',
      },
    ];

    for (const recordData of records) {
      const { gameIndex, ...data } = recordData;
      const record = await prisma.gameRecord.create({
        data: {
          ...data,
          userId: admin.id,
          gameId: createdGames[gameIndex].id,
        },
      });
      console.log('  ✅ 创建记录:', createdGames[gameIndex].name);

      // 为部分记录添加评论
      if (Math.random() > 0.5) {
        await prisma.gameRecordComment.create({
          data: {
            recordId: record.id,
            authorId: admin.id,
            content: '非常赞同！这款游戏确实值得一玩。',
          },
        });
        console.log('    ✅ 添加评论');
      }
    }

    // 添加收藏
    const favoritesCount = 3;
    for (let i = 0; i < favoritesCount; i++) {
      await prisma.gameFavorite.create({
        data: {
          userId: admin.id,
          gameId: createdGames[i].id,
        },
      });
      console.log('  ✅ 收藏游戏:', createdGames[i].name);
    }

    console.log('\n🎉 游戏数据初始化完成！');
    console.log(`共创建了 ${createdGames.length} 个游戏，${records.length} 条记录`);
  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initGameData();
