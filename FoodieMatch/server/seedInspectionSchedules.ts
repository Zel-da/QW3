import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 월별 점검 일정 데이터 (inspectionDay는 MonthlyInspectionDay에서 별도 관리)
// 형식: { month: 1-12, equipmentName: "장비명 점검", displayOrder: 순서 }

// 화성공장 월별 점검 일정 (전체 12개월)
const hwaseongSchedules = [
  // 1월
  { month: 1, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 1, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 1, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 1, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 1, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 1, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 1, equipmentName: '세척조,피트로,유조로 점검', displayOrder: 7 },
  { month: 1, equipmentName: '열처리,올케이스로 점검', displayOrder: 8 },
  { month: 1, equipmentName: '둥근톱 점검', displayOrder: 9 },
  { month: 1, equipmentName: '위험물,가스저장소 점검', displayOrder: 10 },
  { month: 1, equipmentName: '소화전,소화기 점검', displayOrder: 11 },

  // 2월
  { month: 2, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 2, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 2, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 2, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 2, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 2, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 2, equipmentName: 'Deep Hole 점검', displayOrder: 7 },
  { month: 2, equipmentName: '용접기 점검', displayOrder: 8 },
  { month: 2, equipmentName: '굴착기 점검', displayOrder: 9 },
  { month: 2, equipmentName: '테스트크레인 점검', displayOrder: 10 },
  { month: 2, equipmentName: '위험물,가스저장소 점검', displayOrder: 11 },

  // 3월
  { month: 3, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 3, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 3, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 3, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 3, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 3, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 3, equipmentName: '반전기 점검', displayOrder: 7 },
  { month: 3, equipmentName: '세척기 점검', displayOrder: 8 },
  { month: 3, equipmentName: '연삭기 점검', displayOrder: 9 },
  { month: 3, equipmentName: '템퍼링로 점검', displayOrder: 10 },
  { month: 3, equipmentName: '소화전,소화기 점검', displayOrder: 11 },

  // 4월
  { month: 4, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 4, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 4, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 4, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 4, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 4, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 4, equipmentName: '보링기 점검', displayOrder: 7 },
  { month: 4, equipmentName: '마킹기 점검', displayOrder: 8 },
  { month: 4, equipmentName: '멀티밀링 점검', displayOrder: 9 },
  { month: 4, equipmentName: '스토우 점검', displayOrder: 10 },
  { month: 4, equipmentName: '위험물,가스저장소 점검', displayOrder: 11 },

  // 5월
  { month: 5, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 5, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 5, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 5, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 5, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 5, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 5, equipmentName: '절곡기 점검', displayOrder: 7 },
  { month: 5, equipmentName: '프레스 점검', displayOrder: 8 },
  { month: 5, equipmentName: '전단기 점검', displayOrder: 9 },
  { month: 5, equipmentName: '이동크레인 점검', displayOrder: 10 },
  { month: 5, equipmentName: '소화전,소화기 점검', displayOrder: 11 },

  // 6월
  { month: 6, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 6, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 6, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 6, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 6, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 6, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 6, equipmentName: '드릴기 점검', displayOrder: 7 },
  { month: 6, equipmentName: '멀티밀링 점검', displayOrder: 8 },
  { month: 6, equipmentName: '스토우 점검', displayOrder: 9 },
  { month: 6, equipmentName: '프레스 점검', displayOrder: 10 },
  { month: 6, equipmentName: '위험물,가스저장소 점검', displayOrder: 11 },

  // 7월
  { month: 7, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 7, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 7, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 7, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 7, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 7, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 7, equipmentName: '보링기 점검', displayOrder: 7 },
  { month: 7, equipmentName: '멀티밀링 점검', displayOrder: 8 },
  { month: 7, equipmentName: '스토우 점검', displayOrder: 9 },
  { month: 7, equipmentName: '테스트크레인 점검', displayOrder: 10 },
  { month: 7, equipmentName: '위험물,가스저장소 점검', displayOrder: 11 },

  // 8월
  { month: 8, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 8, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 8, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 8, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 8, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 8, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 8, equipmentName: '세척기 점검', displayOrder: 7 },
  { month: 8, equipmentName: '연삭기 점검', displayOrder: 8 },
  { month: 8, equipmentName: '갠트리로더 점검', displayOrder: 9 },
  { month: 8, equipmentName: '굴착기 점검', displayOrder: 10 },
  { month: 8, equipmentName: '소화전,소화기 점검', displayOrder: 11 },

  // 9월
  { month: 9, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 9, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 9, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 9, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 9, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 9, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 9, equipmentName: '세척조,피트로,유조로 점검', displayOrder: 7 },
  { month: 9, equipmentName: '멀티밀링 점검', displayOrder: 8 },
  { month: 9, equipmentName: '스토우 점검', displayOrder: 9 },
  { month: 9, equipmentName: '프레스 점검', displayOrder: 10 },
  { month: 9, equipmentName: '위험물,가스저장소 점검', displayOrder: 11 },

  // 10월
  { month: 10, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 10, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 10, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 10, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 10, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 10, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 10, equipmentName: '용접기 점검', displayOrder: 7 },
  { month: 10, equipmentName: '굴착기 점검', displayOrder: 8 },
  { month: 10, equipmentName: '갠트리로더 점검', displayOrder: 9 },
  { month: 10, equipmentName: '테스트크레인 점검', displayOrder: 10 },
  { month: 10, equipmentName: '위험물,가스저장소 점검', displayOrder: 11 },

  // 11월
  { month: 11, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 11, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 11, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 11, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 11, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 11, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 11, equipmentName: 'Deep Hole 점검', displayOrder: 7 },
  { month: 11, equipmentName: '테스트크레인 점검', displayOrder: 8 },
  { month: 11, equipmentName: '갠트리로더 점검', displayOrder: 9 },
  { month: 11, equipmentName: '둥근톱 점검', displayOrder: 10 },
  { month: 11, equipmentName: '소화전,소화기 점검', displayOrder: 11 },

  // 12월
  { month: 12, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 12, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 12, equipmentName: '컨베이어 점검', displayOrder: 3 },
  { month: 12, equipmentName: 'CNC 선반 점검', displayOrder: 4 },
  { month: 12, equipmentName: 'MCT 점검', displayOrder: 5 },
  { month: 12, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 12, equipmentName: '반전기 점검', displayOrder: 7 },
  { month: 12, equipmentName: '템퍼링로 점검', displayOrder: 8 },
  { month: 12, equipmentName: '멀티밀링 점검', displayOrder: 9 },
  { month: 12, equipmentName: '스토우 점검', displayOrder: 10 },
  { month: 12, equipmentName: '위험물,가스저장소 점검', displayOrder: 11 },
];

