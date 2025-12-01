import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function copyTemplate() {
  console.log('🔄 화성 연구소에 아산 연구소 템플릿 복사...\n');

  // 아산 연구소 템플릿 조회 (ID:4)
  const sourceTemplate = await prisma.checklistTemplate.findFirst({
    where: { teamId: 4 },
    include: { templateItems: { orderBy: { displayOrder: 'asc' } } }
  });

  if (!sourceTemplate) {
    console.log('❌ 아산 연구소 템플릿을 찾을 수 없습니다.');
    return;
  }

  console.log('📋 소스 템플릿:', sourceTemplate.name, `(${sourceTemplate.templateItems.length}개 항목)`);

  // 화성 연구소 (ID:62) 기존 템플릿 삭제
  const deleted = await prisma.templateItem.deleteMany({
    where: { template: { teamId: 62 } }
  });
  await prisma.checklistTemplate.deleteMany({ where: { teamId: 62 } });

  if (deleted.count > 0) {
    console.log(`🗑️ 기존 템플릿 삭제: ${deleted.count}개 항목`);
  }

  // 새 템플릿 생성
  const newTemplate = await prisma.checklistTemplate.create({
    data: {
      name: '연구소 TBM 체크리스트',
      teamId: 62,
      templateItems: {
        create: sourceTemplate.templateItems.map(item => ({
          category: item.category,
          subCategory: item.subCategory,
          description: item.description,
          displayOrder: item.displayOrder
        }))
      }
    },
    include: { templateItems: true }
  });

  console.log(`\n✅ 화성 연구소 템플릿 생성 완료: ${newTemplate.templateItems.length}개 항목`);

  await prisma.$disconnect();
}

copyTemplate();
