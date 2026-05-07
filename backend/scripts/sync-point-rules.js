/**
 * 同步积分规则脚本
 * 将数据库中的日记积分规则更新为与 diaryLevels.js 一致
 */

const prisma = require('../src/lib/prisma');

async function syncPointRules() {
  console.log('开始同步积分规则...');

  // 日记字数级别规则 (D001-D016)
  const diaryLevelRules = [
    { id: 'D001', category: 'diary', action: 'create', name: '发布日记-萌芽级', description: '发布字数<800的日记扣2积分', conditionType: 'word_count', conditionValue: 0, points: -2, dailyLimit: 0, isEnabled: true },
    { id: 'D002', category: 'diary', action: 'create', name: '发布日记-入门级', description: '发布字数≥800的日记可获得5积分', conditionType: 'word_count', conditionValue: 800, points: 5, dailyLimit: 0, isEnabled: true },
    { id: 'D003', category: 'diary', action: 'create', name: '发布日记-良好级', description: '发布字数≥1000的日记可获得10积分', conditionType: 'word_count', conditionValue: 1000, points: 10, dailyLimit: 0, isEnabled: true },
    { id: 'D004', category: 'diary', action: 'create', name: '发布日记-优秀级', description: '发布字数≥1200的日记可获得15积分', conditionType: 'word_count', conditionValue: 1200, points: 15, dailyLimit: 0, isEnabled: true },
    { id: 'D005', category: 'diary', action: 'create', name: '发布日记-卓越级', description: '发布字数≥1500的日记可获得20积分', conditionType: 'word_count', conditionValue: 1500, points: 20, dailyLimit: 0, isEnabled: true },
    { id: 'D006', category: 'diary', action: 'create', name: '发布日记-大师级', description: '发布字数≥2000的日记可获得30积分', conditionType: 'word_count', conditionValue: 2000, points: 30, dailyLimit: 0, isEnabled: true },
    { id: 'D007', category: 'diary', action: 'create', name: '发布日记-精英级', description: '发布字数≥3000的日记可获得40积分', conditionType: 'word_count', conditionValue: 3000, points: 40, dailyLimit: 0, isEnabled: true },
    { id: 'D008', category: 'diary', action: 'create', name: '发布日记-专家级', description: '发布字数≥4000的日记可获得50积分', conditionType: 'word_count', conditionValue: 4000, points: 50, dailyLimit: 0, isEnabled: true },
    { id: 'D009', category: 'diary', action: 'create', name: '发布日记-宗师级', description: '发布字数≥5000的日记可获得60积分', conditionType: 'word_count', conditionValue: 5000, points: 60, dailyLimit: 0, isEnabled: true },
    { id: 'D010', category: 'diary', action: 'create', name: '发布日记-传奇级', description: '发布字数≥6000的日记可获得70积分', conditionType: 'word_count', conditionValue: 6000, points: 70, dailyLimit: 0, isEnabled: true },
    { id: 'D011', category: 'diary', action: 'create', name: '发布日记-史诗级', description: '发布字数≥8000的日记可获得85积分', conditionType: 'word_count', conditionValue: 8000, points: 85, dailyLimit: 0, isEnabled: true },
    { id: 'D012', category: 'diary', action: 'create', name: '发布日记-神话级', description: '发布字数≥10000的日记可获得100积分', conditionType: 'word_count', conditionValue: 10000, points: 100, dailyLimit: 0, isEnabled: true },
    { id: 'D013', category: 'diary', action: 'create', name: '发布日记-不朽级', description: '发布字数≥12000的日记可获得120积分', conditionType: 'word_count', conditionValue: 12000, points: 120, dailyLimit: 0, isEnabled: true },
    { id: 'D014', category: 'diary', action: 'create', name: '发布日记-创世级', description: '发布字数≥15000的日记可获得150积分', conditionType: 'word_count', conditionValue: 15000, points: 150, dailyLimit: 0, isEnabled: true },
    { id: 'D015', category: 'diary', action: 'create', name: '发布日记-永恒级', description: '发布字数≥18000的日记可获得180积分', conditionType: 'word_count', conditionValue: 18000, points: 180, dailyLimit: 0, isEnabled: true },
    { id: 'D016', category: 'diary', action: 'create', name: '发布日记-至尊级', description: '发布字数≥20000的日记可获得200积分', conditionType: 'word_count', conditionValue: 20000, points: 200, dailyLimit: 0, isEnabled: true },
  ];

  // 日记互动规则
  const diaryInteractionRules = [
    { id: 'DL001', category: 'diary', action: 'like', name: '日记被点赞', description: '日记被其他用户点赞获得1积分', conditionType: 'none', points: 1, dailyLimit: 0, isEnabled: true },
    { id: 'DD001', category: 'diary', action: 'dislike', name: '日记被点踩', description: '日记被其他用户点踩扣1积分', conditionType: 'none', points: -1, dailyLimit: 0, isEnabled: true },
    { id: 'DEL001', category: 'diary', action: 'delete', name: '删除日记', description: '删除日记时扣除该日记获得的所有积分', conditionType: 'none', points: 0, dailyLimit: 0, isEnabled: true },
  ];

  const allRules = [...diaryLevelRules, ...diaryInteractionRules];

  for (const rule of allRules) {
    await prisma.pointRule.upsert({
      where: { id: rule.id },
      create: rule,
      update: {
        name: rule.name,
        description: rule.description,
        points: rule.points,
        conditionValue: rule.conditionValue,
      },
    });
    console.log(`✓ 同步规则: ${rule.id} - ${rule.name}`);
  }

  console.log('\n积分规则同步完成！');
  await prisma.$disconnect();
}

syncPointRules().catch(console.error);
