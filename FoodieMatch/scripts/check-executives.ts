import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 화성 사이트의 모든 사용자와 역할 확인
  const users = await prisma.user.findMany({
    where: { site: '화성' },
    select: { username: true, name: true, role: true },
    orderBy: { role: 'asc' }
  });

  console.log('\n=== 화성 사용자 역할 목록 ===\n');

  const roleGroups: Record<string, string[]> = {};
  users.forEach(u => {
    if (!roleGroups[u.role]) roleGroups[u.role] = [];
    roleGroups[u.role].push(`${u.name} (${u.username})`);
  });

  for (const [role, members] of Object.entries(roleGroups)) {
    console.log(`[${role}] - ${members.length}명`);
    members.forEach(m => console.log(`  - ${m}`));
    console.log('');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
