import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicateScheduleTemplates() {
  try {
    console.log('====================================');
    console.log('InspectionScheduleTemplate 중복 제거 시작');
    console.log('====================================\n');

    const factory = await prisma.factory.findFirst({
      where: { code: 'ASAN' }
    });

    if (!factory) {
      console.log('❌ 아산공장을 찾을 수 없습니다.');
      return;
    }

    console.log(`✓ 아산공장 ID: ${factory.id}\n`);

    await prisma.$transaction(async (tx) => {
      // ========================================
      // 1단계: 접미사 없는 항목 모두 삭제
      // ========================================
      console.log('='.repeat(80));
      console.log('1단계: 접미사 없는 중복 항목 삭제');
      console.log('='.repeat(80));

      const itemsToDelete = [
        '드릴기,플라즈마',
        '위험물,가스저장소',
        '소화전,소화기',
        '밀링기,면취기'
      ];

      for (const equipmentName of itemsToDelete) {
        const deleted = await tx.inspectionScheduleTemplate.deleteMany({
          where: {
            factoryId: factory.id,
            equipmentName: equipmentName
          }
        });

        if (deleted.count > 0) {
          console.log(`❌ 삭제: "${equipmentName}" (${deleted.count}개 레코드)`);
        }
      }

      // ========================================
      // 2단계: "드릴기,플라즈마 점검" → "드릴기 점검"으로 변경
      // ========================================
      console.log('\n' + '='.repeat(80));
      console.log('2단계: 장비명 표준화');
      console.log('='.repeat(80));

      const updated = await tx.inspectionScheduleTemplate.updateMany({
        where: {
          factoryId: factory.id,
          equipmentName: '드릴기,플라즈마 점검'
        },
        data: {
          equipmentName: '드릴기 점검'
        }
      });

      if (updated.count > 0) {
        console.log(`🔄 변경: "드릴기,플라즈마 점검" → "드릴기 점검" (${updated.count}개 레코드)`);
      } else {
        console.log('✓ "드릴기,플라즈마 점검" 항목 없음');
      }

      // ========================================
      // 3단계: 최종 검증 - 같은 월/순서에 중복 확인
      // ========================================
      console.log('\n' + '='.repeat(80));
      console.log('3단계: 중복 검증');
      console.log('='.repeat(80));

      const allTemplates = await tx.inspectionScheduleTemplate.findMany({
        where: { factoryId: factory.id },
        orderBy: [
          { month: 'asc' },
          { displayOrder: 'asc' },
          { equipmentName: 'asc' }
        ]
      });

      // 월별/순서별로 그룹화
      const grouped = new Map<string, any[]>();
      allTemplates.forEach(t => {
        const key = `${t.month}-${t.displayOrder}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(t);
      });

      let duplicatesFound = false;
      for (const [key, items] of grouped.entries()) {
        if (items.length > 1) {
          console.log(`⚠️  중복 발견: ${key}`);
          items.forEach(item => {
            console.log(`   - "${item.equipmentName}" (ID: ${item.id})`);
          });
          duplicatesFound = true;
        }
      }

      if (!duplicatesFound) {
        console.log('✓ 중복 없음 - 완벽!');
      }

      // ========================================
      // 4단계: 결과 요약
      // ========================================
      console.log('\n' + '='.repeat(80));
      console.log('최종 결과');
      console.log('='.repeat(80));

      const finalTemplates = await tx.inspectionScheduleTemplate.findMany({
        where: { factoryId: factory.id }
      });

      console.log(`총 레코드: ${finalTemplates.length}개`);

      // 월별 통계
      const byMonth = new Map<number, number>();
      finalTemplates.forEach(t => {
        byMonth.set(t.month, (byMonth.get(t.month) || 0) + 1);
      });

      console.log('\n월별 항목 수:');
      for (let month = 1; month <= 12; month++) {
        const count = byMonth.get(month) || 0;
        console.log(`  ${month}월: ${count}개`);
      }
    });

    console.log('\n====================================');
    console.log('정리 완료!');
    console.log('====================================');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

removeDuplicateScheduleTemplates();
