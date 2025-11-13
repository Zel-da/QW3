const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkState() {
  console.log('='.repeat(60));
  console.log('📊 팀 3의 2025년 11월 현재 상태 확인');
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

    console.log('\n📋 MonthlyApproval 상태:');
    console.log(`  - ID: ${monthlyApproval.id}`);
    console.log(`  - 상태: ${monthlyApproval.status}`);
    console.log(`  - approvedAt: ${monthlyApproval.approvedAt}`);
    console.log(`  - approverId: ${monthlyApproval.approverId}`);

    if (monthlyApproval.approvalRequest) {
      console.log('\n📋 ApprovalRequest 상태:');
      console.log(`  - ID: ${monthlyApproval.approvalRequest.id}`);
      console.log(`  - 상태: ${monthlyApproval.approvalRequest.status}`);
      console.log(`  - approvedAt: ${monthlyApproval.approvalRequest.approvedAt}`);
      console.log(`  - reportId: ${monthlyApproval.approvalRequest.reportId}`);
    } else {
      console.log('\n✅ ApprovalRequest가 없습니다.');
    }

  } catch (error) {
    console.error('❌ 에러:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkState();
