/**
 * TeamMember (로그인 없는 팀원 명단) 일괄 추가 스크립트
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 팀 ID 매핑
const teamIdMap: Record<string, number> = {
  '선삭': 50,
  '연삭': 51,
  'MB': 52,
  'BKT': 53,
  '열처리': 55,
  'BR출하': 27,
  'BR자재부품': 28,
  '2공장': 61,
  'BR품질서비스': 30,
  'CR조립': 54,
  'CR출하': 35,
  'CR자재': 56,
};

// 팀원 명단 (52명)
const teamMembersList: { team: string; members: string[] }[] = [
  { team: '선삭', members: ['이강희', '박진수', '김상균', '백건열', '김갑태'] },
  { team: '연삭', members: ['김동원', '하명남', '강석철', '서정원', '이순금'] },
  { team: 'MB', members: ['최원기', '김성진', '허명', '김승현', '정희영', '원정환'] },
  { team: 'BKT', members: ['박철호', '권오석', '김남균', '최장수', '안상국'] },
  { team: '열처리', members: ['이상현', '이덕표', '유자현', '안태영', '심윤근'] },
  { team: 'BR출하', members: ['김지홍'] },
  { team: 'BR자재부품', members: ['박명호', '황공식', '남광호', '박찬기', '김수현', '이강희'] },
  { team: '2공장', members: ['홍은희', '서경우', '장종성'] },
  { team: 'BR품질서비스', members: ['이덕희', '이효문', '김은옥', '김영봉', '신태섭'] },
  { team: 'CR조립', members: ['이부열', '김준철', '신동현', '김상현', '권태범', '전구', '윤관호', '마지환', '김혁', '정승혁'] },
  { team: 'CR출하', members: ['조성진', '신민섭'] },
  { team: 'CR자재', members: ['천광석'] },
];

async function main() {
  console.log('========================================');
  console.log('TeamMember 일괄 추가 스크립트');
  console.log('========================================\n');

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const { team, members } of teamMembersList) {
    const teamId = teamIdMap[team];
    console.log(`\n📁 ${team} (ID: ${teamId})`);

    // 기존 팀원 확인
    const existingMembers = await prisma.teamMember.findMany({
      where: { teamId },
      select: { name: true }
    });
    const existingNames = new Set(existingMembers.map(m => m.name));

    for (const name of members) {
      if (existingNames.has(name)) {
        console.log(`   ⏭️  스킵: ${name} (이미 존재)`);
        totalSkipped++;
        continue;
      }

      await prisma.teamMember.create({
        data: {
          teamId,
          name,
          isActive: true,
        }
      });
      console.log(`   ✅ 추가: ${name}`);
      totalCreated++;
    }
  }

  console.log('\n========================================');
  console.log('완료!');
  console.log(`추가: ${totalCreated}명`);
  console.log(`스킵: ${totalSkipped}명`);
  console.log('========================================');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
