/**
 * 누락된 5개 팀 생성
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const newTeams = [
  { name: 'BR생산관리', leaderId: null },
  { name: 'BR총괄', leaderId: null },
  { name: 'BR개발', leaderId: null },
  { name: 'CR생산관리', leaderId: null },
  { name: '품질관리', leaderId: null },
];

async function main() {
  console.log('========================================');
  console.log('누락된 5개 팀 생성');
  console.log('========================================\n');

  // 팀장 조회 (매핑용)
  const leaders = await prisma.user.findMany({
    where: {
      username: { in: ['nowhs', 'sbk6116', 'swlee', 'pjy0302', 'prh78'] }
    },
    select: { id: true, name: true, username: true }
  });

  const leaderMap: Record<string, string> = {};
  leaders.forEach(l => { leaderMap[l.username] = l.id; });

  console.log('팀장 목록:');
  leaders.forEach(l => console.log(`  - ${l.name} (${l.username})`));
  console.log('');

  // 팀 생성
  for (const team of newTeams) {
    // 팀장 매핑
    let leaderId: string | null = null;
    if (team.name === 'BR생산관리') leaderId = leaderMap['nowhs'];      // 노화식
    else if (team.name === 'BR총괄') leaderId = leaderMap['sbk6116'];   // 손범국
    else if (team.name === 'BR개발') leaderId = leaderMap['swlee'];     // 이상우
    else if (team.name === 'CR생산관리') leaderId = leaderMap['pjy0302']; // 박준영
    else if (team.name === '품질관리') leaderId = leaderMap['prh78'];   // 박래현

    const created = await prisma.team.create({
      data: {
        name: team.name,
        site: '화성',
        leaderId: leaderId,
      }
    });

    const leaderName = leaders.find(l => l.id === leaderId)?.name || '없음';
    console.log(`✅ ${team.name} (ID: ${created.id}) - 팀장: ${leaderName}`);
  }

  console.log('\n========================================');
  console.log('완료! 5개 팀 생성됨');
  console.log('========================================');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
