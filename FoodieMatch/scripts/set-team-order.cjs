const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 팀 표시 순서 (사용자 요청대로)
const teamOrders = {
  // 화성공장 (19팀)
  '화성': [
    '선삭',           // 1
    '연삭',           // 2
    'MB',             // 3
    'BKT',            // 4
    '열처리',         // 5
    'BR출하',         // 6
    'BR자재부품팀',   // 7
    'BR품질서비스',   // 8
    'CR조립',         // 9
    'CR출하',         // 10
    'CR자재',         // 11
    '로드생산팀',     // 12
    'BR생산관리',     // 13
    'BR총괄',         // 14
    'CR생산관리',     // 15
    'BR개발팀',       // 16
    'SA개발팀',       // 17
    '품질관리팀',     // 18
    '총무지원팀',     // 19
  ],
  // 아산공장 (23팀)
  '아산': [
    '조립1라인',       // 1
    '조립2라인',       // 2
    '조립3라인',       // 3
    '전기라인',        // 4
    '제관라인',        // 5
    '가공라인',        // 6
    '생산팀',          // 7
    '생산기술팀',      // 8
    '자재팀',          // 9
    '고객지원팀',      // 10
    '부품팀',          // 11
    '품질관리팀',      // 12
    '기술관리팀',      // 13
    '천공기개발 1팀',  // 14
    '천공기개발 2팀',  // 15
    '특장개발 1팀',    // 16
    '특장개발 2팀',    // 17
    '제어 1팀',        // 18
    '제어 2팀',        // 19
    'CR개발팀',        // 20
    '선행기술팀',      // 21
    '구조해석팀',      // 22
    '총무지원팀',      // 23
  ],
};

async function main() {
  console.log('\n========================================');
  console.log('팀 표시 순서(displayOrder) 설정');
  console.log('========================================\n');

  for (const [site, teamNames] of Object.entries(teamOrders)) {
    console.log(`■ ${site}공장\n`);

    for (let i = 0; i < teamNames.length; i++) {
      const teamName = teamNames[i];
      const order = i + 1;

      try {
        const result = await prisma.team.updateMany({
          where: {
            name: teamName,
            site: site,
          },
          data: {
            displayOrder: order,
          },
        });

        if (result.count > 0) {
          console.log(`   [OK] ${order}. ${teamName}`);
        } else {
          console.log(`   [SKIP] ${teamName} - 팀을 찾을 수 없음`);
        }
      } catch (error) {
        console.log(`   [ERROR] ${teamName}: ${error.message}`);
      }
    }

    console.log('');
  }

  console.log('========================================');
  console.log('팀 표시 순서 설정 완료');
  console.log('========================================\n');

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
