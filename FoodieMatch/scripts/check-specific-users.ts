import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 신국재, 김동현, 박래현 확인
  const users = await prisma.user.findMany({
    where: {
      username: { in: ['gjshin', 'seeyou.kim', 'prh78'] }
    },
    select: { name: true, username: true, role: true, site: true }
  });
  console.log('찾은 사용자 (' + users.length + '명):');
  users.forEach(u => console.log('  ' + u.name + ' (' + u.username + ') - ' + u.role + ' / ' + u.site));

  // 전체 아산 사용자 수 확인
  const allAsan = await prisma.user.findMany({
    where: { site: '아산' },
    select: { role: true }
  });
  console.log('\n아산 사용자 총: ' + allAsan.length + '명');
  console.log('  APPROVER: ' + allAsan.filter(u => u.role === 'APPROVER').length);
  console.log('  TEAM_LEADER: ' + allAsan.filter(u => u.role === 'TEAM_LEADER').length);
}
main().finally(() => prisma.$disconnect());
