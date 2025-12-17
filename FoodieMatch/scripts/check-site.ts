import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // User site 확인
  const users = await prisma.user.findMany({
    where: {
      username: { in: ['nowhs', 'sbk6116', 'ssp', 'swlee', 'pjy0302', 'prh78', 'gjshin'] }
    },
    select: { username: true, name: true, site: true }
  });

  console.log('\n=== User site 확인 ===');
  users.forEach(u => console.log(`${u.name}: site = ${u.site || 'NULL'}`));

  // Team site 확인
  const teamIds = [50, 51, 52, 53, 55, 27, 28, 61, 30, 54, 35, 56];
  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, name: true, site: true }
  });

  console.log('\n=== Team site 확인 ===');
  teams.forEach(t => console.log(`${t.name} (${t.id}): site = ${t.site || 'NULL'}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
