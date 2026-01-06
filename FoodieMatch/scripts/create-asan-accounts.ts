/**
 * 아산 인원 일괄 생성 스크립트
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'soosan1234!';

// 결재승인자 (APPROVER) - 6명
const approvers = [
  { name: '황종건', username: 'jg.hwang', email: 'jg.hwang@soosan.co.kr' },
  { name: '문상보', username: 'iloveji0', email: 'iloveji0@soosan.co.kr' },
  { name: '고영배', username: 'koyb286314', email: 'koyb286314@soosan.co.kr' },
  { name: '임동진', username: 'imdg77', email: 'imdg77@soosan.co.kr' },
  { name: '신국재', username: 'gjshin', email: 'gjshin@soosan.co.kr' },
  { name: '정의건', username: 'jeg5972', email: 'jeg5972@soosan.co.kr' },
];

// 팀장 (TEAM_LEADER) - 22명
const teamLeaders = [
  { name: '김정철', username: 'yhk218', email: 'yhk218@soosan.co.kr', team: '조립1라인' },
  { name: '조창용', username: '493127', email: '493127@soosan.co.kr', team: '조립2라인' },
  { name: '김덕수', username: 'hunter77', email: 'hunter77@soosan.co.kr', team: '조립3라인' },
  { name: '금서우', username: 'soulsky', email: 'soulsky@soosan.co.kr', team: '전기라인' },
  { name: '김영산', username: 'bmw032', email: 'bmw032@soosan.co.kr', team: '제관라인' },
  { name: '임성길', username: 'sung492025', email: 'sung492025@soosan.co.kr', team: '가공라인' },
  { name: '신용균', username: 'yk.shin', email: 'yk.shin@soosan.co.kr', team: '생산기술팀' },
  { name: '이점두', username: 'leejd', email: 'leejd@soosan.co.kr', team: '자재팀' },
  { name: '최정현', username: 'hyuni060', email: 'hyuni060@soosan.co.kr', team: '고객지원팀' },
  { name: '안종준', username: 'jjan', email: 'jjan@soosan.co.kr', team: '부품팀' },
  { name: '박래현', username: 'prh78', email: 'prh78@soosan.co.kr', team: '품질관리팀' },
  { name: '김동현', username: 'seeyou.kim', email: 'seeyou.kim@soosan.co.kr', team: '총무지원팀' },
  { name: '김홍기', username: 'hg.kim', email: 'hg.kim@soosan.co.kr', team: '구조해석팀' },
  { name: '이동재', username: 'djkhdh', email: 'djkhdh@soosan.co.kr', team: '기술관리팀' },
  { name: '안수철', username: 'scan78', email: 'scan78@soosan.co.kr', team: '천공기개발1팀' },
  { name: '박인화', username: 'wavepih', email: 'wavepih@soosan.co.kr', team: '천공기개발2팀' },
  { name: '김영준', username: 'azecom', email: 'azecom@soosan.co.kr', team: '특장개발1팀' },
  { name: '김세원', username: 'sw.lee', email: 'sw.lee@soosan.co.kr', team: '특장개발2팀' },
  { name: '유웅식', username: 'yoows', email: 'yoows@soosan.co.kr', team: '제어1팀' },
  { name: '김영래', username: 'yr.kim', email: 'yr.kim@soosan.co.kr', team: '제어2팀' },
  { name: '김상하', username: 'ksangha', email: 'ksangha@soosan.co.kr', team: 'CR개발팀' },
  { name: '유원선', username: 'ryu494041', email: 'ryu494041@soosan.co.kr', team: '선행기술팀' },
];

// 팀 정보 (팀명, 팀장이름, 결재자이름)
const teamsInfo = [
  { name: '조립1라인', leaderName: '김정철', approverName: '황종건' },
  { name: '조립2라인', leaderName: '조창용', approverName: '황종건' },
  { name: '조립3라인', leaderName: '김덕수', approverName: '황종건' },
  { name: '전기라인', leaderName: '금서우', approverName: '황종건' },
  { name: '제관라인', leaderName: '김영산', approverName: '황종건' },
  { name: '가공라인', leaderName: '임성길', approverName: '황종건' },
  { name: '생산팀', leaderName: '황종건', approverName: '문상보' },
  { name: '생산기술팀', leaderName: '신용균', approverName: '문상보' },
  { name: '자재팀', leaderName: '이점두', approverName: '문상보' },
  { name: '고객지원팀', leaderName: '최정현', approverName: '고영배' },
  { name: '부품팀', leaderName: '안종준', approverName: '고영배' },
  { name: '품질관리팀', leaderName: '박래현', approverName: '임동진' },
  { name: '총무지원팀', leaderName: '김동현', approverName: '신국재' },
  { name: '구조해석팀', leaderName: '김홍기', approverName: '정의건' },
  { name: '기술관리팀', leaderName: '이동재', approverName: '정의건' },
  { name: '천공기개발1팀', leaderName: '안수철', approverName: '정의건' },
  { name: '천공기개발2팀', leaderName: '박인화', approverName: '정의건' },
  { name: '특장개발1팀', leaderName: '김영준', approverName: '정의건' },
  { name: '특장개발2팀', leaderName: '김세원', approverName: '정의건' },
  { name: '제어1팀', leaderName: '유웅식', approverName: '정의건' },
  { name: '제어2팀', leaderName: '김영래', approverName: '정의건' },
  { name: 'CR개발팀', leaderName: '김상하', approverName: '정의건' },
  { name: '선행기술팀', leaderName: '유원선', approverName: '정의건' },
];

// 라인 직원들 (TeamMember)
const lineMembers: Record<string, string[]> = {
  '조립1라인': ['강준형', '김영우', '윤정관', '최정훈', '박영주', '유동진', '민지홍', '하창우', '조현관', '김다훈', '최재억'],
  '조립2라인': ['고기현', '이동근', '이용청', '김세기', '이배길', '이순한', '오상수', '정혜수', '윤환식'],
  '조립3라인': ['이정훈', '김일환', '이윤주', '강한순', '김호방', '이모준', '김재주', '조성학'],
  '전기라인': ['김동우', '강정식', '황인용', '마정훈', '김종헌'],
  '제관라인': ['김정호', '박성복', '곽호진', '성대호', '신경진', '김용일', '박갑진'],
  '가공라인': ['김화겸', '김광석', '김영래', '이희곤', '김현구', '강민준', '양성모', '박민호', '박기운', '이종서'],
};

async function main() {
  console.log('========================================');
  console.log('아산 인원 일괄 생성 스크립트');
  console.log('========================================\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  console.log('기본 비밀번호:', DEFAULT_PASSWORD);
  console.log('해시:', hashedPassword.substring(0, 30) + '...\n');

  // Factory 확인
  const factories = await prisma.factory.findMany();
  console.log('Factory 목록:', factories.map(f => `${f.name}(${f.id})`).join(', '));
  const asanFactory = factories.find(f => f.code === 'ASAN');
  const factoryId = asanFactory?.id || 1;
  console.log(`아산 Factory ID: ${factoryId}\n`);

  // 기존 사용자 확인
  const allUsernames = [...approvers.map(a => a.username), ...teamLeaders.map(l => l.username)];
  const existingUsers = await prisma.user.findMany({
    where: { username: { in: allUsernames } },
    select: { username: true, name: true }
  });
  const existingUsernames = new Set(existingUsers.map(u => u.username));
  console.log(`기존 사용자 중복: ${existingUsers.length}명`);
  if (existingUsers.length > 0) {
    console.log('  중복:', existingUsers.map(u => `${u.name}(${u.username})`).join(', '));
  }
  console.log('');

  // 1. 결재승인자 생성
  console.log('1. 결재승인자 생성 (APPROVER)...');
  const createdApprovers: Record<string, string> = {}; // name -> id

  for (const approver of approvers) {
    if (existingUsernames.has(approver.username)) {
      // 기존 사용자 ID 조회
      const existing = await prisma.user.findUnique({ where: { username: approver.username } });
      if (existing) {
        createdApprovers[approver.name] = existing.id;
        console.log(`   ⏭️  스킵 (기존): ${approver.name} (${approver.username})`);
      }
      continue;
    }

    const user = await prisma.user.create({
      data: {
        username: approver.username,
        name: approver.name,
        email: approver.email,
        password: hashedPassword,
        role: 'APPROVER',
        site: '아산',
      }
    });
    createdApprovers[approver.name] = user.id;
    console.log(`   ✅ 생성: ${approver.name} (${approver.username})`);
  }
  console.log('');

  // 2. 팀장 생성
  console.log('2. 팀장 생성 (TEAM_LEADER)...');
  const createdLeaders: Record<string, string> = {}; // name -> id

  for (const leader of teamLeaders) {
    if (existingUsernames.has(leader.username)) {
      const existing = await prisma.user.findUnique({ where: { username: leader.username } });
      if (existing) {
        createdLeaders[leader.name] = existing.id;
        console.log(`   ⏭️  스킵 (기존): ${leader.name} (${leader.username})`);
      }
      continue;
    }

    const user = await prisma.user.create({
      data: {
        username: leader.username,
        name: leader.name,
        email: leader.email,
        password: hashedPassword,
        role: 'TEAM_LEADER',
        site: '아산',
      }
    });
    createdLeaders[leader.name] = user.id;
    console.log(`   ✅ 생성: ${leader.name} (${leader.username}) → ${leader.team}`);
  }
  console.log('');

  // 결재자+팀장 ID 통합
  const allUsers = { ...createdApprovers, ...createdLeaders };

  // 3. 팀 생성
  console.log('3. 팀 생성...');
  const existingTeams = await prisma.team.findMany({
    where: { site: '아산' },
    select: { name: true, id: true }
  });
  const existingTeamNames = new Set(existingTeams.map(t => t.name));
  const teamIdMap: Record<string, number> = {};
  existingTeams.forEach(t => { teamIdMap[t.name] = t.id; });

  for (const teamInfo of teamsInfo) {
    if (existingTeamNames.has(teamInfo.name)) {
      console.log(`   ⏭️  스킵 (기존): ${teamInfo.name}`);
      continue;
    }

    const leaderId = allUsers[teamInfo.leaderName];
    const approverId = createdApprovers[teamInfo.approverName];

    if (!leaderId) {
      console.log(`   ❌ 팀장 없음: ${teamInfo.name} (${teamInfo.leaderName})`);
      continue;
    }

    const team = await prisma.team.create({
      data: {
        name: teamInfo.name,
        site: '아산',
        factoryId: factoryId,
        leaderId: leaderId,
        approverId: approverId || null,
      }
    });
    teamIdMap[teamInfo.name] = team.id;
    console.log(`   ✅ 생성: ${teamInfo.name} (팀장: ${teamInfo.leaderName}, 결재자: ${teamInfo.approverName})`);
  }
  console.log('');

  // 4. 라인 직원 생성 (TeamMember)
  console.log('4. 라인 직원 생성 (TeamMember)...');
  let totalMembers = 0;

  for (const [teamName, members] of Object.entries(lineMembers)) {
    const teamId = teamIdMap[teamName];
    if (!teamId) {
      console.log(`   ❌ 팀 없음: ${teamName}`);
      continue;
    }

    // 기존 멤버 확인
    const existingMembers = await prisma.teamMember.findMany({
      where: { teamId },
      select: { name: true }
    });
    const existingMemberNames = new Set(existingMembers.map(m => m.name));

    let created = 0;
    for (const memberName of members) {
      if (existingMemberNames.has(memberName)) {
        continue;
      }

      await prisma.teamMember.create({
        data: {
          teamId: teamId,
          name: memberName,
          position: '직원',
        }
      });
      created++;
    }

    if (created > 0) {
      console.log(`   ✅ ${teamName}: ${created}명 생성`);
      totalMembers += created;
    } else {
      console.log(`   ⏭️  ${teamName}: 모두 기존`);
    }
  }
  console.log('');

  // 요약
  console.log('========================================');
  console.log('완료!');
  console.log(`결재승인자: ${Object.keys(createdApprovers).length}명`);
  console.log(`팀장: ${Object.keys(createdLeaders).length}명`);
  console.log(`팀: ${teamsInfo.length}개`);
  console.log(`라인 직원: ${totalMembers}명`);
  console.log('비밀번호:', DEFAULT_PASSWORD);
  console.log('========================================');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
