import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRoles() {
  try {
    console.log('권한 마이그레이션 시작...');

    // ADMIN → SAFETY_TEAM으로 자동 변환
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    });

    console.log(`\n✅ ADMIN 역할을 가진 사용자 ${adminUsers.length}명 발견`);

    for (const user of adminUsers) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SAFETY_TEAM' }
      });
      console.log(`   - ${user.name || user.username} (${user.id}): ADMIN → SAFETY_TEAM`);
    }

    // TEAM_LEADER는 유지
    const teamLeaders = await prisma.user.count({
      where: { role: 'TEAM_LEADER' }
    });
    console.log(`\n✅ TEAM_LEADER 역할: ${teamLeaders}명 (유지)`);

    // WORKER, OFFICE_WORKER는 수동 변경 안내
    const workers = await prisma.user.findMany({
      where: { role: 'WORKER' }
    });

    const officeWorkers = await prisma.user.findMany({
      where: { role: 'OFFICE_WORKER' }
    });

    console.log(`\n⚠️  수동 변경 필요:`);
    console.log(`   - WORKER (${workers.length}명) → 현장관리자로 변경 필요`);
    if (workers.length > 0) {
      workers.forEach(u => console.log(`     * ${u.name || u.username} (${u.id})`));
    }

    console.log(`   - OFFICE_WORKER (${officeWorkers.length}명) → 임원으로 변경 필요`);
    if (officeWorkers.length > 0) {
      officeWorkers.forEach(u => console.log(`     * ${u.name || u.username} (${u.id})`));
    }

    console.log(`\n📋 새로운 권한 체계:`);
    console.log(`   - ADMIN / SAFETY_TEAM: 총관리자 (안전보건팀)`);
    console.log(`   - TEAM_LEADER: 팀장`);
    console.log(`   - WORKER: 현장관리자`);
    console.log(`   - OFFICE_WORKER: 임원`);

    console.log(`\n✅ 권한 마이그레이션 완료!`);
    console.log(`\n💡 AdminPage에서 수동으로 나머지 권한을 변경해주세요.`);

  } catch (error) {
    console.error('권한 마이그레이션 오류:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateRoles();
