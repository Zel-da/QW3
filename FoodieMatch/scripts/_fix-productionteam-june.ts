/**
 * 2026-06 생산팀 TBM 월간 결재 상태 확인 + 7월 서명으로 결재 완료 처리
 * 1단계: --dry-run 로 상태 확인
 * 2단계: --apply 로 실제 UPDATE
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

async function main() {
  // 생산팀 (아산·화성 둘 다 가능성). 이름에 '생산팀' 들어가는 팀 전부 조회
  const teams = await prisma.team.findMany({
    where: { name: { contains: '생산팀' } },
    select: { id: true, name: true, site: true, isActive: true,
      leader: { select: { name: true, username: true } },
      approver: { select: { name: true, username: true } },
    },
    orderBy: [{ site: 'asc' }, { name: 'asc' }],
  });

  console.log('='.repeat(80));
  console.log('"생산팀" 포함 팀 전체:');
  console.log('='.repeat(80));
  for (const t of teams) {
    console.log(`  [${t.site}] ${t.name} (id=${t.id})${t.isActive === false ? ' [비활성]' : ''} 팀장=${t.leader?.name || '-'} 결재자=${t.approver?.name || '-'}`);
  }

  // 각 팀의 2026-06, 2026-07 MonthlyApproval + ApprovalRequest 상태 확인
  for (const team of teams) {
    console.log('\n' + '-'.repeat(80));
    console.log(`[${team.site}] ${team.name} (id=${team.id}) — 2026-06 vs 2026-07`);
    console.log('-'.repeat(80));

    const [jun, jul] = await Promise.all([
      prisma.monthlyApproval.findUnique({
        where: { teamId_year_month: { teamId: team.id, year: 2026, month: 6 } },
        include: { approvalRequest: { include: { requester: { select: { name: true } }, approver: { select: { name: true } } } } },
      }),
      prisma.monthlyApproval.findUnique({
        where: { teamId_year_month: { teamId: team.id, year: 2026, month: 7 } },
        include: { approvalRequest: { include: { requester: { select: { name: true } }, approver: { select: { name: true } } } } },
      }),
    ]);

    console.log(`  2026-06: ${jun ? `monthlyStatus=${jun.status}` : '(MonthlyApproval 없음)'}`);
    if (jun?.approvalRequest) {
      const ar = jun.approvalRequest;
      console.log(`           ApprovalRequest id=${ar.id} status=${ar.status}`);
      console.log(`           요청자=${ar.requester.name} 서명=${ar.requesterSignature ? '있음' : '없음'}`);
      console.log(`           결재자=${ar.approver.name} 서명=${ar.executiveSignature ? '있음' : '없음'}`);
      console.log(`           승인일=${ar.approvedAt?.toISOString() || '-'}`);
    } else {
      console.log(`           ApprovalRequest 없음`);
    }

    console.log(`  2026-07: ${jul ? `monthlyStatus=${jul.status}` : '(MonthlyApproval 없음)'}`);
    if (jul?.approvalRequest) {
      const ar = jul.approvalRequest;
      console.log(`           ApprovalRequest id=${ar.id} status=${ar.status}`);
      console.log(`           요청자=${ar.requester.name} 서명=${ar.requesterSignature ? `있음(${ar.requesterSignature.length}자)` : '없음'}`);
      console.log(`           결재자=${ar.approver.name} 서명=${ar.executiveSignature ? `있음(${ar.executiveSignature.length}자)` : '없음'}`);
      console.log(`           승인일=${ar.approvedAt?.toISOString() || '-'}`);
    } else {
      console.log(`           ApprovalRequest 없음`);
    }

    // 수정 대상 판별
    const junAlreadyApproved = jun?.approvalRequest?.status === 'APPROVED';
    const julApproved = jul?.approvalRequest?.status === 'APPROVED' && (jul.approvalRequest.executiveSignature || jul.approvalRequest.requesterSignature);

    if (junAlreadyApproved) {
      console.log(`  → 2026-06 이미 승인 완료 상태. 스킵.`);
      continue;
    }

    if (!jul?.approvalRequest || !julApproved) {
      console.log(`  → 2026-07 승인·서명 데이터 없음. 수동 확인 필요.`);
      continue;
    }

    const julAR = jul.approvalRequest;

    if (!jun) {
      console.log(`  → 2026-06 MonthlyApproval 자체가 없음.`);
      if (APPLY) {
        const created = await prisma.monthlyApproval.create({
          data: { teamId: team.id, year: 2026, month: 6, status: 'APPROVED', approverId: julAR.approverId, approvedAt: julAR.approvedAt },
        });
        const newReq = await prisma.approvalRequest.create({
          data: {
            reportId: created.id,
            requesterId: julAR.requesterId,
            approverId: julAR.approverId,
            status: 'APPROVED',
            requestedAt: julAR.requestedAt,
            approvedAt: julAR.approvedAt,
            executiveSignature: julAR.executiveSignature,
            requesterSignature: julAR.requesterSignature,
          },
        });
        console.log(`     ✓ 생성됨: MonthlyApproval id=${created.id}, ApprovalRequest id=${newReq.id}`);
      } else {
        console.log(`     (dry-run) 생성 예정: MonthlyApproval + ApprovalRequest APPROVED (7월 서명 복사)`);
      }
      continue;
    }

    if (!jun.approvalRequest) {
      console.log(`  → 2026-06 MonthlyApproval 있음 but ApprovalRequest 없음.`);
      if (APPLY) {
        const newReq = await prisma.approvalRequest.create({
          data: {
            reportId: jun.id,
            requesterId: julAR.requesterId,
            approverId: julAR.approverId,
            status: 'APPROVED',
            requestedAt: julAR.requestedAt,
            approvedAt: julAR.approvedAt,
            executiveSignature: julAR.executiveSignature,
            requesterSignature: julAR.requesterSignature,
          },
        });
        await prisma.monthlyApproval.update({
          where: { id: jun.id },
          data: { status: 'APPROVED', approvedAt: julAR.approvedAt, approverId: julAR.approverId },
        });
        console.log(`     ✓ ApprovalRequest 생성 id=${newReq.id} + MonthlyApproval status=APPROVED`);
      } else {
        console.log(`     (dry-run) ApprovalRequest 신규 생성 예정 + Monthly status=APPROVED`);
      }
      continue;
    }

    // ApprovalRequest가 있지만 승인 안 됨 (PENDING / REJECTED / WITHDRAWN)
    console.log(`  → 2026-06 ApprovalRequest 상태를 APPROVED 로 전환하고 7월 서명 복사`);
    if (APPLY) {
      await prisma.$transaction([
        prisma.approvalRequest.update({
          where: { id: jun.approvalRequest.id },
          data: {
            status: 'APPROVED',
            approvedAt: julAR.approvedAt,
            executiveSignature: julAR.executiveSignature,
            requesterSignature: julAR.requesterSignature || jun.approvalRequest.requesterSignature,
            rejectionReason: null,
          },
        }),
        prisma.monthlyApproval.update({
          where: { id: jun.id },
          data: { status: 'APPROVED', approvedAt: julAR.approvedAt, approverId: julAR.approverId },
        }),
      ]);
      console.log(`     ✓ 완료 — ApprovalRequest id=${jun.approvalRequest.id} 를 APPROVED 로 전환`);
    } else {
      console.log(`     (dry-run) ApprovalRequest id=${jun.approvalRequest.id} 를 APPROVED 로 전환 예정`);
    }
  }

  console.log('\n' + (APPLY ? '✓ 실제 적용 완료' : '◎ dry-run 종료 — 실제 적용하려면 --apply 추가'));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
