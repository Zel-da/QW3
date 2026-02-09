import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 열처리 팀들 조회
  const teams = await prisma.team.findMany({
    where: {
      site: '화성',
      name: { startsWith: '열처리' }
    },
    orderBy: { name: 'asc' }
  });

  console.log('현재 열처리팀 순서:');
  teams.forEach(t => console.log(`  ${t.name}: displayOrder=${t.displayOrder}`));

  // 1조의 displayOrder 기준으로 2조, 3조 연속 배치
  const team1 = teams.find(t => t.name === '열처리 1조');
  if (team1) {
    const baseOrder = team1.displayOrder || 50;

    // 2조, 3조 순서 업데이트
    await prisma.team.updateMany({
      where: { name: '열처리 2조', site: '화성' },
      data: { displayOrder: baseOrder + 1 }
    });
    await prisma.team.updateMany({
      where: { name: '열처리 3조', site: '화성' },
      data: { displayOrder: baseOrder + 2 }
    });

    console.log('\n업데이트 완료:');
    console.log(`  열처리 1조: ${baseOrder}`);
    console.log(`  열처리 2조: ${baseOrder + 1}`);
    console.log(`  열처리 3조: ${baseOrder + 2}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
