import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const teams = await prisma.team.findMany({
    include: {
      checklistTemplates: {
        include: {
          templateItems: true
        }
      },
      factory: true,
      leader: true,
      approver: true
    },
    orderBy: { id: 'asc' }
  });

  console.log(`총 팀: ${teams.length}개\n`);

  teams.forEach(team => {
    const templatesCount = team.checklistTemplates.length;
    const itemsCount = team.checklistTemplates.reduce((sum, t) => sum + t.templateItems.length, 0);
    console.log(`[${team.id}] ${team.name} (${team.site})`);
    console.log(`  - Factory: ${team.factory?.name || 'null'}`);
    console.log(`  - Leader: ${team.leader?.name || 'null'}`);
    console.log(`  - Templates: ${templatesCount}, Items: ${itemsCount}`);
  });

  await prisma.$disconnect();
}

check();
