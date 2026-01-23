/**
 * 시퀀스 수정 후 팀 생성
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const newTeams = ['BR생산관리', 'BR총괄', 'BR개발', 'CR생산관리', '품질관리'];

async function main() {
  console.log('========================================');
  console.log('시퀀스 수정 및 팀 생성');
  console.log('========================================\n');

  // 1. 현재 최대 ID 확인
  const maxTeam = await prisma.team.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  const maxId = maxTeam?.id || 0;
  console.log(`현재 최대 팀 ID: ${maxId}`);

  // 2. 시퀀스 재설정
  await prisma.$executeRawUnsafe(`SELECT setval('"Teams_id_seq"', ${maxId + 1}, false)`);
  console.log(`시퀀스 재설정: ${maxId + 1}\n`);

  // 3. 팀장 조회
  const leaders = await prisma.user.findMany({
    where: { username: { in: ['nowhs', 'sbk6116', 'swlee', 'pjy0302', 'prh78'] } },
    select: { id: true, name: true, username: true }
  });
  const leaderMap: Record<string, string> = {};
  leaders.forEach(l => { leaderMap[l.username] = l.id; });

  // 4. 팀 생성
  const teamLeaderMap: Record<string, string> = {
    'BR생산관리': 'nowhs',
    'BR총괄': 'sbk6116',
    'BR개발': 'swlee',
    'CR생산관리': 'pjy0302',
    '품질관리': 'prh78',
  };

  for (const name of newTeams) {
    const leaderId = leaderMap[teamLeaderMap[name]] || null;
    const leaderName = leaders.find(l => l.id === leaderId)?.name || '없음';

    const created = await prisma.team.create({
      data: { name, site: '화성', leaderId }
    });

    console.log(`✅ ${name} (ID: ${created.id}) - 팀장: ${leaderName}`);
  }

  console.log('\n========================================');
  console.log('완료! 5개 팀 생성됨');
  console.log('========================================');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
