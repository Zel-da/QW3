import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateMBBKTTemplates() {
  console.log('🔍 M/B, BKT 팀 템플릿 변경 작업 시작...\n');

  try {
    // 1. M/B, BKT 팀 찾기
    console.log('1️⃣ M/B, BKT 팀 검색 중...');
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { name: { contains: 'M/B' } },
          { name: { contains: 'BKT' } },
          { name: { contains: 'MB' } },
        ],
        site: '화성'
      },
      include: {
        checklistTemplates: {
          include: {
            templateItems: true
          }
        }
      }
    });

    console.log(`✅ 찾은 팀: ${teams.length}개`);
    teams.forEach(team => {
      console.log(`   - ${team.name} (ID: ${team.id})`);
      if (team.checklistTemplates.length > 0) {
        console.log(`     현재 템플릿: ${team.checklistTemplates[0].name} (${team.checklistTemplates[0].templateItems.length}개 항목)`);
      } else {
        console.log(`     현재 템플릿: 없음`);
      }
    });

    if (teams.length === 0) {
      console.log('❌ M/B 또는 BKT 팀을 찾을 수 없습니다.');
      return;
    }

    // 2. 조립/전기라인 템플릿 찾기 (가공라인 팀을 참고)
    console.log('\n2️⃣ 조립/전기라인 템플릿 검색 중...');
    const assemblyTeam = await prisma.team.findFirst({
      where: {
        name: { contains: '조립' },
        site: '화성'
      },
      include: {
        checklistTemplates: {
          include: {
            templateItems: {
              orderBy: {
                displayOrder: 'asc'
              }
            }
          }
        }
      }
    });

    if (!assemblyTeam || assemblyTeam.checklistTemplates.length === 0) {
      console.log('❌ 조립/전기라인 템플릿을 찾을 수 없습니다.');
      return;
    }

    const sourceTemplate = assemblyTeam.checklistTemplates[0];
    console.log(`✅ 참조 템플릿 찾음: ${sourceTemplate.name}`);
    console.log(`   항목 개수: ${sourceTemplate.templateItems.length}개`);

    // 3. 각 팀에 대해 템플릿 변경
    console.log('\n3️⃣ 템플릿 변경 작업...');

    for (const team of teams) {
      console.log(`\n📝 ${team.name} 팀 처리 중...`);

      // 기존 템플릿 삭제
      if (team.checklistTemplates.length > 0) {
        for (const oldTemplate of team.checklistTemplates) {
          console.log(`   🗑️  기존 템플릿 삭제: ${oldTemplate.name}`);

          // 템플릿 항목 삭제
          await prisma.templateItem.deleteMany({
            where: { templateId: oldTemplate.id }
          });

          // 템플릿 삭제
          await prisma.checklistTemplate.delete({
            where: { id: oldTemplate.id }
          });
        }
      }

      // 새 템플릿 생성
      const newTemplateName = `${team.name} TBM 체크리스트`;
      console.log(`   ✨ 새 템플릿 생성: ${newTemplateName}`);

      const newTemplate = await prisma.checklistTemplate.create({
        data: {
          name: newTemplateName,
          teamId: team.id,
          templateItems: {
            create: sourceTemplate.templateItems.map(item => ({
              category: item.category,
              subCategory: item.subCategory,
              description: item.description,
              displayOrder: item.displayOrder
            }))
          }
        },
        include: {
          templateItems: true
        }
      });

      console.log(`   ✅ 템플릿 생성 완료 (${newTemplate.templateItems.length}개 항목)`);
    }

    console.log('\n🎉 모든 작업 완료!');
    console.log('\n📊 변경 요약:');
    for (const team of teams) {
      console.log(`   ✅ ${team.name}: 가공라인 → 조립/전기라인`);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateMBBKTTemplates();
