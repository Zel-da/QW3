/**
 * 화성 팀 안전점검 템플릿 수정
 * 1. 잘못 복사된 아산 템플릿 삭제 (13개 팀)
 * 2. 화성 실제 장비 기반 새 템플릿 생성 (9개 팀)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 잘못 복사된 아산 템플릿을 삭제할 팀 ID
const TEAMS_TO_DELETE = [50, 51, 52, 53, 54, 55, 56, 61, 62, 63, 64, 65, 66];

// 화성 팀별 실제 장비 데이터
const HWASEONG_EQUIPMENT: Record<number, { name: string; equipment: string[] }> = {
  50: {
    name: '선삭',
    equipment: [
      '지게차', '크레인', 'CNC선반', 'MCT', 'Deep Hole', '드릴(레디알)',
      '탁상용연삭기', '밴드쏘우', '칩이송장치', '산소절단기',
      '위험물/가스저장소', '소화전/소화기', '분배전반', '걸이구', '압력용기'
    ]
  },
  51: {
    name: '연삭',
    equipment: [
      '크레인', 'MCT', '연삭기', '산소절단기',
      '위험물/가스저장소', '소화전/소화기', '압력용기'
    ]
  },
  52: {
    name: 'M/B',
    equipment: [
      '지게차', '크레인', '컨베이어', '용접기', '연삭기', '둥근톱',
      '산소절단기', '위험물/가스저장소', '소화전/소화기', '분배전반', '공기압축기'
    ]
  },
  53: {
    name: 'BKT',
    equipment: [
      '지게차', '크레인', '산소절단기',
      '위험물/가스저장소', '소화전/소화기', '분배전반', '공기압축기'
    ]
  },
  54: {
    name: 'CR조립',
    equipment: [
      '지게차', '크레인', '컨베이어', '용접기', '반전기', '연삭기',
      '드릴(레디알)', '전동드릴/타카', '둥근톱', '산소절단기',
      '위험물/가스저장소', '소화전/소화기', '분배전반', '걸이구', '압력용기', '공기압축기'
    ]
  },
  55: {
    name: '열처리',
    equipment: [
      '지게차', '크레인', '템퍼링로', '세척조/피트로/유조로', '열처리/올케이스로',
      '산소절단기', '위험물/가스저장소', '분배전반', '공기압축기'
    ]
  },
  56: {
    name: 'CR자재',
    equipment: [
      '지게차', '밧데리충전기', '산소절단기', '위험물/가스저장소', '공기압축기'
    ]
  },
  61: {
    name: '2공장',
    equipment: [
      '지게차', '크레인', '세척기', '템퍼링로', '열처리/올케이스로', '굴착기',
      '고속절단기', '핸드그라인더', '작업대/발판', '산소절단기',
      '위험물/가스저장소', '소화전/소화기', '분배전반', '걸이구', '공기압축기'
    ]
  },
  39: {
    name: '연구소',
    equipment: [
      '시편절단기', '굴착기', '테스트크레인', '전동드릴/타카',
      '산소절단기', '위험물/가스저장소'
    ]
  }
};

async function main() {
  console.log('========================================');
  console.log('화성 팀 안전점검 템플릿 수정');
  console.log('========================================\n');

  // Step 1: 잘못 복사된 아산 템플릿 삭제
  console.log('Step 1: 잘못 복사된 아산 템플릿 삭제');
  console.log('----------------------------------------');

  for (const teamId of TEAMS_TO_DELETE) {
    const deleted = await prisma.inspectionTemplate.deleteMany({
      where: { teamId }
    });
    if (deleted.count > 0) {
      console.log(`  [${teamId}] ${deleted.count}개 템플릿 삭제`);
    }
  }

  // Step 2: 화성 장비 기반 새 템플릿 생성
  console.log('\nStep 2: 화성 장비 기반 새 템플릿 생성');
  console.log('----------------------------------------');

  for (const [teamIdStr, data] of Object.entries(HWASEONG_EQUIPMENT)) {
    const teamId = parseInt(teamIdStr);

    // 팀 존재 확인
    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      console.log(`  ⚠️ [${teamId}] ${data.name} - 팀이 존재하지 않음`);
      continue;
    }

    // 12개월 모두 동일한 장비 목록으로 생성
    let created = 0;
    for (let month = 1; month <= 12; month++) {
      for (let i = 0; i < data.equipment.length; i++) {
        await prisma.inspectionTemplate.create({
          data: {
            teamId,
            month,
            equipmentName: data.equipment[i],
            displayOrder: i + 1,
            isRequired: true
          }
        });
        created++;
      }
    }

    console.log(`  ✅ [${teamId}] ${data.name} - ${data.equipment.length}개 장비 × 12개월 = ${created}개 템플릿 생성`);
  }

  // Step 3: 결과 확인
  console.log('\nStep 3: 화성 팀 템플릿 현황');
  console.log('----------------------------------------');

  const hwaseongTeams = await prisma.team.findMany({
    where: { site: '화성' },
    include: {
      inspectionTemplates: { take: 1 }
    },
    orderBy: { name: 'asc' }
  });

  for (const team of hwaseongTeams) {
    const count = await prisma.inspectionTemplate.count({ where: { teamId: team.id } });
    const status = count > 0 ? '✅' : '❌';
    console.log(`  ${status} [${team.id}] ${team.name}: ${count}개 템플릿`);
  }

  console.log('\n========================================');
  console.log('완료!');
  console.log('========================================');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
