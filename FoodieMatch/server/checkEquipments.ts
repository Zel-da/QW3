import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkEquipments() {
  try {
    // 아산공장 찾기
    const factory = await prisma.factory.findFirst({
      where: { code: 'ASAN' }
    });

    if (!factory) {
      console.log('아산공장을 찾을 수 없습니다.');
      return;
    }

    // 아산공장의 모든 팀 찾기
    const teams = await prisma.team.findMany({
      where: { factoryId: factory.id }
    });

    console.log(`\n아산공장 팀 수: ${teams.length}`);
    console.log('팀 목록:', teams.map(t => t.name).join(', '));

    // 모든 팀의 장비 찾기
    const equipments = await prisma.teamEquipment.findMany({
      where: {
        teamId: { in: teams.map(t => t.id) }
      }
    });

    // 중복 제거하고 정렬
    const uniqueNames = [...new Set(equipments.map(e => e.equipmentName))].sort();

    console.log(`\n아산공장 전체 장비 종류: ${uniqueNames.length}개`);
    console.log('\n=== TeamEquipment 목록 ===');
    uniqueNames.forEach(name => console.log(`  - ${name}`));

    // InspectionScheduleTemplate 확인
    const schedules = await prisma.inspectionScheduleTemplate.findMany({
      where: {
        factoryId: factory.id,
        month: 11
      },
      orderBy: { displayOrder: 'asc' }
    });

    console.log(`\n\n=== InspectionScheduleTemplate (11월) ===`);
    schedules.forEach((s, i) => {
      const cleanName = s.equipmentName.replace(' 점검', '');
      const exists = uniqueNames.includes(cleanName);
      console.log(`${i + 1}. ${s.equipmentName} → "${cleanName}" ${exists ? '✓' : '⚠️ NOT FOUND'}`);
    });

  } catch (error) {
    console.error('에러:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEquipments();
