import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const notices = await prisma.notice.count();
  const dailyReports = await prisma.dailyReport.count();
  const safetyInspections = await prisma.safetyInspection.count();
  const comments = await prisma.comment.count();
  const reportDetails = await prisma.reportDetail.count();
  const monthlyApprovals = await prisma.monthlyApproval.count();

  console.log(`현재 DB 상태:`);
  console.log(`  공지사항 (Notice): ${notices}개`);
  console.log(`  TBM 일지 (DailyReport): ${dailyReports}개`);
  console.log(`  안전점검 (SafetyInspection): ${safetyInspections}개`);
  console.log(`  댓글 (Comment): ${comments}개`);
  console.log(`  보고서 상세 (ReportDetail): ${reportDetails}개`);
  console.log(`  월별 승인 (MonthlyApproval): ${monthlyApprovals}개`);

  await prisma.$disconnect();
}

check();
