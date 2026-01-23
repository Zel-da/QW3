const { PrismaClient } = require('./node_modules/.prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teams = await prisma.team.findMany({
    orderBy: [{ site: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, site: true }
  });
  
  console.log('=== 화성 팀 목록 ===');
  teams.filter(t => t.site === '화성').forEach(t => console.log(`ID ${t.id}: ${t.name}`));
  
  console.log('\n=== 아산 팀 목록 ===');
  teams.filter(t => t.site === '아산').forEach(t => console.log(`ID ${t.id}: ${t.name}`));
  
  console.log('\n=== 기타 ===');
  teams.filter(t => t.site !== '화성' && t.site !== '아산').forEach(t => console.log(`ID ${t.id}: ${t.name} (${t.site})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
