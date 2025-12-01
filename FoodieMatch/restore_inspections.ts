import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function restoreInspections() {
  console.log('📦 안전점검 데이터 복구 시작...');

  const backup = JSON.parse(
    fs.readFileSync('backup_AFTER_phase4_FINAL_2025-11-19T07-24-09.json', 'utf-8')
  );

  const equipmentBackup = JSON.parse(
    fs.readFileSync('backup_equipment_BEFORE_cleanup_2025-11-20T08-02-40.json', 'utf-8')
  );

  let templateCount = 0;
  let scheduleTemplateCount = 0;

  // 1. InspectionTemplates 복구 (팀별)
  console.log('\nInspectionTemplates 복구 중...');
  for (const team of backup.teams || []) {
    for (const template of team.inspectionTemplates || []) {
      const existing = await prisma.inspectionTemplate.findUnique({
        where: { id: template.id }
      });
      if (!existing) {
        try {
          await prisma.inspectionTemplate.create({
            data: {
              id: template.id,
              teamId: template.teamId,
              equipmentName: template.equipmentName,
              displayOrder: template.displayOrder,
              isRequired: template.isRequired,
              createdAt: template.createdAt ? new Date(template.createdAt) : new Date(),
            }
          });
          templateCount++;
        } catch (e: any) {
          console.log(`  ⚠️  InspectionTemplate 복구 실패 (ID: ${template.id}): ${e.message}`);
        }
      }
    }
  }
  console.log(`✅ InspectionTemplates: ${templateCount}개 복구`);

  // 2. InspectionScheduleTemplates 복구
  console.log('\nInspectionScheduleTemplates 복구 중...');
  for (const scheduleTemplate of equipmentBackup.inspectionScheduleTemplates || []) {
    const existing = await prisma.inspectionScheduleTemplate.findUnique({
      where: { id: scheduleTemplate.id }
    });
    if (!existing) {
      try {
        await prisma.inspectionScheduleTemplate.create({
          data: {
            id: scheduleTemplate.id,
            factoryId: scheduleTemplate.factoryId,
            month: scheduleTemplate.month,
            equipmentName: scheduleTemplate.equipmentName,
            displayOrder: scheduleTemplate.displayOrder,
            createdAt: scheduleTemplate.createdAt ? new Date(scheduleTemplate.createdAt) : new Date(),
            updatedAt: scheduleTemplate.updatedAt ? new Date(scheduleTemplate.updatedAt) : new Date(),
          }
        });
        scheduleTemplateCount++;
      } catch (e: any) {
        console.log(`  ⚠️  InspectionScheduleTemplate 복구 실패 (ID: ${scheduleTemplate.id}): ${e.message}`);
      }
    }
  }
  console.log(`✅ InspectionScheduleTemplates: ${scheduleTemplateCount}개 복구`);

  console.log('\n✅ 안전점검 데이터 복구 완료!');
}

restoreInspections()
  .catch((e) => {
    console.error('❌ 복구 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
