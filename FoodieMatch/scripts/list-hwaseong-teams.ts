import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    where: { site: '화성' },
    select: { id: true, name: true, leader: { select: { name: true } } },
    orderBy: { name: 'asc' }
  });

  console.log(`\n화성 팀 목록 (${teams.length}개):\n`);
  teams.forEach((t, i) => {
    console.log(`${i + 1}. ${t.name} (ID: ${t.id}) - 팀장: ${t.leader?.name || '없음'}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
