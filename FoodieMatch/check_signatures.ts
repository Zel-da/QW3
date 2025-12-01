import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  // 최근 결재 요청 확인
  const approvals = await prisma.approvalRequest.findMany({
    take: 5,
    orderBy: { requestedAt: 'desc' },
    include: {
      approver: { select: { name: true } },
      monthlyReport: { select: { teamId: true, year: true, month: true } }
    }
  });

  console.log('=== Recent Approval Requests ===');
  for (const a of approvals) {
    console.log('- ID:', a.id);
    console.log('  Status:', a.status);
    console.log('  Approver:', a.approver?.name || 'N/A');
    console.log('  Has Signature:', !!a.executiveSignature);
    console.log('  Signature Length:', a.executiveSignature?.length || 0);
    console.log('');
  }

  // MonthlyApproval과 ApprovalRequest 관계 확인
  const monthlyApprovals = await prisma.monthlyApproval.findMany({
    take: 5,
    orderBy: { submittedAt: 'desc' },
    include: {
      approvalRequest: {
        include: { approver: true }
      },
      team: { select: { name: true } }
    }
  });

  console.log('=== Monthly Approvals with ApprovalRequest ===');
  for (const ma of monthlyApprovals) {
    console.log('- Team:', ma.team?.name);
    console.log('  Year/Month:', ma.year, '/', ma.month);
    console.log('  Status:', ma.status);
    console.log('  Has ApprovalRequest:', !!ma.approvalRequest);
    if (ma.approvalRequest) {
      console.log('  ApprovalRequest Status:', ma.approvalRequest.status);
      console.log('  ApprovalRequest Approver:', ma.approvalRequest.approver?.name);
      console.log('  ApprovalRequest Has Signature:', !!ma.approvalRequest.executiveSignature);
    }
    console.log('');
  }

  await prisma.$disconnect();
}

check();
