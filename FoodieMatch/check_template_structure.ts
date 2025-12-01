import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('='.repeat(80));
  console.log('체크리스트 템플릿 구조 확인');
  console.log('='.repeat(80));

  // 템플릿 조회 (가공라인 - ID: 3)
  const template = await prisma.checklistTemplate.findFirst({
    where: {
      teamId: 3,
      name: { contains: '가공라인' }
    },
    include: {
      templateItems: {
        orderBy: { displayOrder: 'asc' }
      }
    }
  });

  if (!template) {
    console.log('❌ 템플릿을 찾을 수 없습니다.');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n템플릿: ${template.name}`);
  console.log(`총 항목: ${template.templateItems.length}개\n`);

  let currentCategory = '';
  let currentSubCategory = '';

  template.templateItems.forEach((item, index) => {
    // 카테고리 변경 체크
    if (item.category !== currentCategory) {
      console.log('\n' + '='.repeat(80));
      console.log(`📋 카테고리: ${item.category}`);
      console.log('='.repeat(80));
      currentCategory = item.category;
      currentSubCategory = '';
    }

    // 서브카테고리 변경 체크
    if (item.subCategory !== currentSubCategory) {
      if (item.subCategory) {
        console.log(`\n  ▶ 서브카테고리: ${item.subCategory}`);
        console.log('  ' + '-'.repeat(76));
      }
      currentSubCategory = item.subCategory;
    }

    console.log(`  ${index + 1}. [${item.category}${item.subCategory ? ` > ${item.subCategory}` : ''}] ${item.description}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n카테고리별 항목 수:');

  const categoryGroups: Record<string, any[]> = {};
  template.templateItems.forEach(item => {
    if (!categoryGroups[item.category]) {
      categoryGroups[item.category] = [];
    }
    categoryGroups[item.category].push(item);
  });

  Object.entries(categoryGroups).forEach(([category, items]) => {
    console.log(`  - ${category}: ${items.length}개 항목`);

    const subCategoryGroups: Record<string, number> = {};
    items.forEach(item => {
      if (item.subCategory) {
        subCategoryGroups[item.subCategory] = (subCategoryGroups[item.subCategory] || 0) + 1;
      }
    });

    if (Object.keys(subCategoryGroups).length > 0) {
      Object.entries(subCategoryGroups).forEach(([subCat, count]) => {
        console.log(`      └ ${subCat}: ${count}개`);
      });
    }
  });

  console.log('\n' + '='.repeat(80));

  await prisma.$disconnect();
}

check();
