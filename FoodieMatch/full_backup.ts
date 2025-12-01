import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function fullBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData: any = {};

  console.log('📦 전체 데이터베이스 백업 시작...\n');

  try {
    // 모든 테이블 백업
    console.log('1. Factory (공장)...');
    backupData.factories = await prisma.factory.findMany();
    console.log(`   ✅ ${backupData.factories.length}개`);

    console.log('2. Team (팀)...');
    backupData.teams = await prisma.team.findMany();
    console.log(`   ✅ ${backupData.teams.length}개`);

    console.log('3. TeamMember (팀원)...');
    backupData.teamMembers = await prisma.teamMember.findMany();
    console.log(`   ✅ ${backupData.teamMembers.length}개`);

    console.log('4. TeamEquipment (팀 장비)...');
    backupData.teamEquipments = await prisma.teamEquipment.findMany();
    console.log(`   ✅ ${backupData.teamEquipments.length}개`);

    console.log('5. User (사용자)...');
    backupData.users = await prisma.user.findMany();
    console.log(`   ✅ ${backupData.users.length}개`);

    console.log('6. ChecklistTemplate (체크리스트 템플릿)...');
    backupData.checklistTemplates = await prisma.checklistTemplate.findMany();
    console.log(`   ✅ ${backupData.checklistTemplates.length}개`);

    console.log('7. TemplateItem (템플릿 항목)...');
    backupData.templateItems = await prisma.templateItem.findMany();
    console.log(`   ✅ ${backupData.templateItems.length}개`);

    console.log('8. DailyReport (일일 보고서)...');
    backupData.dailyReports = await prisma.dailyReport.findMany();
    console.log(`   ✅ ${backupData.dailyReports.length}개`);

    console.log('9. ReportDetail (보고서 상세)...');
    backupData.reportDetails = await prisma.reportDetail.findMany();
    console.log(`   ✅ ${backupData.reportDetails.length}개`);

    console.log('10. ReportSignature (서명)...');
    backupData.reportSignatures = await prisma.reportSignature.findMany();
    console.log(`   ✅ ${backupData.reportSignatures.length}개`);

    console.log('11. AbsenceRecord (부재 기록)...');
    backupData.absenceRecords = await prisma.absenceRecord.findMany();
    console.log(`   ✅ ${backupData.absenceRecords.length}개`);

    console.log('12. MonthlyApproval (월별 결재)...');
    backupData.monthlyApprovals = await prisma.monthlyApproval.findMany();
    console.log(`   ✅ ${backupData.monthlyApprovals.length}개`);

    console.log('13. ApprovalRequest (결재 요청)...');
    backupData.approvalRequests = await prisma.approvalRequest.findMany();
    console.log(`   ✅ ${backupData.approvalRequests.length}개`);

    console.log('14. Notice (공지사항)...');
    backupData.notices = await prisma.notice.findMany();
    console.log(`   ✅ ${backupData.notices.length}개`);

    console.log('15. NoticeRead (공지 읽음)...');
    backupData.noticeReads = await prisma.noticeRead.findMany();
    console.log(`   ✅ ${backupData.noticeReads.length}개`);

    console.log('16. Comment (댓글)...');
    backupData.comments = await prisma.comment.findMany();
    console.log(`   ✅ ${backupData.comments.length}개`);

    console.log('17. Attachment (첨부파일)...');
    backupData.attachments = await prisma.attachment.findMany();
    console.log(`   ✅ ${backupData.attachments.length}개`);

    console.log('18. Course (교육과정)...');
    backupData.courses = await prisma.course.findMany();
    console.log(`   ✅ ${backupData.courses.length}개`);

    console.log('19. UserProgress (진행률)...');
    backupData.userProgress = await prisma.userProgress.findMany();
    console.log(`   ✅ ${backupData.userProgress.length}개`);

    console.log('20. Assessment (평가문제)...');
    backupData.assessments = await prisma.assessment.findMany();
    console.log(`   ✅ ${backupData.assessments.length}개`);

    console.log('21. UserAssessment (평가기록)...');
    backupData.userAssessments = await prisma.userAssessment.findMany();
    console.log(`   ✅ ${backupData.userAssessments.length}개`);

    console.log('22. Certificate (수료증)...');
    backupData.certificates = await prisma.certificate.findMany();
    console.log(`   ✅ ${backupData.certificates.length}개`);

    console.log('23. InspectionTemplate (점검 템플릿)...');
    backupData.inspectionTemplates = await prisma.inspectionTemplate.findMany();
    console.log(`   ✅ ${backupData.inspectionTemplates.length}개`);

    console.log('24. InspectionScheduleTemplate (점검 일정 템플릿)...');
    backupData.inspectionScheduleTemplates = await prisma.inspectionScheduleTemplate.findMany();
    console.log(`   ✅ ${backupData.inspectionScheduleTemplates.length}개`);

    console.log('25. MonthlyInspectionDay (월별 점검일)...');
    backupData.monthlyInspectionDays = await prisma.monthlyInspectionDay.findMany();
    console.log(`   ✅ ${backupData.monthlyInspectionDays.length}개`);

    console.log('26. SafetyInspection (안전점검)...');
    backupData.safetyInspections = await prisma.safetyInspection.findMany();
    console.log(`   ✅ ${backupData.safetyInspections.length}개`);

    console.log('27. InspectionItem (점검항목)...');
    backupData.inspectionItems = await prisma.inspectionItem.findMany();
    console.log(`   ✅ ${backupData.inspectionItems.length}개`);

    console.log('28. SimpleEmailConfig (이메일 설정)...');
    backupData.simpleEmailConfigs = await prisma.simpleEmailConfig.findMany();
    console.log(`   ✅ ${backupData.simpleEmailConfigs.length}개`);

    console.log('29. EmailLog (이메일 로그)...');
    backupData.emailLogs = await prisma.emailLog.findMany();
    console.log(`   ✅ ${backupData.emailLogs.length}개`);

    console.log('30. Holiday (공휴일)...');
    backupData.holidays = await prisma.holiday.findMany();
    console.log(`   ✅ ${backupData.holidays.length}개`);

    // 백업 파일 저장
    const filename = `backup_COMPLETE_${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
    console.log(`\n🎉 전체 백업 완료: ${filename}`);

  } catch (error) {
    console.error('❌ 백업 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fullBackup();
