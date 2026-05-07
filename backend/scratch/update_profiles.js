const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const creditService = require('../src/services/creditService.js');

async function main() {
  const users = await prisma.user.findMany({ select: { id: true } });
  for (const u of users) {
    await creditService.updateUserCreditProfile(u.id);
  }
  console.log("Updated profiles for " + users.length + " users.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
