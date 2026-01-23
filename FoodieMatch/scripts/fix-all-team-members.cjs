const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 팀별 직원 전체 목록 (직원 칸의 모든 사람)
const teamMembers = {
  // 화성 팀 (직원 칸에 있는 사람들)
  50: ['이강희', '박진수', '김상균', '백건열', '김갑태'], // 선삭
  51: ['김동원', '하명남', '강석철', '서정원', '이순금'], // 연삭
  52: ['최원기', '김성진', '허명', '김승현', '정희영'], // MB
  53: ['박철호', '권오석', '김남균', '최장수', '안상국'], // BKT
  55: ['이상현', '이덕표', '유자현', '안태영', '심윤근', '원정환'], // 열처리
  27: ['김지홍'], // BR출하
  28: ['박명호', '황공식', '남광호', '박찬기', '김수현'], // BR자재부품팀
  30: ['이덕희', '이효문', '김은옥', '김영봉', '신태섭', '이강희'], // BR품질서비스
  54: ['이부열', '김준철', '신동현', '김상현', '권태범', '전구', '윤관호', '마지환', '김혁', '정승혁'], // CR조립
  35: ['조성진', '신민섭'], // CR출하
  56: ['천광석'], // CR자재
  61: ['홍은희', '서경우', '장종성'], // 로드생산팀
  62: [], // BR생산관리
  63: [], // BR총괄
  65: [], // CR생산관리
  64: [], // BR개발팀
  32: [], // SA개발팀
  66: [], // 품질관리팀
  38: [], // 총무지원팀

  // 아산 팀 (직원 칸에 있는 사람들 - 팀장 포함)
  67: ['김정철', '강준형', '김영우', '윤정관', '최정훈', '박영주', '유동진', '민지홍', '하창우', '조현관', '김다훈', '최재억'], // 조립1라인
  68: ['조창용', '고기현', '이동근', '이용청', '김세기', '이배길', '이순한', '오상수', '정혜수', '윤환식'], // 조립2라인
  69: ['김덕수', '이정훈', '김일환', '이윤주', '강한순', '김호방', '이모준', '김재주', '조성학'], // 조립3라인
  42: ['금서우', '김동우', '강정식', '황인용', '마정훈', '김종헌'], // 전기라인
  2: ['김영산', '김정호', '박성복', '곽호진', '성대호', '신경진', '김용일', '박갑진'], // 제관라인
  3: ['임성길', '김화겸', '김광석', '김영래', '이희곤', '김현구', '강민준', '양성모', '박민호', '박기운', '이종서'], // 가공라인
  70: [], // 생산팀
  9: [], // 생산기술팀
  45: [], // 자재팀
  48: [], // 고객지원팀
  49: [], // 부품팀
  46: [], // 품질관리팀
  73: [], // 기술관리팀
  74: [], // 천공기개발 1팀
  75: [], // 천공기개발 2팀
  76: [], // 특장개발 1팀
  77: [], // 특장개발 2팀
  78: [], // 제어 1팀
  79: [], // 제어 2팀
  80: [], // CR개발팀
  81: [], // 선행기술팀
  72: [], // 구조해석팀
  71: [], // 총무지원팀
};

async function main() {
  console.log('\n========================================');
  console.log('TeamMember 전체 수정 - 직원 칸의 모든 사람');
  console.log('========================================\n');

  const teamIds = Object.keys(teamMembers).map(Number);

  // 1. 기존 TeamMember 전부 삭제
  console.log('1. 기존 TeamMember 삭제 중...');
  const deleteResult = await prisma.teamMember.deleteMany({
    where: { teamId: { in: teamIds } }
  });
  console.log(`   삭제된 TeamMember: ${deleteResult.count}명\n`);

  // 2. 모든 직원 추가
  console.log('2. 직원 추가 중...\n');

  let totalCreated = 0;
  for (const [teamIdStr, members] of Object.entries(teamMembers)) {
    const teamId = parseInt(teamIdStr);

    if (members.length === 0) {
      continue;
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { name: true }
    });

    for (const memberName of members) {
      try {
        await prisma.teamMember.create({
          data: {
            teamId: teamId,
            name: memberName,
            isActive: true,
          }
        });
        totalCreated++;
      } catch (error) {
        console.log(`   [ERROR] ${team?.name}: ${memberName} - ${error.message}`);
      }
    }
    console.log(`   [OK] ${team?.name}: ${members.length}명`);
  }

  console.log('\n========================================');
  console.log(`완료: 총 ${totalCreated}명 직원 추가`);
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
