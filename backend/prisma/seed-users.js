/**
 * 用户数据种子脚本
 * 用于导入用户、好友关系和消息数据
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function seedUsers() {
  try {
    console.log('开始导入用户数据...\n');

    // 读取导出的数据
    const dataPath = path.join(__dirname, 'user-data.json');
    if (!fs.existsSync(dataPath)) {
      console.error('❌ 找不到用户数据文件: user-data.json');
      console.log('请先运行导出脚本生成数据文件');
      return;
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    // 1. 导入用户
    console.log('导入用户...');
    for (const user of data.users) {
      // 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id }
      });

      if (existingUser) {
        console.log(`  ⏭️  用户 ${user.username} 已存在，跳过`);
        continue;
      }

      // 创建用户（包含 profile）
      await prisma.user.create({
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          password: user.password,
          role: user.role,
          avatar: user.avatar,
          createdAt: new Date(user.createdAt),
          profile: user.profile ? {
            create: {
              nickname: user.profile.nickname,
              bio: user.profile.bio,
              grade: user.profile.grade,
              classNumber: user.profile.classNumber
            }
          } : undefined
        }
      });
      console.log(`  ✅ 创建用户: ${user.username}`);
    }
    console.log(`✅ 完成导入 ${data.users.length} 个用户\n`);

    // 2. 导入好友关系
    console.log('导入好友关系...');
    for (const friendship of data.friendships) {
      // 检查好友关系是否已存在
      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { userId1: friendship.userId1, userId2: friendship.userId2 },
            { userId1: friendship.userId2, userId2: friendship.userId1 }
          ]
        }
      });

      if (existing) {
        continue;
      }

      await prisma.friendship.create({
        data: {
          userId1: friendship.userId1,
          userId2: friendship.userId2,
          createdAt: new Date(friendship.createdAt)
        }
      });
    }
    console.log(`✅ 完成导入 ${data.friendships.length} 条好友关系\n`);

    // 3. 导入关注关系
    console.log('导入关注关系...');
    for (const follow of data.follows) {
      // 检查关注关系是否已存在
      const existing = await prisma.userFollow.findFirst({
        where: {
          followerId: follow.followerId,
          followingId: follow.followingId
        }
      });

      if (existing) {
        continue;
      }

      await prisma.userFollow.create({
        data: {
          followerId: follow.followerId,
          followingId: follow.followingId,
          createdAt: new Date(follow.createdAt)
        }
      });
    }
    console.log(`✅ 完成导入 ${data.follows.length} 条关注关系\n`);

    // 4. 导入聊天消息
    console.log('导入聊天消息...');
    let importedChatCount = 0;
    for (const msg of data.chatMessages) {
      await prisma.message.create({
        data: {
          fromUserId: msg.fromUserId,
          toUserId: msg.toUserId,
          content: msg.content,
          messageType: msg.messageType,
          isRead: msg.isRead,
          createdAt: new Date(msg.createdAt)
        }
      });
      importedChatCount++;
    }
    console.log(`✅ 完成导入 ${importedChatCount} 条聊天消息\n`);

    // 5. 导入系统消息
    console.log('导入系统消息...');
    let importedSystemCount = 0;
    for (const msg of data.systemMessages) {
      await prisma.message.create({
        data: {
          fromUserId: null, // 系统消息
          toUserId: msg.toUserId,
          content: msg.content,
          messageType: msg.messageType,
          metadata: msg.metadata,
          isRead: msg.isRead,
          createdAt: new Date(msg.createdAt)
        }
      });
      importedSystemCount++;
    }
    console.log(`✅ 完成导入 ${importedSystemCount} 条系统消息\n`);

    console.log('========================================');
    console.log('✅ 所有用户数据导入完成！');
    console.log('========================================');
    console.log(`  用户: ${data.users.length}`);
    console.log(`  好友关系: ${data.friendships.length}`);
    console.log(`  关注关系: ${data.follows.length}`);
    console.log(`  聊天消息: ${importedChatCount}`);
    console.log(`  系统消息: ${importedSystemCount}`);

  } catch (error) {
    console.error('❌ 导入失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedUsers();
