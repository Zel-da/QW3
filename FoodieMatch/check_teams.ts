import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const teams = await prisma.team.findMany();
  console.log(`현재 팀 수: ${teams.length}`);
  teams.slice(0, 10).forEach(t => console.log(`  ${t.id}: ${t.name} (${t.site})`));
  await prisma.$disconnect();
}

check();
