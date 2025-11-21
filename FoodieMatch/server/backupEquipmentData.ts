import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BackupData {
  timestamp: string;
  teamEquipments: any[];
  inspectionScheduleTemplates: any[];
}

async function backupEquipmentData() {
  try {
    console.log('====================================');
    console.log('장비 데이터 백업 시작');
    console.log('====================================\n');

    // 아산공장 찾기
    const asanFactory = await prisma.factory.findFirst({
      where: { code: 'ASAN' }
    });

    if (!asanFactory) {
      console.log('❌ 아산공장을 찾을 수 없습니다.');
      return;
    }

    console.log(`✓ 아산공장 ID: ${asanFactory.id}\n`);

    // 아산공장 팀들
    const asanTeams = await prisma.team.findMany({
      where: { factoryId: asanFactory.id }
    });

    const teamIds = asanTeams.map(t => t.id);
    console.log(`✓ 아산공장 팀 수: ${asanTeams.length}\n`);

    // TeamEquipment 백업
    const teamEquipments = await prisma.teamEquipment.findMany({
      where: { teamId: { in: teamIds } },
      include: {
        team: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`✓ TeamEquipment 레코드: ${teamEquipments.length}개`);

    // InspectionScheduleTemplate 백업
    const scheduleTemplates = await prisma.inspectionScheduleTemplate.findMany({
      where: { factoryId: asanFactory.id }
    });

    console.log(`✓ InspectionScheduleTemplate 레코드: ${scheduleTemplates.length}개\n`);

    // 백업 데이터 구성
    const backupData: BackupData = {
      timestamp: new Date().toISOString(),
      teamEquipments: teamEquipments.map(eq => ({
        id: eq.id,
        teamId: eq.teamId,
        teamName: eq.team.name,
        equipmentName: eq.equipmentName,
        quantity: eq.quantity,
        createdAt: eq.createdAt,
        updatedAt: eq.updatedAt
      })),
      inspectionScheduleTemplates: scheduleTemplates.map(st => ({
        id: st.id,
        factoryId: st.factoryId,
        month: st.month,
        equipmentName: st.equipmentName,
        displayOrder: st.displayOrder,
        createdAt: st.createdAt,
        updatedAt: st.updatedAt
      }))
    };

    // 파일명 생성
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `backup_equipment_BEFORE_cleanup_${timestamp}.json`;
    const filepath = path.join(process.cwd(), filename);

    // JSON 파일로 저장
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf-8');

    console.log('====================================');
    console.log('백업 완료!');
    console.log('====================================');
    console.log(`파일: ${filename}`);
    console.log(`경로: ${filepath}`);
    console.log(`크기: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB\n`);

    // 백업 내용 요약
    console.log('백업 내용 요약:');
    console.log(`- TeamEquipment: ${backupData.teamEquipments.length}개`);
    console.log(`- InspectionScheduleTemplate: ${backupData.inspectionScheduleTemplates.length}개`);
    console.log();

    // 장비명별 통계
    const equipmentNames = new Set(backupData.teamEquipments.map(e => e.equipmentName));
    console.log(`고유 장비명: ${equipmentNames.size}개`);
    Array.from(equipmentNames).sort().forEach(name => {
      const count = backupData.teamEquipments.filter(e => e.equipmentName === name).length;
      console.log(`  - ${name}: ${count}개`);
    });

  } catch (error) {
    console.error('❌ 백업 중 오류 발생:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupEquipmentData();
