import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_Qat6qIvV5lnh@ep-round-dawn-a1ansap1-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
    }
  }
});

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true }
    });
    console.log('Users in Neon DB:', users.length);
    console.log(JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
