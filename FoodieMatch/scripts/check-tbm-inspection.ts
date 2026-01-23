/**
 * TBM 템플릿 및 안전점검 현황 확인
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========================================');
  console.log('TBM 및 안전점검 현황 (화성)');
  console.log('========================================\n');

  // 1. 화성 팀 목록 + TBM 템플릿 여부
  const teams = await prisma.team.findMany({
    where: { site: '화성' },
    include: {
      _count: { select: { checklistTemplates: true, inspectionTemplates: true } }
    },
    orderBy: { name: 'asc' }
  });

  const teamIds = teams.map(t => t.id);

  console.log('[ TBM 템플릿 현황 ]\n');
  const noTbmTeams: string[] = [];
  const hasTbmTeams: string[] = [];

  teams.forEach(t => {
    if (t._count.checklistTemplates === 0) {
      noTbmTeams.push(t.name);
      console.log(`❌ ${t.name} (ID: ${t.id}) - TBM 없음`);
    } else {
      hasTbmTeams.push(t.name);
      console.log(`✅ ${t.name} (ID: ${t.id}) - TBM ${t._count.checklistTemplates}개`);
    }
  });

  console.log(`\nTBM 있음: ${hasTbmTeams.length}개, TBM 없음: ${noTbmTeams.length}개`);
  if (noTbmTeams.length > 0) {
    console.log(`\n⚠️ TBM 없는 팀: ${noTbmTeams.join(', ')}`);
  }

  // 2. 안전점검 템플릿이 있는 모든 팀 (화성 기준)
  console.log('\n\n[ 안전점검 템플릿 현황 ]\n');

  // 안전점검 템플릿이 있는 팀 ID들
  const inspectionTeamIds = await prisma.inspectionTemplate.findMany({
    distinct: ['teamId'],
    select: { teamId: true }
  });

  const inspTeamIdSet = new Set(inspectionTeamIds.map(i => i.teamId));

  // 화성 19개 팀 중 안전점검 없는 팀
  const noInspTeams: string[] = [];
  const hasInspTeams: string[] = [];

  teams.forEach(t => {
    if (t._count.inspectionTemplates === 0) {
      noInspTeams.push(t.name);
    } else {
      hasInspTeams.push(`${t.name} (${t._count.inspectionTemplates}개)`);
    }
  });

  console.log('안전점검 있는 팀:');
  hasInspTeams.forEach(t => console.log(`  ✅ ${t}`));

  console.log('\n안전점검 없는 팀:');
  noInspTeams.forEach(t => console.log(`  ❌ ${t}`));

  // 3. 화성 19개 팀에 없지만 안전점검에 있는 팀들
  console.log('\n\n[ 화성 팀에 없지만 안전점검에 있는 팀 ]\n');

  const otherInspTeams = await prisma.team.findMany({
    where: {
      id: { in: Array.from(inspTeamIdSet) },
      NOT: { id: { in: teamIds } }
    },
    include: {
      _count: { select: { inspectionTemplates: true } }
    }
  });

  if (otherInspTeams.length === 0) {
    console.log('없음 (모든 안전점검이 화성 팀에 속함)');
  } else {
    otherInspTeams.forEach(t => {
      console.log(`⚠️ ${t.name} (ID: ${t.id}, site: ${t.site}) - 점검 ${t._count.inspectionTemplates}개`);
    });
  }

  console.log('\n========================================');
  console.log('요약');
  console.log('========================================');
  console.log(`화성 팀: ${teams.length}개`);
  console.log(`TBM 없는 팀: ${noTbmTeams.length}개`);
  console.log(`안전점검 없는 팀: ${noInspTeams.length}개`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
