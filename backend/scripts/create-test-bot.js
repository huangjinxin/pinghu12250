/**
 * 创建自动回复测试bot
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('123456', 10);

  const bot = await prisma.user.upsert({
    where: { username: 'echo-bot' },
    update: {
      autoAcceptFriend: true,
      avatar: '🤖',
      status: 'ACTIVE'
    },
    create: {
      username: 'echo-bot',
      email: 'echo-bot@test.com',
      password,
      role: 'STUDENT',
      status: 'ACTIVE',
      autoAcceptFriend: true,
      avatar: '🤖',
      profile: {
        create: {
          nickname: '勤学好问',
          bio: 'AI学习助手，有问必答'
        }
      }
    }
  });

  // 确保昵称更新
  await prisma.profile.updateMany({
    where: { userId: bot.id },
    data: { nickname: '勤学好问', bio: 'AI学习助手，有问必答' }
  });

  console.log('✅ 测试bot创建成功:');
  console.log('   用户名: echo-bot');
  console.log('   昵称: 勤学好问');
  console.log('   密码: 123456');
  console.log('   自动通过好友: 是');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
