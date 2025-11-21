import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRoles() {
  console.log('🔄 Phase 2: Role Migration 시작...\n');

  try {
    // 1. 현재 role 분포 확인
    const currentRoles = await prisma.$queryRaw<Array<{ role: string, count: bigint }>>`
      SELECT role, COUNT(*) as count
      FROM "User"
      GROUP BY role
      ORDER BY role
    `;

    console.log('📊 현재 Role 분포:');
    currentRoles.forEach(r => {
      console.log(`   - ${r.role}: ${r.count}명`);
    });
    console.log('');

    // 2. WORKER → SITE_MANAGER
    const workerCount = await prisma.user.updateMany({
      where: { role: 'WORKER' },
      data: { role: 'SITE_MANAGER' },
    });
    console.log(`✅ WORKER → SITE_MANAGER: ${workerCount.count}명 업데이트`);

    // 3. OFFICE_WORKER → APPROVER
    const officeWorkerCount = await prisma.user.updateMany({
      where: { role: 'OFFICE_WORKER' },
      data: { role: 'APPROVER' },
    });
    console.log(`✅ OFFICE_WORKER → APPROVER: ${officeWorkerCount.count}명 업데이트`);

    console.log('');

    // 4. 업데이트 후 role 분포 확인
    const updatedRoles = await prisma.$queryRaw<Array<{ role: string, count: bigint }>>`
      SELECT role, COUNT(*) as count
      FROM "User"
      GROUP BY role
      ORDER BY role
    `;

    console.log('📊 업데이트 후 Role 분포:');
    updatedRoles.forEach(r => {
      console.log(`   - ${r.role}: ${r.count}명`);
    });
    console.log('');

    console.log('✅ Phase 2 Role Migration 완료!\n');

  } catch (error) {
    console.error('❌ Migration 실패:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrateRoles();