// 아산공장 월별 점검 일정 (전체 12개월)
const asanSchedules = [
  // 1월
  { month: 1, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 1, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 1, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 1, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 1, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 1, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 1, equipmentName: '드릴기,플라즈마 점검', displayOrder: 7 },
  { month: 1, equipmentName: '위험물,가스저장소 점검', displayOrder: 8 },
  { month: 1, equipmentName: '소화전,소화기 점검', displayOrder: 9 },

  // 2월
  { month: 2, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 2, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 2, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 2, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 2, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 2, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 2, equipmentName: '밀링기,면취기 점검', displayOrder: 7 },
  { month: 2, equipmentName: '용접기 점검', displayOrder: 8 },
  { month: 2, equipmentName: '위험물,가스저장소 점검', displayOrder: 9 },

  // 3월
  { month: 3, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 3, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 3, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 3, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 3, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 3, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 3, equipmentName: '전동공구 점검', displayOrder: 7 },
  { month: 3, equipmentName: '탭핑기,스폿용접기 점검', displayOrder: 8 },
  { month: 3, equipmentName: '소화전,소화기 점검', displayOrder: 9 },

  // 4월
  { month: 4, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 4, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 4, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 4, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 4, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 4, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 4, equipmentName: '배전반 점검', displayOrder: 7 },
  { month: 4, equipmentName: '이동크레인 점검', displayOrder: 8 },
  { month: 4, equipmentName: '위험물,가스저장소 점검', displayOrder: 9 },

  // 5월
  { month: 5, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 5, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 5, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 5, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 5, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 5, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 5, equipmentName: '프레스 점검', displayOrder: 7 },
  { month: 5, equipmentName: '굴착기 점검', displayOrder: 8 },
  { month: 5, equipmentName: '소화전,소화기 점검', displayOrder: 9 },

  // 6월
  { month: 6, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 6, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 6, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 6, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 6, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 6, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 6, equipmentName: '드릴기 점검', displayOrder: 7 },
  { month: 6, equipmentName: '용접기 점검', displayOrder: 8 },
  { month: 6, equipmentName: '위험물,가스저장소 점검', displayOrder: 9 },

  // 7월
  { month: 7, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 7, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 7, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 7, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 7, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 7, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 7, equipmentName: '전동공구 점검', displayOrder: 7 },
  { month: 7, equipmentName: '배전반 점검', displayOrder: 8 },
  { month: 7, equipmentName: '위험물,가스저장소 점검', displayOrder: 9 },

  // 8월
  { month: 8, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 8, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 8, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 8, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 8, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 8, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 8, equipmentName: '탭핑기,스폿용접기 점검', displayOrder: 7 },
  { month: 8, equipmentName: '굴착기 점검', displayOrder: 8 },
  { month: 8, equipmentName: '소화전,소화기 점검', displayOrder: 9 },

  // 9월
  { month: 9, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 9, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 9, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 9, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 9, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 9, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 9, equipmentName: '밀링기,면취기 점검', displayOrder: 7 },
  { month: 9, equipmentName: '이동크레인 점검', displayOrder: 8 },
  { month: 9, equipmentName: '위험물,가스저장소 점검', displayOrder: 9 },

  // 10월
  { month: 10, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 10, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 10, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 10, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 10, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 10, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 10, equipmentName: '프레스 점검', displayOrder: 7 },
  { month: 10, equipmentName: '배전반 점검', displayOrder: 8 },
  { month: 10, equipmentName: '소화전,소화기 점검', displayOrder: 9 },

  // 11월
  { month: 11, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 11, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 11, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 11, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 11, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 11, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 11, equipmentName: '드릴기 점검', displayOrder: 7 },
  { month: 11, equipmentName: '굴착기 점검', displayOrder: 8 },
  { month: 11, equipmentName: '소화전,소화기 점검', displayOrder: 9 },

  // 12월
  { month: 12, equipmentName: '지게차 점검', displayOrder: 1 },
  { month: 12, equipmentName: '크레인 점검', displayOrder: 2 },
  { month: 12, equipmentName: '전단기 점검', displayOrder: 3 },
  { month: 12, equipmentName: '절곡기 점검', displayOrder: 4 },
  { month: 12, equipmentName: '컨베이어 점검', displayOrder: 5 },
  { month: 12, equipmentName: '걸이구 점검', displayOrder: 6 },
  { month: 12, equipmentName: '용접기 점검', displayOrder: 7 },
  { month: 12, equipmentName: '이동크레인 점검', displayOrder: 8 },
  { month: 12, equipmentName: '위험물,가스저장소 점검', displayOrder: 9 },
];

