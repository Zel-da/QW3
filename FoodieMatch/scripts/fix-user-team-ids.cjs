const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('사용자 teamId 자동 설정');
  console.log('========================================\n');

  // 1. Team의 leaderId로 연결된 사용자의 teamId 설정
  const teamsWithLeaders = await prisma.team.findMany({
    where: { leaderId: { not: null } },
    include: { leader: true }
  });

  let fixedCount = 0;

  console.log('1. 팀장 사용자의 teamId 설정:\n');

  for (const team of teamsWithLeaders) {
    if (team.leader && team.leader.teamId !== team.id) {
      console.log(`  [${team.site}] ${team.name}: ${team.leader.name} → teamId=${team.id}`);

      await prisma.user.update({
        where: { id: team.leaderId },
        data: { teamId: team.id }
      });
      fixedCount++;
    }
  }

  console.log(`\n팀장 ${fixedCount}명 수정 완료\n`);

  // 2. 결과 확인
  const remainingWithoutTeam = await prisma.user.findMany({
    where: { teamId: null, role: 'TEAM_LEADER' },
    select: { name: true, username: true, site: true }
  });

  if (remainingWithoutTeam.length > 0) {
    console.log('========================================');
    console.log('아직 teamId가 없는 팀장:');
    console.log('========================================');
    remainingWithoutTeam.forEach(u => {
      console.log(`  ${u.name || u.username} (site: ${u.site})`);
    });
  } else {
    console.log('모든 팀장의 teamId가 설정되었습니다.');
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
