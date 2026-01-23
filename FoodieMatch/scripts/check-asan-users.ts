import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { site: '아산' },
    select: { name: true, username: true, role: true },
    orderBy: { role: 'asc' }
  });
  console.log('아산 사용자 총: ' + users.length + '명\n');

  const byRole: Record<string, any[]> = {};
  users.forEach(u => {
    if (!byRole[u.role]) byRole[u.role] = [];
    byRole[u.role].push(u);
  });

  for (const [role, list] of Object.entries(byRole)) {
    console.log(role + ': ' + list.length + '명');
    list.forEach(u => console.log('  - ' + u.name + ' (' + u.username + ')'));
    console.log('');
  }
}
main().finally(() => prisma.$disconnect());
