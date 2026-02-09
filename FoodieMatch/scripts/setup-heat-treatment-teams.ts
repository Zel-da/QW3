import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD = 'soosan1234!';

// 팀장 정보
const teamLeaders = [
  { name: '이덕표', username: 'leedp', email: 'leedp@soosan.co.kr', team: '열처리 1조' },
  { name: '이상현', username: 'lsh', email: 'lsh@soosan.co.kr', team: '열처리 2조' },
  { name: '심윤근', username: 'syg', email: 'syg@soosan.co.kr', team: '열처리 3조' },
];

async function main() {
  const hashedPassword = await bcrypt.hash(PASSWORD, 10);

  console.log('=== 화성 열처리팀 설정 시작 ===\n');

  // 1. 기존 열처리팀 찾기 (열처리 또는 열처리 1조)
  let existingTeam = await prisma.team.findFirst({
    where: { name: '열처리', site: '화성' }
  });

  if (!existingTeam) {
    existingTeam = await prisma.team.findFirst({
      where: { name: '열처리 1조', site: '화성' }
    });
  }

  if (!existingTeam) {
    console.log('❌ 기존 열처리팀을 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ 기존 열처리팀 발견: ID=${existingTeam.id}, 이름=${existingTeam.name}`);

  // 2. 팀장 계정 생성
  console.log('\n--- 팀장 계정 생성 ---');
  const createdLeaders: { [key: string]: string } = {};

  for (const leader of teamLeaders) {
    const existing = await prisma.user.findUnique({
      where: { username: leader.username }
    });

    if (existing) {
      console.log(`⚠️  ${leader.username} (${leader.name}) - 이미 존재함`);
      createdLeaders[leader.team] = existing.id;
      continue;
    }

    const user = await prisma.user.create({
      data: {
        username: leader.username,
        name: leader.name,
        email: leader.email,
        password: hashedPassword,
        role: 'TEAM_LEADER',
        site: '화성',
      }
    });

    console.log(`✅ ${user.username} (${leader.name}) - 생성 완료`);
    createdLeaders[leader.team] = user.id;
  }

  // 3. 기존 열처리팀 → 열처리 1조로 변경 + 팀장 설정
  console.log('\n--- 팀 설정 ---');

  const leader1Id = createdLeaders['열처리 1조'];
  if (existingTeam.name !== '열처리 1조') {
    await prisma.team.update({
      where: { id: existingTeam.id },
      data: {
        name: '열처리 1조',
        leaderId: leader1Id
      }
    });
    console.log(`✅ 열처리 → 열처리 1조로 변경, 팀장: 이덕표`);
  } else {
    // 이미 열처리 1조인 경우 팀장만 업데이트
    await prisma.team.update({
      where: { id: existingTeam.id },
      data: { leaderId: leader1Id }
    });
    console.log(`✅ 열처리 1조 팀장 업데이트: 이덕표`);
  }

  // 4. 기존 템플릿 조회 (복사용)
  const existingTemplate = await prisma.checklistTemplate.findFirst({
    where: { teamId: existingTeam.id },
    include: { templateItems: true }
  });

  // 5. 열처리 2조 생성 (이미 있으면 조회)
  const leader2Id = createdLeaders['열처리 2조'];
  let team2 = await prisma.team.findFirst({
    where: { name: '열처리 2조', site: '화성' }
  });

  if (!team2) {
    team2 = await prisma.team.create({
      data: {
        name: '열처리 2조',
        site: '화성',
        leaderId: leader2Id,
        displayOrder: existingTeam.displayOrder ? existingTeam.displayOrder + 1 : 100
      }
    });
    console.log(`✅ 열처리 2조 생성, 팀장: 이상현`);
  } else {
    await prisma.team.update({
      where: { id: team2.id },
      data: { leaderId: leader2Id }
    });
    console.log(`⚠️ 열처리 2조 이미 존재, 팀장 업데이트: 이상현`);
  }

  // 2조 팀장 teamId 업데이트
  await prisma.user.update({
    where: { id: leader2Id },
    data: { teamId: team2.id }
  });

  // 6. 열처리 3조 생성 (이미 있으면 조회)
  const leader3Id = createdLeaders['열처리 3조'];
  let team3 = await prisma.team.findFirst({
    where: { name: '열처리 3조', site: '화성' }
  });

  if (!team3) {
    team3 = await prisma.team.create({
      data: {
        name: '열처리 3조',
        site: '화성',
        leaderId: leader3Id,
        displayOrder: existingTeam.displayOrder ? existingTeam.displayOrder + 2 : 101
      }
    });
    console.log(`✅ 열처리 3조 생성, 팀장: 심윤근`);
  } else {
    await prisma.team.update({
      where: { id: team3.id },
      data: { leaderId: leader3Id }
    });
    console.log(`⚠️ 열처리 3조 이미 존재, 팀장 업데이트: 심윤근`);
  }

  // 3조 팀장 teamId 업데이트
  await prisma.user.update({
    where: { id: leader3Id },
    data: { teamId: team3.id }
  });

  // 1조 팀장 teamId 업데이트
  await prisma.user.update({
    where: { id: leader1Id },
    data: { teamId: existingTeam.id }
  });

  // 7. 템플릿 복사 (2조, 3조)
  if (existingTemplate) {
    console.log('\n--- 템플릿 복사 ---');

    for (const team of [team2, team3]) {
      const newTemplate = await prisma.checklistTemplate.create({
        data: {
          teamId: team.id,
          name: existingTemplate.name || `${team.name} TBM 템플릿`,
        }
      });

      // 템플릿 항목 복사
      for (const item of existingTemplate.templateItems) {
        await prisma.templateItem.create({
          data: {
            templateId: newTemplate.id,
            category: item.category,
            description: item.description,
            displayOrder: item.displayOrder
          }
        });
      }

      console.log(`✅ ${team.name} 템플릿 복사 완료 (${existingTemplate.templateItems.length}개 항목)`);
    }
  }

  // 8. 최영삼 3개 조에 팀원 등록
  console.log('\n--- 최영삼 팀원 등록 ---');

  for (const team of [existingTeam, team2, team3]) {
    // 이미 등록되어 있는지 확인
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: team.id,
        name: '최영삼'
      }
    });

    if (existingMember) {
      console.log(`⚠️  최영삼 - ${team.name}에 이미 등록됨`);
      continue;
    }

    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        name: '최영삼',
        position: '주간 담당',
        isActive: true
      }
    });
    console.log(`✅ 최영삼 - ${team.name}에 등록 완료`);
  }

  console.log('\n=== 설정 완료 ===');
  console.log(`
요약:
- 열처리 1조 (ID: ${existingTeam.id}) - 팀장: 이덕표
- 열처리 2조 (ID: ${team2.id}) - 팀장: 이상현
- 열처리 3조 (ID: ${team3.id}) - 팀장: 심윤근
- 최영삼: 3개 조에 모두 팀원 등록
  `);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
