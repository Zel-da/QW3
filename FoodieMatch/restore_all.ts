import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function restoreAll() {
  console.log('📦 전체 데이터 복구 시작...');

  const backup = JSON.parse(
    fs.readFileSync('backup_AFTER_phase4_FINAL_2025-11-19T07-24-09.json', 'utf-8')
  );

  console.log(`백업 타임스탬프: ${backup.timestamp}`);
  console.log(`팀: ${backup.teamCount}개`);

  // 1. 팀별 데이터 복구
  for (const team of backup.teams) {
    console.log(`\n처리 중: ${team.name}`);

    // 팀 체크 (이미 복구됨)
    let dbTeam = await prisma.team.findUnique({ where: { id: team.id } });
    if (!dbTeam) {
      dbTeam = await prisma.team.create({
        data: {
          id: team.id,
          name: team.name,
          site: team.site,
          factoryId: null,
          leaderId: null,
          approverId: null,
        }
      });
    }

    // 체크리스트 템플릿 복구
    for (const template of team.checklistTemplates || []) {
      const existingTemplate = await prisma.checklistTemplate.findUnique({
        where: { id: template.id }
      });

      if (!existingTemplate) {
        const newTemplate = await prisma.checklistTemplate.create({
          data: {
            id: template.id,
            name: template.name,
            teamId: team.id,
          }
        });

        // 템플릿 아이템 복구
        if (template.templateItems && Array.isArray(template.templateItems)) {
          for (const item of template.templateItems) {
            await prisma.templateItem.create({
              data: {
                id: item.id,
                templateId: newTemplate.id,
                category: item.category,
                subCategory: item.subCategory,
                description: item.description,
                displayOrder: item.displayOrder,
              }
            });
          }
        }
        console.log(`  ✓ 템플릿 복구: ${template.name} (${template.templateItems?.length || 0}개 아이템)`);
      }
    }

    // DailyReports 복구
    for (const report of team.dailyReports || []) {
      const existing = await prisma.dailyReport.findUnique({
        where: { id: report.id }
      });
      if (!existing && report.reportDate) {
        try {
          const reportDate = new Date(report.reportDate);
          if (isNaN(reportDate.getTime())) {
            console.log(`  ⚠️  DailyReport 건너뜀 (잘못된 날짜): ${report.reportDate}`);
            continue;
          }

          await prisma.dailyReport.create({
            data: {
              id: report.id,
              teamId: team.id,
              reportDate: reportDate,
              managerName: report.managerName,
              remarks: report.remarks,
              site: report.site,
              createdAt: report.createdAt ? new Date(report.createdAt) : new Date(),
              updatedAt: report.updatedAt ? new Date(report.updatedAt) : new Date(),
            }
          });
          console.log(`  ✓ DailyReport 복구: ${report.reportDate} - ${report.managerName}`);
        } catch (e: any) {
          console.log(`  ⚠️  DailyReport 복구 실패 (ID: ${report.id}): ${e.message}`);
        }
      }
    }

    // SafetyInspections 복구
    for (const inspection of team.safetyInspections || []) {
      const existing = await prisma.safetyInspection.findUnique({
        where: { id: inspection.id }
      });
      if (!existing) {
        const newInspection = await prisma.safetyInspection.create({
          data: {
            id: inspection.id,
            teamId: team.id,
            year: inspection.year,
            month: inspection.month,
            inspectionDate: inspection.inspectionDate ? new Date(inspection.inspectionDate) : null,
            isCompleted: inspection.isCompleted,
            completedAt: inspection.completedAt ? new Date(inspection.completedAt) : null,
            createdAt: new Date(inspection.createdAt),
            updatedAt: new Date(inspection.updatedAt),
          }
        });

        // InspectionItems 복구
        for (const item of inspection.inspectionItems || []) {
          await prisma.inspectionItem.create({
            data: {
              id: item.id,
              inspectionId: newInspection.id,
              equipmentName: item.equipmentName,
              requiredPhotoCount: item.requiredPhotoCount,
              photos: item.photos,
              remarks: item.remarks,
              isCompleted: item.isCompleted,
              uploadedAt: item.uploadedAt ? new Date(item.uploadedAt) : null,
            }
          });
        }
        console.log(`  ✓ SafetyInspection 복구: ${inspection.year}-${inspection.month} (${inspection.inspectionItems?.length || 0}개 아이템)`);
      }
    }
  }

  // 2. 공지사항 복구
  if (backup.notices && backup.notices.length > 0) {
    console.log(`\n공지사항 복구 중...`);
    for (const notice of backup.notices) {
      const existing = await prisma.notice.findUnique({
        where: { id: notice.id }
      });
      if (!existing) {
        await prisma.notice.create({
          data: {
            id: notice.id,
            title: notice.title,
            content: notice.content,
            authorId: notice.authorId,
            category: notice.category,
            isActive: notice.isActive,
            viewCount: notice.viewCount,
            imageUrl: notice.imageUrl,
            attachmentUrl: notice.attachmentUrl,
            attachmentName: notice.attachmentName,
            videoUrl: notice.videoUrl,
            videoType: notice.videoType,
            createdAt: new Date(notice.createdAt),
            updatedAt: new Date(notice.updatedAt),
          }
        });
        console.log(`  ✓ 공지사항: ${notice.title}`);
      }
    }
  }

  console.log('\n✅ 전체 복구 완료!');
}

restoreAll()
  .catch((e) => {
    console.error('❌ 복구 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
