/**
 * 成就种子数据
 * 运行: node backend/prisma/seed_achievements.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ACHIEVEMENTS = [
  // ===== 数学 =====
  { code: 'MATH_FIRST',    name: '初次运算',       description: '首次提交数学学习进度',       icon: '🔢', rarity: 'COMMON',   category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 1,   rewardPoints: 20  },
  { code: 'MATH_10',       name: '勤学苦练',       description: '累计提交10次数学进度',       icon: '🔢', rarity: 'COMMON',   category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 10,  rewardPoints: 50  },
  { code: 'MATH_50',       name: '数海扬帆',       description: '累计提交50次数学进度',       icon: '➗', rarity: 'RARE',     category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 50,  rewardPoints: 150 },
  { code: 'MATH_100',      name: '数学达人',       description: '累计提交100次数学进度',      icon: '📐', rarity: 'EPIC',     category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 100, rewardPoints: 400 },
  { code: 'MATH_STREAK_7', name: '每周必练',       description: '连续7天提交数学进度',        icon: '📆', rarity: 'RARE',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 7,   rewardPoints: 100 },
  { code: 'MATH_STREAK_30',name: '月度学霸',       description: '连续30天提交数学进度',       icon: '📆', rarity: 'EPIC',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 30,  rewardPoints: 300 },

  // ===== 背诗 =====
  { code: 'POEM_FIRST',    name: '初吟',           description: '首次提交背诵古诗',            icon: '📜', rarity: 'COMMON',   category: 'CREATION',   conditionType: 'COUNT', conditionValue: 1,   rewardPoints: 20  },
  { code: 'POEM_10',       name: '诗坛新秀',       description: '累计背诵10首诗词',           icon: '📜', rarity: 'COMMON',   category: 'CREATION',   conditionType: 'COUNT', conditionValue: 10,  rewardPoints: 50  },
  { code: 'POEM_50',       name: '诗词达人',       description: '累计背诵50首诗词',           icon: '📖', rarity: 'RARE',     category: 'CREATION',   conditionType: 'COUNT', conditionValue: 50,  rewardPoints: 150 },
  { code: 'POEM_100',      name: '百首诗人',       description: '累计背诵100首诗词',          icon: '📚', rarity: 'EPIC',     category: 'CREATION',   conditionType: 'COUNT', conditionValue: 100, rewardPoints: 400 },
  { code: 'POEM_STREAK_7', name: '每周一诗',       description: '连续7天背诵诗词',            icon: '🔥', rarity: 'RARE',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 7,   rewardPoints: 100 },
  { code: 'POEM_STREAK_30',name: '诗不离口',       description: '连续30天背诵诗词',           icon: '🔥', rarity: 'EPIC',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 30,  rewardPoints: 300 },

  // ===== 书写 =====
  { code: 'CALLI_FIRST',    name: '初试笔墨',       description: '首次提交书写作品',            icon: '✍️', rarity: 'COMMON',   category: 'CREATION',   conditionType: 'COUNT', conditionValue: 1,   rewardPoints: 20  },
  { code: 'CALLI_10',       name: '笔墨生花',       description: '累计10幅书写作品',           icon: '✍️', rarity: 'COMMON',   category: 'CREATION',   conditionType: 'COUNT', conditionValue: 10,  rewardPoints: 50  },
  { code: 'CALLI_50',       name: '书法新秀',       description: '累计50幅书写作品',           icon: '🖌️', rarity: 'RARE',     category: 'CREATION',   conditionType: 'COUNT', conditionValue: 50,  rewardPoints: 150 },
  { code: 'CALLI_100',      name: '翰墨名家',       description: '累计100幅书写作品',          icon: '🖼️', rarity: 'EPIC',     category: 'CREATION',   conditionType: 'COUNT', conditionValue: 100, rewardPoints: 400 },
  { code: 'CALLI_STREAK_7', name: '每日一练',       description: '连续7天书写练习',            icon: '🔥', rarity: 'RARE',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 7,   rewardPoints: 100 },
  { code: 'CALLI_STREAK_30',name: '铁画银钩',       description: '连续30天书写练习',           icon: '🔥', rarity: 'EPIC',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 30,  rewardPoints: 300 },
  { code: 'CALLI_APPROVED_10',name: '十全十美',     description: '累计10幅作品通过审核',       icon: '✅', rarity: 'RARE',     category: 'CREATION',   conditionType: 'COUNT', conditionValue: 10,  rewardPoints: 80  },
  { code: 'CALLI_APPROVED_50',name: '墨宝传世',     description: '累计50幅作品通过审核',       icon: '🏆', rarity: 'LEGENDARY', category: 'CREATION',  conditionType: 'COUNT', conditionValue: 50,  rewardPoints: 800 },

  // ===== 分享生活 =====
  { code: 'MOMENT_FIRST',  name: '初露锋芒',       description: '首次发布动态',                icon: '📸', rarity: 'COMMON',   category: 'SOCIAL',     conditionType: 'COUNT', conditionValue: 1,   rewardPoints: 15  },
  { code: 'MOMENT_10',     name: '生活分享家',     description: '累计10条动态',                icon: '📸', rarity: 'COMMON',   category: 'SOCIAL',     conditionType: 'COUNT', conditionValue: 10,  rewardPoints: 30  },
  { code: 'MOMENT_50',     name: '社交达人',       description: '累计50条动态',                icon: '🌟', rarity: 'RARE',     category: 'SOCIAL',     conditionType: 'COUNT', conditionValue: 50,  rewardPoints: 100 },
  { code: 'MOMENT_100',    name: '人气之星',       description: '累计100条动态',               icon: '⭐', rarity: 'EPIC',     category: 'SOCIAL',     conditionType: 'COUNT', conditionValue: 100, rewardPoints: 300 },
  { code: 'MOMENT_STREAK_7',name: '每日分享',       description: '连续7天发布动态',            icon: '🔥', rarity: 'RARE',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 7,   rewardPoints: 80  },

  // ===== 勤学好问 =====
  { code: 'ASK_FIRST',    name: '求知若渴',       description: '首次提问',                     icon: '❓', rarity: 'COMMON',   category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 1,   rewardPoints: 15  },
  { code: 'ASK_10',       name: '好奇宝宝',       description: '累计提问10次',                 icon: '❓', rarity: 'COMMON',   category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 10,  rewardPoints: 30  },
  { code: 'ASK_50',       name: '探索先锋',       description: '累计提问50次',                 icon: '💡', rarity: 'RARE',     category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 50,  rewardPoints: 100 },
  { code: 'ASK_200',      name: '学问家',         description: '累计提问200次',                icon: '🧠', rarity: 'EPIC',     category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 200, rewardPoints: 300 },
  { code: 'ASK_STREAK_7', name: '每日一问',       description: '连续7天提问',                  icon: '🔥', rarity: 'RARE',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 7,   rewardPoints: 80  },
  { code: 'ASK_STREAK_30',name: '学无止境',       description: '连续30天提问',                 icon: '🔥', rarity: 'EPIC',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 30,  rewardPoints: 300 },

  // ===== 打字训练 =====
  { code: 'TYPING_FIRST',   name: '星际启航',       description: '首次完成打字训练',            icon: '🚀', rarity: 'COMMON',   category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 1,   rewardPoints: 20  },
  { code: 'TYPING_30',      name: '常驻太空',       description: '累计30次打字训练',           icon: '🛸', rarity: 'RARE',     category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 30,  rewardPoints: 100 },
  { code: 'TYPING_100',     name: '太空老兵',       description: '累计100次打字训练',          icon: '👨‍🚀', rarity: 'EPIC',     category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 100, rewardPoints: 300 },
  { code: 'TYPING_STREAK_7',name: '周周训练',       description: '连续7天打字训练',            icon: '🔥', rarity: 'RARE',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 7,   rewardPoints: 100 },
  { code: 'TYPING_STREAK_30',name: '月度宇航员',   description: '连续30天打字训练',           icon: '🔥', rarity: 'EPIC',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 30,  rewardPoints: 300 },
  { code: 'TYPING_SCORE_3000',name: '战力爆表',     description: '单局得分达到3000',           icon: '💥', rarity: 'RARE',     category: 'LEARNING',   conditionType: 'THRESHOLD', conditionValue: 3000, rewardPoints: 80  },
  { code: 'TYPING_SCORE_5000',name: '无敌舰队',     description: '单局得分达到5000',           icon: '💫', rarity: 'EPIC',     category: 'LEARNING',   conditionType: 'THRESHOLD', conditionValue: 5000, rewardPoints: 200 },
  { code: 'TYPING_WPM_50',    name: '音速飞行',     description: '单局速度达到50WPM',          icon: '⚡', rarity: 'RARE',     category: 'LEARNING',   conditionType: 'THRESHOLD', conditionValue: 50,  rewardPoints: 100 },
  { code: 'TYPING_WPM_75',    name: '超光速跃迁',   description: '单局速度达到75WPM',          icon: '⚡', rarity: 'EPIC',     category: 'LEARNING',   conditionType: 'THRESHOLD', conditionValue: 75,  rewardPoints: 250 },
  { code: 'TYPING_ACCURACY_99',name: '完美打击',     description: '单局准确率达到99%',          icon: '🎯', rarity: 'RARE',     category: 'LEARNING',   conditionType: 'THRESHOLD', conditionValue: 99,  rewardPoints: 100 },
  { code: 'TYPING_COMBO_50',  name: '无限连击',     description: '单局最大连击达到50',          icon: '🔥', rarity: 'EPIC',     category: 'LEARNING',   conditionType: 'THRESHOLD', conditionValue: 50,  rewardPoints: 200 },

  // ===== 拼音练习 =====
  { code: 'PINYIN_FIRST',    name: '初学拼音',       description: '首次完成拼音练习',            icon: '🔤', rarity: 'COMMON',   category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 1,   rewardPoints: 20  },
  { code: 'PINYIN_20',       name: '拼音能手',       description: '累计20次拼音练习',           icon: '🔤', rarity: 'COMMON',   category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 20,  rewardPoints: 50  },
  { code: 'PINYIN_50',       name: '拼音勇士',       description: '累计50次拼音练习',           icon: '🏅', rarity: 'RARE',     category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 50,  rewardPoints: 150 },
  { code: 'PINYIN_100',      name: '拼音大师',       description: '累计100次拼音练习',          icon: '👑', rarity: 'EPIC',     category: 'LEARNING',   conditionType: 'COUNT', conditionValue: 100, rewardPoints: 400 },
  { code: 'PINYIN_STREAK_7', name: '周周拼读',       description: '连续7天拼音练习',            icon: '🔥', rarity: 'RARE',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 7,   rewardPoints: 100 },
  { code: 'PINYIN_STREAK_30',name: '拼音达人',       description: '连续30天拼音练习',           icon: '🔥', rarity: 'EPIC',     category: 'PERSISTENCE', conditionType: 'STREAK', conditionValue: 30,  rewardPoints: 300 },

  // ===== 全能类 =====
  { code: 'ALL_8_FIRST',     name: '初窥门径',       description: '全部8个任务各完成至少1次',   icon: '🌟', rarity: 'RARE',     category: 'SPECIAL',    conditionType: 'COUNT', conditionValue: 8,   rewardPoints: 150 },
  { code: 'ALL_8_WEEK',      name: '全能周冠',       description: '一周内完成全部8个任务',      icon: '🏆', rarity: 'EPIC',     category: 'SPECIAL',    conditionType: 'STREAK', conditionValue: 1,   rewardPoints: 300 },
  { code: 'ALL_8_STREAK_7',  name: '全能战神',       description: '连续7天完成全部8个任务',     icon: '👑', rarity: 'LEGENDARY', category: 'SPECIAL',   conditionType: 'STREAK', conditionValue: 7,   rewardPoints: 1000 },
  { code: 'ALL_8_STREAK_30', name: '全能传奇',       description: '连续30天完成全部8个任务',    icon: '💎', rarity: 'LEGENDARY', category: 'SPECIAL',   conditionType: 'STREAK', conditionValue: 30,  rewardPoints: 3000 },
];

async function main() {
  console.log('开始同步成就定义...');

  let sortOrder = 0;
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: a.code },
      create: {
        code: a.code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        rarity: a.rarity,
        category: a.category,
        conditionType: a.conditionType,
        conditionValue: a.conditionValue,
        rewardPoints: a.rewardPoints,
        rewardCoins: 0,
        sortOrder,
      },
      update: {
        name: a.name,
        description: a.description,
        icon: a.icon,
        rarity: a.rarity,
        category: a.category,
        conditionType: a.conditionType,
        conditionValue: a.conditionValue,
        rewardPoints: a.rewardPoints,
        sortOrder,
      },
    });
    sortOrder++;
  }

  const count = await prisma.achievement.count();
  console.log(`✅ 成就同步完成，共 ${count} 个成就定义`);
}

// 允许被 require 调用
async function initAchievements() {
  const count = await prisma.achievement.count();
  if (count > 0) {
    console.log(`[Achievement] 已有 ${count} 个成就定义，跳过初始化`);
    return;
  }
  await main();
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { initAchievements };
