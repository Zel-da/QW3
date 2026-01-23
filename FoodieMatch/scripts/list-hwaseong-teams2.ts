import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    where: { site: '화성' },
    select: { name: true },
    orderBy: { name: 'asc' }
  });
  console.log('화성 팀 목록 (' + teams.length + '개):');
  teams.forEach(t => console.log('  ' + t.name));
}
main().finally(() => prisma.$disconnect());
