const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteAllGames() {
  try {
    const result = await prisma.game.deleteMany({});
    console.log(`✅ 已删除 ${result.count} 个游戏`);
  } catch (error) {
    console.error('❌ 删除失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllGames();
