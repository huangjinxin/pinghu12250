/**
 * 临时脚本：检查用户状态和角色分布
 * 用于排查排行榜人数不对的问题
 */
const prisma = require('../src/lib/prisma');

async function main() {
  // 获取所有用户
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      profile: { select: { nickname: true } }
    }
  });

  console.log('=== 用户总数:', allUsers.length, '===\n');

  // 按角色分组
  const byRole = {};
  allUsers.forEach(u => {
    if (!byRole[u.role]) byRole[u.role] = [];
    byRole[u.role].push(u);
  });

  console.log('=== 按角色分组 ===');
  Object.entries(byRole).forEach(([role, users]) => {
    console.log(`${role}: ${users.length}人`);
  });

  // 按状态分组
  const byStatus = {};
  allUsers.forEach(u => {
    if (!byStatus[u.status]) byStatus[u.status] = [];
    byStatus[u.status].push(u);
  });

  console.log('\n=== 按状态分组 ===');
  Object.entries(byStatus).forEach(([status, users]) => {
    console.log(`${status}: ${users.length}人`);
  });

  // 找出 STUDENT 但非 ACTIVE 的用户
  const studentNotActive = allUsers.filter(u => u.role === 'STUDENT' && u.status !== 'ACTIVE');
  if (studentNotActive.length > 0) {
    console.log('\n=== STUDENT 但非 ACTIVE 的用户 ===');
    studentNotActive.forEach(u => {
      console.log(`- ${u.username} (${u.profile?.nickname || '无昵称'}): status=${u.status}`);
    });
  }

  // 找出 ACTIVE 但非 STUDENT 的用户
  const activeNotStudent = allUsers.filter(u => u.status === 'ACTIVE' && u.role !== 'STUDENT');
  if (activeNotStudent.length > 0) {
    console.log('\n=== ACTIVE 但非 STUDENT 的用户 ===');
    activeNotStudent.forEach(u => {
      console.log(`- ${u.username} (${u.profile?.nickname || '无昵称'}): role=${u.role}`);
    });
  }

  // 排行榜应该显示的用户（STUDENT + ACTIVE）
  const leaderboardUsers = allUsers.filter(u => u.role === 'STUDENT' && u.status === 'ACTIVE');
  console.log('\n=== 排行榜应显示的用户 (STUDENT + ACTIVE) ===');
  console.log(`共 ${leaderboardUsers.length} 人:`);
  leaderboardUsers.forEach(u => {
    console.log(`- ${u.username} (${u.profile?.nickname || '无昵称'})`);
  });

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
