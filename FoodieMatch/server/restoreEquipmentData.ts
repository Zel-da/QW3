import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BackupData {
  timestamp: string;
  teamEquipments: Array<{
    id: number;
    teamId: number;
    teamName: string;
    equipmentName: string;
    quantity: number;
    createdAt: string;
    updatedAt: string;
  }>;
  inspectionScheduleTemplates: Array<{
    id: number;
    factoryId: number;
    month: number;
    equipmentName: string;
    displayOrder: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

async function restoreEquipmentData(backupFilePath: string) {
  try {
    console.log('====================================');
    console.log('장비 데이터 복원 시작');
    console.log('====================================\n');

    // 백업 파일 읽기
    if (!fs.existsSync(backupFilePath)) {
      console.log(`❌ 백업 파일을 찾을 수 없습니다: ${backupFilePath}`);
      process.exit(1);
    }

    const backupData: BackupData = JSON.parse(
      fs.readFileSync(backupFilePath, 'utf-8')
    );

    console.log(`✓ 백업 파일 로드: ${path.basename(backupFilePath)}`);
    console.log(`✓ 백업 시간: ${backupData.timestamp}\n`);

    console.log('백업 데이터 내용:');
    console.log(`- TeamEquipment: ${backupData.teamEquipments.length}개`);
    console.log(`- InspectionScheduleTemplate: ${backupData.inspectionScheduleTemplates.length}개\n`);

    // 확인 메시지
    console.log('⚠️  경고: 현재 데이터를 삭제하고 백업 데이터로 복원합니다.');
    console.log('⚠️  이 작업은 되돌릴 수 없습니다.\n');

    // 아산공장 찾기
    const asanFactory = await prisma.factory.findFirst({
      where: { code: 'ASAN' }
    });

    if (!asanFactory) {
      console.log('❌ 아산공장을 찾을 수 없습니다.');
      return;
    }

    const asanTeams = await prisma.team.findMany({
      where: { factoryId: asanFactory.id }
    });

    const teamIds = asanTeams.map(t => t.id);

    console.log('복원 시작...\n');

    // 트랜잭션으로 복원
    await prisma.$transaction(async (tx) => {
      // 1. 기존 TeamEquipment 삭제
      const deletedTE = await tx.teamEquipment.deleteMany({
        where: { teamId: { in: teamIds } }
      });
      console.log(`✓ 기존 TeamEquipment 삭제: ${deletedTE.count}개`);

      // 2. 기존 InspectionScheduleTemplate 삭제
      const deletedIST = await tx.inspectionScheduleTemplate.deleteMany({
        where: { factoryId: asanFactory.id }
      });
      console.log(`✓ 기존 InspectionScheduleTemplate 삭제: ${deletedIST.count}개\n`);

      // 3. TeamEquipment 복원
      console.log('TeamEquipment 복원 중...');
      for (const eq of backupData.teamEquipments) {
        await tx.teamEquipment.create({
          data: {
            teamId: eq.teamId,
            equipmentName: eq.equipmentName,
            quantity: eq.quantity
          }
        });
      }
      console.log(`✓ TeamEquipment 복원 완료: ${backupData.teamEquipments.length}개`);

      // 4. InspectionScheduleTemplate 복원
      console.log('InspectionScheduleTemplate 복원 중...');
      for (const st of backupData.inspectionScheduleTemplates) {
        await tx.inspectionScheduleTemplate.create({
          data: {
            factoryId: st.factoryId,
            month: st.month,
            equipmentName: st.equipmentName,
            displayOrder: st.displayOrder
          }
        });
      }
      console.log(`✓ InspectionScheduleTemplate 복원 완료: ${backupData.inspectionScheduleTemplates.length}개`);
    });

    console.log();
    console.log('====================================');
    console.log('복원 완료!');
    console.log('====================================');

  } catch (error) {
    console.error('❌ 복원 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 실행
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('사용법: npx tsx server/restoreEquipmentData.ts <백업파일명>');
  console.log('예시: npx tsx server/restoreEquipmentData.ts backup_equipment_BEFORE_cleanup_2025-11-20T12-00-00.json');
  process.exit(1);
}

const backupFile = path.join(process.cwd(), args[0]);
restoreEquipmentData(backupFile);
