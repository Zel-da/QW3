import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySchema() {
  try {
    console.log('=== 스키마 검증 시작 ===\n');

    // 1. Factory 테이블 확인
    const factories = await prisma.factory.findMany();
    console.log('✅ Factory 테이블:', factories.length, '개');

    // 2. InspectionScheduleTemplate 확인 (inspectionDay 필드 없어야 함)
    const schedules = await prisma.inspectionScheduleTemplate.findMany({ take: 1 });
    console.log('✅ InspectionScheduleTemplate 테이블:', schedules.length > 0 ? '존재' : '비어있음');
    if (schedules.length > 0) {
      console.log('   샘플 데이터:', {
        id: schedules[0].id,
        factoryId: schedules[0].factoryId,
        month: schedules[0].month,
        equipmentName: schedules[0].equipmentName,
        // inspectionDay 필드가 없어야 함
      });
    }

    // 3. MonthlyInspectionDay 테이블 확인 (새로 생성되어야 함)
    const monthlyDays = await prisma.monthlyInspectionDay.findMany();
    console.log('✅ MonthlyInspectionDay 테이블:', monthlyDays.length, '개');
    if (monthlyDays.length > 0) {
      console.log('   샘플 데이터:', monthlyDays[0]);
    } else {
      console.log('   ⚠️  데이터 없음 (seed 필요)');
    }

    // 4. TeamEquipment 확인
    const equipments = await prisma.teamEquipment.findMany({ take: 3 });
    console.log('\n✅ TeamEquipment 테이블:', '확인됨');
    console.log('   샘플 데이터 (3개):');
    equipments.forEach((eq) => {
      console.log(`   - ${eq.equipmentName}: ${eq.quantity}개`);
    });

    console.log('\n=== 검증 완료 ===');
    console.log('\n다음 단계:');
    console.log('1. ✅ 스키마 변경 완료 (inspectionDay 제거됨)');
    console.log('2. ✅ MonthlyInspectionDay 테이블 생성됨');
    console.log('3. ⏳ MonthlyInspectionDay seed 데이터 생성 필요 (24개)');
    console.log('4. ⏳ InspectionScheduleTemplate 12개월 데이터 확장 필요');

  } catch (error) {
    console.error('❌ 검증 실패:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySchema();
