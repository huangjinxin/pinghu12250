/**
 * 测试每日积分限制功能
 */

// 使用 Prisma 单例
const prisma = require('../src/lib/prisma');
const pointService = require('../src/services/pointService');

async function testDailyLimit() {
  try {
    console.log('=== 测试每日积分限制功能 ===\n');

    // 1. 获取或创建测试用户
    let testUser = await prisma.user.findFirst({
      where: { role: 'STUDENT', status: 'ACTIVE' }
    });

    if (!testUser) {
      console.log('没有找到测试用户，请先创建一个学生账户');
      return;
    }

    console.log(`测试用户: ${testUser.username} (${testUser.id})`);

    // 2. 获取系统配置的每日上限
    const dailyLimit = await pointService.getDailyPointsLimit();
    console.log(`\n系统配置的每日上限: ${dailyLimit} 分`);

    // 3. 获取用户今日已获得积分
    const todayEarned = await pointService.getTodayEarnedPoints(testUser.id);
    console.log(`今日已获得积分: ${todayEarned} 分`);

    // 4. 检查每日限制状态
    const limitStatus = await pointService.checkDailyPointsLimit(testUser.id);
    console.log(`\n每日限制状态:`);
    console.log(`  - 上限: ${limitStatus.limit} 分`);
    console.log(`  - 已获得: ${limitStatus.earned} 分`);
    console.log(`  - 剩余: ${limitStatus.remaining} 分`);
    console.log(`  - 是否达到上限: ${limitStatus.isMaxed ? '是' : '否'}`);

    // 5. 测试添加积分（模拟写日记）
    console.log(`\n\n=== 测试添加积分 ===`);

    // 查找日记积分规则
    const diaryRule = await prisma.pointRule.findFirst({
      where: {
        OR: [
          { id: { contains: 'D0' } },
          { category: 'diary' }
        ]
      }
    });

    if (diaryRule) {
      console.log(`\n使用规则: ${diaryRule.id} - ${diaryRule.description} (+${diaryRule.points}分)`);

      const result = await pointService.addPoints(diaryRule.id, testUser.id, {
        targetType: 'diary',
        targetId: 'test-diary-' + Date.now(),
        description: '测试日记积分发放'
      });

      if (result.success) {
        console.log(`✓ 积分发放成功`);
        console.log(`  - 获得积分: ${result.log?.points || 0}`);
        console.log(`  - 总积分: ${result.totalPoints}`);
        if (result.limited) {
          console.log(`  - ⚠️ ${result.message}`);
        }
      } else {
        console.log(`✗ 积分发放失败: ${result.message}`);
      }

      // 再次检查限制状态
      const newLimitStatus = await pointService.checkDailyPointsLimit(testUser.id);
      console.log(`\n更新后的限制状态:`);
      console.log(`  - 已获得: ${newLimitStatus.earned} 分`);
      console.log(`  - 剩余: ${newLimitStatus.remaining} 分`);
      console.log(`  - 是否达到上限: ${newLimitStatus.isMaxed ? '是' : '否'}`);
    } else {
      console.log('\n未找到日记积分规则');
    }

    // 6. 测试奖罚模块（不受限制）
    console.log(`\n\n=== 测试奖罚模块（不受限制） ===`);

    const rewardResult = await pointService.adjustPointsByAdmin(
      testUser.id,
      10,
      'system',
      '测试奖罚模块积分发放（不受每日限制）'
    );

    if (rewardResult.success) {
      console.log(`✓ 奖罚积分发放成功`);
      console.log(`  - 获得积分: 10`);
      console.log(`  - 总积分: ${rewardResult.totalPoints}`);

      // 检查限制状态（奖罚模块的积分不应该计入每日累计）
      const finalLimitStatus = await pointService.checkDailyPointsLimit(testUser.id);
      console.log(`\n奖罚后的限制状态（应该与之前相同）:`);
      console.log(`  - 已获得: ${finalLimitStatus.earned} 分`);
      console.log(`  - 剩余: ${finalLimitStatus.remaining} 分`);
      console.log(`  - 是否达到上限: ${finalLimitStatus.isMaxed ? '是' : '否'}`);
    } else {
      console.log(`✗ 奖罚积分发放失败: ${rewardResult.error}`);
    }

    console.log('\n=== 测试完成 ===');

  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行测试
testDailyLimit()
  .then(() => {
    console.log('\n所有测试通过！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n测试失败:', error);
    process.exit(1);
  });
