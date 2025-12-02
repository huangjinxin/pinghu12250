/**
 * 种子数据脚本 - 创建管理员账号和默认积分规则
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// 管理员账号数据
const adminData = {
  email: 'admin@example.com',
  username: 'admin',
  password: 'admin123',
  role: 'ADMIN',
};

// 默认积分规则数据
const defaultPointRules = [
  // ========== 日记类 ==========
  {
    category: 'diary',
    name: '发布日记-入门级',
    action: 'DIARY_CREATE',
    conditionType: 'word_count',
    conditionValue: 800,
    points: 5,
    dailyLimit: 0,
    description: '发布字数≥800的日记可获得5积分',
  },
  {
    category: 'diary',
    name: '发布日记-良好级',
    action: 'DIARY_CREATE',
    conditionType: 'word_count',
    conditionValue: 1000,
    points: 10,
    dailyLimit: 0,
    description: '发布字数≥1000的日记可获得10积分',
  },
  {
    category: 'diary',
    name: '发布日记-优秀级',
    action: 'DIARY_CREATE',
    conditionType: 'word_count',
    conditionValue: 1200,
    points: 15,
    dailyLimit: 0,
    description: '发布字数≥1200的日记可获得15积分',
  },
  {
    category: 'diary',
    name: '发布日记-卓越级',
    action: 'DIARY_CREATE',
    conditionType: 'word_count',
    conditionValue: 1500,
    points: 20,
    dailyLimit: 0,
    description: '发布字数≥1500的日记可获得20积分',
  },
  {
    category: 'diary',
    name: '发布日记-大师级',
    action: 'DIARY_CREATE',
    conditionType: 'word_count',
    conditionValue: 2000,
    points: 30,
    dailyLimit: 0,
    description: '发布字数≥2000的日记可获得30积分',
  },
  {
    category: 'diary',
    name: '日记被点赞',
    action: 'DIARY_LIKE',
    conditionType: 'none',
    points: 1,
    dailyLimit: 0,
    description: '日记被他人点赞时作者获得1积分',
  },
  {
    category: 'diary',
    name: '日记被点踩',
    action: 'DIARY_DISLIKE',
    conditionType: 'none',
    points: -1,
    dailyLimit: 0,
    description: '日记被他人点踩时作者扣除1积分',
  },
  {
    category: 'diary',
    name: '删除日记',
    action: 'DIARY_DELETE',
    conditionType: 'none',
    points: 0, // 动态计算
    dailyLimit: 0,
    description: '删除日记时扣除该日记获得的所有积分',
  },

  // ========== 读书类 ==========
  {
    category: 'reading',
    name: '添加书籍到书架',
    action: 'BOOK_ADD',
    conditionType: 'none',
    points: 2,
    dailyLimit: 0,
    description: '添加书籍到个人书架可获得2积分',
  },
  {
    category: 'reading',
    name: '发布阅读记录',
    action: 'READING_LOG_CREATE',
    conditionType: 'none',
    points: 5,
    dailyLimit: 0,
    description: '发布阅读记录可获得5积分',
  },
  {
    category: 'reading',
    name: '阅读记录被点赞',
    action: 'READING_LOG_LIKE',
    conditionType: 'none',
    points: 1,
    dailyLimit: 0,
    description: '阅读记录被他人点赞时作者获得1积分',
  },
  {
    category: 'reading',
    name: '阅读记录被点踩',
    action: 'READING_LOG_DISLIKE',
    conditionType: 'none',
    points: -1,
    dailyLimit: 0,
    description: '阅读记录被他人点踩时作者扣除1积分',
  },
  {
    category: 'reading',
    name: '读完一本书',
    action: 'BOOK_FINISH',
    conditionType: 'none',
    points: 20,
    dailyLimit: 0,
    description: '将书籍阅读状态改为"已读完"可获得20积分',
  },
  {
    category: 'reading',
    name: '删除阅读记录',
    action: 'READING_LOG_DELETE',
    conditionType: 'none',
    points: -5,
    dailyLimit: 0,
    description: '删除阅读记录扣除5积分',
  },

  // ========== 作业类 ==========
  {
    category: 'homework',
    name: '提交作业',
    action: 'HOMEWORK_CREATE',
    conditionType: 'none',
    points: 5,
    dailyLimit: 0,
    description: '提交作业可获得5积分',
  },
  {
    category: 'homework',
    name: '作业被评为优秀',
    action: 'HOMEWORK_EXCELLENT',
    conditionType: 'none',
    points: 10,
    dailyLimit: 0,
    description: '作业被老师评为优秀可获得10积分',
  },

  // ========== 作品类 ==========
  {
    category: 'work',
    name: '发布HTML作品',
    action: 'HTML_WORK_CREATE',
    conditionType: 'none',
    points: 10,
    dailyLimit: 0,
    description: '发布HTML作品可获得10积分',
  },
  {
    category: 'work',
    name: '作品被点赞',
    action: 'HTML_WORK_LIKE',
    conditionType: 'none',
    points: 2,
    dailyLimit: 0,
    description: '作品被他人点赞时作者获得2积分',
  },
  {
    category: 'work',
    name: '作品被点踩',
    action: 'HTML_WORK_DISLIKE',
    conditionType: 'none',
    points: -2,
    dailyLimit: 0,
    description: '作品被他人点踩时作者扣除2积分',
  },
  {
    category: 'work',
    name: '作品被Fork',
    action: 'HTML_WORK_FORK',
    conditionType: 'none',
    points: 5,
    dailyLimit: 0,
    description: '作品被其他用户Fork可获得5积分',
  },
  {
    category: 'work',
    name: '删除作品',
    action: 'HTML_WORK_DELETE',
    conditionType: 'none',
    points: -10,
    dailyLimit: 0,
    description: '删除作品扣除10积分',
  },

  // ========== 游戏评测类 ==========
  {
    category: 'game',
    name: '发布游戏短评',
    action: 'GAME_SHORT_REVIEW',
    conditionType: 'none',
    points: 3,
    dailyLimit: 0,
    description: '发布游戏短评可获得3积分',
  },
  {
    category: 'game',
    name: '发布游戏长评',
    action: 'GAME_LONG_REVIEW',
    conditionType: 'none',
    points: 10,
    dailyLimit: 0,
    description: '发布游戏长评可获得10积分',
  },
  {
    category: 'game',
    name: '长评被点赞',
    action: 'GAME_REVIEW_LIKE',
    conditionType: 'none',
    points: 1,
    dailyLimit: 0,
    description: '游戏长评被他人点赞时作者获得1积分',
  },

  // ========== 社交类 ==========
  {
    category: 'social',
    name: '给他人点赞',
    action: 'GIVE_LIKE',
    conditionType: 'none',
    points: 1,
    dailyLimit: 5,
    description: '给他人的内容点赞可获得1积分，每日上限5分',
  },
  {
    category: 'social',
    name: '发表评论',
    action: 'COMMENT_CREATE',
    conditionType: 'none',
    points: 2,
    dailyLimit: 10,
    description: '发表评论可获得2积分，每日上限10分',
  },

  // ========== 登录类 ==========
  {
    category: 'login',
    name: '每日登录',
    action: 'DAILY_LOGIN',
    conditionType: 'none',
    points: 1,
    dailyLimit: 0,
    description: '每日首次登录可获得1积分',
  },
  {
    category: 'login',
    name: '连续登录7天',
    action: 'CONTINUOUS_LOGIN_7',
    conditionType: 'none',
    points: 10,
    dailyLimit: 0,
    description: '连续登录7天可获得额外10积分奖励',
  },
  {
    category: 'login',
    name: '断签惩罚',
    action: 'LOGIN_BREAK',
    conditionType: 'none',
    points: -5,
    dailyLimit: 0,
    description: '中断连续登录扣除5积分',
  },
];

async function seed() {
  try {
    console.log('🌱 开始初始化种子数据...\n');

    // 1. 创建管理员账号
    console.log('📝 创建管理员账号...');
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminData.email },
          { username: adminData.username },
        ],
      },
    });

    let admin;
    if (existingAdmin) {
      console.log('  ⚠️  管理员账号已存在，跳过创建');
      admin = existingAdmin;
    } else {
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      admin = await prisma.user.create({
        data: {
          email: adminData.email,
          username: adminData.username,
          password: hashedPassword,
          role: adminData.role,
          status: 'ACTIVE',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminData.username}`,
          profile: {
            create: {
              nickname: '系统管理员',
              bio: '系统管理员账号',
              joinedDays: 0,
            },
          },
        },
      });
      console.log('  ✅ 管理员账号创建成功');
      console.log(`     用户名: ${adminData.username}`);
      console.log(`     邮箱: ${adminData.email}`);
      console.log(`     密码: ${adminData.password}`);
    }

    // 2. 创建默认积分规则
    console.log('\n📊 创建默认积分规则...');
    let createdCount = 0;
    let skippedCount = 0;

    for (const rule of defaultPointRules) {
      const existing = await prisma.pointRule.findUnique({
        where: { action: rule.action },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      await prisma.pointRule.create({
        data: rule,
      });
      createdCount++;
    }

    console.log(`  ✅ 创建了 ${createdCount} 条积分规则`);
    if (skippedCount > 0) {
      console.log(`  ⚠️  跳过了 ${skippedCount} 条已存在的规则`);
    }

    // 3. 显示规则摘要
    console.log('\n📋 积分规则摘要：');
    const categories = ['diary', 'reading', 'homework', 'work', 'game', 'social', 'login'];
    const categoryNames = {
      diary: '日记类',
      reading: '读书类',
      homework: '作业类',
      work: '作品类',
      game: '游戏评测类',
      social: '社交类',
      login: '登录类',
    };

    for (const category of categories) {
      const count = await prisma.pointRule.count({
        where: { category },
      });
      console.log(`  ${categoryNames[category]}: ${count} 条规则`);
    }

    console.log('\n✨ 种子数据初始化完成！');
    console.log('\n==========================================');
    console.log('🔐 管理员登录信息：');
    console.log(`   用户名: ${adminData.username}`);
    console.log(`   密码: ${adminData.password}`);
    console.log('==========================================\n');

  } catch (error) {
    console.error('❌ 种子数据初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行种子数据脚本
seed()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
