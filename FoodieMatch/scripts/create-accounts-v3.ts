/**
 * 계정 일괄 생성 스크립트 v3
 * 팀 생성 없이 기존 팀만 사용
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// 기존 팀 ID 직접 매핑
const teamIdMap: Record<string, number> = {
  'BR생산관리': 19,      // BR생산 선삭 사용
  'BR총괄': 19,          // BR생산 선삭 사용
  '선삭': 50,
  '연삭': 51,
  'MB': 52,              // M/B
  'BKT': 53,
  '열처리': 55,
  'BR출하': 27,
  'BR자재부품': 28,      // 자재부품
  '2공장': 61,
  'BR품질서비스': 30,    // 품질서비스
  'BR개발': 4,           // 연구소
  'SA개발': 32,          // S/A개발
  'CR생산관리': 33,      // CR생산 팀장
  'CR조립': 54,
  'CR출하': 35,
  'CR자재': 56,
  '품질관리': 46,        // 품질관리팀
  '인사총무': 38,
};

// 팀장 (TEAM_LEADER) - 7명
const teamLeaders = [
  { name: '노화식', username: 'nowhs', email: 'nowhs@soosan.co.kr', teams: ['BR생산관리', 'BR자재부품', '2공장'] },
  { name: '손범국', username: 'sbk6116', email: 'sbk6116@soosan.co.kr', teams: ['BR총괄', '선삭', '연삭', 'MB', 'BKT', '열처리', 'BR출하'] },
  { name: '신상표', username: 'ssp', email: 'ssp@soosan.co.kr', teams: ['BR품질서비스'] },
  { name: '이상우', username: 'swlee', email: 'swlee@soosan.co.kr', teams: ['BR개발', 'SA개발'] },
  { name: '박준영', username: 'pjy0302', email: 'pjy0302@soosan.co.kr', teams: ['CR생산관리', 'CR조립', 'CR출하', 'CR자재'] },
  { name: '박래현', username: 'prh78', email: 'prh78@soosan.co.kr', teams: ['품질관리'] },
  { name: '신국재', username: 'gjshin', email: 'gjshin@soosan.co.kr', teams: ['인사총무'] },
];

// 팀원 (USER) - 16명
const teamMembers = [
  { name: '김천일', username: 'kimci', email: 'kimci@soosan.co.kr', team: 'BR총괄' },
  { name: '전형표', username: 'hp.jeon', email: 'hp.jeon@soosan.co.kr', team: '선삭' },
  { name: '박영웅', username: 'pyw', email: 'pyw@soosan.co.kr', team: '연삭' },
  { name: '이용대', username: 'ydlee', email: 'ydlee@soosan.co.kr', team: 'MB' },
  { name: '이흥수', username: 'leehsoo', email: 'leehsoo@soosan.co.kr', team: 'BKT' },
  { name: '최영삼', username: 'cs133', email: 'cs133@soosan.co.kr', team: '열처리' },
  { name: '권기원', username: 'kkw', email: 'kkw@soosan.co.kr', team: 'BR출하' },
  { name: '김형근', username: 'hkkim', email: 'hkkim@soosan.co.kr', team: 'BR자재부품' },
  { name: '한철희', username: 'ch.han', email: 'ch.han@soosan.co.kr', team: '2공장' },
  { name: '김경호', username: 'kimgho', email: 'kimgho@soosan.co.kr', team: 'BR개발' },
  { name: '김남수', username: 'kimns', email: 'kimns@soosan.co.kr', team: 'SA개발' },
  { name: '권순봉', username: 'ksbong', email: 'ksbong@soosan.co.kr', team: 'CR조립' },
  { name: '한재봉', username: 'hanjb', email: 'hanjb@soosan.co.kr', team: 'CR출하' },
  { name: '이준용', username: 'jy.lee', email: 'jy.lee@soosan.co.kr', team: 'CR자재' },
  { name: '이강욱', username: 'ku.lee', email: 'ku.lee@soosan.co.kr', team: '품질관리' },
  { name: '김동현', username: 'seeyou.kim', email: 'seeyou.kim@soosan.co.kr', team: '인사총무' },
];

const DEFAULT_PASSWORD = 'soosan1234!';

async function main() {
  console.log('========================================');
  console.log('계정 일괄 생성 스크립트 v3');
  console.log('========================================\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  console.log('기본 비밀번호:', DEFAULT_PASSWORD, '\n');

  // 1. 기존 사용자 확인
  console.log('1. 기존 사용자 확인...');
  const allUsernames = [...teamLeaders.map(l => l.username), ...teamMembers.map(m => m.username)];
  const existingUsers = await prisma.user.findMany({
    where: { username: { in: allUsernames } },
    select: { username: true }
  });
  const existingUsernames = new Set(existingUsers.map(u => u.username));
  console.log(`   기존 사용자 중 중복: ${existingUsers.length}명\n`);

  // 2. 팀장 계정 생성
  console.log('2. 팀장 계정 생성 (TEAM_LEADER)...');
  let createdLeaders = 0;

  for (const leader of teamLeaders) {
    if (existingUsernames.has(leader.username)) {
      console.log(`   ⏭️  스킵: ${leader.name} (${leader.username})`);
      continue;
    }

    const primaryTeamId = teamIdMap[leader.teams[0]];

    const user = await prisma.user.create({
      data: {
        username: leader.username,
        name: leader.name,
        email: leader.email,
        password: hashedPassword,
        role: 'TEAM_LEADER',
        teamId: primaryTeamId,
      }
    });

    // 담당 팀의 리더로 설정
    for (const teamName of leader.teams) {
      const teamId = teamIdMap[teamName];
      if (teamId) {
        await prisma.team.update({
          where: { id: teamId },
          data: { leaderId: user.id }
        });
      }
    }

    console.log(`   ✅ 생성: ${leader.name} (${leader.username}) → 팀ID: ${primaryTeamId}`);
    createdLeaders++;
  }
  console.log(`   결과: ${createdLeaders}명 생성\n`);

  // 3. 팀원 계정 생성
  console.log('3. 팀원 계정 생성 (USER)...');
  let createdMembers = 0;

  for (const member of teamMembers) {
    if (existingUsernames.has(member.username)) {
      console.log(`   ⏭️  스킵: ${member.name} (${member.username})`);
      continue;
    }

    const teamId = teamIdMap[member.team];

    await prisma.user.create({
      data: {
        username: member.username,
        name: member.name,
        email: member.email,
        password: hashedPassword,
        role: 'USER',
        teamId: teamId,
      }
    });

    console.log(`   ✅ 생성: ${member.name} (${member.username}) → 팀ID: ${teamId}`);
    createdMembers++;
  }
  console.log(`   결과: ${createdMembers}명 생성\n`);

  // 4. 요약
  console.log('========================================');
  console.log('완료!');
  console.log(`팀장: ${createdLeaders}명, 팀원: ${createdMembers}명`);
  console.log(`총: ${createdLeaders + createdMembers}명 생성`);
  console.log('비밀번호:', DEFAULT_PASSWORD);
  console.log('========================================');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
