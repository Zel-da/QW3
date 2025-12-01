import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function restore() {
  console.log('📦 백업에서 팀 데이터 복구 시작...');

  const backupData = JSON.parse(
    fs.readFileSync('backup_AFTER_phase4_FINAL_2025-11-19T07-24-09.json', 'utf-8')
  );

  console.log(`복구할 팀: ${backupData.teamCount}개`);

  // 현재 모든 팀 데이터 삭제
  console.log('기존 모든 팀 데이터 삭제 중...');
  await prisma.templateItem.deleteMany({});
  await prisma.checklistTemplate.deleteMany({});
  await prisma.dailyReport.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.teamEquipment.deleteMany({});
  await prisma.team.deleteMany({}); // 모든 팀 삭제
  console.log('삭제 완료');

  // 팀 데이터 복구
  for (const team of backupData.teams) {
    console.log(`복구 중: ${team.name}`);

    const restoredTeam = await prisma.team.create({
      data: {
        id: team.id,
        name: team.name,
        site: team.site,
        factoryId: null, // 외래 키는 일단 null
        leaderId: null,
        approverId: null,
      }
    });

    // 체크리스트 템플릿 복구
    for (const template of team.checklistTemplates) {
      const restoredTemplate = await prisma.checklistTemplate.create({
        data: {
          id: template.id,
          name: template.name,
          teamId: restoredTeam.id,
        }
      });

      // 템플릿 아이템 복구
      if (template.templateItems && Array.isArray(template.templateItems)) {
        for (const item of template.templateItems) {
          await prisma.templateItem.create({
            data: {
              id: item.id,
              templateId: restoredTemplate.id,
              category: item.category,
              subCategory: item.subCategory,
              description: item.description,
              displayOrder: item.displayOrder,
            }
          });
        }
      }
    }
  }

  console.log('✅ 복구 완료!');

  // 복구된 팀 수 확인
  const teamCount = await prisma.team.count();
  console.log(`현재 팀 수: ${teamCount}개`);
}

restore()
  .catch((e) => {
    console.error('❌ 복구 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
