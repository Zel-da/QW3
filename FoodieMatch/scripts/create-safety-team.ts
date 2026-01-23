import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 안전환경보건팀 및 관리자 계정 생성 ===\n');

  // 1. 공장 정보 확인
  const factories = await prisma.factory.findMany();
  console.log('공장 목록:');
  factories.forEach(f => console.log(`  - ${f.name} (ID: ${f.id}, Code: ${f.code})`));

  const asanFactory = factories.find(f => f.code === 'ASAN');
  const hwaseongFactory = factories.find(f => f.code === 'HWASEONG');

  if (!asanFactory || !hwaseongFactory) {
    console.error('아산 또는 화성 공장을 찾을 수 없습니다.');
    return;
  }

  console.log(`\n아산 공장 ID: ${asanFactory.id}`);
  console.log(`화성 공장 ID: ${hwaseongFactory.id}`);

  // 2. 안전환경보건팀 생성
  const teamName = '안전환경보건팀';

  // 아산 안전환경보건팀
  let asanTeam = await prisma.team.findFirst({
    where: { name: teamName, factoryId: asanFactory.id }
  });

  if (!asanTeam) {
    asanTeam = await prisma.team.create({
      data: {
        name: teamName,
        factoryId: asanFactory.id
      }
    });
    console.log(`\n✅ 아산 ${teamName} 생성됨 (ID: ${asanTeam.id})`);
  } else {
    console.log(`\n⚠️ 아산 ${teamName} 이미 존재 (ID: ${asanTeam.id})`);
  }

  // 화성 안전환경보건팀
  let hwaseongTeam = await prisma.team.findFirst({
    where: { name: teamName, factoryId: hwaseongFactory.id }
  });

  if (!hwaseongTeam) {
    hwaseongTeam = await prisma.team.create({
      data: {
        name: teamName,
        factoryId: hwaseongFactory.id
      }
    });
    console.log(`✅ 화성 ${teamName} 생성됨 (ID: ${hwaseongTeam.id})`);
  } else {
    console.log(`⚠️ 화성 ${teamName} 이미 존재 (ID: ${hwaseongTeam.id})`);
  }

  // 3. 관리자 계정 생성
  const defaultPassword = await bcrypt.hash('soosan123!', 10);

  // 화성 팀장 - 표경윤
  const hwaseongLeader = await createOrUpdateUser({
    username: 'gy.pyo',
    email: 'gy.pyo@soosan.co.kr',
    name: '표경윤',
    password: defaultPassword,
    role: 'ADMIN',
    teamId: hwaseongTeam.id,
    site: 'HWASEONG',
    sites: 'ASAN,HWASEONG'  // 모든 사이트 접근 가능
  });
  console.log(`\n✅ 화성 팀장 계정: ${hwaseongLeader.username} (${hwaseongLeader.email})`);

  // 아산 팀장 - 김문현
  const asanLeader = await createOrUpdateUser({
    username: 'soosan7143',
    email: 'soosan7143@soosan.co.kr',
    name: '김문현',
    password: defaultPassword,
    role: 'ADMIN',
    teamId: asanTeam.id,
    site: 'ASAN',
    sites: 'ASAN,HWASEONG'  // 모든 사이트 접근 가능
  });
  console.log(`✅ 아산 팀장 계정: ${asanLeader.username} (${asanLeader.email})`);

  // 총 관리 - 정상배
  const superAdmin = await createOrUpdateUser({
    username: 'sbjung',
    email: 'sbjung@soosan.co.kr',
    name: '정상배',
    password: defaultPassword,
    role: 'ADMIN',
    teamId: null,  // 특정 팀에 소속되지 않음
    site: null,
    sites: 'ASAN,HWASEONG'  // 모든 사이트 접근 가능
  });
  console.log(`✅ 총 관리 계정: ${superAdmin.username} (${superAdmin.email})`);

  // 4. 팀장 설정
  await prisma.team.update({
    where: { id: hwaseongTeam.id },
    data: { leaderId: hwaseongLeader.id }
  });
  console.log(`\n✅ 화성 ${teamName} 팀장 설정: ${hwaseongLeader.name}`);

  await prisma.team.update({
    where: { id: asanTeam.id },
    data: { leaderId: asanLeader.id }
  });
  console.log(`✅ 아산 ${teamName} 팀장 설정: ${asanLeader.name}`);

  console.log('\n=== 완료 ===');
  console.log('\n생성된 계정 (기본 비밀번호: soosan123!)');
  console.log('1. 표경윤 (gy.pyo) - 화성 안전환경보건팀 팀장, ADMIN');
  console.log('2. 김문현 (soosan7143) - 아산 안전환경보건팀 팀장, ADMIN');
  console.log('3. 정상배 (sbjung) - 총 관리, ADMIN');
}

async function createOrUpdateUser(data: {
  username: string;
  email: string;
  name: string;
  password: string;
  role: string;
  teamId: number | null;
  site: string | null;
  sites: string;
}) {
  let user = await prisma.user.findFirst({
    where: { OR: [{ username: data.username }, { email: data.email }] }
  });

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        role: data.role,
        teamId: data.teamId,
        site: data.site,
        sites: data.sites
      }
    });
    console.log(`  (기존 계정 업데이트: ${data.username})`);
  } else {
    user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        name: data.name,
        password: data.password,
        role: data.role,
        teamId: data.teamId,
        site: data.site,
        sites: data.sites
      }
    });
  }

  return user;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
