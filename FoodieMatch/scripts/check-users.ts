import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: {
      username: {
        in: ['nowhs', 'sbk6116', 'ssp', 'swlee', 'pjy0302', 'prh78', 'gjshin',
             'kimci', 'hp.jeon', 'pyw', 'ydlee', 'leehsoo', 'cs133', 'kkw',
             'hkkim', 'ch.han', 'kimgho', 'kimns', 'ksbong', 'hanjb',
             'jy.lee', 'ku.lee', 'seeyou.kim']
      }
    },
    select: {
      username: true,
      name: true,
      email: true,
      role: true,
      teamId: true,
    }
  });

  console.log(`\n총 ${users.length}명 조회됨:\n`);
  users.forEach(u => {
    console.log(`${u.name} | ${u.username} | ${u.role} | 팀ID: ${u.teamId}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
