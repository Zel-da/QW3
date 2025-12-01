import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function restoreFactoryLinks() {
  console.log('📦 팀-공장 연결 복원 시작...');

  const backup = JSON.parse(
    fs.readFileSync('backup_AFTER_phase4_FINAL_2025-11-19T07-24-09.json', 'utf-8')
  );

  let count = 0;

  for (const team of backup.teams || []) {
    if (team.factoryId) {
      try {
        await prisma.team.update({
          where: { id: team.id },
          data: {
            factoryId: team.factoryId
          }
        });
        count++;
      } catch (e: any) {
        console.log(`  ⚠️  팀 연결 실패 (ID: ${team.id}, ${team.name}): ${e.message}`);
      }
    }
  }

  console.log(`✅ ${count}개 팀의 공장 연결 복원 완료!`);

  // 확인
  const factories = await prisma.factory.findMany({
    include: {
      _count: {
        select: { teams: true }
      }
    }
  });

  console.log('\n공장별 팀 수:');
  factories.forEach(f => {
    console.log(`  - ${f.name}: ${f._count.teams}개 팀`);
  });

  await prisma.$disconnect();
}

restoreFactoryLinks()
  .catch((e) => {
    console.error('❌ 복원 실패:', e);
    process.exit(1);
  });
