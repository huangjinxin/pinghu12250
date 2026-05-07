const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const templates = await prisma.ruleTemplate.findMany({
    include: {
      type: true
    }
  });
  console.log("Templates:");
  templates.forEach(t => console.log(`ID: ${t.id}, Name: ${t.name}, Type: ${t.type?.name}, Action: ${t.action}`));

  const approvedSubmissions = await prisma.ruleSubmission.findMany({
    where: { status: 'APPROVED' },
    include: {
      template: true
    }
  });
  console.log("\nApproved Submissions Count:", approvedSubmissions.length);
  
  // Group by template name
  const counts = {};
  approvedSubmissions.forEach(sub => {
    const name = sub.template.name;
    counts[name] = (counts[name] || 0) + 1;
  });
  console.log("Counts by Template Name:", counts);
}

main().finally(() => prisma.$disconnect());
