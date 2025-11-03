import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createSessionTable() {
  try {
    console.log('Creating user_sessions table...');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      );
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "user_sessions" DROP CONSTRAINT IF EXISTS "session_pkey";
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
    `);

    console.log('✅ user_sessions table created successfully!');
  } catch (error) {
    console.error('Error creating session table:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSessionTable();
