import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkScheduleTemplates() {
  const factory = await prisma.factory.findFirst({
    where: { code: 'ASAN' }
  });

  if (!factory) {
    console.log('아산공장을 찾을 수 없습니다.');
    return;
  }

  const templates = await prisma.inspectionScheduleTemplate.findMany({
    where: { factoryId: factory.id },
    orderBy: [{ month: 'asc' }, { displayOrder: 'asc' }]
  });

  console.log('Month | Order | Equipment Name');
  console.log('-'.repeat(80));
  templates.forEach(t => {
    console.log(`${t.month.toString().padStart(5)} | ${t.displayOrder.toString().padStart(5)} | ${t.equipmentName}`);
  });

  console.log('\n총 레코드:', templates.length);

  await prisma.$disconnect();
}

checkScheduleTemplates();
