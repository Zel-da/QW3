/**
 * 하드코딩된 부서 매핑(teamDepartments.ts)을 DB로 이관.
 * 재실행 안전: 이미 존재하는 부서는 skip, Team.departmentId 없는 것만 채움.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const ASAN_DEPARTMENTS = [
  { name: '생산팀', teams: ['조립1라인', '조립2라인', '조립3라인', '전기라인', '제관라인', '가공라인'] },
  { name: '생산', teams: ['생산팀', '생산기술팀', '자재팀'] },
  { name: '고객', teams: ['고객지원팀', '부품팀'] },
  { name: '품질', teams: ['품질관리팀'] },
  { name: '연구', teams: ['기술관리팀', '천공기개발 1팀', '천공기개발 2팀', '특장개발 1팀', '특장개발 2팀', '제어 1팀', '제어 2팀', 'CR개발팀', '선행기술팀'] },
  { name: '선행', teams: ['구조해석팀'] },
  { name: '경영', teams: ['총무지원팀'] },
];

const HWASEONG_DEPARTMENTS = [
  { name: 'BR생산팀', teams: ['선삭', '연삭', 'MB', 'BKT', '열처리 1조', '열처리 2조', '열처리 3조', 'BR출하', 'BR생산관리', 'BR총괄'] },
  { name: 'BR생산', teams: ['BR자재부품팀', 'BR품질서비스', '로드생산팀'] },
  { name: 'CR생산팀', teams: ['CR조립', 'CR출하', 'CR생산관리'] },
  { name: 'CR생산', teams: ['CR자재'] },
  { name: '화성연구소', teams: ['BR개발팀', 'SA개발팀'] },
  { name: '품질', teams: ['품질관리팀'] },
  { name: '경영', teams: ['총무지원팀'] },
];

async function main() {
  let deptCreated = 0;
  let deptSkipped = 0;
  let teamMapped = 0;
  let teamNoMatch: string[] = [];

  for (const [site, deptList] of [['아산', ASAN_DEPARTMENTS], ['화성', HWASEONG_DEPARTMENTS]] as const) {
    for (let i = 0; i < deptList.length; i++) {
      const dept = deptList[i];
      const existing = await prisma.department.findUnique({
        where: { site_name: { site, name: dept.name } },
      });
      let deptId: number;
      if (existing) {
        deptId = existing.id;
        deptSkipped++;
      } else {
        const created = await prisma.department.create({
          data: { site, name: dept.name, displayOrder: i },
        });
        deptId = created.id;
        deptCreated++;
        console.log(`  ✓ 부서 생성: ${site}/${dept.name}`);
      }

      // 이 부서에 속한 팀들의 departmentId 세팅
      for (const teamName of dept.teams) {
        // 팀 이름 일치 조건: 접미사(사이트) 제거된 팀명이 매칭되는 팀
        const teams = await prisma.team.findMany({
          where: { site, name: { contains: teamName } },
        });
        for (const t of teams) {
          if (t.departmentId === deptId) continue;
          await prisma.team.update({
            where: { id: t.id },
            data: { departmentId: deptId },
          });
          teamMapped++;
        }
        if (teams.length === 0) teamNoMatch.push(`${site}/${dept.name}: ${teamName}`);
      }
    }
  }

  console.log('\n=== 마이그레이션 결과 ===');
  console.log(`부서 생성: ${deptCreated}건`);
  console.log(`부서 이미 존재 (skip): ${deptSkipped}건`);
  console.log(`Team.departmentId 매핑: ${teamMapped}건`);
  if (teamNoMatch.length > 0) {
    console.log(`\n⚠️  매칭 안 된 팀 (${teamNoMatch.length}):`);
    teamNoMatch.forEach(t => console.log(`   - ${t}`));
  }

  // 매핑 안 된 팀 확인
  const unmapped = await prisma.team.findMany({
    where: { departmentId: null },
    select: { id: true, name: true, site: true },
  });
  if (unmapped.length > 0) {
    console.log(`\n⚠️  departmentId 없는 팀 (${unmapped.length}):`);
    unmapped.forEach(t => console.log(`   - id=${t.id} ${t.site}/${t.name}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
