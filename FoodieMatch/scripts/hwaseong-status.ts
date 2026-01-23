/**
 * 화성 팀 전체 현황
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('화성 팀 전체 현황');
  console.log('========================================\n');

  const teams = await prisma.team.findMany({
    where: { site: '화성' },
    include: {
      leader: { select: { name: true, role: true } },
      approver: { select: { name: true, role: true } },
      teamMembers: { select: { id: true } }
    },
    orderBy: { name: 'asc' }
  });

  console.log('팀명\t\t\t팀장\t\t결재자\t\tTBM\t점검\t팀원');
  console.log('─'.repeat(80));

  for (const team of teams) {
    const tbmCount = await prisma.checklistTemplate.count({ where: { teamId: team.id } });
    const inspCount = await prisma.inspectionTemplate.count({ where: { teamId: team.id } });

    const tbmItems = tbmCount > 0 ?
      await prisma.templateItem.count({
        where: { template: { teamId: team.id } }
      }) : 0;

    const teamName = team.name.padEnd(12, ' ');
    const leaderName = team.leader?.name || '-';
    const approverName = team.approver?.name || '-';
    const tbmStatus = tbmCount > 0 ? `✅(${tbmItems}항목)` : '❌';
    const inspStatus = inspCount > 0 ? `✅(${inspCount/12}개)` : '❌';
    const memberCount = team.teamMembers.length;

    console.log(`[${team.id}] ${teamName}\t${leaderName.padEnd(8)}\t${approverName.padEnd(8)}\t${tbmStatus}\t${inspStatus}\t${memberCount}명`);
  }

  // 요약
  console.log('\n========================================');
  console.log('요약');
  console.log('========================================');

  const withLeader = teams.filter(t => t.leader).length;
  const withApprover = teams.filter(t => t.approver).length;

  let withTBM = 0;
  let withInsp = 0;
  for (const team of teams) {
    const tbm = await prisma.checklistTemplate.count({ where: { teamId: team.id } });
    const insp = await prisma.inspectionTemplate.count({ where: { teamId: team.id } });
    if (tbm > 0) withTBM++;
    if (insp > 0) withInsp++;
  }

  const totalMembers = teams.reduce((sum, t) => sum + t.teamMembers.length, 0);

  console.log(`총 팀 수: ${teams.length}개`);
  console.log(`팀장 있는 팀: ${withLeader}개`);
  console.log(`결재자 있는 팀: ${withApprover}개`);
  console.log(`TBM 있는 팀: ${withTBM}개`);
  console.log(`안전점검 있는 팀: ${withInsp}개`);
  console.log(`총 팀원 수: ${totalMembers}명`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
