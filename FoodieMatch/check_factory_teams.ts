import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('='.repeat(60));
  console.log('공장-팀 연결 상태 확인');
  console.log('='.repeat(60));

  // 1. 공장 확인
  const factories = await prisma.factory.findMany({
    include: {
      _count: {
        select: { teams: true }
      }
    }
  });

  console.log('\n📍 공장 목록:');
  factories.forEach(f => {
    console.log(`  - ID: ${f.id}, 이름: ${f.name}, 코드: ${f.code}, 팀 수: ${f._count.teams}개`);
  });

  // 2. 팀별 공장 연결 확인
  const teams = await prisma.team.findMany({
    include: {
      factory: true
    },
    orderBy: { name: 'asc' }
  });

  console.log(`\n👥 전체 팀: ${teams.length}개`);

  const teamsByFactory: Record<string, any[]> = {};
  let teamsWithoutFactory = 0;

  teams.forEach(team => {
    if (team.factory) {
      const key = team.factory.name;
      if (!teamsByFactory[key]) {
        teamsByFactory[key] = [];
      }
      teamsByFactory[key].push(team);
    } else {
      teamsWithoutFactory++;
    }
  });

  console.log('\n공장별 팀 분포:');
  for (const [factoryName, factoryTeams] of Object.entries(teamsByFactory)) {
    console.log(`\n  ${factoryName}: ${factoryTeams.length}개 팀`);
    factoryTeams.slice(0, 5).forEach(t => {
      console.log(`    - ${t.name} (ID: ${t.id}, factoryId: ${t.factoryId})`);
    });
    if (factoryTeams.length > 5) {
      console.log(`    ... 외 ${factoryTeams.length - 5}개 팀`);
    }
  }

  if (teamsWithoutFactory > 0) {
    console.log(`\n  ⚠️  공장 없는 팀: ${teamsWithoutFactory}개`);
  }

  // 3. 아산공장(ID: 1) 상세 확인
  console.log('\n='.repeat(60));
  console.log('아산공장 상세 확인 (ID: 1)');
  console.log('='.repeat(60));

  const asanTeams = await prisma.team.findMany({
    where: { factoryId: 1 },
    include: {
      teamEquipments: true
    },
    orderBy: { name: 'asc' }
  });

  console.log(`\n팀 수: ${asanTeams.length}개`);
  asanTeams.forEach(team => {
    console.log(`\n  ${team.name} (ID: ${team.id})`);
    console.log(`    장비: ${team.teamEquipments.length}개`);
    team.teamEquipments.slice(0, 3).forEach(eq => {
      console.log(`      - ${eq.equipmentName} (${eq.quantity}개)`);
    });
  });

  console.log('\n' + '='.repeat(60));

  await prisma.$disconnect();
}

check();
