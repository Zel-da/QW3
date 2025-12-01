import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function backupAllData() {
  console.log('Starting full database backup...');

  const backup: Record<string, any> = {};

  // Users
  console.log('Backing up users...');
  backup.users = await prisma.user.findMany();

  // Teams
  console.log('Backing up teams...');
  backup.teams = await prisma.team.findMany();

  // TeamMembers
  console.log('Backing up teamMembers...');
  backup.teamMembers = await prisma.teamMember.findMany();

  // TeamEquipments
  console.log('Backing up teamEquipments...');
  backup.teamEquipments = await prisma.teamEquipment.findMany();

  // Factories
  console.log('Backing up factories...');
  backup.factories = await prisma.factory.findMany();

  // Courses
  console.log('Backing up courses...');
  backup.courses = await prisma.course.findMany();

  // UserProgress
  console.log('Backing up userProgress...');
  backup.userProgress = await prisma.userProgress.findMany();

  // Assessments
  console.log('Backing up assessments...');
  backup.assessments = await prisma.assessment.findMany();

  // UserAssessments
  console.log('Backing up userAssessments...');
  backup.userAssessments = await prisma.userAssessment.findMany();

  // Certificates
  console.log('Backing up certificates...');
  backup.certificates = await prisma.certificate.findMany();

  // Notices
  console.log('Backing up notices...');
  backup.notices = await prisma.notice.findMany();

  // NoticeReads
  console.log('Backing up noticeReads...');
  backup.noticeReads = await prisma.noticeRead.findMany();

  // Comments
  console.log('Backing up comments...');
  backup.comments = await prisma.comment.findMany();

  // Attachments
  console.log('Backing up attachments...');
  backup.attachments = await prisma.attachment.findMany();

  // DailyReports (TBM)
  console.log('Backing up dailyReports...');
  backup.dailyReports = await prisma.dailyReport.findMany();

  // ReportDetails
  console.log('Backing up reportDetails...');
  backup.reportDetails = await prisma.reportDetail.findMany();

  // ReportSignatures
  console.log('Backing up reportSignatures...');
  backup.reportSignatures = await prisma.reportSignature.findMany();

  // AbsenceRecords
  console.log('Backing up absenceRecords...');
  backup.absenceRecords = await prisma.absenceRecord.findMany();

  // ChecklistTemplates
  console.log('Backing up checklistTemplates...');
  backup.checklistTemplates = await prisma.checklistTemplate.findMany();

  // TemplateItems
  console.log('Backing up templateItems...');
  backup.templateItems = await prisma.templateItem.findMany();

  // MonthlyApprovals
  console.log('Backing up monthlyApprovals...');
  backup.monthlyApprovals = await prisma.monthlyApproval.findMany();

  // ApprovalRequests
  console.log('Backing up approvalRequests...');
  backup.approvalRequests = await prisma.approvalRequest.findMany();

  // InspectionTemplates
  console.log('Backing up inspectionTemplates...');
  backup.inspectionTemplates = await prisma.inspectionTemplate.findMany();

  // InspectionScheduleTemplates
  console.log('Backing up inspectionScheduleTemplates...');
  backup.inspectionScheduleTemplates = await prisma.inspectionScheduleTemplate.findMany();

  // MonthlyInspectionDays
  console.log('Backing up monthlyInspectionDays...');
  backup.monthlyInspectionDays = await prisma.monthlyInspectionDay.findMany();

  // SafetyInspections
  console.log('Backing up safetyInspections...');
  backup.safetyInspections = await prisma.safetyInspection.findMany();

  // InspectionItems
  console.log('Backing up inspectionItems...');
  backup.inspectionItems = await prisma.inspectionItem.findMany();

  // SimpleEmailConfigs
  console.log('Backing up simpleEmailConfigs...');
  backup.simpleEmailConfigs = await prisma.simpleEmailConfig.findMany();

  // EmailLogs
  console.log('Backing up emailLogs...');
  backup.emailLogs = await prisma.emailLog.findMany();

  // Holidays
  console.log('Backing up holidays...');
  backup.holidays = await prisma.holiday.findMany();

  // UserSessions
  console.log('Backing up userSessions...');
  backup.userSessions = await prisma.userSession.findMany();

  // Save to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup_FULL_${timestamp}.json`;

  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));

  console.log(`\n=== Backup completed successfully! ===`);
  console.log(`Saved to: ${filename}`);
  console.log('\nSummary:');
  let totalRecords = 0;
  for (const [table, data] of Object.entries(backup)) {
    const count = Array.isArray(data) ? data.length : 1;
    totalRecords += count;
    console.log(`  ${table}: ${count} records`);
  }
  console.log(`\nTotal: ${totalRecords} records`);
}

backupAllData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
