/**
 * 진단: 정의건(jeg5972) 결재 처리 관련 상태 점검
 * - 사용자 계정 존재/역할
 * - 이 사람을 approver로 지정한 팀 목록
 * - PENDING 상태의 결재 요청과 approverId 일치 여부
 *
 * 실행: npx tsx scripts/_diag-jeg-approvals.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const jeg = await prisma.user.findFirst({
    where: {
      OR: [
        { username: 'jeg5972' },
        { name: '정의건' },
      ],
    },
    select: { id: true, username: true, name: true, role: true, site: true, teamId: true, email: true },
  });

  console.log('▶ 사용자 계정:', jeg || '없음');
  if (!jeg) {
    console.log('❌ 정의건 계정을 찾을 수 없습니다. 이 계정이 만들어져 있는지 먼저 확인하세요.');
    process.exit(0);
  }

  const teamsWithApprover = await prisma.team.findMany({
    where: { approverId: jeg.id },
    select: { id: true, name: true, site: true, isActive: true },
    orderBy: [{ site: 'asc' }, { name: 'asc' }],
  });

  console.log(`\n▶ ${jeg.name}이 결재자로 지정된 팀 (${teamsWithApprover.length}개):`);
  for (const t of teamsWithApprover) {
    console.log(`  - [${t.site}] ${t.name} (id=${t.id})${t.isActive === false ? ' [비활성]' : ''}`);
  }

  const pendings = await prisma.approvalRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      approver: { select: { id: true, name: true, username: true } },
      requester: { select: { id: true, name: true, username: true } },
      monthlyReport: {
        include: {
          team: { select: { id: true, name: true, site: true, approverId: true } },
        },
      },
    },
    orderBy: { requestedAt: 'desc' },
  });

  const jegPendings = pendings.filter((p) => p.approverId === jeg.id);
  const jegShouldBeApprover = pendings.filter(
    (p) => p.monthlyReport?.team?.approverId === jeg.id && p.approverId !== jeg.id,
  );

  console.log(`\n▶ 정의건에게 할당된 PENDING 결재 (${jegPendings.length}개):`);
  for (const p of jegPendings) {
    const t = p.monthlyReport?.team;
    console.log(`  - ${t?.site}/${t?.name} ${p.monthlyReport?.year}-${p.monthlyReport?.month}월 (requestId=${p.id}, requester=${p.requester?.name})`);
  }

  console.log(`\n▶ 팀 approverId는 정의건이지만 approvalRequest.approverId는 다른 사람 (${jegShouldBeApprover.length}개):`);
  for (const p of jegShouldBeApprover) {
    const t = p.monthlyReport?.team;
    console.log(`  - ${t?.site}/${t?.name}: 결재요청 approverId=${p.approverId} (${p.approver?.name}) ← 팀 설정과 불일치`);
  }

  if (jegShouldBeApprover.length > 0) {
    console.log('\n💡 위 결재요청들은 팀 결재자가 정의건으로 바뀌었지만 옛 approver로 접수된 상태입니다.');
    console.log('   해결책 1: 요청자가 결재를 회수하고 다시 요청 (권장)');
    console.log('   해결책 2: 아래 SQL로 approverId 일괄 갱신:');
    for (const p of jegShouldBeApprover) {
      console.log(`   UPDATE "ApprovalRequests" SET "approverId" = '${jeg.id}' WHERE id = '${p.id}';`);
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
