import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedMonthlyInspectionDays() {
  try {
    console.log('=== 월별 점검일 Seed 시작 ===\n');

    // 공장 조회
    const hwaseong = await prisma.factory.findUnique({ where: { code: 'HWASEONG' } });
    const asan = await prisma.factory.findUnique({ where: { code: 'ASAN' } });

    if (!hwaseong || !asan) {
      throw new Error('공장 데이터가 없습니다. seedFactoriesAndTeams.ts를 먼저 실행하세요.');
    }

    // 화성공장 월별 점검일 (사용자 제공 데이터)
    const hwaseongDays = [
      { month: 1, day: 3 },   // 1/3
      { month: 2, day: 4 },   // 2/4
      { month: 3, day: 7 },   // 3/7
      { month: 4, day: 4 },   // 4/4
      { month: 5, day: 7 },   // 5/7
      { month: 6, day: 4 },   // 6/4
      { month: 7, day: 4 },   // 7/4
      { month: 8, day: 7 },   // 8/7
      { month: 9, day: 4 },   // 9/4
      { month: 10, day: 4 },  // 10/4
      { month: 11, day: 7 },  // 11/7
      { month: 12, day: 4 },  // 12/4
    ];

    // 아산공장 월별 점검일 (사용자 제공 데이터)
    const asanDays = [
      { month: 1, day: 3 },   // 1/3
      { month: 2, day: 4 },   // 2/4
      { month: 3, day: 7 },   // 3/7
      { month: 4, day: 4 },   // 4/4
      { month: 5, day: 7 },   // 5/7
      { month: 6, day: 4 },   // 6/4
      { month: 7, day: 4 },   // 7/4
      { month: 8, day: 7 },   // 8/7
      { month: 9, day: 4 },   // 9/4
      { month: 10, day: 7 },  // 10/7
      { month: 11, day: 7 },  // 11/7
      { month: 12, day: 4 },  // 12/4
    ];

    console.log('📅 화성공장 월별 점검일 생성 중...');
    for (const { month, day } of hwaseongDays) {
      await prisma.monthlyInspectionDay.upsert({
        where: {
          factoryId_month: {
            factoryId: hwaseong.id,
            month: month,
          },
        },
        update: {
          inspectionDay: day,
        },
        create: {
          factoryId: hwaseong.id,
          month: month,
          inspectionDay: day,
        },
      });
      console.log(`  ✅ ${month}월 → ${day}일`);
    }

    console.log('\n📅 아산공장 월별 점검일 생성 중...');
    for (const { month, day } of asanDays) {
      await prisma.monthlyInspectionDay.upsert({
        where: {
          factoryId_month: {
            factoryId: asan.id,
            month: month,
          },
        },
        update: {
          inspectionDay: day,
        },
        create: {
          factoryId: asan.id,
          month: month,
          inspectionDay: day,
        },
      });
      console.log(`  ✅ ${month}월 → ${day}일`);
    }

    console.log('\n=== ✅ 완료: 24개 월별 점검일 생성됨 ===');
    console.log('   - 화성공장: 12개월');
    console.log('   - 아산공장: 12개월');

  } catch (error) {
    console.error('❌ Seed 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedMonthlyInspectionDays();
