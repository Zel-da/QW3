const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== "[제관라인, 화성 생산]" 템플릿 검색 ===\n');
  
  // 정확한 이름으로 검색
  const exactMatch = await prisma.checklistTemplate.findFirst({
    where: { name: '[제관라인, 화성 생산]' },
    include: {
      team: true,
      _count: { select: { templateItems: true } }
    }
  });
  
  if (exactMatch) {
    console.log('✅ 정확히 일치하는 템플릿 발견:');
    console.log(`  ID: ${exactMatch.id}`);
    console.log(`  이름: ${exactMatch.name}`);
    console.log(`  소속 팀: ${exactMatch.team.name} (ID: ${exactMatch.team.id}, Site: ${exactMatch.team.site})`);
    console.log(`  항목 수: ${exactMatch._count.templateItems}개`);
  } else {
    console.log('❌ "[제관라인, 화성 생산]" 템플릿을 찾을 수 없습니다.\n');
  }
  
  // 유사한 이름 검색
  console.log('\n=== 유사한 이름의 템플릿 검색 ===\n');
  const similarTemplates = await prisma.checklistTemplate.findMany({
    where: {
      OR: [
        { name: { contains: '제관' } },
        { name: { contains: '화성' } },
        { name: { contains: '[' } }
      ]
    },
    include: {
      team: true,
      _count: { select: { templateItems: true } }
    }
  });
  
  if (similarTemplates.length > 0) {
    console.log(`${similarTemplates.length}개의 유사 템플릿 발견:\n`);
    similarTemplates.forEach(t => {
      console.log(`  ID: ${t.id}`);
      console.log(`  이름: ${t.name}`);
      console.log(`  팀: ${t.team.name} (ID: ${t.team.id}, Site: ${t.team.site})`);
      console.log(`  항목 수: ${t._count.templateItems}개`);
      console.log('');
    });
  } else {
    console.log('유사한 템플릿이 없습니다.\n');
  }
  
  // "제관라인_생산" 템플릿 타입이 create-hwaseong-tbm-templates.ts에 정의되어 있음
  console.log('=== create-hwaseong-tbm-templates.ts 분석 ===\n');
  console.log('파일에 정의된 "제관라인_생산" 템플릿 타입은:');
  console.log('  - BR로드생산');
  console.log('  - BR생산 열처리(주간)');
  console.log('  - BR생산 열처리(야간1조)');
  console.log('  - BR생산 열처리(야간2조)');
  console.log('  - BR생산 열처리(야간3조)');
  console.log('  - CR생산 팀장');
  console.log('  - CR생산 CR총괄');
  console.log('\n이 팀들에게 동일한 29개 항목의 체크리스트가 할당되어 있습니다.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
