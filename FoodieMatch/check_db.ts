import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUser() {
  console.log('=== 사용자 ID 복구 ===\n');

  const oldId = '787d9302-222d-48dd-8ac3-ecfc2c879811';
  const sessionUserId = 'b3fcfd1d-bd53-4948-8c4f-bc7f10b5b90e';

  // 1. 기존 사용자 정보 저장
  const existingUser = await prisma.user.findUnique({ where: { id: oldId } });

  if (existingUser) {
    console.log('기존 사용자:', existingUser.username, existingUser.role);

    // 2. 기존 사용자 삭제 먼저
    await prisma.user.delete({ where: { id: oldId } });
    console.log('✅ 기존 사용자 삭제 완료');

    // 3. 새 ID로 사용자 생성
    await prisma.user.create({
      data: {
        id: sessionUserId,
        username: existingUser.username,
        name: existingUser.name,
        email: existingUser.email,
        password: existingUser.password,
        role: existingUser.role,
        site: existingUser.site,
        teamId: existingUser.teamId
      }
    });

    console.log('✅ 새 사용자 생성 완료:', sessionUserId);
  } else {
    console.log('❌ 기존 사용자를 찾을 수 없습니다');
  }

  // 최종 확인
  const finalUser = await prisma.user.findUnique({ where: { id: sessionUserId } });
  console.log('\n최종 확인:', finalUser ? `✅ ${finalUser.username} (${finalUser.role})` : '❌ 없음');

  await prisma.$disconnect();
}

fixUser().catch(console.error);
