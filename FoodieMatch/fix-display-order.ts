import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixDisplayOrder() {
  console.log('템플릿 아이템의 displayOrder 재정렬 시작...');

  // 모든 템플릿 가져오기
  const templates = await prisma.checklistTemplate.findMany({
    include: {
      templateItems: {
        orderBy: { id: 'asc' } // ID 순서대로 가져오기
      }
    }
  });

  for (const template of templates) {
    console.log(`\n템플릿 ID ${template.id} (${template.name}) 처리 중...`);
    console.log(`  - 총 ${template.templateItems.length}개 아이템`);

    // displayOrder 확인
    const orderIssues = template.templateItems.filter(
      (item, idx) => item.displayOrder !== idx
    );

    if (orderIssues.length > 0) {
      console.log(`  ⚠️  displayOrder 문제 발견: ${orderIssues.length}개`);
      orderIssues.forEach(item => {
        console.log(`     - ID ${item.id}: displayOrder=${item.displayOrder} (예상: ${template.templateItems.findIndex(i => i.id === item.id)})`);
      });

      // displayOrder 재설정
      for (let idx = 0; idx < template.templateItems.length; idx++) {
        const item = template.templateItems[idx];
        await prisma.templateItem.update({
          where: { id: item.id },
          data: { displayOrder: idx }
        });
      }
      console.log(`  ✅ displayOrder 재정렬 완료`);
    } else {
      console.log(`  ✅ displayOrder 정상`);
    }
  }

  console.log('\n모든 템플릿 처리 완료!');
}

fixDisplayOrder()
  .catch((e) => {
    console.error('에러 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
