/**
 * 아산 팀의 안전점검 템플릿 확인
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('아산 팀 안전점검 템플릿 확인');
  console.log('========================================\n');

  // 아산 팀들의 점검 템플릿
  const asanTeams = await prisma.team.findMany({
    where: { site: '아산' },
    include: {
      inspectionTemplates: {
        orderBy: [{ month: 'asc' }, { displayOrder: 'asc' }]
      }
    }
  });

  for (const team of asanTeams) {
    if (team.inspectionTemplates.length === 0) continue;

    console.log(`\n📁 ${team.name} (ID: ${team.id}) - ${team.inspectionTemplates.length}개`);

    // 월별로 그룹핑
    const byMonth: Record<number, string[]> = {};
    team.inspectionTemplates.forEach(t => {
      if (!byMonth[t.month]) byMonth[t.month] = [];
      byMonth[t.month].push(t.equipmentName);
    });

    // 1월 템플릿만 출력 (다른 월도 비슷함)
    if (byMonth[1]) {
      console.log(`   1월 점검 항목: ${byMonth[1].join(', ')}`);
    }
  }

  // 화성 팀 중 점검 있는 팀의 템플릿도 확인
  console.log('\n\n========================================');
  console.log('화성 팀 안전점검 템플릿 확인 (있는 것만)');
  console.log('========================================');

  const hwaseongTeams = await prisma.team.findMany({
    where: {
      site: '화성',
      inspectionTemplates: { some: {} }
    },
    include: {
      inspectionTemplates: {
        orderBy: [{ month: 'asc' }, { displayOrder: 'asc' }]
      }
    }
  });

  for (const team of hwaseongTeams) {
    console.log(`\n📁 ${team.name} (ID: ${team.id}) - ${team.inspectionTemplates.length}개`);

    const byMonth: Record<number, string[]> = {};
    team.inspectionTemplates.forEach(t => {
      if (!byMonth[t.month]) byMonth[t.month] = [];
      byMonth[t.month].push(t.equipmentName);
    });

    if (byMonth[1]) {
      console.log(`   1월 점검 항목: ${byMonth[1].join(', ')}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
