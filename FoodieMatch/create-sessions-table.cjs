/**
 * Create user_sessions table for PostgreSQL session store
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating user_sessions table...');

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
      WITH (OIDS=FALSE);
    `);

    console.log('✅ Table created');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "user_sessions"
      ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      NOT DEFERRABLE INITIALLY IMMEDIATE;
    `);

    console.log('✅ Primary key added');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire"
      ON "user_sessions" ("expire");
    `);

    console.log('✅ Index created');
    console.log('\n🎉 user_sessions table created successfully!');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Table or constraint already exists');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
