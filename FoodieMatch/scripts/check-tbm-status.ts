/**
 * 화성 팀 TBM 템플릿 현황 확인
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hwaseongTeams = await prisma.team.findMany({
    where: { site: '화성' },
    orderBy: { name: 'asc' }
  });

  console.log('화성 팀 TBM 템플릿 현황');
  console.log('========================');

  const withTBM: { id: number; name: string; count: number }[] = [];
  const withoutTBM: { id: number; name: string }[] = [];

  for (const team of hwaseongTeams) {
    const count = await prisma.checklistTemplate.count({ where: { teamId: team.id } });
    if (count > 0) {
      withTBM.push({ id: team.id, name: team.name, count });
    } else {
      withoutTBM.push({ id: team.id, name: team.name });
    }
  }

  console.log(`\n✅ TBM 있는 팀 (${withTBM.length}개):`);
  withTBM.forEach(t => console.log(`  [${t.id}] ${t.name}: ${t.count}개`));

  console.log(`\n❌ TBM 없는 팀 (${withoutTBM.length}개):`);
  withoutTBM.forEach(t => console.log(`  [${t.id}] ${t.name}`));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
