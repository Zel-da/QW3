const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 화성 생산 팀들의 현재 체크리스트 템플릿 ===\n');
  
  const teams = await prisma.team.findMany({
    where: {
      site: '화성',
      OR: [
        { name: { contains: '선삭' } },
        { name: { contains: '연삭' } },
        { name: { contains: 'MB조립' } },
        { name: { contains: 'BKT조립' } },
        { name: { contains: '열처리' } },
        { name: { contains: '로드생산' } },
        { name: { contains: 'CR생산' } }
      ]
    },
    include: {
      checklistTemplates: {
        include: {
          _count: {
            select: { templateItems: true }
          }
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  for (const team of teams) {
    console.log(`팀 ID: ${team.id}, 팀명: ${team.name}`);
    if (team.checklistTemplates.length > 0) {
      team.checklistTemplates.forEach(t => {
        console.log(`  → 템플릿 ID: ${t.id}, 이름: ${t.name} (${t._count.templateItems}개 항목)`);
      });
    } else {
      console.log('  → 체크리스트 템플릿 없음');
    }
    console.log('');
  }

  console.log('\n=== 모든 체크리스트 템플릿 목록 (화성) ===\n');
  const allTemplates = await prisma.checklistTemplate.findMany({
    where: {
      team: {
        site: '화성'
      }
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          site: true
        }
      },
      _count: {
        select: { templateItems: true }
      }
    },
    orderBy: { team: { name: 'asc' } }
  });

  console.log(`총 ${allTemplates.length}개 템플릿\n`);
  allTemplates.forEach(t => {
    console.log(`템플릿 ID: ${t.id}`);
    console.log(`  이름: ${t.name}`);
    console.log(`  팀: ${t.team.name} (ID: ${t.team.id})`);
    console.log(`  항목 수: ${t._count.templateItems}개`);
    console.log('');
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
