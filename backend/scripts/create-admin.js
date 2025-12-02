/**
 * 创建管理员账号脚本
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('开始创建管理员账号...');

    // 管理员信息
    const adminData = {
      email: 'admin@example.com',
      username: 'admin',
      password: 'admin123', // 请在生产环境中使用强密码
      role: 'ADMIN',
    };

    // 检查管理员是否已存在
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminData.email },
          { username: adminData.username },
        ],
      },
    });

    if (existingAdmin) {
      console.log('管理员账号已存在');
      console.log('用户名:', existingAdmin.username);
      console.log('邮箱:', existingAdmin.email);
      console.log('角色:', existingAdmin.role);
      console.log('状态:', existingAdmin.status);

      // 如果状态不是 ACTIVE，更新为 ACTIVE
      if (existingAdmin.status !== 'ACTIVE') {
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { status: 'ACTIVE' },
        });
        console.log('已将账号状态更新为 ACTIVE');
      }

      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // 创建管理员账号
    const admin = await prisma.user.create({
      data: {
        email: adminData.email,
        username: adminData.username,
        password: hashedPassword,
        role: adminData.role,
        status: 'ACTIVE', // 直接设置为激活状态
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${adminData.username}`,
        profile: {
          create: {
            nickname: '系统管理员',
            bio: '系统管理员账号',
            joinedDays: 0,
          },
        },
      },
    });

    console.log('✅ 管理员账号创建成功！');
    console.log('==========================================');
    console.log('用户名:', adminData.username);
    console.log('邮箱:', adminData.email);
    console.log('密码:', adminData.password);
    console.log('角色:', adminData.role);
    console.log('==========================================');
    console.log('⚠️  请登录后立即修改密码！');
  } catch (error) {
    console.error('创建管理员账号失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 执行脚本
createAdmin()
  .then(() => {
    console.log('脚本执行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
