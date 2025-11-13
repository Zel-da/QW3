/**
 * 팀 데이터 업데이트 스크립트
 * 1. 아산 팀들의 "아산" 접두사 제거
 * 2. 화성 세부 팀들 생성
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('팀 데이터 업데이트 시작');
  console.log('='.repeat(60));
  console.log();

  // 1. 기존 아산 팀 이름에서 "아산" 접두사 제거
  console.log('1️⃣ 아산 팀 이름 업데이트 중...');

  const asanTeams = await prisma.team.findMany({
    where: { site: '아산' }
  });

  console.log(`   총 ${asanTeams.length}개의 아산 팀 발견`);

  for (const team of asanTeams) {
    const newName = team.name.replace(/^아산\s+/, '');
    if (newName !== team.name) {
      await prisma.team.update({
        where: { id: team.id },
        data: { name: newName }
      });
      console.log(`   ✅ "${team.name}" → "${newName}"`);
    } else {
      console.log(`   ⏭️  "${team.name}" (변경 없음)`);
    }
  }

  console.log();

  // 2. 화성 세부 팀 생성
  console.log('2️⃣ 화성 팀 생성 중...');

  const hwaseongTeams = [
    'BR생산 선삭',
    'BR생산 연삭',
    'BR생산 MB조립',
    'BR생산 BKT조립',
    'BR생산 열처리(주간)',
    'BR생산 열처리(야간1조)',
    'BR생산 열처리(야간2조)',
    'BR생산 열처리(야간3조)',
    'BR출하',
    '자재부품',
    'BR로드생산',
    '품질서비스',
    'BR테스트',
    'S/A개발',
    'CR생산 팀장',
    'CR생산 CR총괄',
    'CR출하',
    '자재관리',
    'CR품질관리',
    '인사총무'
  ];

  const teamsToCreate = hwaseongTeams.map(name => ({
    name,
    site: '화성'
  }));

  const result = await prisma.team.createMany({
    data: teamsToCreate,
    skipDuplicates: true
  });

  console.log(`   ✅ ${result.count}개의 화성 팀 생성 완료`);
  console.log();

  // 3. 최종 팀 목록 출력
  console.log('='.repeat(60));
  console.log('📊 최종 팀 목록');
  console.log('='.repeat(60));

  const allTeams = await prisma.team.findMany({
    orderBy: [{ site: 'asc' }, { name: 'asc' }]
  });

  const teamsBySite = allTeams.reduce((acc, team) => {
    const site = team.site || '미지정';
    if (!acc[site]) acc[site] = [];
    acc[site].push(team.name);
    return acc;
  }, {} as Record<string, string[]>);

  for (const [site, teams] of Object.entries(teamsBySite)) {
    console.log();
    console.log(`📍 ${site} (${teams.length}개 팀)`);
    teams.forEach((name, i) => {
      console.log(`   ${i + 1}. ${name}`);
    });
  }

  console.log();
  console.log('='.repeat(60));
  console.log('✅ 모든 작업 완료!');
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
