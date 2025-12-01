import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateRoles() {
  console.log('🔄 권한 마이그레이션 시작...\n');

  try {
    // 현재 SITE_MANAGER 사용자 조회
    const siteManagers = await prisma.user.findMany({
      where: { role: 'SITE_MANAGER' },
      select: { id: true, username: true, name: true, role: true }
    });

    console.log(`📋 SITE_MANAGER 사용자: ${siteManagers.length}명`);
    siteManagers.forEach(u => {
      console.log(`   - ${u.name || u.username} (${u.id})`);
    });

    if (siteManagers.length === 0) {
      console.log('\n✅ 마이그레이션할 SITE_MANAGER 사용자가 없습니다.');
      return;
    }

    // SITE_MANAGER → TEAM_LEADER로 변경
    const result = await prisma.user.updateMany({
      where: { role: 'SITE_MANAGER' },
      data: { role: 'TEAM_LEADER' }
    });

    console.log(`\n✅ ${result.count}명의 사용자 권한이 TEAM_LEADER로 변경되었습니다.`);

    // 변경 후 현황 출력
    const allUsers = await prisma.user.groupBy({
      by: ['role'],
      _count: { role: true }
    });

    console.log('\n📊 현재 권한별 사용자 수:');
    allUsers.forEach(g => {
      console.log(`   ${g.role}: ${g._count.role}명`);
    });

  } catch (error) {
    console.error('❌ 마이그레이션 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateRoles();
