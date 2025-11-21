import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findTeamsWithoutChecklistTemplate() {
  try {
    // 모든 팀 조회 (ChecklistTemplate 및 TemplateItem 포함)
    const teams = await prisma.team.findMany({
      include: {
        factory: true,
        leader: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true
          }
        },
        checklistTemplates: {
          include: {
            templateItems: true
          }
        }
      },
      orderBy: [
        { site: 'asc' },
        { name: 'asc' }
      ]
    });

    console.log('\n========================================');
    console.log('체크리스트 템플릿이 없는 팀 조회 결과');
    console.log('========================================\n');

    const teamsWithoutTemplate: any[] = [];
    const teamsWithEmptyItems: any[] = [];

    teams.forEach(team => {
      // 1. ChecklistTemplate이 아예 없는 팀
      if (team.checklistTemplates.length === 0) {
        teamsWithoutTemplate.push(team);
      } else {
        // 2. ChecklistTemplate은 있지만 TemplateItem이 하나도 없는 경우
        const hasEmptyTemplate = team.checklistTemplates.some(
          template => template.templateItems.length === 0
        );
        if (hasEmptyTemplate) {
          teamsWithEmptyItems.push(team);
        }
      }
    });

    console.log('\n📋 총 팀 개수:', teams.length);
    console.log('\n--- 1. ChecklistTemplate이 아예 없는 팀 ---');
    console.log('개수:', teamsWithoutTemplate.length);

    if (teamsWithoutTemplate.length > 0) {
      teamsWithoutTemplate.forEach((team, index) => {
        console.log(`\n${index + 1}.`);
        console.log('  팀 ID:', team.id);
        console.log('  팀명:', team.name);
        console.log('  사업장:', team.site || '(없음)');
        console.log('  공장:', team.factory ? team.factory.name : '(없음)');
        console.log('  팀장:', team.leader ? `${team.leader.name} (${team.leader.username})` : '(없음)');
        console.log('  팀장 이메일:', team.leader?.email || '(없음)');
        console.log('  ChecklistTemplate 개수:', team.checklistTemplates.length);
      });
    } else {
      console.log('  → 해당 팀 없음');
    }

    console.log('\n\n--- 2. ChecklistTemplate은 있지만 TemplateItem이 없는 팀 ---');
    console.log('개수:', teamsWithEmptyItems.length);

    if (teamsWithEmptyItems.length > 0) {
      teamsWithEmptyItems.forEach((team, index) => {
        console.log(`\n${index + 1}.`);
        console.log('  팀 ID:', team.id);
        console.log('  팀명:', team.name);
        console.log('  사업장:', team.site || '(없음)');
        console.log('  공장:', team.factory ? team.factory.name : '(없음)');
        console.log('  팀장:', team.leader ? `${team.leader.name} (${team.leader.username})` : '(없음)');
        console.log('  팀장 이메일:', team.leader?.email || '(없음)');
        console.log('  ChecklistTemplate 개수:', team.checklistTemplates.length);

        team.checklistTemplates.forEach((template: any, tIdx: number) => {
          console.log(`    Template ${tIdx + 1}: ${template.name} (항목 개수: ${template.templateItems.length})`);
        });
      });
    } else {
      console.log('  → 해당 팀 없음');
    }

    console.log('\n\n========================================');
    console.log('요약');
    console.log('========================================');
    console.log('전체 팀:', teams.length);
    console.log('템플릿 없음:', teamsWithoutTemplate.length);
    console.log('템플릿 있지만 항목 없음:', teamsWithEmptyItems.length);
    console.log('문제 있는 팀 총계:', teamsWithoutTemplate.length + teamsWithEmptyItems.length);
    console.log('========================================\n');

    // 자세한 팀 목록 JSON 출력
    console.log('\n\n========================================');
    console.log('상세 JSON 데이터');
    console.log('========================================\n');

    const result = {
      summary: {
        totalTeams: teams.length,
        teamsWithoutTemplate: teamsWithoutTemplate.length,
        teamsWithEmptyItems: teamsWithEmptyItems.length,
        totalProblematicTeams: teamsWithoutTemplate.length + teamsWithEmptyItems.length
      },
      teamsWithoutTemplate: teamsWithoutTemplate.map(t => ({
        id: t.id,
        name: t.name,
        site: t.site,
        factory: t.factory?.name,
        leader: t.leader ? {
          name: t.leader.name,
          username: t.leader.username,
          email: t.leader.email
        } : null
      })),
      teamsWithEmptyItems: teamsWithEmptyItems.map(t => ({
        id: t.id,
        name: t.name,
        site: t.site,
        factory: t.factory?.name,
        leader: t.leader ? {
          name: t.leader.name,
          username: t.leader.username,
          email: t.leader.email
        } : null,
        templates: t.checklistTemplates.map((tmpl: any) => ({
          name: tmpl.name,
          itemCount: tmpl.templateItems.length
        }))
      }))
    };

    console.log(JSON.stringify(result, null, 2));

    return result;

  } catch (error) {
    console.error('에러 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

findTeamsWithoutChecklistTemplate();
