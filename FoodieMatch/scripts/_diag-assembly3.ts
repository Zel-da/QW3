/**
 * 조립3라인 TBM 제출 안 되는 원인 조사
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    where: { name: { contains: '조립3라인' } },
    include: {
      checklistTemplates: {
        include: { _count: { select: { templateItems: true } } },
      },
      leader: { select: { name: true, username: true, email: true } },
      approver: { select: { name: true } },
      members: { select: { id: true, name: true, username: true, role: true, email: true } },
      teamMembers: { where: { isActive: true }, select: { id: true, name: true } },
    },
  });

  console.log('='.repeat(80));
  console.log('"조립3라인" 검색 결과:');
  console.log('='.repeat(80));
  if (teams.length === 0) {
    console.log('  정확 매칭 없음. 유사 검색:');
    const sim = await prisma.team.findMany({
      where: { OR: [{ name: { contains: '조립 3' } }, { name: { contains: '조립3' } }, { name: { contains: '3라인' } }] },
      select: { id: true, name: true, site: true, isActive: true },
    });
    for (const t of sim) console.log(`    id=${t.id} [${t.site}] "${t.name}" isActive=${t.isActive}`);
    await prisma.$disconnect();
    return;
  }

  for (const t of teams) {
    console.log(`\n  id=${t.id}  [${t.site ?? 'NULL'}]  "${t.name}"  isActive=${t.isActive}`);
    console.log(`    팀장: ${t.leader?.name ?? '-'} (${t.leader?.username ?? '-'})`);
    console.log(`    결재자: ${t.approver?.name ?? '-'}`);
    console.log(`    소속 User: ${t.members.length}명 — ${t.members.map(m => m.name).join(', ')}`);
    console.log(`    활성 TeamMember: ${t.teamMembers.length}명`);

    console.log(`    ChecklistTemplate ${t.checklistTemplates.length}개:`);
    if (t.checklistTemplates.length === 0) {
      console.log(`      ⚠ 템플릿 없음!`);
    } else {
      for (const tpl of t.checklistTemplates) {
        console.log(`      id=${tpl.id} "${tpl.name}" items=${tpl._count.templateItems}개${tpl._count.templateItems === 0 ? ' ⚠ 빈 템플릿!' : ''}`);
      }
    }

    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const dayEnd   = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
    const todayReports = await prisma.dailyReport.findMany({
      where: { teamId: t.id, reportDate: { gte: dayStart, lt: dayEnd } },
      select: { id: true, reportDate: true, managerName: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    console.log(`    오늘(±1일) TBM: ${todayReports.length}건`);
    for (const r of todayReports) {
      console.log(`      - ${r.reportDate.toISOString().slice(0,10)} ${r.managerName}  createdAt=${r.createdAt.toISOString()}`);
    }

    const day3Ago = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    const recent = await prisma.dailyReport.findMany({
      where: { teamId: t.id, reportDate: { gte: day3Ago } },
      select: { reportDate: true, managerName: true },
      orderBy: { reportDate: 'desc' },
      take: 5,
    });
    console.log(`    최근 7일 TBM: ${recent.length}건`);
    for (const r of recent) {
      console.log(`      - ${r.reportDate.toISOString().slice(0,10)} ${r.managerName}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
