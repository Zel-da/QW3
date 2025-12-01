import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData: any = {};

  console.log('📦 데이터베이스 백업 시작...\n');

  try {
    // 1. 팀 정보
    console.log('1️⃣ 팀 정보 백업...');
    backupData.teams = await prisma.team.findMany({
      include: {
        factory: true,
      }
    });
    console.log(`   ✅ ${backupData.teams.length}개 팀`);

    // 2. 체크리스트 템플릿
    console.log('2️⃣ 체크리스트 템플릿 백업...');
    backupData.checklistTemplates = await prisma.checklistTemplate.findMany({
      include: {
        templateItems: true,
      }
    });
    console.log(`   ✅ ${backupData.checklistTemplates.length}개 템플릿`);

    // 3. 템플릿 항목
    console.log('3️⃣ 템플릿 항목 백업...');
    backupData.templateItems = await prisma.templateItem.findMany();
    console.log(`   ✅ ${backupData.templateItems.length}개 항목`);

    // 4. 공장 정보
    console.log('4️⃣ 공장 정보 백업...');
    backupData.factories = await prisma.factory.findMany();
    console.log(`   ✅ ${backupData.factories.length}개 공장`);

    // 5. 사용자 정보 (비밀번호 제외)
    console.log('5️⃣ 사용자 정보 백업...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        site: true,
        teamId: true,
      }
    });
    backupData.users = users;
    console.log(`   ✅ ${backupData.users.length}명 사용자`);

    // 백업 파일 저장
    const filename = `backup_FULL_${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
    console.log(`\n🎉 백업 완료: ${filename}`);

    // 요약 출력
    console.log('\n📊 백업 요약:');
    console.log(`   - 팀: ${backupData.teams.length}개`);
    console.log(`   - 체크리스트 템플릿: ${backupData.checklistTemplates.length}개`);
    console.log(`   - 템플릿 항목: ${backupData.templateItems.length}개`);
    console.log(`   - 공장: ${backupData.factories.length}개`);
    console.log(`   - 사용자: ${backupData.users.length}명`);

    // 현재 팀별 템플릿 상태 출력
    console.log('\n📋 현재 팀-템플릿 매핑 상태:');
    for (const team of backupData.teams) {
      const template = backupData.checklistTemplates.find((t: any) => t.teamId === team.id);
      console.log(`   ${team.site || '미지정'} | ${team.name} (ID:${team.id}) → ${template ? template.name : '❌ 템플릿 없음'}`);
    }

  } catch (error) {
    console.error('❌ 백업 오류:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase();
