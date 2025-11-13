const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 아산 제관라인 템플릿 (ID: 40) 상세 정보 ===\n');
  
  const template = await prisma.checklistTemplate.findUnique({
    where: { id: 40 },
    include: {
      team: true,
      templateItems: {
        orderBy: { displayOrder: 'asc' }
      }
    }
  });
  
  if (!template) {
    console.log('템플릿 ID 40을 찾을 수 없습니다.');
    return;
  }
  
  console.log('템플릿 ID: ' + template.id);
  console.log('템플릿 이름: ' + template.name);
  console.log('소속 팀: ' + template.team.name + ' (ID: ' + template.team.id + ', Site: ' + template.team.site + ')');
  console.log('총 항목 수: ' + template.templateItems.length + '개\n');
  
  console.log('=== 템플릿 항목 목록 (처음 10개만) ===\n');
  template.templateItems.slice(0, 10).forEach((item, idx) => {
    const num = idx + 1;
    console.log(num + '. [ID: ' + item.id + '] ' + item.category + (item.subCategory ? ' > ' + item.subCategory : ''));
    console.log('   ' + item.description);
    console.log('   displayOrder: ' + item.displayOrder + '\n');
  });
  
  console.log('\n=== 카테고리별 분류 ===\n');
  const categoryGroups = {};
  template.templateItems.forEach((item) => {
    if (!categoryGroups[item.category]) categoryGroups[item.category] = [];
    categoryGroups[item.category].push(item);
  });
  
  Object.keys(categoryGroups).forEach((category) => {
    console.log(category + ': ' + categoryGroups[category].length + '개 항목');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
