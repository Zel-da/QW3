/**
 * TBM 없는 화성 팀 5개에 TBM 템플릿 복사
 * - BR개발(64) ← S/A개발(32) 복사
 * - BR생산관리(62), BR총괄(63), CR생산관리(65) ← 인사총무(38) 복사
 * - 품질관리(66) ← 품질서비스(30) 복사
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 복사 매핑: targetTeamId -> sourceTeamId
const COPY_MAPPINGS: { targetId: number; targetName: string; sourceId: number }[] = [
  { targetId: 64, targetName: 'BR개발', sourceId: 32 },       // S/A개발 복사
  { targetId: 62, targetName: 'BR생산관리', sourceId: 38 },   // 인사총무 복사
  { targetId: 63, targetName: 'BR총괄', sourceId: 38 },       // 인사총무 복사
  { targetId: 65, targetName: 'CR생산관리', sourceId: 38 },   // 인사총무 복사
  { targetId: 66, targetName: '품질관리', sourceId: 30 },     // 품질서비스 복사
];

async function main() {
  console.log('========================================');
  console.log('TBM 없는 화성 팀에 TBM 템플릿 복사');
  console.log('========================================\n');

  for (const mapping of COPY_MAPPINGS) {
    // 이미 템플릿이 있는지 확인
    const existing = await prisma.checklistTemplate.count({
      where: { teamId: mapping.targetId }
    });

    if (existing > 0) {
      console.log(`⏭️ [${mapping.targetId}] ${mapping.targetName} - 이미 ${existing}개 템플릿 있음`);
      continue;
    }

    // 소스 팀의 템플릿 가져오기
    const sourceTemplate = await prisma.checklistTemplate.findFirst({
      where: { teamId: mapping.sourceId },
      include: { templateItems: { orderBy: { displayOrder: 'asc' } } }
    });

    if (!sourceTemplate) {
      console.log(`⚠️ [${mapping.targetId}] ${mapping.targetName} - 소스 템플릿 없음 (sourceId: ${mapping.sourceId})`);
      continue;
    }

    // 새 템플릿 생성
    const newTemplate = await prisma.checklistTemplate.create({
      data: {
        name: `${mapping.targetName} TBM 체크리스트`,
        teamId: mapping.targetId
      }
    });

    // 템플릿 항목 복사
    let itemCount = 0;
    for (const item of sourceTemplate.templateItems) {
      await prisma.templateItem.create({
        data: {
          templateId: newTemplate.id,
          category: item.category,
          subCategory: item.subCategory,
          description: item.description,
          displayOrder: item.displayOrder
        }
      });
      itemCount++;
    }

    console.log(`✅ [${mapping.targetId}] ${mapping.targetName} - ${itemCount}개 항목 복사 완료 (from: ${sourceTemplate.name})`);
  }

  // 결과 확인
  console.log('\n========================================');
  console.log('화성 팀 TBM 현황');
  console.log('========================================');

  const hwaseongTeams = await prisma.team.findMany({
    where: { site: '화성' },
    orderBy: { name: 'asc' }
  });

  for (const team of hwaseongTeams) {
    const count = await prisma.checklistTemplate.count({ where: { teamId: team.id } });
    const status = count > 0 ? '✅' : '❌';
    console.log(`${status} [${team.id}] ${team.name}: ${count}개 TBM`);
  }

  console.log('\n완료!');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
