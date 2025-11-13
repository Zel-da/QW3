import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    orderBy: [{ site: 'asc' }, { name: 'asc' }]
  });

  console.log('\n아산 팀들:');
  teams.filter(t => t.site === '아산').forEach(t => {
    console.log(`  ${t.id}. ${t.name}`);
  });

  console.log('\n화성 팀들:');
  teams.filter(t => t.site === '화성').forEach(t => {
    console.log(`  ${t.id}. ${t.name}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => await prisma.$disconnect());
