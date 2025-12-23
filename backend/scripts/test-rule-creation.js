/**
 * 测试规则创建功能（包含新增的音频和数量字段）
 */

// 使用 Prisma 单例
const prisma = require('../src/lib/prisma');

async function testRuleCreation() {
  try {
    console.log('=== 测试规则模板创建（带音频和数量功能） ===\n');

    // 1. 获取或创建测试用的类型和标准
    let type = await prisma.ruleType.findFirst({
      where: { isEnabled: true }
    });

    if (!type) {
      type = await prisma.ruleType.create({
        data: {
          name: '测试类型',
          description: '用于测试'
        }
      });
      console.log('创建测试类型:', type.name);
    } else {
      console.log('使用已有类型:', type.name);
    }

    let standard = await prisma.ruleStandard.findFirst({
      where: { isEnabled: true }
    });

    if (!standard) {
      standard = await prisma.ruleStandard.create({
        data: {
          name: '测试标准',
          description: '用于测试'
        }
      });
      console.log('创建测试标准:', standard.name);
    } else {
      console.log('使用已有标准:', standard.name);
    }

    // 2. 获取管理员用户
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.error('未找到管理员用户');
      return;
    }

    console.log(`使用管理员: ${admin.username}\n`);

    // 3. 创建带音频和数量功能的规则模板
    console.log('创建规则模板（含音频和数量功能）...');

    const template = await prisma.ruleTemplate.create({
      data: {
        name: '测试规则-音频和数量',
        typeId: type.id,
        standardId: standard.id,
        requireText: true,
        requireImage: false,
        requireAudio: true,
        requireLink: false,
        textMaxLength: 500,
        audioUrl: 'https://example.com/test-audio.mp3',
        points: 10,
        allowQuantity: true,
        status: 'ENABLED',
        createdBy: admin.id
      },
      include: {
        type: true,
        standard: true
      }
    });

    console.log('✓ 规则模板创建成功:');
    console.log(`  - ID: ${template.id}`);
    console.log(`  - 名称: ${template.name}`);
    console.log(`  - 类型: ${template.type.name}`);
    console.log(`  - 标准: ${template.standard.name}`);
    console.log(`  - 积分: ${template.points}`);
    console.log(`  - 需要音频: ${template.requireAudio ? '是' : '否'}`);
    console.log(`  - 规则音频URL: ${template.audioUrl || '无'}`);
    console.log(`  - 允许数量: ${template.allowQuantity ? '是' : '否'}`);
    console.log(`  - 需要文本: ${template.requireText ? '是' : '否'}`);

    // 4. 更新规则模板
    console.log('\n更新规则模板...');

    const updated = await prisma.ruleTemplate.update({
      where: { id: template.id },
      data: {
        name: '测试规则-更新后',
        requireAudio: false,
        audioUrl: 'https://example.com/updated-audio.mp3',
        allowQuantity: false,
        points: 20
      },
      include: {
        type: true,
        standard: true
      }
    });

    console.log('✓ 规则模板更新成功:');
    console.log(`  - 名称: ${updated.name}`);
    console.log(`  - 积分: ${updated.points}`);
    console.log(`  - 需要音频: ${updated.requireAudio ? '是' : '否'}`);
    console.log(`  - 规则音频URL: ${updated.audioUrl || '无'}`);
    console.log(`  - 允许数量: ${updated.allowQuantity ? '是' : '否'}`);

    // 5. 清理测试数据
    console.log('\n清理测试数据...');
    await prisma.ruleTemplate.delete({
      where: { id: template.id }
    });
    console.log('✓ 测试数据已清理');

    console.log('\n=== 测试完成，所有功能正常 ===');

  } catch (error) {
    console.error('\n测试失败:', error);
    console.error('错误详情:', error.message);
    if (error.meta) {
      console.error('Meta信息:', error.meta);
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行测试
testRuleCreation()
  .then(() => {
    console.log('\n所有测试通过！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n测试失败:', error);
    process.exit(1);
  });
