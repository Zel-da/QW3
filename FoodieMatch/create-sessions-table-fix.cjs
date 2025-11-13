const { Client } = require('pg');
require('dotenv').config();

async function createSessionsTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const sql = `
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      );

      ALTER TABLE "user_sessions" DROP CONSTRAINT IF EXISTS "session_pkey";
      ALTER TABLE "user_sessions" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

      DROP INDEX IF EXISTS "IDX_session_expire";
      CREATE INDEX "IDX_session_expire" ON "user_sessions" ("expire");
    `;

    await client.query(sql);
    console.log('✅ user_sessions table created successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

createSessionsTable();
