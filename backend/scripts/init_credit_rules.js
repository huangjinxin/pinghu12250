const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化默认信用评分规则...');

  const rules = [
    // 学习类 (LEARNING) -> weight: 1.0
    {
      behaviorType: 'LEARNING',
      action: 'diary_submission',
      dimension: 'INTELLIGENCE',
      points: 5.0,
      weight: 1.0,
      description: '日记发布奖励',
      isEnabled: true,
      conditions: { dimensionDailyLimit: 50 }
    },
    {
      behaviorType: 'LEARNING',
      action: 'reading',
      dimension: 'INTELLIGENCE',
      points: 2.0,
      weight: 1.0,
      description: '阅读奖励',
      isEnabled: true,
      conditions: { dimensionDailyLimit: 50 }
    },
    {
      behaviorType: 'LEARNING',
      action: 'homework',
      dimension: 'INTELLIGENCE',
      points: 3.0,
      weight: 1.0,
      description: '完成作业奖励',
      isEnabled: true,
      conditions: { dimensionDailyLimit: 50 }
    },
    // 社交类 (SOCIAL) -> weight: 0.5
    {
      behaviorType: 'SOCIAL',
      action: 'received_like',
      dimension: 'SOCIETY',
      points: 1.0,
      weight: 0.5,
      description: '被点赞奖励',
      isEnabled: true,
      conditions: { dimensionDailyLimit: 20 }
    },
    {
      behaviorType: 'SOCIAL',
      action: 'received_dislike',
      dimension: 'SOCIETY',
      points: -1.0,
      weight: 0.5,
      description: '被点踩惩罚',
      isEnabled: true,
      conditions: { dimensionDailyLimit: 0 } // 无限制或设为大负数限制
    },
    {
      behaviorType: 'SOCIAL',
      action: 'mutual_review',
      dimension: 'MORALITY',
      points: 2.0,
      weight: 0.5,
      description: '互评奖励（德育）',
      isEnabled: true,
      conditions: { dimensionDailyLimit: 20 }
    },
    // 审核类 (APPROVED_SUBMISSION) -> weight: 2.0
    {
      behaviorType: 'APPROVED_SUBMISSION',
      action: 'audit_learning',
      dimension: 'INTELLIGENCE',
      points: 10.0,
      weight: 2.0,
      description: '审核通过-学习类任务',
      isEnabled: true,
      conditions: { dimensionDailyLimit: 100 }
    },
    {
      behaviorType: 'APPROVED_SUBMISSION',
      action: 'audit_labor',
      dimension: 'LABOR',
      points: 10.0,
      weight: 2.0,
      description: '审核通过-劳动类任务',
      isEnabled: true,
      conditions: { dimensionDailyLimit: 100 }
    },
    {
      behaviorType: 'APPROVED_SUBMISSION',
      action: 'audit_art',
      dimension: 'AESTHETICS',
      points: 10.0,
      weight: 2.0,
      description: '审核通过-艺术/美育任务',
      isEnabled: true,
      conditions: { dimensionDailyLimit: 100 }
    }
  ];

  for (const rule of rules) {
    const existing = await prisma.creditRule.findFirst({
      where: {
        behaviorType: rule.behaviorType,
        action: rule.action
      }
    });

    if (!existing) {
      await prisma.creditRule.create({ data: rule });
      console.log(`[新增] ${rule.behaviorType} - ${rule.action}`);
    } else {
      console.log(`[跳过] ${rule.behaviorType} - ${rule.action} 已存在`);
    }
  }

  console.log('初始化完毕！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
