/**
 * 화성 팀 결재자/팀장 업데이트
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 팀 순서 (이름 가나다순)
const TEAM_ORDER = [
  '2공장', 'BKT', 'BR개발', 'BR생산관리', 'BR총괄', 'BR출하',
  'CR생산관리', 'CR자재', 'CR조립', 'CR출하', 'M/B', 'S/A개발',
  '선삭', '연삭', '열처리', '인사총무', '자재부품', '품질관리', '품질서비스'
];

// 결재자 (위)
const APPROVERS = [
  '노화식', '손범국', '손범국', '손범국', '손범국', '손범국',
  '손범국', '손범국', '노화식', '노화식', '신상표', '이상우',
  '이상우', '박준영', '박준영', '박준영', '박준영', '박래현', '신국재'
];

// 팀장 (아래)
const LEADERS = [
  '손범국', '김천일', '전형표', '박영웅', '이용대', '이흥수',
  '최영삼', '권기원', '김형근', '한철희', '신상표', '김경호',
  '김남수', '박준영', '권순봉', '한재봉', '이준용', '이강욱', '김동현'
];

async function main() {
  console.log('========================================');
  console.log('화성 팀 결재자/팀장 업데이트');
  console.log('========================================\n');

  // 먼저 모든 사용자 조회
  const allUsers = await prisma.user.findMany({
    where: { site: '화성' },
    select: { id: true, name: true, role: true }
  });

  console.log(`화성 사용자 수: ${allUsers.length}명\n`);

  // 사용자 이름 -> ID 매핑
  const userMap = new Map<string, { id: string; role: string }>();
  allUsers.forEach(u => userMap.set(u.name, { id: u.id, role: u.role }));

  // 필요한 사용자 확인
  const neededApprovers = [...new Set(APPROVERS)];
  const neededLeaders = [...new Set(LEADERS)];

  console.log('필요한 결재자:', neededApprovers.join(', '));
  console.log('필요한 팀장:', neededLeaders.join(', '));

  const missingApprovers = neededApprovers.filter(name => !userMap.has(name));
  const missingLeaders = neededLeaders.filter(name => !userMap.has(name));

  if (missingApprovers.length > 0) {
    console.log(`\n⚠️ 없는 결재자: ${missingApprovers.join(', ')}`);
  }
  if (missingLeaders.length > 0) {
    console.log(`\n⚠️ 없는 팀장: ${missingLeaders.join(', ')}`);
  }

  // 팀 업데이트
  console.log('\n----------------------------------------');
  console.log('팀 업데이트');
  console.log('----------------------------------------');

  for (let i = 0; i < TEAM_ORDER.length; i++) {
    const teamName = TEAM_ORDER[i];
    const approverName = APPROVERS[i];
    const leaderName = LEADERS[i];

    const team = await prisma.team.findFirst({
      where: { site: '화성', name: teamName }
    });

    if (!team) {
      console.log(`❌ ${teamName} - 팀 없음`);
      continue;
    }

    const approver = userMap.get(approverName);
    const leader = userMap.get(leaderName);

    const updateData: any = {};

    if (approver) {
      updateData.approverId = approver.id;
    }
    if (leader) {
      updateData.leaderId = leader.id;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.team.update({
        where: { id: team.id },
        data: updateData
      });

      const approverStatus = approver ? `✅${approverName}` : `❌${approverName}`;
      const leaderStatus = leader ? `✅${leaderName}` : `❌${leaderName}`;
      console.log(`[${team.id}] ${teamName} - 결재자: ${approverStatus}, 팀장: ${leaderStatus}`);
    }
  }

  // 결과 확인
  console.log('\n========================================');
  console.log('업데이트 후 현황');
  console.log('========================================');

  const teams = await prisma.team.findMany({
    where: { site: '화성' },
    include: {
      leader: { select: { name: true } },
      approver: { select: { name: true } }
    },
    orderBy: { name: 'asc' }
  });

  for (const team of teams) {
    console.log(`[${team.id}] ${team.name} - 팀장: ${team.leader?.name || '-'}, 결재자: ${team.approver?.name || '-'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
