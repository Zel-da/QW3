import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 소스 템플릿 ID 매핑 (백업에서 확인한 값)
const SOURCE_TEMPLATES = {
  '조립/전기라인': 39,  // 조립 전기라인 TBM 체크리스트 (teamId: 1)
  '자재/부품/출하': 43, // 지재/부품/출하 TBM 체크리스트 (teamId: 5)
  '품질': 45,           // 품질 TBM 체크리스트 (teamId: 7)
  '서비스': 44,         // 서비스 TBM 체크리스트 (teamId: 6)
  '가공라인': 41,       // 가공라인 TBM 체크리스트 (teamId: 3)
};

// 대상 팀 매핑
const TEAM_MAPPINGS = {
  아산: {
    '조립/전기라인': [
      { id: 39, name: '조립 1라인' },
      { id: 40, name: '조립 2라인' },
      { id: 41, name: '조립 3라인' },
      { id: 42, name: '전기라인' },
    ],
    '자재/부품/출하': [
      { id: 45, name: '자재팀' },
      { id: 49, name: '부품팀' },
    ],
    '서비스': [
      { id: 48, name: '고객지원팀' },
    ],
    '품질': [
      { id: 46, name: '품질관리팀' },
    ],
  },
  화성: {
    '가공라인': [
      { id: 50, name: '선삭' },
      { id: 51, name: '연삭' },
      { id: 55, name: '열처리' },
    ],
    '조립/전기라인': [
      { id: 54, name: 'CR조립' },
      // M/B (52), BKT (53)는 이미 완료됨
    ],
    '자재/부품/출하': [
      { id: 56, name: 'CR자재' },
      { id: 61, name: '2공장' },
    ],
  },
};

async function applyTemplateMapping() {
  console.log('🚀 TBM 템플릿 매핑 작업 시작...\n');
  console.log('=' .repeat(60));

  try {
    // 1. 현재 상태 확인
    console.log('\n📋 1단계: 현재 상태 확인\n');

    // 대상 팀 ID 수집
    const targetTeamIds: number[] = [];
    for (const site of Object.keys(TEAM_MAPPINGS) as Array<keyof typeof TEAM_MAPPINGS>) {
      for (const templateType of Object.keys(TEAM_MAPPINGS[site])) {
        const teams = TEAM_MAPPINGS[site][templateType as keyof typeof TEAM_MAPPINGS[typeof site]];
        for (const team of teams) {
          targetTeamIds.push(team.id);
        }
      }
    }

    // 대상 팀의 현재 템플릿 상태
    const targetTeams = await prisma.team.findMany({
      where: { id: { in: targetTeamIds } },
      include: {
        checklistTemplates: {
          include: { templateItems: true }
        }
      }
    });

    console.log('대상 팀 현재 상태:');
    for (const team of targetTeams) {
      const template = team.checklistTemplates[0];
      if (template) {
        console.log(`  ✅ ${team.site} | ${team.name} (ID:${team.id}) → ${template.name} (${template.templateItems.length}개 항목)`);
      } else {
        console.log(`  ❌ ${team.site} | ${team.name} (ID:${team.id}) → 템플릿 없음`);
      }
    }

    // 2. 소스 템플릿 조회
    console.log('\n📋 2단계: 소스 템플릿 확인\n');

    const sourceTemplates: { [key: string]: any } = {};
    for (const [name, id] of Object.entries(SOURCE_TEMPLATES)) {
      const template = await prisma.checklistTemplate.findUnique({
        where: { id },
        include: {
          templateItems: {
            orderBy: { displayOrder: 'asc' }
          }
        }
      });

      if (!template) {
        console.log(`  ❌ ${name} 템플릿 (ID:${id}) 찾을 수 없음`);
        throw new Error(`소스 템플릿 없음: ${name}`);
      }

      sourceTemplates[name] = template;
      console.log(`  ✅ ${name}: ${template.name} (${template.templateItems.length}개 항목)`);
    }

    // 3. 템플릿 적용
    console.log('\n📋 3단계: 템플릿 적용\n');
    console.log('=' .repeat(60));

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const site of Object.keys(TEAM_MAPPINGS) as Array<keyof typeof TEAM_MAPPINGS>) {
      console.log(`\n🏭 ${site} 현장:\n`);

      for (const templateType of Object.keys(TEAM_MAPPINGS[site])) {
        const sourceTemplate = sourceTemplates[templateType];
        const teams = TEAM_MAPPINGS[site][templateType as keyof typeof TEAM_MAPPINGS[typeof site]];

        console.log(`  📝 ${templateType} 템플릿 적용 (${teams.length}개 팀):`);

        for (const teamInfo of teams) {
          try {
            // 팀 정보 조회
            const team = await prisma.team.findUnique({
              where: { id: teamInfo.id },
              include: {
                checklistTemplates: true
              }
            });

            if (!team) {
              console.log(`     ❌ ${teamInfo.name} (ID:${teamInfo.id}): 팀을 찾을 수 없음`);
              errorCount++;
              continue;
            }

            // 기존 템플릿 삭제
            if (team.checklistTemplates.length > 0) {
              for (const oldTemplate of team.checklistTemplates) {
                // 템플릿 항목 삭제
                await prisma.templateItem.deleteMany({
                  where: { templateId: oldTemplate.id }
                });
                // 템플릿 삭제
                await prisma.checklistTemplate.delete({
                  where: { id: oldTemplate.id }
                });
              }
              console.log(`     🗑️  ${team.name}: 기존 템플릿 삭제`);
            }

            // 새 템플릿 생성
            const newTemplateName = `${team.name} TBM 체크리스트`;
            const newTemplate = await prisma.checklistTemplate.create({
              data: {
                name: newTemplateName,
                teamId: team.id,
                templateItems: {
                  create: sourceTemplate.templateItems.map((item: any) => ({
                    category: item.category,
                    subCategory: item.subCategory,
                    description: item.description,
                    displayOrder: item.displayOrder
                  }))
                }
              },
              include: { templateItems: true }
            });

            console.log(`     ✅ ${team.name}: ${newTemplate.templateItems.length}개 항목 적용 완료`);
            successCount++;

          } catch (error) {
            console.log(`     ❌ ${teamInfo.name} (ID:${teamInfo.id}): 오류 발생`);
            console.error(error);
            errorCount++;
          }
        }
      }
    }

    // 4. 결과 검증
    console.log('\n' + '=' .repeat(60));
    console.log('\n📋 4단계: 결과 검증\n');

    const verificationTeams = await prisma.team.findMany({
      where: { id: { in: targetTeamIds } },
      include: {
        checklistTemplates: {
          include: { templateItems: true }
        }
      }
    });

    console.log('최종 상태:');
    for (const team of verificationTeams) {
      const template = team.checklistTemplates[0];
      if (template) {
        console.log(`  ✅ ${team.site} | ${team.name} (ID:${team.id}) → ${template.name} (${template.templateItems.length}개 항목)`);
      } else {
        console.log(`  ❌ ${team.site} | ${team.name} (ID:${team.id}) → 템플릿 없음`);
      }
    }

    // 5. 요약
    console.log('\n' + '=' .repeat(60));
    console.log('\n🎉 작업 완료!\n');
    console.log('📊 요약:');
    console.log(`  ✅ 성공: ${successCount}개 팀`);
    console.log(`  ⏭️  스킵: ${skipCount}개 팀`);
    console.log(`  ❌ 오류: ${errorCount}개 팀`);

  } catch (error) {
    console.error('\n❌ 치명적 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

applyTemplateMapping();
