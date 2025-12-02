/**
 * 每日挑战系统种子数据
 * 初始化挑战模板和每日挑战积分规则
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化每日挑战数据...');

  // ========== 1. 创建每日挑战积分规则 ==========
  console.log('创建每日挑战积分规则...');

  const challengeRules = [
    {
      id: 'C001',
      category: 'daily_challenge',
      action: 'complete',
      name: '完成简单挑战',
      description: '完成easy难度挑战可获得10积分',
      conditionType: 'none',
      conditionValue: null,
      points: 10,
      dailyLimit: 0,
      isEnabled: true,
    },
    {
      id: 'C002',
      category: 'daily_challenge',
      action: 'complete',
      name: '完成中等挑战',
      description: '完成medium难度挑战可获得20积分',
      conditionType: 'none',
      conditionValue: null,
      points: 20,
      dailyLimit: 0,
      isEnabled: true,
    },
    {
      id: 'C003',
      category: 'daily_challenge',
      action: 'complete',
      name: '完成困难挑战',
      description: '完成hard难度挑战可获得50积分',
      conditionType: 'none',
      conditionValue: null,
      points: 50,
      dailyLimit: 0,
      isEnabled: true,
    },
    {
      id: 'C004',
      category: 'daily_challenge',
      action: 'streak',
      name: '连续完成3天',
      description: '连续3天全部完成挑战时额外获得50积分',
      conditionType: 'none',
      conditionValue: null,
      points: 50,
      dailyLimit: 0,
      isEnabled: true,
    },
    {
      id: 'C005',
      category: 'daily_challenge',
      action: 'streak',
      name: '连续完成7天',
      description: '连续7天全部完成挑战时额外获得100积分',
      conditionType: 'none',
      conditionValue: null,
      points: 100,
      dailyLimit: 0,
      isEnabled: true,
    },
  ];

  for (const rule of challengeRules) {
    await prisma.pointRule.upsert({
      where: { id: rule.id },
      update: rule,
      create: rule,
    });
  }

  console.log(`创建了 ${challengeRules.length} 个每日挑战积分规则`);

  // ========== 2. 创建挑战模板 ==========
  console.log('创建挑战模板...');

  const templates = [
    // ===== 简单挑战 (EASY) =====
    {
      title: '写一篇日记',
      description: '发布一篇100字以上的日记',
      type: 'DIARY',
      difficulty: 'EASY',
      conditionType: 'WORD_COUNT',
      conditionValue: 100,
      rewardPoints: 10,
      rewardCoins: 5,
      weight: 10,
    },
    {
      title: '学习20分钟',
      description: '使用学习追踪器学习满20分钟',
      type: 'STUDY',
      difficulty: 'EASY',
      conditionType: 'DURATION',
      conditionValue: 20,
      rewardPoints: 10,
      rewardCoins: 5,
      weight: 10,
    },
    {
      title: '给3位同学点赞',
      description: '为其他同学的内容点赞3次',
      type: 'SOCIAL',
      difficulty: 'EASY',
      conditionType: 'COUNT',
      conditionValue: 3,
      rewardPoints: 10,
      rewardCoins: 5,
      weight: 10,
    },
    {
      title: '发布1条评论',
      description: '对任意内容发表1条评论',
      type: 'SOCIAL',
      difficulty: 'EASY',
      conditionType: 'COUNT',
      conditionValue: 1,
      rewardPoints: 10,
      rewardCoins: 5,
      weight: 8,
    },
    {
      title: '完成1次阅读记录',
      description: '发布1条阅读笔记',
      type: 'READING',
      difficulty: 'EASY',
      conditionType: 'COUNT',
      conditionValue: 1,
      rewardPoints: 10,
      rewardCoins: 5,
      weight: 8,
    },
    {
      title: '发布1个作品',
      description: '发布1个HTML作品',
      type: 'WORK',
      difficulty: 'EASY',
      conditionType: 'COUNT',
      conditionValue: 1,
      rewardPoints: 10,
      rewardCoins: 5,
      weight: 6,
    },
    {
      title: '记录1次作业',
      description: '提交1份作业记录',
      type: 'DIARY',
      difficulty: 'EASY',
      conditionType: 'COUNT',
      conditionValue: 1,
      rewardPoints: 10,
      rewardCoins: 5,
      weight: 8,
    },
    {
      title: '使用学习追踪器',
      description: '启动一次学习计时',
      type: 'STUDY',
      difficulty: 'EASY',
      conditionType: 'ACTION',
      conditionValue: 1,
      rewardPoints: 10,
      rewardCoins: 5,
      weight: 10,
    },
    {
      title: '分享学习感受',
      description: '完成学习后记录学习感受',
      type: 'STUDY',
      difficulty: 'EASY',
      conditionType: 'COUNT',
      conditionValue: 1,
      rewardPoints: 10,
      rewardCoins: 5,
      weight: 9,
    },
    {
      title: '记录今日心情',
      description: '发布一篇日记并选择今日心情',
      type: 'DIARY',
      difficulty: 'EASY',
      conditionType: 'ACTION',
      conditionValue: 1,
      rewardPoints: 10,
      rewardCoins: 5,
      weight: 9,
    },

    // ===== 中等挑战 (MEDIUM) =====
    {
      title: '写一篇500字日记',
      description: '发布一篇500字以上的日记',
      type: 'DIARY',
      difficulty: 'MEDIUM',
      conditionType: 'WORD_COUNT',
      conditionValue: 500,
      rewardPoints: 20,
      rewardCoins: 15,
      weight: 10,
    },
    {
      title: '学习1小时',
      description: '使用学习追踪器学习满60分钟',
      type: 'STUDY',
      difficulty: 'MEDIUM',
      conditionType: 'DURATION',
      conditionValue: 60,
      rewardPoints: 20,
      rewardCoins: 15,
      weight: 10,
    },
    {
      title: '发布HTML作品',
      description: '创建并发布一个HTML作品',
      type: 'WORK',
      difficulty: 'MEDIUM',
      conditionType: 'COUNT',
      conditionValue: 1,
      rewardPoints: 20,
      rewardCoins: 15,
      weight: 8,
    },
    {
      title: '写一篇读书笔记',
      description: '发布一条100字以上的阅读记录',
      type: 'READING',
      difficulty: 'MEDIUM',
      conditionType: 'WORD_COUNT',
      conditionValue: 100,
      rewardPoints: 20,
      rewardCoins: 15,
      weight: 9,
    },
    {
      title: '给5位同学评论',
      description: '对其他同学的内容发表5条评论',
      type: 'SOCIAL',
      difficulty: 'MEDIUM',
      conditionType: 'COUNT',
      conditionValue: 5,
      rewardPoints: 20,
      rewardCoins: 15,
      weight: 8,
    },
    {
      title: '完成2次学习记录',
      description: '完成2次不同的学习计时',
      type: 'STUDY',
      difficulty: 'MEDIUM',
      conditionType: 'COUNT',
      conditionValue: 2,
      rewardPoints: 20,
      rewardCoins: 15,
      weight: 9,
    },
    {
      title: '点赞10次',
      description: '为其他同学的内容点赞10次',
      type: 'SOCIAL',
      difficulty: 'MEDIUM',
      conditionType: 'COUNT',
      conditionValue: 10,
      rewardPoints: 20,
      rewardCoins: 15,
      weight: 8,
    },
    {
      title: '学习两门课程',
      description: '对两个不同的学习项目进行学习',
      type: 'STUDY',
      difficulty: 'MEDIUM',
      conditionType: 'COUNT',
      conditionValue: 2,
      rewardPoints: 20,
      rewardCoins: 15,
      weight: 7,
    },
    {
      title: '记录学习进度',
      description: '完成学习并详细记录学习进度',
      type: 'STUDY',
      difficulty: 'MEDIUM',
      conditionType: 'ACTION',
      conditionValue: 1,
      rewardPoints: 20,
      rewardCoins: 15,
      weight: 8,
    },
    {
      title: '阅读20页',
      description: '记录一次阅读20页以上的阅读笔记',
      type: 'READING',
      difficulty: 'MEDIUM',
      conditionType: 'COUNT',
      conditionValue: 20,
      rewardPoints: 20,
      rewardCoins: 15,
      weight: 8,
    },

    // ===== 困难挑战 (HARD) =====
    {
      title: '写一篇1000字日记',
      description: '发布一篇1000字以上的高质量日记',
      type: 'DIARY',
      difficulty: 'HARD',
      conditionType: 'WORD_COUNT',
      conditionValue: 1000,
      rewardPoints: 50,
      rewardCoins: 30,
      weight: 10,
    },
    {
      title: '学习2小时',
      description: '使用学习追踪器学习满120分钟',
      type: 'STUDY',
      difficulty: 'HARD',
      conditionType: 'DURATION',
      conditionValue: 120,
      rewardPoints: 50,
      rewardCoins: 30,
      weight: 10,
    },
    {
      title: '发布作品并获得10赞',
      description: '发布一个HTML作品并获得至少10个点赞',
      type: 'WORK',
      difficulty: 'HARD',
      conditionType: 'COUNT',
      conditionValue: 10,
      rewardPoints: 50,
      rewardCoins: 30,
      weight: 6,
    },
    {
      title: '完成3次学习记录',
      description: '完成3次不同的学习计时',
      type: 'STUDY',
      difficulty: 'HARD',
      conditionType: 'COUNT',
      conditionValue: 3,
      rewardPoints: 50,
      rewardCoins: 30,
      weight: 9,
    },
    {
      title: '帮助5位同学',
      description: '给5位不同的同学评论和点赞',
      type: 'SOCIAL',
      difficulty: 'HARD',
      conditionType: 'COUNT',
      conditionValue: 5,
      rewardPoints: 50,
      rewardCoins: 30,
      weight: 8,
    },
    {
      title: '写详细读书笔记',
      description: '发布一条300字以上的深度阅读笔记',
      type: 'READING',
      difficulty: 'HARD',
      conditionType: 'WORD_COUNT',
      conditionValue: 300,
      rewardPoints: 50,
      rewardCoins: 30,
      weight: 8,
    },
    {
      title: '创作优质作品',
      description: '发布一个包含CSS和JS的复杂作品',
      type: 'WORK',
      difficulty: 'HARD',
      conditionType: 'ACTION',
      conditionValue: 1,
      rewardPoints: 50,
      rewardCoins: 30,
      weight: 7,
    },
    {
      title: '深度学习日',
      description: '学习3个不同的项目，每个至少30分钟',
      type: 'STUDY',
      difficulty: 'HARD',
      conditionType: 'COUNT',
      conditionValue: 3,
      rewardPoints: 50,
      rewardCoins: 30,
      weight: 7,
    },
  ];

  let createdCount = 0;
  for (const template of templates) {
    try {
      await prisma.challengeTemplate.create({
        data: template,
      });
      createdCount++;
    } catch (error) {
      console.error(`创建模板失败: ${template.title}`, error.message);
    }
  }

  console.log(`成功创建了 ${createdCount}/${templates.length} 个挑战模板`);
  console.log('每日挑战数据初始化完成！');
}

main()
  .catch((e) => {
    console.error('初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
