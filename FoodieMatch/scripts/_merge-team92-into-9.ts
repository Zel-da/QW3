/**
 * 생산기술팀 승계:
 *   id=9  "생산기술팀" (비활성, 신용균 팀장, TBM 120건) → 재활성화 + 팀장 안태헌으로 교체
 *   id=92 "아산 생산 생산기술팀" (오늘 생성, 안태헌 팀장) → 사용자 이동 후 삭제
 *
 * 과거 TBM·결재 이력은 id=9 그대로 유지됨.
 *
 * 2단계: dry-run → --apply
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  const t9 = await prisma.team.findUnique({
    where: { id: 9 },
    include: { leader: true, teamMembers: { select: { id: true, name: true, isActive: true } } },
  });
  const t92 = await prisma.team.findUnique({
    where: { id: 92 },
    include: { leader: true, members: true, teamMembers: true },
  });

  if (!t9 || !t92) {
    console.log('팀 9 또는 92 가 없음'); return;
  }

  console.log('='.repeat(80));
  console.log('적용 전 상태');
  console.log('='.repeat(80));
  console.log(`  id=9  "${t9.name}" isActive=${t9.isActive} 팀장=${t9.leader?.name ?? '-'}`);
  console.log(`  id=92 "${t92.name}" isActive=${t92.isActive} 팀장=${t92.leader?.name ?? '-'}`);
  console.log(`  id=92 소속 User: ${t92.members.length}명, TeamMember: ${t92.teamMembers.length}명`);

  const newLeaderId = t92.leaderId;
  const newLeaderName = t92.leader?.name;
  if (!newLeaderId) {
    console.log('⚠ id=92 에 팀장이 없음. 스크립트 종료'); return;
  }

  console.log('\n계획:');
  console.log(`  1) id=9 (생산기술팀) → isActive=true, leaderId=${newLeaderId} (${newLeaderName})`);
  console.log(`  2) id=92 소속 User(${t92.members.length}명) → teamId=9 로 이동`);
  console.log(`  3) id=92 TeamMember(${t92.teamMembers.length}명) → teamId=9 로 이동`);
  console.log(`  4) id=92 팀 레코드 삭제`);

  if (!APPLY) { console.log('\n(dry-run) 실제 적용: --apply'); await prisma.$disconnect(); return; }

  await prisma.$transaction(async (tx) => {
    // 1) id=9 재활성화 + 팀장 교체
    await tx.team.update({ where: { id: 9 }, data: { isActive: true, leaderId: newLeaderId } });

    // 2) User 이동
    if (t92.members.length > 0) {
      await tx.user.updateMany({ where: { teamId: 92 }, data: { teamId: 9 } });
    }

    // 3) TeamMember 이동
    if (t92.teamMembers.length > 0) {
      await tx.teamMember.updateMany({ where: { teamId: 92 }, data: { teamId: 9 } });
    }

    // 4) id=92 삭제 (이제 비어있음)
    await tx.team.delete({ where: { id: 92 } });
  });

  // 결과 확인
  const after = await prisma.team.findUnique({
    where: { id: 9 },
    include: {
      leader: { select: { name: true, username: true } },
      _count: { select: { dailyReports: true, members: true, teamMembers: true, monthlyApprovals: true } },
    },
  });
  console.log('\n✓ 적용 완료');
  console.log(`  id=9  "${after?.name}" isActive=${after?.isActive} 팀장=${after?.leader?.name}`);
  console.log(`  TBM ${after?._count.dailyReports}건, 사용자 ${after?._count.members}명, TeamMember ${after?._count.teamMembers}명, 월간결재 ${after?._count.monthlyApprovals}건`);

  const t92After = await prisma.team.findUnique({ where: { id: 92 } });
  console.log(`  id=92: ${t92After ? '아직 존재' : '삭제됨 ✓'}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
