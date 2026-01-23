import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
  console.log('누락된 아산 인원 추가...\n');

  const password = await bcrypt.hash('soosan1234!', 10);

  // 1. 누락된 APPROVER: 신국재
  let approver;
  const existingApprover = await prisma.user.findFirst({ where: { username: 'gjshin' } });
  if (existingApprover) {
    console.log('APPROVER 이미 존재: 신국재');
    approver = existingApprover;
  } else {
    approver = await prisma.user.create({
      data: {
        username: 'gjshin',
        name: '신국재',
        email: 'gjshin@soosan.co.kr',
        password: password,
        role: 'APPROVER',
        site: '아산',
      }
    });
    console.log('APPROVER 추가: 신국재 (gjshin)');
  }

  // 2. 누락된 TEAM_LEADER: 김동현
  let leader1;
  const existingLeader1 = await prisma.user.findFirst({ where: { username: 'seeyou.kim' } });
  if (existingLeader1) {
    console.log('TEAM_LEADER 이미 존재: 김동현');
    leader1 = existingLeader1;
  } else {
    leader1 = await prisma.user.create({
      data: {
        username: 'seeyou.kim',
        name: '김동현',
        email: 'seeyou.kim@soosan.co.kr',
        password: password,
        role: 'TEAM_LEADER',
        site: '아산',
      }
    });
    console.log('TEAM_LEADER 추가: 김동현 (seeyou.kim)');
  }

  // 3. 누락된 TEAM_LEADER: 박래현
  let leader2;
  const existingLeader2 = await prisma.user.findFirst({ where: { username: 'prh78' } });
  if (existingLeader2) {
    console.log('TEAM_LEADER 이미 존재: 박래현');
    leader2 = existingLeader2;
  } else {
    leader2 = await prisma.user.create({
      data: {
        username: 'prh78',
        name: '박래현',
        email: 'prh78@soosan.co.kr',
        password: password,
        role: 'TEAM_LEADER',
        site: '아산',
      }
    });
    console.log('TEAM_LEADER 추가: 박래현 (prh78)');
  }

  // 4. 총무지원팀 팀장/결재자 업데이트
  const 총무지원팀 = await prisma.team.findFirst({ where: { name: '총무지원팀', site: '아산' } });
  if (총무지원팀) {
    await prisma.team.update({
      where: { id: 총무지원팀.id },
      data: { leaderId: leader1.id, approverId: approver.id }
    });
    console.log('총무지원팀 팀장(김동현)/결재자(신국재) 업데이트');
  }

  // 5. 품질관리팀 팀장 업데이트 (결재자는 임동진으로 이미 설정됨)
  const 품질관리팀 = await prisma.team.findFirst({ where: { name: '품질관리팀', site: '아산' } });
  if (품질관리팀) {
    await prisma.team.update({
      where: { id: 품질관리팀.id },
      data: { leaderId: leader2.id }
    });
    console.log('품질관리팀 팀장(박래현) 업데이트');
  }

  console.log('\n완료!');

  // 최종 확인
  const users = await prisma.user.findMany({
    where: { site: '아산' },
    select: { role: true }
  });
  const approvers = users.filter(u => u.role === 'APPROVER').length;
  const leaders = users.filter(u => u.role === 'TEAM_LEADER').length;
  console.log('아산 APPROVER: ' + approvers + '명');
  console.log('아산 TEAM_LEADER: ' + leaders + '명');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
