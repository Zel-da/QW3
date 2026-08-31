/**
 * Team.createdAt 백필 — 기존 팀의 실제 생성일을 첫 dailyReport 날짜로 세팅.
 *
 * 배경:
 *   Team 모델에 createdAt 신규 추가. db push 직후 모든 팀의 createdAt이 push 시점(now())로 세팅됨.
 *   이 상태에서 attendance-overview에 "팀 createdAt 이후 월만 표시" 필터를 걸면 예전 팀들이
 *   최근 월에서만 보이는 회귀가 발생. 백필 필수.
 *
 * 정책:
 *   - 팀에 dailyReport가 하나라도 있으면 → 그 팀의 최초 reportDate로 createdAt 세팅
 *   - 팀에 dailyReport가 없으면 → 지금 시점(now())의 값을 그대로 유지 (신규 팀 취급)
 *
 * 실행: npx tsx scripts/_backfill-team-createdat.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({ select: { id: true, name: true, site: true } });
  console.log(`총 ${teams.length}개 팀 검사 시작`);

  let updated = 0;
  let skipped = 0;

  for (const team of teams) {
    const firstReport = await prisma.dailyReport.findFirst({
      where: { teamId: team.id },
      orderBy: { reportDate: 'asc' },
      select: { reportDate: true },
    });

    if (!firstReport) {
      skipped++;
      continue;
    }

    await prisma.team.update({
      where: { id: team.id },
      data: { createdAt: firstReport.reportDate },
    });
    updated++;
    console.log(`  ✓ [${team.site}] ${team.name} → ${firstReport.reportDate.toISOString().slice(0, 10)}`);
  }

  console.log(`\n완료: ${updated}개 팀 업데이트, ${skipped}개 팀 스킵 (dailyReport 없음, 현재 시각 유지)`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
