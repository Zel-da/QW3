import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    where: { site: '화성' },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }]
  });
  console.log('화성 전체 팀 순서:');
  teams.forEach((t, i) => console.log(`${i+1}. ${t.name} (displayOrder=${t.displayOrder})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
