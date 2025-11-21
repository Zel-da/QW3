import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 라인별 장비 시드 데이터 생성 시작...');

  // 아산공장 라인 조회
  const asanFactory = await prisma.factory.findUnique({
    where: { code: 'ASAN' },
  });

  if (!asanFactory) {
    throw new Error('아산공장을 찾을 수 없습니다');
  }

  // 화성공장 라인 조회
  const hwaseongFactory = await prisma.factory.findUnique({
    where: { code: 'HWASEONG' },
  });

  if (!hwaseongFactory) {
    throw new Error('화성공장을 찾을 수 없습니다');
  }

  // 아산공장 장비 데이터
  console.log('\n1️⃣ 아산공장 장비 데이터 생성...');

  const asanEquipments = {
    '조립 1라인': [
      { name: '지게차', quantity: 1 },
      { name: '크레인', quantity: 5 },
      { name: '절곡기', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '드릴기,플라즈마,레이져절단기', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '용접기', quantity: 1 },
      { name: '세척기선반', quantity: 1 },
      { name: '탁상용연삭기,드릴', quantity: 1 },
      { name: '고속절단기,핸드그라인더', quantity: 1 },
      { name: '작업대발판', quantity: 1 },
    ],
    '조립 2라인': [
      { name: '지게차', quantity: 1 },
      { name: '크레인', quantity: 5 },
      { name: '절곡기', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '드릴기,플라즈마,레이져절단기', quantity: 1 },
      { name: '밀링기,면취기', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '용접기', quantity: 1 },
      { name: '세척기선반', quantity: 1 },
      { name: '탁상용연삭기,드릴', quantity: 1 },
      { name: '고속절단기,핸드그라인더', quantity: 1 },
      { name: '작업대발판', quantity: 1 },
    ],
    '조립 3라인': [
      { name: '지게차', quantity: 1 },
      { name: '크레인', quantity: 6 },
      { name: '절곡기', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '드릴기,플라즈마,레이져절단기', quantity: 1 },
      { name: '밀링기,면취기', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '용접기', quantity: 1 },
      { name: '세척기선반', quantity: 1 },
      { name: '보링기,반전기', quantity: 1 },
      { name: '탁상용연삭기,드릴', quantity: 1 },
      { name: '고속절단기,핸드그라인더', quantity: 1 },
      { name: '작업대발판', quantity: 1 },
    ],
    '전기라인': [
      { name: '절곡기', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '밀링기,면취기', quantity: 1 },
      { name: '탁상용연삭기,드릴', quantity: 1 },
    ],
    '제관라인': [
      { name: '지게차', quantity: 1 },
      { name: '크레인', quantity: 7 },
      { name: '절곡기', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '드릴기,플라즈마,레이져절단기', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '용접기', quantity: 1 },
      { name: '세척기선반', quantity: 1 },
      { name: '고속절단기,핸드그라인더', quantity: 1 },
      { name: '밧데리충전기', quantity: 1 },
      { name: '작업대발판', quantity: 1 },
    ],
    '가공라인': [
      { name: '지게차', quantity: 1 },
      { name: '크레인', quantity: 6 },
      { name: '전단기', quantity: 1 },
      { name: '절곡기', quantity: 3 },
      { name: '걸이구', quantity: 1 },
      { name: '드릴기,플라즈마,레이져절단기', quantity: 4 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '밀링기,면취기', quantity: 2 },
      { name: '세척기선반', quantity: 1 },
      { name: '보링기,반전기', quantity: 1 },
      { name: '탁상용연삭기,드릴', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '고속절단기,핸드그라인더', quantity: 1 },
      { name: '전동드릴밴드쏘우', quantity: 1 },
      { name: '산소절단기', quantity: 1 },
      { name: '보일러,국소배기장치', quantity: 1 },
    ],
    '자재팀': [
      { name: '지게차', quantity: 4 },
      { name: '걸이구', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '밧데리충전기', quantity: 1 },
    ],
    '품질관리팀': [
      { name: '절곡기', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '밀링기,면취기', quantity: 1 },
    ],
    '연구소': [
      { name: '크레인', quantity: 3 },
      { name: '절곡기', quantity: 1 },
      { name: '드릴기,플라즈마,레이져절단기', quantity: 1 },
      { name: '세척기선반', quantity: 1 },
      { name: '탁상용연삭기,드릴', quantity: 1 },
    ],
    '고객지원팀': [
      { name: '지게차', quantity: 1 },
      { name: '크레인', quantity: 2 },
      { name: '절곡기', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '드릴기,플라즈마,레이져절단기', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '용접기', quantity: 1 },
      { name: '세척기선반', quantity: 1 },
      { name: '탁상용연삭기,드릴', quantity: 1 },
      { name: '고속절단기,핸드그라인더', quantity: 1 },
      { name: '작업대발판', quantity: 1 },
    ],
    '부품팀': [
      { name: '지게차', quantity: 5 },
      { name: '걸이구', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '밧데리충전기', quantity: 1 },
    ],
  };

  for (const [teamName, equipments] of Object.entries(asanEquipments)) {
    const team = await prisma.team.findFirst({
      where: {
        name: teamName,
        factoryId: asanFactory.id,
      },
    });

    if (!team) {
      console.log(`  ⚠️  ${teamName} 팀을 찾을 수 없습니다.`);
      continue;
    }

    for (const equipment of equipments) {
      await prisma.teamEquipment.upsert({
        where: {
          teamId_equipmentName: {
            teamId: team.id,
            equipmentName: equipment.name,
          },
        },
        update: {
          quantity: equipment.quantity,
        },
        create: {
          teamId: team.id,
          equipmentName: equipment.name,
          quantity: equipment.quantity,
        },
      });
    }

    console.log(`  ✓ ${teamName} 장비 ${equipments.length}개 생성`);
  }

  // 화성공장 장비 데이터
  console.log('\n2️⃣ 화성공장 장비 데이터 생성...');

  const hwaseongEquipments = {
    '선삭': [
      { name: '지게차', quantity: 2 },
      { name: '크레인', quantity: 14 },
      { name: 'CNC선반', quantity: 6 },
      { name: 'MCT', quantity: 9 },
      { name: 'Deep Hole', quantity: 1 },
      { name: '탁상용연삭기', quantity: 1 },
      { name: '시편절단기', quantity: 1 },
      { name: '밴드쏘우', quantity: 1 },
      { name: '칩이송장치', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '압력용기', quantity: 1 },
      { name: '공기압축기', quantity: 1 },
    ],
    '연삭': [
      { name: '크레인', quantity: 7 },
      { name: 'MCT', quantity: 1 },
      { name: '연삭기', quantity: 12 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '공기압축기', quantity: 1 },
    ],
    'M/B': [
      { name: '지게차', quantity: 2 },
      { name: '크레인', quantity: 9 },
      { name: '컨베이어', quantity: 1 },
      { name: '반전기', quantity: 1 },
      { name: '세척기', quantity: 1 },
      { name: '위험물,가스저장소', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '압력용기', quantity: 1 },
      { name: '공기압축기', quantity: 1 },
    ],
    'BKT': [
      { name: '지게차', quantity: 1 },
      { name: '크레인', quantity: 7 },
      { name: '위험물,가스저장소', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '공기압축기', quantity: 1 },
    ],
    'CR조립': [
      { name: '지게차', quantity: 3 },
      { name: '크레인', quantity: 13 },
      { name: '컨베이어', quantity: 1 },
      { name: 'MCT', quantity: 1 },
      { name: 'Deep Hole', quantity: 1 },
      { name: '용접기', quantity: 1 },
      { name: '탁상용연삭기', quantity: 1 },
      { name: '전동드릴,타카', quantity: 1 },
      { name: '작업대/발판', quantity: 1 },
      { name: '산소절단기', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '압력용기', quantity: 1 },
      { name: '가스분배기/쇼트기', quantity: 2 },
    ],
    '열처리': [
      { name: '지게차', quantity: 1 },
      { name: '크레인', quantity: 4 },
      { name: '도장장/건조로', quantity: 8 },
      { name: '밧데리충전기', quantity: 9 },
      { name: '템퍼링로', quantity: 3 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '열처리,올케이스로', quantity: 1 },
      { name: '가스분배기/쇼트기', quantity: 2 },
    ],
    'CR자재': [
      { name: '지게차', quantity: 2 },
      { name: '세척기', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '공기압축기', quantity: 1 },
    ],
    '품질서비스': [
      { name: '지게차', quantity: 1 },
      { name: '크레인', quantity: 8 },
      { name: '탁상용연삭기', quantity: 1 },
      { name: '전동드릴,타카', quantity: 1 },
      { name: '위험물,가스저장소', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '공기압축기', quantity: 1 },
    ],
    'CR출하': [
      { name: '지게차', quantity: 1 },
      { name: '크레인', quantity: 4 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '공기압축기', quantity: 1 },
    ],
    'BR출하': [
      { name: '지게차', quantity: 2 },
      { name: '크레인', quantity: 2 },
      { name: '전동드릴,타카', quantity: 1 },
      { name: '작업대/발판', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '공기압축기', quantity: 1 },
    ],
    '자재부품': [
      { name: '지게차', quantity: 3 },
      { name: '크레인', quantity: 4 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '압력용기', quantity: 1 },
      { name: '공기압축기', quantity: 1 },
    ],
    '2공장': [
      { name: '지게차', quantity: 3 },
      { name: '크레인', quantity: 7 },
      { name: '세척기', quantity: 1 },
      { name: '세척조,피트로,유조로', quantity: 3 },
      { name: '열처리,올케이스로', quantity: 2 },
      { name: '굴착기', quantity: 7 },
      { name: '고속절단기', quantity: 1 },
      { name: '핸드그라인더', quantity: 1 },
      { name: '작업대/발판', quantity: 1 },
      { name: '산소절단기', quantity: 1 },
      { name: '위험물,가스저장소', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '걸이구', quantity: 1 },
      { name: '압력용기', quantity: 2 },
      { name: '가스분배기/쇼트기', quantity: 2 },
    ],
    '연구소': [
      { name: '탁상용연삭기', quantity: 1 },
      { name: '전동드릴,타카', quantity: 1 },
      { name: '소화전,소화기', quantity: 1 },
      { name: '분배전반', quantity: 1 },
      { name: '굴착기', quantity: 4 },
      { name: '테스트크레인', quantity: 1 },
    ],
  };

  for (const [teamName, equipments] of Object.entries(hwaseongEquipments)) {
    const team = await prisma.team.findFirst({
      where: {
        name: teamName,
        factoryId: hwaseongFactory.id,
      },
    });

    if (!team) {
      console.log(`  ⚠️  ${teamName} 팀을 찾을 수 없습니다.`);
      continue;
    }

    for (const equipment of equipments) {
      await prisma.teamEquipment.upsert({
        where: {
          teamId_equipmentName: {
            teamId: team.id,
            equipmentName: equipment.name,
          },
        },
        update: {
          quantity: equipment.quantity,
        },
        create: {
          teamId: team.id,
          equipmentName: equipment.name,
          quantity: equipment.quantity,
        },
      });
    }

    console.log(`  ✓ ${teamName} 장비 ${equipments.length}개 생성`);
  }

  console.log('\n✅ 라인별 장비 시드 데이터 생성 완료!');
}

main()
  .catch((e) => {
    console.error('❌ 시드 데이터 생성 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
