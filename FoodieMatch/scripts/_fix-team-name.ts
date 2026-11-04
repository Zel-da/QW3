/**
 * '생산 생산기술팀' → '생산기술팀' 이름 변경 + 유사한 중복어 패턴 전체 조사
 * 1단계: dry-run 으로 영향 범위 확인
 * 2단계: --apply 로 실제 UPDATE
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  // '생산 생산', '품질 품질' 같은 중복어 패턴을 가진 팀 검색
  const allTeams = await prisma.team.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, site: true,
      _count: { select: { dailyReports: true, members: true, teamMembers: true } },
    },
    orderBy: [{ site: 'asc' }, { name: 'asc' }],
  });

  // 패턴: '단어 단어' 또는 '단어단어' 같은 중복 감지
  const suspects = allTeams.filter(t => {
    const words = t.name.replace(/\s+/g, ' ').trim().split(' ');
    if (words.length < 2) return false;
    // 첫 단어가 두 번째 단어 안에 포함되는 경우 (예: '생산 생산기술팀')
    for (let i = 0; i < words.length - 1; i++) {
      const a = words[i], b = words[i + 1];
      if (b.startsWith(a) && a.length >= 2 && a !== b) return true;
    }
    return false;
  });

  console.log('='.repeat(80));
  console.log('중복어 패턴 의심 팀 (확인 후 수동 판단):');
  console.log('='.repeat(80));
  if (suspects.length === 0) {
    console.log('  없음 (정상)');
  } else {
    for (const t of suspects) {
      console.log(`  [${t.site}] "${t.name}" (id=${t.id}) — TBM ${t._count.dailyReports}건, 사용자 ${t._count.members}명, 팀원 ${t._count.teamMembers}명`);
    }
  }

  // '생산 생산기술팀' 정확히 매칭
  console.log('\n' + '='.repeat(80));
  console.log('"생산 생산기술팀" 대상 조회:');
  console.log('='.repeat(80));
  const target = await prisma.team.findFirst({
    where: { name: '생산 생산기술팀' },
    include: { _count: { select: { dailyReports: true, members: true, teamMembers: true } } },
  });

  if (!target) {
    // 정확 매칭 실패 — contains 로 유사 검색
    const similar = await prisma.team.findMany({
      where: { name: { contains: '생산기술' } },
      include: { _count: { select: { dailyReports: true, members: true, teamMembers: true } } },
    });
    console.log(`  "생산 생산기술팀" 정확 매칭 없음. '생산기술' 포함 팀:`);
    for (const t of similar) {
      console.log(`    [${t.site}] "${t.name}" (id=${t.id}) — TBM ${t._count.dailyReports}건`);
    }
    await prisma.$disconnect();
    return;
  }

  console.log(`  [${target.site}] "${target.name}" (id=${target.id})`);
  console.log(`  연관 데이터: TBM ${target._count.dailyReports}건, 사용자 ${target._count.members}명, TeamMember ${target._count.teamMembers}명`);
  console.log(`  → '생산기술팀' 으로 변경`);

  // 이름 변경 시 중복 체크 — 같은 사이트에 이미 '생산기술팀' 존재하면 충돌
  if (target.site) {
    const existing = await prisma.team.findFirst({
      where: { name: '생산기술팀', site: target.site, id: { not: target.id } },
    });
    if (existing) {
      console.log(`\n  ⚠ ${target.site} 에 이미 '생산기술팀' (id=${existing.id}) 이 존재.`);
      console.log(`    두 팀을 '병합' 하려면 별도 작업이 필요합니다 (TBM/서명/멤버 전부 이동).`);
      console.log(`    이 스크립트는 단순 이름 변경만 지원합니다. 수동 판단 후 재실행.`);
      await prisma.$disconnect();
      return;
    }
  }

  if (APPLY) {
    const updated = await prisma.team.update({
      where: { id: target.id },
      data: { name: '생산기술팀' },
    });
    console.log(`\n✓ 완료 — Team id=${updated.id} 이름 '${target.name}' → '${updated.name}'`);
    console.log(`  연관 데이터(TBM/서명/사용자/결재)는 teamId 참조라 자동 반영됨.`);
  } else {
    console.log(`\n(dry-run) 실제 적용하려면: --apply 추가`);
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
