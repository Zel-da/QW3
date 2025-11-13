const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function syncMonthlyApproval() {
  console.log('='.repeat(60));
  console.log('🔄 MonthlyApproval 상태 동기화');
  console.log('='.repeat(60));

  try {
    const monthlyApproval = await prisma.monthlyApproval.findFirst({
      where: {
        teamId: 3,
        year: 2025,
        month: 11
      },
      include: {
        approvalRequest: true
      }
    });

    if (!monthlyApproval) {
      console.log('❌ 월별 보고서를 찾을 수 없습니다.');
      return;
    }

    if (!monthlyApproval.approvalRequest) {
      console.log('❌ ApprovalRequest가 없습니다.');
      return;
    }

    const approval = monthlyApproval.approvalRequest;

    console.log('\n📋 현재 상태:');
    console.log(`  - ApprovalRequest 상태: ${approval.status}`);
    console.log(`  - ApprovalRequest approvedAt: ${approval.approvedAt}`);
    console.log(`  - MonthlyApproval 상태: ${monthlyApproval.status}`);
    console.log(`  - MonthlyApproval approvedAt: ${monthlyApproval.approvedAt}`);

    if (approval.status === 'APPROVED' && monthlyApproval.status !== 'APPROVED') {
      console.log('\n⚠️  상태 불일치 발견! MonthlyApproval을 APPROVED로 업데이트합니다...');

      await prisma.monthlyApproval.update({
        where: { id: monthlyApproval.id },
        data: {
          status: 'APPROVED',
          approvedAt: approval.approvedAt,
          approverId: approval.approverId
        }
      });

      console.log('✅ MonthlyApproval 상태 업데이트 완료!');
      console.log(`  - 상태: APPROVED`);
      console.log(`  - approvedAt: ${approval.approvedAt}`);
      console.log(`  - approverId: ${approval.approverId}`);
    } else {
      console.log('\n✅ 상태가 이미 동기화되어 있습니다.');
    }

  } catch (error) {
    console.error('❌ 에러:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncMonthlyApproval();
