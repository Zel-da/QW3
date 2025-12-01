import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('='.repeat(70));
  console.log('안전점검 데이터 상세 확인');
  console.log('='.repeat(70));

  // 1. InspectionTemplate (안전점검 템플릿 - 어떤 장비를 점검해야 하는지)
  const templates = await prisma.inspectionTemplate.findMany({
    take: 5,
    include: {
      team: {
        select: {
          name: true
        }
      }
    }
  });
  console.log(`\n1. InspectionTemplate (안전점검 템플릿): ${await prisma.inspectionTemplate.count()}개`);
  console.log('   예시:');
  templates.forEach(t => {
    console.log(`   - ${t.team.name}: ${t.equipmentName} (순서: ${t.displayOrder})`);
  });

  // 2. InspectionScheduleTemplate (월별 안전점검 스케줄)
  const schedules = await prisma.inspectionScheduleTemplate.findMany({
    take: 5
  });
  console.log(`\n2. InspectionScheduleTemplate (월별 스케줄): ${await prisma.inspectionScheduleTemplate.count()}개`);
  console.log('   예시:');
  schedules.forEach(s => {
    console.log(`   - ${s.month}월: ${s.equipmentName} (공장ID: ${s.factoryId})`);
  });

  // 3. SafetyInspection (실제 작성한 안전점검 기록)
  const safetyInspections = await prisma.safetyInspection.findMany({
    take: 5,
    include: {
      team: {
        select: {
          name: true
        }
      },
      inspectionItems: true
    }
  });
  console.log(`\n3. SafetyInspection (실제 작성한 안전점검): ${await prisma.safetyInspection.count()}개`);
  if (safetyInspections.length > 0) {
    console.log('   예시:');
    safetyInspections.forEach(s => {
      console.log(`   - ${s.team.name} ${s.year}-${s.month}월: ${s.isCompleted ? '완료' : '미완료'} (아이템: ${s.inspectionItems.length}개)`);
    });
  } else {
    console.log('   ❌ 없음 (백업에 없었음)');
  }

  // 4. InspectionItem (안전점검 항목별 상세 데이터)
  const items = await prisma.inspectionItem.count();
  console.log(`\n4. InspectionItem (안전점검 항목 상세): ${items}개`);
  if (items === 0) {
    console.log('   ❌ 없음 (백업에 없었음)');
  }

  console.log('\n' + '='.repeat(70));
  console.log('요약:');
  console.log('  ✅ 템플릿 (어떤 장비를 점검해야 하는지): 복구됨');
  console.log('  ❌ 실제 작성 데이터 (누가 언제 무엇을 점검했는지): 복구 안 됨');
  console.log('='.repeat(70));

  await prisma.$disconnect();
}

check();
