/**
 * 아산 팀 리더/결재자 업데이트 스크립트
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 업데이트할 팀 정보
const teamUpdates = [
  { teamName: '가공라인', leaderName: '임성길', approverName: '황종건' },
  { teamName: '고객지원팀', leaderName: '최정현', approverName: '고영배' },
  { teamName: '부품팀', leaderName: '안종준', approverName: '고영배' },
  { teamName: '생산기술팀', leaderName: '신용균', approverName: '문상보' },
  { teamName: '자재팀', leaderName: '이점두', approverName: '문상보' },
  { teamName: '전기라인', leaderName: '금서우', approverName: '황종건' },
  { teamName: '제관라인', leaderName: '김영산', approverName: '황종건' },
  { teamName: '품질관리팀', leaderName: '박래현', approverName: '임동진' },
];

async function main() {
  console.log('========================================');
  console.log('아산 팀 리더/결재자 업데이트');
  console.log('========================================\n');

  for (const update of teamUpdates) {
    const team = await prisma.team.findFirst({
      where: { name: update.teamName, site: '아산' }
    });

    if (!team) {
      console.log('❌ 팀 없음: ' + update.teamName);
      continue;
    }

    const leader = await prisma.user.findFirst({
      where: { name: update.leaderName, site: '아산' }
    });

    const approver = await prisma.user.findFirst({
      where: { name: update.approverName, site: '아산' }
    });

    if (!leader) {
      console.log('❌ 팀장 없음: ' + update.leaderName + ' (' + update.teamName + ')');
      continue;
    }

    if (!approver) {
      console.log('❌ 결재자 없음: ' + update.approverName + ' (' + update.teamName + ')');
      continue;
    }

    await prisma.team.update({
      where: { id: team.id },
      data: {
        leaderId: leader.id,
        approverId: approver.id,
      }
    });

    console.log('✅ 업데이트: ' + update.teamName + ' (팀장=' + update.leaderName + ', 결재자=' + update.approverName + ')');
  }

  console.log('\n========================================');
  console.log('완료!');
  console.log('========================================');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
