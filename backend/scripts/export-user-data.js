const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function exportUserData() {
  try {
    console.log('开始导出用户数据...\n');

    // 导出用户基本信息
    const users = await prisma.user.findMany({
      include: {
        profile: true
      }
    });
    console.log(`✅ 导出 ${users.length} 个用户`);

    // 导出好友关系
    const friendships = await prisma.friendship.findMany();
    console.log(`✅ 导出 ${friendships.length} 条好友关系`);

    // 导出关注关系
    const follows = await prisma.userFollow.findMany();
    console.log(`✅ 导出 ${follows.length} 条关注关系`);

    // 导出消息（最近100条）
    const messages = await prisma.message.findMany({
      where: {
        messageType: 'CHAT'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });
    console.log(`✅ 导出 ${messages.length} 条聊天消息`);

    // 导出系统消息（最近50条）
    const systemMessages = await prisma.message.findMany({
      where: {
        messageType: {
          in: ['SYSTEM_ACHIEVEMENT', 'SYSTEM_PURCHASE', 'SYSTEM_FOLLOW', 'SYSTEM_FRIEND', 'SYSTEM_TASK']
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });
    console.log(`✅ 导出 ${systemMessages.length} 条系统消息`);

    // 组装数据
    const exportData = {
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        password: u.password, // 已加密的密码
        role: u.role,
        avatar: u.avatar,
        createdAt: u.createdAt,
        profile: u.profile
      })),
      friendships: friendships.map(f => ({
        userId1: f.userId1,
        userId2: f.userId2,
        createdAt: f.createdAt
      })),
      follows: follows.map(f => ({
        followerId: f.followerId,
        followingId: f.followingId,
        createdAt: f.createdAt
      })),
      chatMessages: messages.map(m => ({
        fromUserId: m.fromUserId,
        toUserId: m.toUserId,
        content: m.content,
        messageType: m.messageType,
        isRead: m.isRead,
        createdAt: m.createdAt
      })),
      systemMessages: systemMessages.map(m => ({
        toUserId: m.toUserId,
        content: m.content,
        messageType: m.messageType,
        metadata: m.metadata,
        isRead: m.isRead,
        createdAt: m.createdAt
      }))
    };

    // 写入文件
    const outputPath = path.join(__dirname, 'user-data-export.json');
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

    console.log(`\n✅ 数据已导出到: ${outputPath}`);
    console.log('\n导出统计:');
    console.log(`  用户: ${exportData.users.length}`);
    console.log(`  好友关系: ${exportData.friendships.length}`);
    console.log(`  关注关系: ${exportData.follows.length}`);
    console.log(`  聊天消息: ${exportData.chatMessages.length}`);
    console.log(`  系统消息: ${exportData.systemMessages.length}`);

  } catch (error) {
    console.error('❌ 导出失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportUserData();
