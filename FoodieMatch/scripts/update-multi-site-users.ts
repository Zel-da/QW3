/**
 * 다중 사이트 접근 사용자 업데이트
 * - 신국재, 김동현, 박래현: 화성 + 아산 양쪽 접근 가능
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const MULTI_SITE_USERS = ['gjshin', 'seeyou.kim', 'prh78'];

async function main() {
  console.log('다중 사이트 사용자 업데이트...\n');

  for (const username of MULTI_SITE_USERS) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, name: true, username: true, site: true, sites: true }
    });

    if (!user) {
      console.log('사용자 없음: ' + username);
      continue;
    }

    // sites 필드 업데이트 (화성,아산)
    await prisma.user.update({
      where: { id: user.id },
      data: { sites: '화성,아산' }
    });

    console.log('업데이트: ' + user.name + ' (' + user.username + ') - sites: 화성,아산');
  }

  console.log('\n완료!');

  // 확인
  console.log('\n다중 사이트 사용자 확인:');
  const updatedUsers = await prisma.user.findMany({
    where: { username: { in: MULTI_SITE_USERS } },
    select: { name: true, username: true, site: true, sites: true, role: true }
  });
  updatedUsers.forEach(u => {
    console.log('  ' + u.name + ' (' + u.username + '): site=' + u.site + ', sites=' + u.sites + ', role=' + u.role);
  });
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
