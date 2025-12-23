const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user1Id = '274836fd-7d4c-4f69-98d3-3f667f5682c3'; // chattest1
  const user2Id = '161125d5-1b40-424a-aa0f-3ced880e989a'; // chattest2

  // 创建测试消息
  const messages = await Promise.all([
    prisma.message.create({
      data: {
        fromUserId: user1Id,
        toUserId: user2Id,
        content: '你好，chattest2！这是第一条测试消息。',
        messageType: 'CHAT',
        isRead: false,
      }
    }),
    prisma.message.create({
      data: {
        fromUserId: user2Id,
        toUserId: user1Id,
        content: '你好，chattest1！很高兴收到你的消息！',
        messageType: 'CHAT',
        isRead: true,
      }
    }),
    prisma.message.create({
      data: {
        fromUserId: user1Id,
        toUserId: user2Id,
        content: '聊天系统重构完成了，我们来测试一下新的UI组件！',
        messageType: 'CHAT',
        isRead: false,
      }
    }),
  ]);

  console.log('✅ 创建了', messages.length, '条测试消息');

  // 查询消息
  const allMessages = await prisma.message.findMany({
    where: {
      messageType: 'CHAT',
      OR: [
        { fromUserId: user1Id, toUserId: user2Id },
        { fromUserId: user2Id, toUserId: user1Id }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log('📝 聊天消息列表:');
  allMessages.forEach(msg => {
    console.log(`  - ${msg.fromUserId === user1Id ? 'chattest1' : 'chattest2'}: ${msg.content}`);
  });
}

main()
  .catch(e => {
    console.error('❌ 错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
