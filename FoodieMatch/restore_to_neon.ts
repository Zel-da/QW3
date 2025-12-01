/**
 * 로컬 DB 백업을 Neon으로 복원하는 스크립트
 * 외래키 순서를 고려하여 복원
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function restoreData() {
  // 가장 최신 백업 파일 찾기
  const backupFiles = fs.readdirSync('.').filter(f => f.startsWith('backup_FULL_') && f.endsWith('.json'));
  if (backupFiles.length === 0) {
    console.error('No backup file found!');
    process.exit(1);
  }

  const latestBackup = backupFiles.sort().reverse()[0];
  console.log(`Using backup file: ${latestBackup}`);

  const backup = JSON.parse(fs.readFileSync(latestBackup, 'utf-8'));

  console.log('\n=== Starting data restoration to Neon ===\n');

  // Phase 1: 기본 테이블 (외래키 없음)
  console.log('--- Phase 1: Base tables ---');

  // 1. Factories
  if (backup.factories?.length > 0) {
    console.log(`Restoring ${backup.factories.length} factories...`);
    for (const item of backup.factories) {
      try {
        await prisma.factory.upsert({
          where: { id: item.id },
          update: { name: item.name, code: item.code },
          create: item
        });
      } catch (e) { console.log(`  Skip factory ${item.id}: ${(e as Error).message.slice(0,50)}`); }
    }
  }

  // 2. Teams (먼저 외래키 없이 생성)
  if (backup.teams?.length > 0) {
    console.log(`Restoring ${backup.teams.length} teams...`);
    for (const item of backup.teams) {
      try {
        await prisma.team.upsert({
          where: { id: item.id },
          update: { name: item.name, site: item.site, factoryId: item.factoryId },
          create: { id: item.id, name: item.name, site: item.site, factoryId: item.factoryId }
        });
      } catch (e) { console.log(`  Skip team ${item.id}: ${(e as Error).message.slice(0,50)}`); }
    }
  }

  // 3. Users (teamId 없이 먼저 생성)
  if (backup.users?.length > 0) {
    console.log(`Restoring ${backup.users.length} users...`);
    for (const item of backup.users) {
      try {
        const { teamId, ...userWithoutTeam } = item;
        await prisma.user.upsert({
          where: { id: item.id },
          update: userWithoutTeam,
          create: userWithoutTeam
        });
      } catch (e) { console.log(`  Skip user ${item.id}: ${(e as Error).message.slice(0,50)}`); }
    }
  }

  // Phase 2: 외래키 관계 업데이트
  console.log('\n--- Phase 2: Update foreign key relationships ---');

  // Users의 teamId 업데이트
  if (backup.users?.length > 0) {
    console.log('Updating user teamId relationships...');
    for (const item of backup.users) {
      if (item.teamId) {
        try {
          await prisma.user.update({
            where: { id: item.id },
            data: { teamId: item.teamId }
          });
        } catch (e) { /* ignore */ }
      }
    }
  }

  // Teams의 leaderId, approverId 업데이트
  if (backup.teams?.length > 0) {
    console.log('Updating team leader/approver relationships...');
    for (const item of backup.teams) {
      try {
        await prisma.team.update({
          where: { id: item.id },
          data: { leaderId: item.leaderId, approverId: item.approverId }
        });
      } catch (e) { /* ignore */ }
    }
  }

  // Phase 3: 나머지 테이블들
  console.log('\n--- Phase 3: Remaining tables ---');

  // TeamMembers
  if (backup.teamMembers?.length > 0) {
    console.log(`Restoring ${backup.teamMembers.length} teamMembers...`);
    for (const item of backup.teamMembers) {
      try {
        await prisma.teamMember.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // TeamEquipments
  if (backup.teamEquipments?.length > 0) {
    console.log(`Restoring ${backup.teamEquipments.length} teamEquipments...`);
    for (const item of backup.teamEquipments) {
      try {
        await prisma.teamEquipment.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // Courses
  if (backup.courses?.length > 0) {
    console.log(`Restoring ${backup.courses.length} courses...`);
    for (const item of backup.courses) {
      try {
        await prisma.course.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // Assessments
  if (backup.assessments?.length > 0) {
    console.log(`Restoring ${backup.assessments.length} assessments...`);
    for (const item of backup.assessments) {
      try {
        await prisma.assessment.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // UserProgress
  if (backup.userProgress?.length > 0) {
    console.log(`Restoring ${backup.userProgress.length} userProgress...`);
    for (const item of backup.userProgress) {
      try {
        await prisma.userProgress.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // UserAssessments
  if (backup.userAssessments?.length > 0) {
    console.log(`Restoring ${backup.userAssessments.length} userAssessments...`);
    for (const item of backup.userAssessments) {
      try {
        await prisma.userAssessment.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // Certificates
  if (backup.certificates?.length > 0) {
    console.log(`Restoring ${backup.certificates.length} certificates...`);
    for (const item of backup.certificates) {
      try {
        await prisma.certificate.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // Notices
  if (backup.notices?.length > 0) {
    console.log(`Restoring ${backup.notices.length} notices...`);
    for (const item of backup.notices) {
      try {
        await prisma.notice.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // NoticeReads
  if (backup.noticeReads?.length > 0) {
    console.log(`Restoring ${backup.noticeReads.length} noticeReads...`);
    for (const item of backup.noticeReads) {
      try {
        await prisma.noticeRead.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // Comments
  if (backup.comments?.length > 0) {
    console.log(`Restoring ${backup.comments.length} comments...`);
    for (const item of backup.comments) {
      try {
        await prisma.comment.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // ChecklistTemplates
  if (backup.checklistTemplates?.length > 0) {
    console.log(`Restoring ${backup.checklistTemplates.length} checklistTemplates...`);
    for (const item of backup.checklistTemplates) {
      try {
        await prisma.checklistTemplate.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // TemplateItems
  if (backup.templateItems?.length > 0) {
    console.log(`Restoring ${backup.templateItems.length} templateItems...`);
    for (const item of backup.templateItems) {
      try {
        await prisma.templateItem.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // DailyReports
  if (backup.dailyReports?.length > 0) {
    console.log(`Restoring ${backup.dailyReports.length} dailyReports...`);
    for (const item of backup.dailyReports) {
      try {
        await prisma.dailyReport.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // ReportDetails
  if (backup.reportDetails?.length > 0) {
    console.log(`Restoring ${backup.reportDetails.length} reportDetails...`);
    for (const item of backup.reportDetails) {
      try {
        await prisma.reportDetail.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // ReportSignatures
  if (backup.reportSignatures?.length > 0) {
    console.log(`Restoring ${backup.reportSignatures.length} reportSignatures...`);
    for (const item of backup.reportSignatures) {
      try {
        await prisma.reportSignature.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // AbsenceRecords
  if (backup.absenceRecords?.length > 0) {
    console.log(`Restoring ${backup.absenceRecords.length} absenceRecords...`);
    for (const item of backup.absenceRecords) {
      try {
        await prisma.absenceRecord.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // MonthlyApprovals
  if (backup.monthlyApprovals?.length > 0) {
    console.log(`Restoring ${backup.monthlyApprovals.length} monthlyApprovals...`);
    for (const item of backup.monthlyApprovals) {
      try {
        await prisma.monthlyApproval.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // ApprovalRequests
  if (backup.approvalRequests?.length > 0) {
    console.log(`Restoring ${backup.approvalRequests.length} approvalRequests...`);
    for (const item of backup.approvalRequests) {
      try {
        await prisma.approvalRequest.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // Attachments
  if (backup.attachments?.length > 0) {
    console.log(`Restoring ${backup.attachments.length} attachments...`);
    for (const item of backup.attachments) {
      try {
        await prisma.attachment.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // InspectionTemplates
  if (backup.inspectionTemplates?.length > 0) {
    console.log(`Restoring ${backup.inspectionTemplates.length} inspectionTemplates...`);
    for (const item of backup.inspectionTemplates) {
      try {
        await prisma.inspectionTemplate.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // InspectionScheduleTemplates
  if (backup.inspectionScheduleTemplates?.length > 0) {
    console.log(`Restoring ${backup.inspectionScheduleTemplates.length} inspectionScheduleTemplates...`);
    for (const item of backup.inspectionScheduleTemplates) {
      try {
        await prisma.inspectionScheduleTemplate.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // MonthlyInspectionDays
  if (backup.monthlyInspectionDays?.length > 0) {
    console.log(`Restoring ${backup.monthlyInspectionDays.length} monthlyInspectionDays...`);
    for (const item of backup.monthlyInspectionDays) {
      try {
        await prisma.monthlyInspectionDay.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // SafetyInspections
  if (backup.safetyInspections?.length > 0) {
    console.log(`Restoring ${backup.safetyInspections.length} safetyInspections...`);
    for (const item of backup.safetyInspections) {
      try {
        await prisma.safetyInspection.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // InspectionItems
  if (backup.inspectionItems?.length > 0) {
    console.log(`Restoring ${backup.inspectionItems.length} inspectionItems...`);
    for (const item of backup.inspectionItems) {
      try {
        await prisma.inspectionItem.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // SimpleEmailConfigs
  if (backup.simpleEmailConfigs?.length > 0) {
    console.log(`Restoring ${backup.simpleEmailConfigs.length} simpleEmailConfigs...`);
    for (const item of backup.simpleEmailConfigs) {
      try {
        await prisma.simpleEmailConfig.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // EmailLogs
  if (backup.emailLogs?.length > 0) {
    console.log(`Restoring ${backup.emailLogs.length} emailLogs...`);
    for (const item of backup.emailLogs) {
      try {
        await prisma.emailLog.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  // Holidays
  if (backup.holidays?.length > 0) {
    console.log(`Restoring ${backup.holidays.length} holidays...`);
    for (const item of backup.holidays) {
      try {
        await prisma.holiday.upsert({ where: { id: item.id }, update: item, create: item });
      } catch (e) { /* ignore */ }
    }
  }

  console.log('\n=== Data restoration completed! ===');

  // 검증
  const counts = {
    users: await prisma.user.count(),
    teams: await prisma.team.count(),
    courses: await prisma.course.count(),
    dailyReports: await prisma.dailyReport.count()
  };
  console.log('\nVerification:', counts);
}

restoreData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
