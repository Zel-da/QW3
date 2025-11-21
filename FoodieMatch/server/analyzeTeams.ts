import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

interface TeamWithFactory {
  id: number;
  name: string;
  site: string | null;
  factoryId: number | null;
  factory: { name: string } | null;
}

interface DuplicateTeam {
  name: string;
  count: bigint;
  team_ids: number[];
}

async function analyzeTeams() {
  console.log('🔍 팀 데이터 분석 시작...\n');

  // 1. 모든 팀 목록 조회
  const allTeams = await prisma.team.findMany({
    include: {
      factory: true,
    },
    orderBy: [
      { factoryId: 'asc' },
      { name: 'asc' },
    ],
  });

  console.log(`✅ 총 ${allTeams.length}개 팀 발견\n`);

  // 2. 중복 팀 이름 찾기
  const duplicates = await prisma.$queryRaw<DuplicateTeam[]>`
    SELECT name, COUNT(*) as count, array_agg(id) as team_ids
    FROM "Teams"
    GROUP BY name
    HAVING COUNT(*) > 1
    ORDER BY name
  `;

  console.log(`🔍 중복 팀 이름: ${duplicates.length}개\n`);

  // 3. 안전점검 템플릿이 설정된 팀 (InspectionTemplate이 있는 팀)
  const safetyTeams = await prisma.team.findMany({
    where: {
      inspectionTemplates: {
        some: {},
      },
    },
    include: {
      factory: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`✅ 안전점검 설정된 팀: ${safetyTeams.length}개`);

  // 4. TBM 템플릿이 설정된 팀 (ChecklistTemplate 안에 실제 항목이 있는 팀)
  const tbmTeams = await prisma.team.findMany({
    where: {
      checklistTemplates: {
        some: {
          templateItems: {
            some: {},
          },
        },
      },
    },
    include: {
      factory: true,
    },
    orderBy: { name: 'asc' },
  });

  console.log(`✅ TBM 설정된 팀: ${tbmTeams.length}개\n`);

  // 5. 비교 분석
  const safetyTeamIds = new Set(safetyTeams.map(t => t.id));
  const tbmTeamIds = new Set(tbmTeams.map(t => t.id));

  const onlyInSafety = allTeams.filter(t => safetyTeamIds.has(t.id) && !tbmTeamIds.has(t.id));
  const onlyInTBM = allTeams.filter(t => !safetyTeamIds.has(t.id) && tbmTeamIds.has(t.id));
  const inBoth = allTeams.filter(t => safetyTeamIds.has(t.id) && tbmTeamIds.has(t.id));
  const inNeither = allTeams.filter(t => !safetyTeamIds.has(t.id) && !tbmTeamIds.has(t.id));

  console.log(`📊 분석 결과:`);
  console.log(`   - 안전점검에만 있는 팀: ${onlyInSafety.length}개`);
  console.log(`   - TBM에만 있는 팀: ${onlyInTBM.length}개`);
  console.log(`   - 둘 다 사용하는 팀: ${inBoth.length}개`);
  console.log(`   - 둘 다 사용하지 않는 팀 (유령팀): ${inNeither.length}개\n`);

  // 6. 마크다운 리포트 생성 (간단한 리스트 형식)
  let report = '# 팀 사용 현황 분석\n\n';
  report += `생성일: ${new Date().toLocaleString('ko-KR')}\n\n`;
  report += `총 팀 개수: ${allTeams.length}개\n\n`;
  report += '---\n\n';

  // 카테고리 1: TBM + 안전점검 (둘 다 사용)
  report += `## ✅ TBM + 안전점검 (둘 다 사용) - ${inBoth.length}개\n\n`;
  if (inBoth.length > 0) {
    inBoth.forEach(team => {
      report += `- **${team.name}** (ID: ${team.id}, 공장: ${team.factory?.name || '없음'}, 사이트: ${team.site || '없음'})\n`;
    });
  } else {
    report += '⚠️ 둘 다 사용하는 팀이 없습니다! 정상적으로는 모든 팀이 여기 있어야 합니다.\n';
  }
  report += '\n';

  // 카테고리 2: TBM만 사용
  report += `## ⚠️ TBM만 사용 (안전점검 미설정) - ${onlyInTBM.length}개\n\n`;
  if (onlyInTBM.length > 0) {
    onlyInTBM.forEach(team => {
      report += `- **${team.name}** (ID: ${team.id}, 공장: ${team.factory?.name || '없음'}, 사이트: ${team.site || '없음'})\n`;
    });
    report += '\n**조치 필요:** 이 팀들도 안전점검을 해야 하는지 관계자 확인 필요\n';
  } else {
    report += '✅ 없음\n';
  }
  report += '\n';

  // 카테고리 3: 안전점검만 사용
  report += `## ⚠️ 안전점검만 사용 (TBM 미사용) - ${onlyInSafety.length}개\n\n`;
  if (onlyInSafety.length > 0) {
    onlyInSafety.forEach(team => {
      report += `- **${team.name}** (ID: ${team.id}, 공장: ${team.factory?.name || '없음'}, 사이트: ${team.site || '없음'})\n`;
    });
    report += '\n**조치 필요:** 이 팀들도 TBM을 해야 하는지 관계자 확인 필요\n';
  } else {
    report += '✅ 없음\n';
  }
  report += '\n';

  // 카테고리 4: 둘 다 미사용 (유령팀)
  report += `## ❌ 둘 다 미사용 (유령팀) - ${inNeither.length}개\n\n`;
  if (inNeither.length > 0) {
    inNeither.forEach(team => {
      report += `- **${team.name}** (ID: ${team.id}, 공장: ${team.factory?.name || '없음'}, 사이트: ${team.site || '없음'})\n`;
    });
    report += '\n**조치 필요:** 사용하지 않는 팀은 삭제 고려\n';
  } else {
    report += '✅ 없음\n';
  }
  report += '\n';

  // 중복 팀 이름 섹션
  report += '---\n\n';
  if (duplicates.length > 0) {
    report += `## 🔍 중복 팀 이름 (${duplicates.length}개)\n\n`;
    duplicates.forEach(dup => {
      report += `### ${dup.name} (${dup.count.toString()}개)\n\n`;
      const duplicateTeams = allTeams.filter(t => dup.team_ids.includes(t.id));
      duplicateTeams.forEach(team => {
        report += `- ID ${team.id}: ${team.factory?.name || 'factory없음'} / ${team.site || 'site없음'}\n`;
      });
      report += '\n';
    });
    report += '**권장사항:**\n';
    report += '- 같은 공장 내 중복: 하나로 통합 필요\n';
    report += '- 다른 공장 간 중복: 정상 (각 공장마다 같은 이름의 팀이 있을 수 있음)\n\n';
  } else {
    report += '## 🔍 중복 팀 이름\n\n';
    report += '✅ 중복된 팀 이름이 없습니다.\n\n';
  }

  report += '---\n\n';
  report += '**분석 스크립트:** `server/analyzeTeams.ts`\n';
  report += '**실행 명령:** `npx tsx server/analyzeTeams.ts`\n';

  // 파일 저장
  const reportPath = './TEAM_ANALYSIS_REPORT.md';
  fs.writeFileSync(reportPath, report, 'utf-8');

  console.log(`✅ 리포트 생성 완료: ${reportPath}\n`);
  console.log('📄 요약:');
  console.log(`   - 전체 팀: ${allTeams.length}개`);
  console.log(`   - 중복 팀 이름: ${duplicates.length}개`);
  console.log(`   - 안전점검에만: ${onlyInSafety.length}개`);
  console.log(`   - TBM에만: ${onlyInTBM.length}개`);
  console.log(`   - 둘 다 사용: ${inBoth.length}개`);
  console.log(`   - 미사용(유령): ${inNeither.length}개\n`);

  await prisma.$disconnect();
}

analyzeTeams()
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });
