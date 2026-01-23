/**
 * 아산 팀의 안전점검 템플릿을 화성 팀에 복사
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 소스 팀 ID (아산)
const SOURCE = {
  production: 3,   // 가공라인 - 생산라인용 20개
  warehouse: 5,    // 지재/부품/출하 - 자재/출하용 14개
  quality: 7,      // 품질 - 품질/서비스용 12개
  research: 4,     // 연구소 - 연구소용 14개
};

// 화성 팀 매핑 (targetId: sourceType)
const MAPPINGS: { teamId: number; teamName: string; sourceId: number }[] = [
  // 생산라인용
  { teamId: 61, teamName: '2공장', sourceId: SOURCE.production },
  { teamId: 53, teamName: 'BKT', sourceId: SOURCE.production },
  { teamId: 52, teamName: 'M/B', sourceId: SOURCE.production },
  { teamId: 50, teamName: '선삭', sourceId: SOURCE.production },
  { teamId: 51, teamName: '연삭', sourceId: SOURCE.production },
  { teamId: 55, teamName: '열처리', sourceId: SOURCE.production },
  { teamId: 54, teamName: 'CR조립', sourceId: SOURCE.production },
  { teamId: 62, teamName: 'BR생산관리', sourceId: SOURCE.production },
  { teamId: 63, teamName: 'BR총괄', sourceId: SOURCE.production },
  { teamId: 65, teamName: 'CR생산관리', sourceId: SOURCE.production },
  // 자재/출하용
  { teamId: 56, teamName: 'CR자재', sourceId: SOURCE.warehouse },
  // 품질/서비스용
  { teamId: 66, teamName: '품질관리', sourceId: SOURCE.quality },
  // 연구소용
  { teamId: 64, teamName: 'BR개발', sourceId: SOURCE.research },
];

async function main() {
  console.log('========================================');
  console.log('안전점검 템플릿 복사 (아산 → 화성)');
  console.log('========================================\n');

  for (const mapping of MAPPINGS) {
    // 이미 템플릿이 있는지 확인
    const existing = await prisma.inspectionTemplate.count({
      where: { teamId: mapping.teamId }
    });

    if (existing > 0) {
      console.log(`⏭️ ${mapping.teamName} - 이미 ${existing}개 템플릿 있음`);
      continue;
    }

    // 소스 팀의 템플릿 가져오기
    const sourceTemplates = await prisma.inspectionTemplate.findMany({
      where: { teamId: mapping.sourceId },
      orderBy: [{ month: 'asc' }, { displayOrder: 'asc' }]
    });

    if (sourceTemplates.length === 0) {
      console.log(`⚠️ ${mapping.teamName} - 소스 템플릿 없음 (sourceId: ${mapping.sourceId})`);
      continue;
    }

    // 복사
    let created = 0;
    for (const template of sourceTemplates) {
      await prisma.inspectionTemplate.create({
        data: {
          teamId: mapping.teamId,
          month: template.month,
          equipmentName: template.equipmentName,
          displayOrder: template.displayOrder,
          isRequired: template.isRequired,
        }
      });
      created++;
    }

    console.log(`✅ ${mapping.teamName} - ${created}개 템플릿 복사 완료`);
  }

  console.log('\n========================================');
  console.log('완료!');
  console.log('========================================');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
