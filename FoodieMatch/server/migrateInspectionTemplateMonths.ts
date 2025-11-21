/**
 * InspectionTemplate 월별 마이그레이션 스크립트
 *
 * 목적:
 * 1. 기존 InspectionTemplate에 month 필드가 추가됨에 따라
 * 2. 기존 템플릿들을 1월 템플릿으로 설정
 * 3. 각 팀의 1월 템플릿을 2-12월에도 복사
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 InspectionTemplate 월별 마이그레이션 시작...\n');

  try {
    // 1단계: 기존 템플릿 확인
    const existingTemplates = await prisma.inspectionTemplate.findMany({
      orderBy: [{ teamId: 'asc' }, { displayOrder: 'asc' }]
    });

    console.log(`📊 기존 템플릿 개수: ${existingTemplates.length}개`);

    if (existingTemplates.length === 0) {
      console.log('✅ 마이그레이션할 데이터가 없습니다.');
      return;
    }

    // 팀별로 그룹화
    const templatesByTeam = existingTemplates.reduce((acc, template) => {
      if (!acc[template.teamId]) {
        acc[template.teamId] = [];
      }
      acc[template.teamId].push(template);
      return acc;
    }, {} as Record<number, typeof existingTemplates>);

    console.log(`📊 팀 개수: ${Object.keys(templatesByTeam).length}개 팀\n`);

    // 2단계: 각 팀별로 2-12월 템플릿 생성
    let totalCreated = 0;

    for (const [teamIdStr, templates] of Object.entries(templatesByTeam)) {
      const teamId = parseInt(teamIdStr);
      console.log(`🔄 팀 ID ${teamId} 처리 중... (${templates.length}개 항목)`);

      // 1월 템플릿은 이미 존재하므로, 2-12월만 생성
      for (let month = 2; month <= 12; month++) {
        // 해당 월의 템플릿이 이미 있는지 확인
        const existing = await prisma.inspectionTemplate.findFirst({
          where: { teamId, month }
        });

        if (existing) {
          console.log(`  ⏭️  ${month}월 템플릿 이미 존재 - 건너뜀`);
          continue;
        }

        // 1월 템플릿을 복사하여 해당 월에 생성
        const newTemplates = templates.map(template => ({
          teamId,
          month,
          equipmentName: template.equipmentName,
          displayOrder: template.displayOrder,
          isRequired: template.isRequired,
        }));

        const created = await prisma.inspectionTemplate.createMany({
          data: newTemplates,
          skipDuplicates: true,
        });

        totalCreated += created.count;
        console.log(`  ✅ ${month}월 템플릿 생성: ${created.count}개`);
      }

      console.log('');
    }

    console.log(`\n✅ 마이그레이션 완료!`);
    console.log(`   총 ${totalCreated}개 템플릿 생성됨`);
    console.log(`   모든 팀의 템플릿이 1-12월에 복사되었습니다.\n`);

  } catch (error) {
    console.error('❌ 마이그레이션 중 오류 발생:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
