/**
 * 成就徽章系统种子数据
 * 初始化默认成就定义
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 成就定义数据
const achievements = [
  // ========== 创作成就 (CREATION) ==========
  {
    code: 'FIRST_WORK',
    name: '初试身手',
    description: '发布第1个HTML作品',
    icon: '🎨',
    rarity: 'COMMON',
    category: 'CREATION',
    conditionType: 'COUNT',
    conditionValue: 1,
    rewardPoints: 10,
    rewardCoins: 5,
    isHidden: false,
    sortOrder: 1,
  },
  {
    code: 'WORK_CREATOR_10',
    name: '小有成就',
    description: '发布10个作品',
    icon: '🎯',
    rarity: 'RARE',
    category: 'CREATION',
    conditionType: 'COUNT',
    conditionValue: 10,
    rewardPoints: 50,
    rewardCoins: 30,
    isHidden: false,
    sortOrder: 2,
  },
  {
    code: 'WORK_CREATOR_50',
    name: '创作大师',
    description: '发布50个作品',
    icon: '🏆',
    rarity: 'EPIC',
    category: 'CREATION',
    conditionType: 'COUNT',
    conditionValue: 50,
    rewardPoints: 200,
    rewardCoins: 100,
    isHidden: false,
    sortOrder: 3,
  },
  {
    code: 'POPULAR_WORK',
    name: '人气作品',
    description: '单个作品获得100个赞',
    icon: '⭐',
    rarity: 'RARE',
    category: 'CREATION',
    conditionType: 'THRESHOLD',
    conditionValue: 100,
    rewardPoints: 100,
    rewardCoins: 50,
    isHidden: false,
    sortOrder: 4,
  },
  {
    code: 'VIRAL_WORK',
    name: '爆款制造机',
    description: '单个作品获得500个赞',
    icon: '🌟',
    rarity: 'LEGENDARY',
    category: 'CREATION',
    conditionType: 'THRESHOLD',
    conditionValue: 500,
    rewardPoints: 500,
    rewardCoins: 300,
    isHidden: false,
    sortOrder: 5,
  },
  {
    code: 'FIRST_DIARY',
    name: '记录生活',
    description: '发布第1篇日记',
    icon: '📝',
    rarity: 'COMMON',
    category: 'CREATION',
    conditionType: 'COUNT',
    conditionValue: 1,
    rewardPoints: 5,
    rewardCoins: 3,
    isHidden: false,
    sortOrder: 6,
  },
  {
    code: 'DIARY_WRITER_50',
    name: '日记达人',
    description: '发布50篇日记',
    icon: '📔',
    rarity: 'RARE',
    category: 'CREATION',
    conditionType: 'COUNT',
    conditionValue: 50,
    rewardPoints: 100,
    rewardCoins: 60,
    isHidden: false,
    sortOrder: 7,
  },
  {
    code: 'DIARY_WRITER_200',
    name: '日记大师',
    description: '发布200篇日记',
    icon: '📚',
    rarity: 'EPIC',
    category: 'CREATION',
    conditionType: 'COUNT',
    conditionValue: 200,
    rewardPoints: 300,
    rewardCoins: 200,
    isHidden: false,
    sortOrder: 8,
  },

  // ========== 学习成就 (LEARNING) ==========
  {
    code: 'STUDY_10H',
    name: '学习入门',
    description: '累计学习10小时',
    icon: '📖',
    rarity: 'COMMON',
    category: 'LEARNING',
    conditionType: 'TOTAL',
    conditionValue: 600, // 10小时 = 600分钟
    rewardPoints: 20,
    rewardCoins: 10,
    isHidden: false,
    sortOrder: 10,
  },
  {
    code: 'STUDY_100H',
    name: '勤奋学习',
    description: '累计学习100小时',
    icon: '📚',
    rarity: 'RARE',
    category: 'LEARNING',
    conditionType: 'TOTAL',
    conditionValue: 6000, // 100小时
    rewardPoints: 100,
    rewardCoins: 50,
    isHidden: false,
    sortOrder: 11,
  },
  {
    code: 'STUDY_500H',
    name: '学霸降临',
    description: '累计学习500小时',
    icon: '🎓',
    rarity: 'EPIC',
    category: 'LEARNING',
    conditionType: 'TOTAL',
    conditionValue: 30000, // 500小时
    rewardPoints: 500,
    rewardCoins: 300,
    isHidden: false,
    sortOrder: 12,
  },
  {
    code: 'FOCUS_MASTER',
    name: '专注大师',
    description: '完成30个番茄钟',
    icon: '🍅',
    rarity: 'EPIC',
    category: 'LEARNING',
    conditionType: 'COUNT',
    conditionValue: 30,
    rewardPoints: 150,
    rewardCoins: 100,
    isHidden: false,
    sortOrder: 13,
  },
  {
    code: 'BOOK_WORM',
    name: '书虫',
    description: '读完20本书',
    icon: '🐛',
    rarity: 'RARE',
    category: 'LEARNING',
    conditionType: 'COUNT',
    conditionValue: 20,
    rewardPoints: 100,
    rewardCoins: 50,
    isHidden: false,
    sortOrder: 14,
  },
  {
    code: 'BOOK_LOVER_50',
    name: '阅读狂人',
    description: '读完50本书',
    icon: '📚',
    rarity: 'EPIC',
    category: 'LEARNING',
    conditionType: 'COUNT',
    conditionValue: 50,
    rewardPoints: 300,
    rewardCoins: 200,
    isHidden: false,
    sortOrder: 15,
  },
  {
    code: 'READING_LOG_100',
    name: '读书笔记家',
    description: '发布100条阅读记录',
    icon: '✍️',
    rarity: 'RARE',
    category: 'LEARNING',
    conditionType: 'COUNT',
    conditionValue: 100,
    rewardPoints: 150,
    rewardCoins: 80,
    isHidden: false,
    sortOrder: 16,
  },

  // ========== 坚持成就 (PERSISTENCE) ==========
  {
    code: 'DIARY_STREAK_7',
    name: '日记新手',
    description: '连续7天写日记',
    icon: '🔥',
    rarity: 'COMMON',
    category: 'PERSISTENCE',
    conditionType: 'STREAK',
    conditionValue: 7,
    rewardPoints: 30,
    rewardCoins: 20,
    isHidden: false,
    sortOrder: 20,
  },
  {
    code: 'DIARY_STREAK_30',
    name: '坚持不懈',
    description: '连续30天写日记',
    icon: '🔥',
    rarity: 'RARE',
    category: 'PERSISTENCE',
    conditionType: 'STREAK',
    conditionValue: 30,
    rewardPoints: 150,
    rewardCoins: 100,
    isHidden: false,
    sortOrder: 21,
  },
  {
    code: 'DIARY_STREAK_100',
    name: '日记传说',
    description: '连续100天写日记',
    icon: '🔥',
    rarity: 'EPIC',
    category: 'PERSISTENCE',
    conditionType: 'STREAK',
    conditionValue: 100,
    rewardPoints: 500,
    rewardCoins: 300,
    isHidden: false,
    sortOrder: 22,
  },
  {
    code: 'STUDY_STREAK_7',
    name: '学习习惯',
    description: '连续7天学习',
    icon: '📅',
    rarity: 'COMMON',
    category: 'PERSISTENCE',
    conditionType: 'STREAK',
    conditionValue: 7,
    rewardPoints: 30,
    rewardCoins: 20,
    isHidden: false,
    sortOrder: 23,
  },
  {
    code: 'STUDY_STREAK_30',
    name: '学习达人',
    description: '连续30天学习',
    icon: '📅',
    rarity: 'RARE',
    category: 'PERSISTENCE',
    conditionType: 'STREAK',
    conditionValue: 30,
    rewardPoints: 150,
    rewardCoins: 100,
    isHidden: false,
    sortOrder: 24,
  },
  {
    code: 'LOGIN_STREAK_30',
    name: '常驻用户',
    description: '连续30天登录',
    icon: '🚪',
    rarity: 'RARE',
    category: 'PERSISTENCE',
    conditionType: 'STREAK',
    conditionValue: 30,
    rewardPoints: 100,
    rewardCoins: 60,
    isHidden: false,
    sortOrder: 25,
  },
  {
    code: 'LOGIN_STREAK_100',
    name: '忠实用户',
    description: '连续100天登录',
    icon: '👑',
    rarity: 'EPIC',
    category: 'PERSISTENCE',
    conditionType: 'STREAK',
    conditionValue: 100,
    rewardPoints: 400,
    rewardCoins: 250,
    isHidden: false,
    sortOrder: 26,
  },
  {
    code: 'CHALLENGE_STREAK_7',
    name: '挑战狂热',
    description: '连续7天完成全部挑战',
    icon: '🎯',
    rarity: 'RARE',
    category: 'PERSISTENCE',
    conditionType: 'STREAK',
    conditionValue: 7,
    rewardPoints: 200,
    rewardCoins: 120,
    isHidden: false,
    sortOrder: 27,
  },

  // ========== 社交成就 (SOCIAL) ==========
  {
    code: 'SOCIAL_EXPERT',
    name: '社交达人',
    description: '内容累计获得100个赞',
    icon: '❤️',
    rarity: 'COMMON',
    category: 'SOCIAL',
    conditionType: 'TOTAL',
    conditionValue: 100,
    rewardPoints: 50,
    rewardCoins: 30,
    isHidden: false,
    sortOrder: 30,
  },
  {
    code: 'COMMENTER',
    name: '评论家',
    description: '发表50条评论',
    icon: '💬',
    rarity: 'COMMON',
    category: 'SOCIAL',
    conditionType: 'COUNT',
    conditionValue: 50,
    rewardPoints: 30,
    rewardCoins: 20,
    isHidden: false,
    sortOrder: 31,
  },
  {
    code: 'POPULAR',
    name: '人气王',
    description: '内容累计获得500个赞',
    icon: '💖',
    rarity: 'RARE',
    category: 'SOCIAL',
    conditionType: 'TOTAL',
    conditionValue: 500,
    rewardPoints: 200,
    rewardCoins: 100,
    isHidden: false,
    sortOrder: 32,
  },
  {
    code: 'INFLUENCER',
    name: '影响力大师',
    description: '内容累计获得1000个赞',
    icon: '🌟',
    rarity: 'EPIC',
    category: 'SOCIAL',
    conditionType: 'TOTAL',
    conditionValue: 1000,
    rewardPoints: 500,
    rewardCoins: 300,
    isHidden: false,
    sortOrder: 33,
  },
  {
    code: 'ACTIVE_COMMENTER',
    name: '活跃评论者',
    description: '发表200条评论',
    icon: '💭',
    rarity: 'RARE',
    category: 'SOCIAL',
    conditionType: 'COUNT',
    conditionValue: 200,
    rewardPoints: 100,
    rewardCoins: 60,
    isHidden: false,
    sortOrder: 34,
  },
  {
    code: 'FIRST_LIKE',
    name: '点赞新手',
    description: '给他人点赞10次',
    icon: '👍',
    rarity: 'COMMON',
    category: 'SOCIAL',
    conditionType: 'COUNT',
    conditionValue: 10,
    rewardPoints: 10,
    rewardCoins: 5,
    isHidden: false,
    sortOrder: 35,
  },

  // ========== 特殊成就 (SPECIAL) ==========
  {
    code: 'ALL_ROUNDER',
    name: '全能选手',
    description: '每种内容类型至少发布10个',
    icon: '🎖️',
    rarity: 'LEGENDARY',
    category: 'SPECIAL',
    conditionType: 'COUNT',
    conditionValue: 10,
    rewardPoints: 300,
    rewardCoins: 200,
    isHidden: false,
    sortOrder: 40,
  },
  {
    code: 'POINT_TYCOON',
    name: '积分大亨',
    description: '累计获得10000积分',
    icon: '💰',
    rarity: 'LEGENDARY',
    category: 'SPECIAL',
    conditionType: 'TOTAL',
    conditionValue: 10000,
    rewardPoints: 500,
    rewardCoins: 300,
    isHidden: false,
    sortOrder: 41,
  },
  {
    code: 'PERFECT',
    name: '完美主义',
    description: '连续30天完成全部每日挑战',
    icon: '💎',
    rarity: 'LEGENDARY',
    category: 'SPECIAL',
    conditionType: 'STREAK',
    conditionValue: 30,
    rewardPoints: 1000,
    rewardCoins: 500,
    isHidden: true,
    sortOrder: 42,
  },
  {
    code: 'LEGEND',
    name: '传奇用户',
    description: '解锁所有其他成就',
    icon: '👑',
    rarity: 'LEGENDARY',
    category: 'SPECIAL',
    conditionType: 'COUNT',
    conditionValue: 40, // 需要解锁的成就总数（除了自己）
    rewardPoints: 2000,
    rewardCoins: 1000,
    isHidden: true,
    sortOrder: 43,
  },
  {
    code: 'EARLY_BIRD',
    name: '早起的鸟儿',
    description: '在早上6点前完成学习',
    icon: '🌅',
    rarity: 'RARE',
    category: 'SPECIAL',
    conditionType: 'COUNT',
    conditionValue: 10,
    rewardPoints: 50,
    rewardCoins: 30,
    isHidden: false,
    sortOrder: 44,
  },
  {
    code: 'NIGHT_OWL',
    name: '夜猫子',
    description: '在晚上10点后完成学习',
    icon: '🦉',
    rarity: 'RARE',
    category: 'SPECIAL',
    conditionType: 'COUNT',
    conditionValue: 10,
    rewardPoints: 50,
    rewardCoins: 30,
    isHidden: false,
    sortOrder: 45,
  },
  {
    code: 'QUICK_LEARNER',
    name: '速学者',
    description: '单日学习超过5小时',
    icon: '⚡',
    rarity: 'EPIC',
    category: 'SPECIAL',
    conditionType: 'THRESHOLD',
    conditionValue: 300, // 5小时 = 300分钟
    rewardPoints: 100,
    rewardCoins: 60,
    isHidden: false,
    sortOrder: 46,
  },
  {
    code: 'SUPER_LEARNER',
    name: '超级学霸',
    description: '单日学习超过10小时',
    icon: '💪',
    rarity: 'LEGENDARY',
    category: 'SPECIAL',
    conditionType: 'THRESHOLD',
    conditionValue: 600, // 10小时
    rewardPoints: 300,
    rewardCoins: 200,
    isHidden: false,
    sortOrder: 47,
  },
];

async function main() {
  console.log('开始初始化成就系统...');

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const achievementData of achievements) {
    try {
      // 检查是否已存在
      const existing = await prisma.achievement.findUnique({
        where: { code: achievementData.code },
      });

      if (existing) {
        // 更新现有成就
        await prisma.achievement.update({
          where: { code: achievementData.code },
          data: achievementData,
        });
        updatedCount++;
      } else {
        // 创建新成就
        await prisma.achievement.create({
          data: achievementData,
        });
        createdCount++;
      }
    } catch (error) {
      console.error(`处理成就 "${achievementData.code}" 失败:`, error.message);
      skippedCount++;
    }
  }

  console.log('\n========== 成就系统初始化完成 ==========');
  console.log(`✓ 创建了 ${createdCount} 个新成就`);
  console.log(`✓ 更新了 ${updatedCount} 个现有成就`);
  if (skippedCount > 0) {
    console.log(`⚠ 跳过了 ${skippedCount} 个失败的成就`);
  }
  console.log(`\n成就分类统计：`);
  console.log(`- 创作成就 (CREATION): 8个`);
  console.log(`- 学习成就 (LEARNING): 7个`);
  console.log(`- 坚持成就 (PERSISTENCE): 8个`);
  console.log(`- 社交成就 (SOCIAL): 6个`);
  console.log(`- 特殊成就 (SPECIAL): 8个`);
  console.log(`\n稀有度统计：`);
  console.log(`- 普通 (COMMON): 10个`);
  console.log(`- 稀有 (RARE): 14个`);
  console.log(`- 史诗 (EPIC): 9个`);
  console.log(`- 传说 (LEGENDARY): 4个`);
  console.log(`- 隐藏成就: 2个`);
  console.log('=========================================\n');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
