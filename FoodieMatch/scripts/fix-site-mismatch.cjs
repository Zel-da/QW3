const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n========================================');
  console.log('사이트 불일치 및 영문 사이트명 수정');
  console.log('========================================\n');

  // 1. 박래현: 아산 품질관리팀(46) 팀장이므로 user.site를 아산으로 변경
  const user1 = await prisma.user.findFirst({ where: { name: '박래현' } });
  if (user1) {
    await prisma.user.update({
      where: { id: user1.id },
      data: { site: '아산', teamId: 46 }
    });
    console.log('1. 박래현: site=아산, teamId=46 (아산 품질관리팀)');
  }

  // 2. 김동현: 화성 사용자이므로 화성 총무지원팀(38)으로 변경
  const user2 = await prisma.user.findFirst({ where: { name: '김동현', site: '화성' } });
  if (user2) {
    await prisma.user.update({
      where: { id: user2.id },
      data: { teamId: 38 }
    });
    console.log('2. 김동현: teamId=38 (화성 총무지원팀)');

    // 화성 총무지원팀(38)의 leaderId 설정
    await prisma.team.update({
      where: { id: 38 },
      data: { leaderId: user2.id }
    });
    console.log('   화성 총무지원팀 leaderId 설정');
  }

  // 3. 아산 총무지원팀(71)의 별도 팀장 필요 - 현재 김동현이 두 팀 팀장
  // 우선 아산 총무지원팀의 leaderId를 null로 설정하고 별도 확인 필요
  console.log('\n※ 아산 총무지원팀(71)의 팀장을 별도로 지정해야 합니다.');

  // 4. 영문 site를 한글로 변경
  const hwaseongUsers = await prisma.user.updateMany({
    where: { site: 'HWASEONG' },
    data: { site: '화성' }
  });
  console.log(`\n3. HWASEONG → 화성: ${hwaseongUsers.count}명 수정`);

  const asanUsers = await prisma.user.updateMany({
    where: { site: 'ASAN' },
    data: { site: '아산' }
  });
  console.log(`4. ASAN → 아산: ${asanUsers.count}명 수정`);

  // 5. 안전환경보건팀 site 설정 (표경윤: 화성, 김문현: 아산)
  const team82 = await prisma.team.findUnique({
    where: { id: 82 },
    include: { leader: true }
  });
  const team83 = await prisma.team.findUnique({
    where: { id: 83 },
    include: { leader: true }
  });

  if (team82 && team82.leader?.name === '김문현') {
    await prisma.team.update({
      where: { id: 82 },
      data: { site: '아산' }
    });
    console.log('5. 안전환경보건팀(82, 김문현): site=아산');
  }

  if (team83 && team83.leader?.name === '표경윤') {
    await prisma.team.update({
      where: { id: 83 },
      data: { site: '화성' }
    });
    console.log('6. 안전환경보건팀(83, 표경윤): site=화성');
  }

  console.log('\n========================================');
  console.log('수정 완료');
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
