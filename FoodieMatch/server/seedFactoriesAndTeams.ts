import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏭 공장 및 라인 시드 데이터 생성 시작...');

  // 1. 공장 생성
  console.log('\n1️⃣ 공장 생성...');

  const asanFactory = await prisma.factory.upsert({
    where: { code: 'ASAN' },
    update: {},
    create: {
      name: '아산공장',
      code: 'ASAN',
    },
  });
  console.log('✅ 아산공장 생성 완료');

  const hwaseongFactory = await prisma.factory.upsert({
    where: { code: 'HWASEONG' },
    update: {},
    create: {
      name: '화성공장',
      code: 'HWASEONG',
    },
  });
  console.log('✅ 화성공장 생성 완료');

  // 2. 아산공장 라인 생성 (11개)
  console.log('\n2️⃣ 아산공장 라인 생성...');

  const asanTeams = [
    { name: '조립 1라인', site: '아산' },
    { name: '조립 2라인', site: '아산' },
    { name: '조립 3라인', site: '아산' },
    { name: '전기라인', site: '아산' },
    { name: '제관라인', site: '아산' },
    { name: '가공라인', site: '아산' },
    { name: '자재팀', site: '아산' },
    { name: '품질관리팀', site: '아산' },
    { name: '연구소', site: '아산' },
    { name: '고객지원팀', site: '아산' },
    { name: '부품팀', site: '아산' },
  ];

  for (const team of asanTeams) {
    const existingTeam = await prisma.team.findFirst({
      where: {
        name: team.name,
        factoryId: asanFactory.id,
      },
    });

    if (!existingTeam) {
      await prisma.team.create({
        data: {
          name: team.name,
          site: team.site,
          factoryId: asanFactory.id,
        },
      });
      console.log(`  ✓ ${team.name} 생성`);
    } else {
      console.log(`  - ${team.name} 이미 존재`);
    }
  }

  // 3. 화성공장 라인 생성 (13개)
  console.log('\n3️⃣ 화성공장 라인 생성...');

  const hwaseongTeams = [
    { name: '선삭', site: '화성' },
    { name: '연삭', site: '화성' },
    { name: 'M/B', site: '화성' },
    { name: 'BKT', site: '화성' },
    { name: 'CR조립', site: '화성' },
    { name: '열처리', site: '화성' },
    { name: 'CR자재', site: '화성' },
    { name: '품질서비스', site: '화성' },
    { name: 'CR출하', site: '화성' },
    { name: 'BR출하', site: '화성' },
    { name: '자재부품', site: '화성' },
    { name: '2공장', site: '화성' },
    { name: '연구소', site: '화성' },
  ];

  for (const team of hwaseongTeams) {
    const existingTeam = await prisma.team.findFirst({
      where: {
        name: team.name,
        factoryId: hwaseongFactory.id,
      },
    });

    if (!existingTeam) {
      await prisma.team.create({
        data: {
          name: team.name,
          site: team.site,
          factoryId: hwaseongFactory.id,
        },
      });
      console.log(`  ✓ ${team.name} 생성`);
    } else {
      console.log(`  - ${team.name} 이미 존재`);
    }
  }

  console.log('\n✅ 공장 및 라인 시드 데이터 생성 완료!');
}

main()
  .catch((e) => {
    console.error('❌ 시드 데이터 생성 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
