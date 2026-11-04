/**
 * 생산기술팀(id=9) 와 '아산 생산 생산기술팀'(id=92) 상세 비교
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  for (const teamId of [9, 92]) {
    const t = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        department: true,
        leader: { select: { name: true, username: true, email: true, createdAt: true } },
        approver: { select: { name: true, username: true } },
        members: { select: { id: true, name: true, username: true, role: true } },
        teamMembers: { select: { id: true, name: true, isActive: true } },
      },
    });
    if (!t) { console.log(`팀 ${teamId} 없음`); continue; }

    console.log('='.repeat(80));
    console.log(`[${t.site ?? '-'}] "${t.name}"  (id=${t.id}) · isActive=${t.isActive}`);
    console.log('='.repeat(80));
    console.log(`  createdAt: ${t.createdAt.toISOString()}`);
    console.log(`  department: ${t.department?.name ?? '-'}`);
    console.log(`  팀장: ${t.leader?.name ?? '-'} (${t.leader?.username ?? '-'})`);
    console.log(`  결재자: ${t.approver?.name ?? '-'} (${t.approver?.username ?? '-'})`);
    console.log(`  소속 User (${t.members.length}명):`);
    for (const m of t.members) console.log(`    · ${m.name} (${m.username}) ${m.role}`);
    console.log(`  TeamMember (${t.teamMembers.length}명):`);
    for (const m of t.teamMembers) console.log(`    · ${m.name}${m.isActive === false ? ' [비활성]' : ''}`);

    // TBM 요약
    const tbmFirst = await prisma.dailyReport.findFirst({ where: { teamId }, orderBy: { reportDate: 'asc' }, select: { reportDate: true, managerName: true } });
    const tbmLast = await prisma.dailyReport.findFirst({ where: { teamId }, orderBy: { reportDate: 'desc' }, select: { reportDate: true, managerName: true } });
    const tbmCount = await prisma.dailyReport.count({ where: { teamId } });
    console.log(`  TBM: ${tbmCount}건`);
    if (tbmFirst && tbmLast) {
      console.log(`    첫 작성: ${tbmFirst.reportDate.toISOString().slice(0, 10)} (${tbmFirst.managerName})`);
      console.log(`    마지막: ${tbmLast.reportDate.toISOString().slice(0, 10)} (${tbmLast.managerName})`);
    }

    // 월간 결재 요약
    const approvals = await prisma.monthlyApproval.count({ where: { teamId } });
    console.log(`  월간 결재: ${approvals}건`);
  }

  await prisma.$disconnect();
}
main();
