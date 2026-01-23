/**
 * 기존 TBM 템플릿 구조 확인
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('기존 TBM 템플릿 구조 확인');
  console.log('==========================\n');

  // 화성 팀 중 TBM이 있는 팀들의 템플릿 확인
  const teamsWithTBM = await prisma.team.findMany({
    where: {
      site: '화성',
      checklistTemplates: { some: {} }
    },
    include: {
      checklistTemplates: {
        include: {
          templateItems: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  for (const team of teamsWithTBM) {
    console.log(`\n📋 [${team.id}] ${team.name}`);
    for (const template of team.checklistTemplates) {
      console.log(`  템플릿: ${template.name} (ID: ${template.id})`);
      console.log(`  항목 수: ${template.templateItems.length}개`);
      if (template.templateItems.length > 0) {
        console.log('  항목들:');
        template.templateItems.forEach((item, i) => {
          console.log(`    ${i+1}. ${item.content}`);
        });
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
