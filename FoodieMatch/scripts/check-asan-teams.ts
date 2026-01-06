import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    where: { site: '아산' },
    select: { id: true, name: true, leaderId: true, approverId: true },
    orderBy: { name: 'asc' }
  });

  console.log('아산 팀 현황 (' + teams.length + '개):');
  console.log('');

  for (const t of teams) {
    const leader = t.leaderId ? await prisma.user.findUnique({ where: { id: t.leaderId }, select: { name: true } }) : null;
    const approver = t.approverId ? await prisma.user.findUnique({ where: { id: t.approverId }, select: { name: true } }) : null;
    const leaderName = leader?.name || '❌ 없음';
    const approverName = approver?.name || '❌ 없음';
    console.log('  ' + t.name + ': 팀장=' + leaderName + ', 결재자=' + approverName);
  }
}

main().finally(() => prisma.$disconnect());
