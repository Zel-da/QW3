const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteAllApproved() {
  console.log('='.repeat(60));
  console.log('🗑️  팀 3의 모든 APPROVED 결재 요청 삭제');
  console.log('='.repeat(60));

  try {
    // 팀 3의 2025년 11월 월별 보고서 찾기
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

    console.log('\n📋 현재 상태:');
    console.log(`  - MonthlyApproval 상태: ${monthlyApproval.status}`);
    if (monthlyApproval.approvalRequest) {
      console.log(`  - ApprovalRequest ID: ${monthlyApproval.approvalRequest.id}`);
      console.log(`  - ApprovalRequest 상태: ${monthlyApproval.approvalRequest.status}`);

      // ApprovalRequest 삭제
      await prisma.approvalRequest.delete({
        where: { id: monthlyApproval.approvalRequest.id }
      });
      console.log('\n✅ ApprovalRequest 삭제 완료');
    }

    // MonthlyApproval 상태를 SUBMITTED로 초기화
    await prisma.monthlyApproval.update({
      where: { id: monthlyApproval.id },
      data: {
        status: 'SUBMITTED',
        approvedAt: null,
        approverId: null
      }
    });

    console.log('✅ MonthlyApproval 상태를 SUBMITTED로 초기화');
    console.log('\n✅ 모든 작업 완료! 이제 새로운 결재 요청을 할 수 있습니다.');

  } catch (error) {
    console.error('❌ 에러:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllApproved();
