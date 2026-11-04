/**
 * '기술관리팀' 재활성화
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  const teams = await prisma.team.findMany({
    where: { name: { contains: '기술관리' } },
    include: {
      department: true,
      leader: { select: { name: true, username: true } },
      approver: { select: { name: true, username: true } },
      _count: { select: { dailyReports: true, members: true, teamMembers: true, monthlyApprovals: true } },
    },
    orderBy: [{ site: 'asc' }, { name: 'asc' }],
  });

  console.log('='.repeat(80));
  console.log('"기술관리" 포함 팀:');
  console.log('='.repeat(80));
  for (const t of teams) {
    console.log(`  id=${t.id} [${t.site ?? '-'}] "${t.name}" isActive=${t.isActive}`);
    console.log(`    부서=${t.department?.name ?? '-'}  팀장=${t.leader?.name ?? '-'}  결재자=${t.approver?.name ?? '-'}`);
    console.log(`    TBM ${t._count.dailyReports}건, 사용자 ${t._count.members}명, TeamMember ${t._count.teamMembers}명, 월간결재 ${t._count.monthlyApprovals}건`);
  }

  const inactive = teams.filter(t => !t.isActive);
  if (inactive.length === 0) {
    console.log('\n→ 비활성 상태인 기술관리팀 없음 (이미 모두 활성)');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n→ 비활성 ${inactive.length}개 재활성화 ${APPLY ? '실행' : '(dry-run)'}`);
  for (const t of inactive) {
    if (APPLY) {
      await prisma.team.update({ where: { id: t.id }, data: { isActive: true } });
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'TEAM',
          entityId: String(t.id),
          userId: null,
          newValue: { reactivated: true, by: 'admin-script' } as any,
        },
      }).catch(() => {});
      console.log(`  ✓ id=${t.id} "${t.name}" 재활성화`);
    } else {
      console.log(`  (dry-run) id=${t.id} "${t.name}" 재활성화 예정`);
    }
  }

  if (!APPLY) console.log('\n실제 적용: --apply');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
