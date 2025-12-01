import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function finalCheck() {
  console.log('='.repeat(60));
  console.log('최종 복구 상태 확인');
  console.log('='.repeat(60));

  const teams = await prisma.team.count();
  const templates = await prisma.checklistTemplate.count();
  const templateItems = await prisma.templateItem.count();
  const dailyReports = await prisma.dailyReport.count();
  const inspectionTemplates = await prisma.inspectionTemplate.count();
  const inspectionScheduleTemplates = await prisma.inspectionScheduleTemplate.count();
  const teamEquipments = await prisma.teamEquipment.count();

  const notices = await prisma.notice.count();
  const safetyInspections = await prisma.safetyInspection.count();
  const inspectionItems = await prisma.inspectionItem.count();
  const comments = await prisma.comment.count();
  const reportDetails = await prisma.reportDetail.count();
  const reportSignatures = await prisma.reportSignature.count();
  const monthlyApprovals = await prisma.monthlyApproval.count();

  console.log('\n✅ 복구 완료:');
  console.log(`  팀 (Team): ${teams}개`);
  console.log(`  체크리스트 템플릿: ${templates}개`);
  console.log(`  체크리스트 아이템: ${templateItems}개`);
  console.log(`  TBM 일지 (DailyReport): ${dailyReports}개`);
  console.log(`  안전점검 템플릿 (InspectionTemplate): ${inspectionTemplates}개`);
  console.log(`  안전점검 스케줄 템플릿: ${inspectionScheduleTemplates}개`);
  console.log(`  팀 장비 (TeamEquipment): ${teamEquipments}개`);

  console.log('\n❌ 복구 불가 (백업에 없음):');
  console.log(`  공지사항 (Notice): ${notices}개`);
  console.log(`  안전점검 실행 데이터 (SafetyInspection): ${safetyInspections}개`);
  console.log(`  안전점검 아이템 (InspectionItem): ${inspectionItems}개`);
  console.log(`  댓글 (Comment): ${comments}개`);
  console.log(`  보고서 상세 (ReportDetail): ${reportDetails}개`);
  console.log(`  보고서 서명 (ReportSignature): ${reportSignatures}개`);
  console.log(`  월별 승인 (MonthlyApproval): ${monthlyApprovals}개`);

  console.log('\n' + '='.repeat(60));

  await prisma.$disconnect();
}

finalCheck();