async function main() {
  console.log('📅 월별 점검 일정 Seed 시작 (전체 12개월)...\n');

  // 공장 조회
  const asanFactory = await prisma.factory.findUnique({
    where: { code: 'ASAN' },
  });

  if (!asanFactory) {
    throw new Error('아산공장을 찾을 수 없습니다');
  }

  const hwaseongFactory = await prisma.factory.findUnique({
    where: { code: 'HWASEONG' },
  });

  if (!hwaseongFactory) {
    throw new Error('화성공장을 찾을 수 없습니다');
  }

  // 화성공장 일정 생성
  console.log('1️⃣ 화성공장 월별 점검 일정 생성...');

  for (const schedule of hwaseongSchedules) {
    await prisma.inspectionScheduleTemplate.upsert({
      where: {
        factoryId_month_equipmentName: {
          factoryId: hwaseongFactory.id,
          month: schedule.month,
          equipmentName: schedule.equipmentName,
        },
      },
      update: {
        displayOrder: schedule.displayOrder,
      },
      create: {
        factoryId: hwaseongFactory.id,
        month: schedule.month,
        equipmentName: schedule.equipmentName,
        displayOrder: schedule.displayOrder,
      },
    });
  }

  console.log(`  ✅ 화성공장 일정 ${hwaseongSchedules.length}개 항목 생성`);
  console.log(`     - 12개월 전체 (${hwaseongSchedules.length / 12}개/월 평균)`);

  // 아산공장 일정 생성
  console.log('\n2️⃣ 아산공장 월별 점검 일정 생성...');

  for (const schedule of asanSchedules) {
    await prisma.inspectionScheduleTemplate.upsert({
      where: {
        factoryId_month_equipmentName: {
          factoryId: asanFactory.id,
          month: schedule.month,
          equipmentName: schedule.equipmentName,
        },
      },
      update: {
        displayOrder: schedule.displayOrder,
      },
      create: {
        factoryId: asanFactory.id,
        month: schedule.month,
        equipmentName: schedule.equipmentName,
        displayOrder: schedule.displayOrder,
      },
    });
  }

  console.log(`  ✅ 아산공장 일정 ${asanSchedules.length}개 항목 생성`);
  console.log(`     - 12개월 전체 (${asanSchedules.length / 12}개/월 평균)`);

  console.log('\n✅ 월별 점검 일정 Seed 완료!');
  console.log(`   - 화성공장: ${hwaseongSchedules.length}개 (12개월)`);
  console.log(`   - 아산공장: ${asanSchedules.length}개 (12개월)`);
  console.log(`   - 총 ${hwaseongSchedules.length + asanSchedules.length}개 항목`);
}

main()
  .catch((e) => {
    console.error('❌ Seed 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
