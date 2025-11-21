import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function restoreDatabase() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('❌ 사용법: npx tsx server/restoreDatabase.ts <백업파일명>');
    console.error('   예시: npx tsx server/restoreDatabase.ts backup_teams_2025-11-19T00-00-00.json');
    process.exit(1);
  }

  const backupFile = args[0];

  if (!fs.existsSync(backupFile)) {
    console.error(`❌ 백업 파일을 찾을 수 없습니다: ${backupFile}`);
    process.exit(1);
  }

  console.log('⚠️  경고: 이 작업은 현재 Teams 테이블의 데이터를 삭제하고 백업으로 복원합니다!');
  console.log(`📁 백업 파일: ${backupFile}\n`);

  try {
    // 백업 파일 읽기
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
    console.log(`📦 백업 정보:`);
    console.log(`   - 생성 시각: ${backupData.timestamp}`);
    console.log(`   - 팀 개수: ${backupData.teamCount}개\n`);

    console.log('🔄 복원 시작...\n');

    // 1. 모든 관련 데이터 삭제 (역순으로)
    console.log('1️⃣ 기존 데이터 삭제 중...');
    await prisma.inspectionItem.deleteMany({});
    await prisma.safetyInspection.deleteMany({});
    await prisma.inspectionTemplate.deleteMany({});
    await prisma.teamEquipment.deleteMany({});
    await prisma.reportDetail.deleteMany({});
    await prisma.dailyReport.deleteMany({});
    await prisma.templateItem.deleteMany({});
    await prisma.checklistTemplate.deleteMany({});
    await prisma.monthlyApproval.deleteMany({});
    await prisma.teamMember.deleteMany({});

    // User의 teamId를 null로 설정 (삭제 대신)
    await prisma.user.updateMany({
      where: { teamId: { not: null } },
      data: { teamId: null },
    });

    // Team 테이블 삭제
    await prisma.team.deleteMany({});
    console.log('   ✅ 기존 데이터 삭제 완료\n');

    // 2. Teams 복원
    console.log('2️⃣ Teams 복원 중...');
    for (const team of backupData.teams) {
      await prisma.team.create({
        data: {
          id: team.id,
          name: team.name,
          site: team.site,
          factoryId: team.factoryId,
          leaderId: team.leaderId,
          approverId: team.approverId,
        },
      });
    }
    console.log(`   ✅ ${backupData.teamCount}개 팀 복원 완료\n`);

    // 3. 관련 데이터 복원
    console.log('3️⃣ 관련 데이터 복원 중...');

    for (const team of backupData.teams) {
      // ChecklistTemplates & TemplateItems
      for (const template of team.checklistTemplates || []) {
        await prisma.checklistTemplate.create({
          data: {
            id: template.id,
            name: template.name,
            teamId: team.id,
            templateItems: {
              create: template.templateItems.map((item: any) => ({
                id: item.id,
                category: item.category,
                subCategory: item.subCategory,
                description: item.description,
                displayOrder: item.displayOrder,
              })),
            },
          },
        });
      }

      // InspectionTemplates
      for (const template of team.inspectionTemplates || []) {
        await prisma.inspectionTemplate.create({
          data: {
            id: template.id,
            teamId: team.id,
            equipmentName: template.equipmentName,
            displayOrder: template.displayOrder,
            isRequired: template.isRequired,
            createdAt: new Date(template.createdAt),
          },
        });
      }

      // TeamEquipments
      for (const equipment of team.teamEquipments || []) {
        await prisma.teamEquipment.create({
          data: {
            id: equipment.id,
            teamId: team.id,
            equipmentName: equipment.equipmentName,
            quantity: equipment.quantity,
            createdAt: new Date(equipment.createdAt),
            updatedAt: new Date(equipment.updatedAt),
          },
        });
      }

      // TeamMembers
      for (const member of team.teamMembers || []) {
        await prisma.teamMember.create({
          data: {
            id: member.id,
            teamId: team.id,
            name: member.name,
            role: member.role,
            createdAt: new Date(member.createdAt),
          },
        });
      }
    }

    console.log('   ✅ 관련 데이터 복원 완료\n');

    // 4. Users의 teamId 복원
    console.log('4️⃣ Users의 teamId 복원 중...');
    let userCount = 0;
    for (const team of backupData.teams) {
      for (const member of team.members || []) {
        await prisma.user.update({
          where: { id: member.id },
          data: { teamId: team.id },
        });
        userCount++;
      }
    }
    console.log(`   ✅ ${userCount}명의 사용자 teamId 복원 완료\n`);

    console.log('✅ 복원 완료!\n');
    console.log('💡 결과 확인: npx tsx server/analyzeTeams.ts');

  } catch (error) {
    console.error('❌ 복원 실패:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

restoreDatabase();
