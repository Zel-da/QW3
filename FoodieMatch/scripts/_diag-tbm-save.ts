/**
 * TBM 저장 안 되는 문제 진단 — 운영 DB 상태 조사
 * 1) 최근 DailyReport 작성 통계 (다른 사용자는 쓰고 있는지)
 * 2) ChecklistTemplate 없는 팀 (있으면 그 팀 사용자는 제출 버튼 비활성화됨)
 * 3) 최근 생성 Template 중 templateItems 없는 것 (빈 템플릿이면 formState 못 채움)
 *
 * 실행: npx tsx scripts/_diag-tbm-save.ts
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const day1 = new Date(now.getTime() - 86400 * 1000);
  const day3 = new Date(now.getTime() - 3 * 86400 * 1000);
  const day7 = new Date(now.getTime() - 7 * 86400 * 1000);

  console.log('='.repeat(80));
  console.log('TBM 저장 진단 리포트  ·  기준시각:', now.toISOString());
  console.log('='.repeat(80));

  // 1) 최근 DailyReport 작성 통계
  const [count1, count3, count7, latest] = await Promise.all([
    prisma.dailyReport.count({ where: { createdAt: { gte: day1 } } }),
    prisma.dailyReport.count({ where: { createdAt: { gte: day3 } } }),
    prisma.dailyReport.count({ where: { createdAt: { gte: day7 } } }),
    prisma.dailyReport.findFirst({ orderBy: { createdAt: 'desc' }, include: { team: { select: { name: true, site: true } } } }),
  ]);
  console.log('\n[1] 최근 TBM 작성 통계 (DailyReport.createdAt 기준)');
  console.log(`  · 최근 1일: ${count1}건`);
  console.log(`  · 최근 3일: ${count3}건`);
  console.log(`  · 최근 7일: ${count7}건`);
  if (latest) {
    console.log(`  · 가장 최근: ${latest.createdAt.toISOString()} / ${latest.team?.site} ${latest.team?.name} / ${latest.managerName}`);
  }

  // 2) 활성 팀 중 ChecklistTemplate 없는 팀
  const allTeams = await prisma.team.findMany({
    where: { isActive: true, NOT: { name: { contains: '안전환경보건팀' } } },
    include: { checklistTemplates: { include: { _count: { select: { templateItems: true } } } } },
    orderBy: [{ site: 'asc' }, { name: 'asc' }],
  });

  const noTemplate: string[] = [];
  const emptyTemplate: Array<{ team: string; templateId: number }> = [];
  for (const t of allTeams) {
    if (t.checklistTemplates.length === 0) {
      noTemplate.push(`[${t.site}] ${t.name} (id=${t.id})`);
    } else {
      for (const tpl of t.checklistTemplates) {
        if (tpl._count.templateItems === 0) {
          emptyTemplate.push({ team: `[${t.site}] ${t.name}`, templateId: tpl.id });
        }
      }
    }
  }

  console.log(`\n[2] 활성 팀 ${allTeams.length}개 중 ChecklistTemplate 없는 팀`);
  if (noTemplate.length === 0) {
    console.log('  · 없음 (모든 팀에 템플릿 있음)');
  } else {
    console.log(`  · ${noTemplate.length}개 팀에 템플릿 없음 → 이 팀 사용자는 TBM 제출 버튼이 비활성화됨!`);
    noTemplate.forEach(n => console.log(`    - ${n}`));
  }

  console.log(`\n[3] ChecklistTemplate 있지만 templateItems 0개인 템플릿`);
  if (emptyTemplate.length === 0) {
    console.log('  · 없음');
  } else {
    console.log(`  · ${emptyTemplate.length}개 템플릿이 빈 상태 → 이 팀도 체크 못 함`);
    emptyTemplate.forEach(e => console.log(`    - ${e.team} (templateId=${e.templateId})`));
  }

  // 4) 최근 24시간 내 LOGIN 사용자 수 (TBM 쓰려는 사람들)
  const recentLogins = await prisma.auditLog.count({
    where: { action: 'LOGIN', createdAt: { gte: day1 } },
  });
  console.log(`\n[4] 최근 1일 로그인 수: ${recentLogins}건`);

  // 5) 최근 1시간 생성된 TBM (사용자가 신고한 시점 근처)
  const hour1 = new Date(now.getTime() - 60 * 60 * 1000);
  const veryRecent = await prisma.dailyReport.findMany({
    where: { createdAt: { gte: hour1 } },
    include: { team: { select: { name: true, site: true } } },
    orderBy: { createdAt: 'desc' },
  });
  console.log(`\n[5] 최근 1시간 생성 TBM: ${veryRecent.length}건`);
  for (const r of veryRecent) {
    console.log(`  · ${r.createdAt.toISOString()} / ${r.team?.site} ${r.team?.name} / ${r.managerName}`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
