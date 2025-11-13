/**
 * 기존 화성 팀 삭제 스크립트
 * "화성" 접두사가 있는 구 팀들 제거
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('기존 화성 팀 삭제 시작');
  console.log('='.repeat(60));
  console.log();

  // "화성"으로 시작하는 팀들 찾기
  const oldHwaseongTeams = await prisma.team.findMany({
    where: {
      site: '화성',
      name: { startsWith: '화성' }
    }
  });

  console.log(`삭제할 팀: ${oldHwaseongTeams.length}개`);
  console.log();

  for (const team of oldHwaseongTeams) {
    console.log(`   ❌ "${team.name}" (ID: ${team.id})`);
  }

  console.log();
  console.log('삭제 진행 중...');
  console.log();

  // 팀 삭제
  const result = await prisma.team.deleteMany({
    where: {
      site: '화성',
      name: { startsWith: '화성' }
    }
  });

  console.log(`✅ ${result.count}개 팀 삭제 완료`);
  console.log();

  // 최종 화성 팀 목록 출력
  console.log('='.repeat(60));
  console.log('📊 남은 화성 팀 목록');
  console.log('='.repeat(60));
  console.log();

  const remainingTeams = await prisma.team.findMany({
    where: { site: '화성' },
    orderBy: { name: 'asc' }
  });

  console.log(`총 ${remainingTeams.length}개 팀:`);
  remainingTeams.forEach((team, i) => {
    console.log(`   ${i + 1}. ${team.name}`);
  });

  console.log();
  console.log('='.repeat(60));
  console.log('✅ 작업 완료!');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
