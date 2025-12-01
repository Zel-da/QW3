import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTemplates() {
  console.log('📋 템플릿 현황 조사\n');
  console.log('='.repeat(80));

  // 모든 팀 조회
  const teams = await prisma.team.findMany({
    include: {
      checklistTemplates: {
        include: { templateItems: true }
      },
      factory: true
    },
    orderBy: [
      { site: 'asc' },
      { name: 'asc' }
    ]
  });

  // TBM 템플릿 현황
  console.log('\n🔧 TBM 체크리스트 템플릿 현황\n');

  const tbmBySize: { [key: string]: typeof teams } = {
    '아산': [],
    '화성': [],
    '기타': []
  };

  teams.forEach(team => {
    const site = team.site || '기타';
    if (tbmBySize[site]) {
      tbmBySize[site].push(team);
    } else {
      tbmBySize['기타'].push(team);
    }
  });

  for (const [site, siteTeams] of Object.entries(tbmBySize)) {
    if (siteTeams.length === 0) continue;

    console.log(`\n【${site}】 (${siteTeams.length}개 팀)`);
    console.log('-'.repeat(60));

    const withTemplate = siteTeams.filter(t => t.checklistTemplates.length > 0);
    const withoutTemplate = siteTeams.filter(t => t.checklistTemplates.length === 0);

    console.log(`  ✅ 템플릿 있음: ${withTemplate.length}개 팀`);
    withTemplate.forEach(t => {
      const template = t.checklistTemplates[0];
      console.log(`     - ${t.name} (ID:${t.id}): ${template.name} (${template.templateItems.length}개 항목)`);
    });

    if (withoutTemplate.length > 0) {
      console.log(`  ❌ 템플릿 없음: ${withoutTemplate.length}개 팀`);
      withoutTemplate.forEach(t => {
        console.log(`     - ${t.name} (ID:${t.id})`);
      });
    }
  }

  // 안전점검 템플릿 현황
  console.log('\n\n' + '='.repeat(80));
  console.log('\n🔍 안전점검 템플릿 현황\n');

  const inspectionTemplates = await prisma.inspectionTemplate.findMany({
    include: {
      team: true
    },
    orderBy: { teamId: 'asc' }
  });

  // 팀별 그룹화
  const inspectionByTeam: { [key: string]: typeof inspectionTemplates } = {};

  inspectionTemplates.forEach(template => {
    if (template.teamId && template.team) {
      const key = `${template.team.site || '기타'} - ${template.team.name}`;
      if (!inspectionByTeam[key]) inspectionByTeam[key] = [];
      inspectionByTeam[key].push(template);
    }
  });

  console.log(`총 안전점검 템플릿: ${inspectionTemplates.length}개\n`);

  // 팀별 점검 템플릿
  const teamKeys = Object.keys(inspectionByTeam).sort();
  if (teamKeys.length > 0) {
    console.log('【팀별 안전점검 템플릿】');
    console.log('-'.repeat(60));
    teamKeys.forEach(key => {
      const templates = inspectionByTeam[key];
      console.log(`  ${key}: ${templates.length}개 템플릿`);
      templates.slice(0, 3).forEach(t => {
        console.log(`    - ${t.category} > ${t.checkItem}`);
      });
      if (templates.length > 3) {
        console.log(`    ... 외 ${templates.length - 3}개`);
      }
    });
  }


  // 안전점검 템플릿 없는 팀 확인
  const teamsWithInspection = new Set(inspectionTemplates.filter(t => t.teamId).map(t => t.teamId));
  const teamsWithoutInspection = teams.filter(t => !teamsWithInspection.has(t.id));

  if (teamsWithoutInspection.length > 0) {
    console.log('\n【안전점검 템플릿 없는 팀】');
    console.log('-'.repeat(60));
    teamsWithoutInspection.forEach(t => {
      console.log(`  ❌ ${t.site || '기타'} - ${t.name} (ID:${t.id})`);
    });
  }

  // 요약
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📊 요약\n');

  const tbmWithTemplate = teams.filter(t => t.checklistTemplates.length > 0).length;
  const tbmWithoutTemplate = teams.filter(t => t.checklistTemplates.length === 0).length;

  console.log(`TBM 템플릿:`);
  console.log(`  - 있는 팀: ${tbmWithTemplate}개`);
  console.log(`  - 없는 팀: ${tbmWithoutTemplate}개`);

  console.log(`\n안전점검 템플릿:`);
  console.log(`  - 총 템플릿: ${inspectionTemplates.length}개`);
  console.log(`  - 적용된 팀: ${teamsWithInspection.size}개`);
  console.log(`  - 미적용 팀: ${teamsWithoutInspection.length}개`);

  await prisma.$disconnect();
}

checkTemplates();
