const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("开始处理历史审核记录的回填...");

  // 1. 获取所有 RuleTemplate
  const templates = await prisma.ruleTemplate.findMany();
  
  // 维度映射函数
  const guessDimension = (name, typeName) => {
    const text = (name + " " + (typeName || '')).toLowerCase();
    if (text.match(/画|美|歌|舞|琴/)) return 'AESTHETICS';
    if (text.match(/跑|跳|操|球|卫生|尿床/)) return 'PHYSIQUE';
    if (text.match(/劳动|家务|扫|清洁/)) return 'LABOR';
    if (text.match(/批评|帮助|礼貌|迟到|早退|品德/)) return 'MORALITY';
    if (text.match(/发言|合作|社交|群/)) return 'SOCIETY';
    return 'INTELLIGENCE'; // 默认智力
  };

  // 2. 为每个模板分配 action 并创建/更新对应的 CreditRule
  for (const t of templates) {
    const action = t.id; // 使用 template ID 作为 action 保证唯一
    const dimension = guessDimension(t.name, '');

    // 更新 RuleTemplate 的 action
    await prisma.ruleTemplate.update({
      where: { id: t.id },
      data: { action }
    });

    // 建立/更新 CreditRule (如果不存在)
    const existingRule = await prisma.creditRule.findFirst({
      where: { behaviorType: 'APPROVED_SUBMISSION', action }
    });

    if (!existingRule) {
      await prisma.creditRule.create({
        data: {
          behaviorType: 'APPROVED_SUBMISSION',
          action,
          dimension,
          points: t.points,
          weight: 2.0, // 审核类默认2倍权重
          description: `审核同步: ${t.name}`,
          isEnabled: true,
          conditions: { dimensionDailyLimit: 200 } // 给一个较大的每日上限
        }
      });
      console.log(`创建信用规则 -> ${t.name} [${dimension}] points: ${t.points}`);
    } else {
      await prisma.creditRule.update({
        where: { id: existingRule.id },
        data: { dimension, points: t.points }
      });
    }
  }

  // 3. 删除以前回填的可能重复的记录
  await prisma.behaviorLog.deleteMany({
    where: { behaviorType: 'APPROVED_SUBMISSION', description: { startsWith: '[历史回填]' } }
  });
  // 级联删除了 CreditImpact

  // 4. 获取所有 APPROVED 的提交记录并回填
  const approvedSubmissions = await prisma.ruleSubmission.findMany({
    where: { status: 'APPROVED' },
    include: { template: true }
  });

  console.log(`找到 ${approvedSubmissions.length} 条已通过的记录准备回填...`);

  // 按日期和动作分组，用于计算衰减和每日上限
  // 我们在回填时，尽量模拟当时的打分情况。为了简单，我们将直接应用基础分*权重，
  // 每日上限和衰减为了避免过度复杂化，在回填时不做严格的每日次数统计衰减，
  // 或者也可以做，这需要按时间排序并模拟。
  // 为了性能和简单，直接插入：

  let count = 0;
  for (const sub of approvedSubmissions) {
    const action = sub.template.action || sub.template.id;
    const rule = await prisma.creditRule.findFirst({
      where: { behaviorType: 'APPROVED_SUBMISSION', action }
    });

    if (!rule) continue;

    const finalPoints = rule.points * rule.weight * sub.quantity;
    const timestamp = sub.reviewedAt || sub.createdAt;

    const behaviorLog = await prisma.behaviorLog.create({
      data: {
        userId: sub.userId,
        behaviorType: 'APPROVED_SUBMISSION',
        action: action,
        description: `[历史回填] 审核通过: ${sub.template.name}`,
        sourceId: sub.id,
        createdAt: timestamp
      }
    });

    await prisma.creditImpact.create({
      data: {
        userId: sub.userId,
        behaviorId: behaviorLog.id,
        dimension: rule.dimension,
        rawPoints: finalPoints,
        finalPoints: finalPoints,
        createdAt: timestamp
      }
    });

    count++;
  }

  console.log(`成功回填 ${count} 条记录到信用引擎。`);

  // 5. 调用信用服务重新计算每个人的总分
  const creditService = require('./src/services/creditService.js');
  const uniqueUsers = [...new Set(approvedSubmissions.map(s => s.userId))];
  
  for (const uid of uniqueUsers) {
    await creditService.updateUserCreditProfile(uid);
  }

  console.log(`成功更新了 ${uniqueUsers.length} 位用户的信用档案总分。`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
