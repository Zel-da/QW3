/**
 * 화성 팀 데이터 연결 현황 조회
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 유지해야 할 팀 이름들 (19개)
const keepTeams = [
  'BR생산관리', 'BR총괄', '선삭', '연삭', 'MB', 'BKT', '열처리', 'BR출하',
  'BR자재부품', '2공장', 'BR품질서비스', 'BR개발', 'SA개발',
  'CR생산관리', 'CR조립', 'CR출하', 'CR자재', '품질관리', '인사총무',
  // 매핑된 기존 팀 이름들도 포함
  'M/B', '자재부품', '품질서비스', 'S/A개발', '품질관리팀'
];

async function main() {
  console.log('========================================');
  console.log('화성 팀 데이터 연결 현황');
  console.log('========================================\n');

  // 화성 사이트의 모든 팀 조회
  const teams = await prisma.team.findMany({
    where: { site: '화성' },
    include: {
      leader: { select: { name: true, username: true } },
      approver: { select: { name: true, username: true } },
      members: { select: { id: true, name: true } },
      teamMembers: { select: { id: true, name: true } },
      _count: {
        select: {
          dailyReports: true,
          checklistTemplates: true,
          inspectionTemplates: true,
          safetyInspections: true,
          monthlyApprovals: true,
          teamEquipments: true,
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`총 ${teams.length}개 팀\n`);

  // 유지할 팀과 삭제 대상 팀 분류
  const teamsToKeep: typeof teams = [];
  const teamsToDelete: typeof teams = [];

  teams.forEach(team => {
    if (keepTeams.includes(team.name)) {
      teamsToKeep.push(team);
    } else {
      teamsToDelete.push(team);
    }
  });

  console.log('==========================================');
  console.log('✅ 유지할 팀 (' + teamsToKeep.length + '개)');
  console.log('==========================================\n');

  for (const team of teamsToKeep) {
    console.log(`📁 ${team.name} (ID: ${team.id})`);
    console.log(`   팀장: ${team.leader?.name || '없음'}`);
    console.log(`   결재자: ${team.approver?.name || '없음'}`);
    console.log(`   User 멤버: ${team.members.length}명`);
    console.log(`   TeamMember: ${team.teamMembers.length}명`);
    console.log(`   TBM 템플릿: ${team._count.checklistTemplates}개`);
    console.log(`   TBM 일지: ${team._count.dailyReports}개`);
    console.log(`   점검 템플릿: ${team._count.inspectionTemplates}개`);
    console.log(`   안전점검: ${team._count.safetyInspections}개`);
    console.log(`   월별결재: ${team._count.monthlyApprovals}개`);
    console.log(`   장비: ${team._count.teamEquipments}개`);
    console.log('');
  }

  console.log('==========================================');
  console.log('❌ 삭제 대상 팀 (' + teamsToDelete.length + '개)');
  console.log('==========================================\n');

  for (const team of teamsToDelete) {
    const hasData = team._count.dailyReports > 0 ||
                    team._count.checklistTemplates > 0 ||
                    team._count.inspectionTemplates > 0 ||
                    team._count.safetyInspections > 0 ||
                    team._count.monthlyApprovals > 0 ||
                    team.members.length > 0 ||
                    team.teamMembers.length > 0;

    const warning = hasData ? '⚠️ 데이터 있음!' : '';

    console.log(`📁 ${team.name} (ID: ${team.id}) ${warning}`);
    if (team.leader) console.log(`   팀장: ${team.leader.name}`);
    if (team.members.length > 0) console.log(`   User 멤버: ${team.members.length}명 - ${team.members.map(m => m.name).join(', ')}`);
    if (team.teamMembers.length > 0) console.log(`   TeamMember: ${team.teamMembers.length}명`);
    if (team._count.checklistTemplates > 0) console.log(`   TBM 템플릿: ${team._count.checklistTemplates}개`);
    if (team._count.dailyReports > 0) console.log(`   TBM 일지: ${team._count.dailyReports}개`);
    if (team._count.inspectionTemplates > 0) console.log(`   점검 템플릿: ${team._count.inspectionTemplates}개`);
    if (team._count.safetyInspections > 0) console.log(`   안전점검: ${team._count.safetyInspections}개`);
    if (team._count.monthlyApprovals > 0) console.log(`   월별결재: ${team._count.monthlyApprovals}개`);
    console.log('');
  }

  // 요약
  console.log('==========================================');
  console.log('요약');
  console.log('==========================================');
  console.log(`유지할 팀: ${teamsToKeep.length}개`);
  console.log(`삭제 대상: ${teamsToDelete.length}개`);

  const teamsWithData = teamsToDelete.filter(t =>
    t._count.dailyReports > 0 || t._count.checklistTemplates > 0 ||
    t.members.length > 0 || t.teamMembers.length > 0
  );
  if (teamsWithData.length > 0) {
    console.log(`⚠️ 데이터 있는 삭제 대상: ${teamsWithData.length}개`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
