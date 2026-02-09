import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 화성 팀 순서 (teamDepartments.ts와 일치)
const HWASEONG_TEAM_ORDER = [
  // BR생산팀
  '선삭', '연삭', 'MB', 'BKT', '열처리 1조', '열처리 2조', '열처리 3조', 'BR출하', 'BR생산관리', 'BR총괄',
  // BR생산
  'BR자재부품팀', 'BR품질서비스', '로드생산팀',
  // CR생산팀
  'CR조립', 'CR출하', 'CR생산관리',
  // CR생산
  'CR자재',
  // 화성연구소
  'BR개발팀', 'SA개발팀',
  // 품질
  '품질관리팀',
  // 경영
  '총무지원팀',
  // 기타
  '안전환경보건팀'
];

async function main() {
  console.log('=== 화성 팀 순서 재정렬 ===\n');

  // 현재 팀 조회
  const teams = await prisma.team.findMany({
    where: { site: '화성' }
  });

  console.log(`총 ${teams.length}개 팀 발견\n`);

  // 순서에 따라 displayOrder 업데이트
  for (let i = 0; i < HWASEONG_TEAM_ORDER.length; i++) {
    const teamName = HWASEONG_TEAM_ORDER[i];
    const displayOrder = i + 1;

    const team = teams.find(t => t.name === teamName);
    if (team) {
      await prisma.team.update({
        where: { id: team.id },
        data: { displayOrder }
      });
      console.log(`${displayOrder}. ${teamName}`);
    } else {
      console.log(`${displayOrder}. ${teamName} (없음)`);
    }
  }

  // 목록에 없는 팀 처리 (맨 뒤에 배치)
  const listedNames = new Set(HWASEONG_TEAM_ORDER);
  const unlistedTeams = teams.filter(t => !listedNames.has(t.name));
  let nextOrder = HWASEONG_TEAM_ORDER.length + 1;

  for (const team of unlistedTeams) {
    await prisma.team.update({
      where: { id: team.id },
      data: { displayOrder: nextOrder }
    });
    console.log(`${nextOrder}. ${team.name} (미등록 - 추가)`);
    nextOrder++;
  }

  console.log('\n=== 완료 ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
