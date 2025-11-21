import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface EquipmentComparison {
  equipmentName: string;
  inTeamEquipment: boolean;
  teamEquipmentCount: number;
  teamEquipmentTeams: string[];
  inScheduleTemplate: boolean;
  scheduleTemplateCount: number;
  inInspectionItems: boolean;
  inspectionItemsCount: number;
  inspectionItemsTeams: string[];
  actualUsageCount: number;
}

async function analyzeAsanEquipment() {
  console.log('='.repeat(100));
  console.log('아산공장 장비명 데이터 완벽 분석 리포트');
  console.log('='.repeat(100));
  console.log();

  // ============================================================================
  // 1. 아산공장 및 팀 정보 확인
  // ============================================================================
  const asanFactory = await prisma.factory.findFirst({
    where: { code: 'ASAN' }
  });

  if (!asanFactory) {
    console.log('❌ 아산공장을 찾을 수 없습니다.');
    return;
  }

  console.log(`✓ 아산공장 ID: ${asanFactory.id}, Code: ${asanFactory.code}, Name: ${asanFactory.name}`);
  console.log();

  const asanTeams = await prisma.team.findMany({
    where: { factoryId: asanFactory.id },
    include: {
      leader: { select: { name: true } },
      _count: {
        select: {
          teamEquipments: true,
          inspectionTemplates: true,
          safetyInspections: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log('='.repeat(100));
  console.log('1단계: 아산공장 팀 현황');
  console.log('='.repeat(100));
  console.log(`총 ${asanTeams.length}개 팀\n`);

  asanTeams.forEach((team, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${team.name.padEnd(20)} (ID: ${team.id})`);
    console.log(`    팀장: ${team.leader?.name || '없음'}`);
    console.log(`    보유 장비(TeamEquipment): ${team._count.teamEquipments}개`);
    console.log(`    점검 템플릿(InspectionTemplate): ${team._count.inspectionTemplates}개`);
    console.log(`    안전점검 기록(SafetyInspection): ${team._count.safetyInspections}개`);
    console.log();
  });

  const teamIds = asanTeams.map(t => t.id);

  // ============================================================================
  // 2. 실제 점검에서 사용된 장비명 (InspectionItems - 표준!)
  // ============================================================================
  console.log('='.repeat(100));
  console.log('2단계: 실제 점검에서 사용된 장비명 (InspectionItems - 이게 표준!)');
  console.log('='.repeat(100));

  const actualInspectionItems = await prisma.inspectionItem.findMany({
    where: {
      inspection: {
        teamId: { in: teamIds }
      }
    },
    include: {
      inspection: {
        include: {
          team: { select: { name: true } }
        }
      }
    },
    orderBy: {
      equipmentName: 'asc'
    }
  });

  // 장비명별로 그룹화
  const equipmentUsageMap = new Map<string, any[]>();
  actualInspectionItems.forEach(item => {
    if (!equipmentUsageMap.has(item.equipmentName)) {
      equipmentUsageMap.set(item.equipmentName, []);
    }
    equipmentUsageMap.get(item.equipmentName)!.push(item);
  });

  console.log(`총 ${equipmentUsageMap.size}개의 고유 장비명이 실제 점검에 사용됨`);
  console.log(`총 ${actualInspectionItems.length}건의 점검 기록\n`);

  const sortedUsage = Array.from(equipmentUsageMap.entries()).sort((a, b) =>
    b[1].length - a[1].length || a[0].localeCompare(b[0])
  );

  for (const [equipmentName, items] of sortedUsage) {
    const teams = new Set(items.map((i: any) => i.inspection.team.name));
    const teamNames = Array.from(teams).sort();

    console.log(`✓ "${equipmentName}"`);
    console.log(`  사용 횟수: ${items.length}회`);
    console.log(`  사용 팀(${teams.size}개): ${teamNames.join(', ')}`);

    // 월별 분포
    const monthDist = new Map<number, number>();
    items.forEach((item: any) => {
      const month = item.inspection.month;
      monthDist.set(month, (monthDist.get(month) || 0) + 1);
    });
    const monthStr = Array.from(monthDist.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([m, c]) => `${m}월:${c}건`)
      .join(', ');
    console.log(`  월별 분포: ${monthStr}`);
    console.log();
  }

  // ============================================================================
  // 3. TeamEquipment 분석
  // ============================================================================
  console.log('='.repeat(100));
  console.log('3단계: 팀별 보유 장비 (TeamEquipment)');
  console.log('='.repeat(100));

  const teamEquipments = await prisma.teamEquipment.findMany({
    where: {
      teamId: { in: teamIds }
    },
    include: {
      team: { select: { name: true } }
    },
    orderBy: [
      { equipmentName: 'asc' },
      { team: { name: 'asc' } }
    ]
  });

  const teamEquipmentMap = new Map<string, any[]>();
  teamEquipments.forEach(eq => {
    if (!teamEquipmentMap.has(eq.equipmentName)) {
      teamEquipmentMap.set(eq.equipmentName, []);
    }
    teamEquipmentMap.get(eq.equipmentName)!.push(eq);
  });

  console.log(`총 ${teamEquipmentMap.size}개의 고유 장비명`);
  console.log(`총 ${teamEquipments.length}개의 팀-장비 매핑\n`);

  for (const [equipmentName, items] of Array.from(teamEquipmentMap.entries()).sort()) {
    const totalQty = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    console.log(`✓ "${equipmentName}" (총 ${totalQty}개)`);

    items.sort((a: any, b: any) => a.team.name.localeCompare(b.team.name)).forEach((item: any) => {
      console.log(`  ${item.team.name.padEnd(20)}: ${item.quantity}개`);
    });
    console.log();
  }

  // ============================================================================
  // 4. InspectionScheduleTemplate 분석 (11월 기준)
  // ============================================================================
  console.log('='.repeat(100));
  console.log('4단계: 월별 점검 일정 템플릿 (InspectionScheduleTemplate - 11월)');
  console.log('='.repeat(100));

  const scheduleTemplates = await prisma.inspectionScheduleTemplate.findMany({
    where: {
      factoryId: asanFactory.id,
      month: 11
    },
    orderBy: {
      displayOrder: 'asc'
    }
  });

  console.log(`총 ${scheduleTemplates.length}개 항목\n`);

  scheduleTemplates.forEach((template, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. "${template.equipmentName}" (displayOrder: ${template.displayOrder})`);
  });
  console.log();

  // ============================================================================
  // 5. 중복 확인
  // ============================================================================
  console.log('='.repeat(100));
  console.log('5단계: InspectionScheduleTemplate 중복 확인 (11월)');
  console.log('='.repeat(100));

  const duplicateCheck = await prisma.$queryRaw<Array<{ equipmentName: string; count: bigint }>>`
    SELECT "equipmentName", COUNT(*) as count
    FROM "InspectionScheduleTemplates"
    WHERE "factoryId" = ${asanFactory.id} AND "month" = 11
    GROUP BY "equipmentName"
    HAVING COUNT(*) > 1
    ORDER BY count DESC, "equipmentName"
  `;

  if (duplicateCheck.length === 0) {
    console.log('✓ 중복 없음\n');
  } else {
    console.log(`⚠️  ${duplicateCheck.length}개의 중복된 장비명 발견:\n`);
    duplicateCheck.forEach(item => {
      console.log(`  "${item.equipmentName}": ${Number(item.count)}회 중복`);
    });
    console.log();
  }

  // ============================================================================
  // 6. 3개 테이블 비교 매트릭스
  // ============================================================================
  console.log('='.repeat(100));
  console.log('6단계: 3개 테이블 비교 매트릭스');
  console.log('='.repeat(100));
  console.log('InspectionItems (실제 점검 기록)을 "표준"으로 삼습니다.');
  console.log('='.repeat(100));
  console.log();

  // 모든 고유 장비명 수집
  const allEquipmentNames = new Set<string>();

  Array.from(equipmentUsageMap.keys()).forEach(name => allEquipmentNames.add(name));
  Array.from(teamEquipmentMap.keys()).forEach(name => allEquipmentNames.add(name));
  scheduleTemplates.forEach(t => allEquipmentNames.add(t.equipmentName));

  const comparison: EquipmentComparison[] = [];

  for (const equipmentName of Array.from(allEquipmentNames).sort()) {
    const actualItems = equipmentUsageMap.get(equipmentName) || [];
    const actualTeams = new Set(actualItems.map((i: any) => i.inspection.team.name));

    const teamEqItems = teamEquipmentMap.get(equipmentName) || [];
    const teamEqTeams = teamEqItems.map((i: any) => i.team.name);

    const scheduleItems = scheduleTemplates.filter(t => t.equipmentName === equipmentName);

    comparison.push({
      equipmentName,
      inTeamEquipment: teamEqItems.length > 0,
      teamEquipmentCount: teamEqItems.length,
      teamEquipmentTeams: teamEqTeams,
      inScheduleTemplate: scheduleItems.length > 0,
      scheduleTemplateCount: scheduleItems.length,
      inInspectionItems: actualItems.length > 0,
      inspectionItemsCount: actualItems.length,
      inspectionItemsTeams: Array.from(actualTeams),
      actualUsageCount: actualItems.length
    });
  }

  // 테이블 출력
  console.log('장비명 | TeamEquipment | ScheduleTemplate | InspectionItems (표준) | 상태');
  console.log('-'.repeat(100));

  comparison.forEach(item => {
    const te = item.inTeamEquipment ? `✓ ${item.teamEquipmentCount}팀` : '✗';
    const st = item.inScheduleTemplate ? `✓ ${item.scheduleTemplateCount}개` : '✗';
    const ii = item.inInspectionItems ? `✓ ${item.inspectionItemsCount}회` : '✗';

    let status = '';
    if (item.inInspectionItems) {
      if (item.inTeamEquipment && item.inScheduleTemplate) {
        status = '✓ 완벽';
      } else if (!item.inTeamEquipment && !item.inScheduleTemplate) {
        status = '⚠️  모든 테이블에 추가 필요';
      } else if (!item.inTeamEquipment) {
        status = '⚠️  TeamEquipment 추가';
      } else if (!item.inScheduleTemplate) {
        status = '⚠️  ScheduleTemplate 추가';
      }
    } else {
      if (item.inTeamEquipment || item.inScheduleTemplate) {
        status = '❌ 실사용 없음 (삭제 고려)';
      }
    }

    console.log(`${item.equipmentName} | ${te} | ${st} | ${ii} | ${status}`);
  });
  console.log();

  // ============================================================================
  // 최종 요약
  // ============================================================================
  console.log('='.repeat(100));
  console.log('최종 요약');
  console.log('='.repeat(100));

  const missingInTeamEquipment = comparison.filter(c => c.inInspectionItems && !c.inTeamEquipment);
  const missingInSchedule = comparison.filter(c => c.inInspectionItems && !c.inScheduleTemplate);
  const notUsed = comparison.filter(c => !c.inInspectionItems && (c.inTeamEquipment || c.inScheduleTemplate));

  console.log(`실제 점검에 사용된 표준 장비: ${equipmentUsageMap.size}개`);
  console.log(`TeamEquipment 추가 필요: ${missingInTeamEquipment.length}개`);
  console.log(`ScheduleTemplate 추가 필요: ${missingInSchedule.length}개`);
  console.log(`삭제 고려 대상: ${notUsed.length}개`);
  console.log(`중복 제거 필요: ${duplicateCheck.length}개`);
  console.log();
}

// 실행
analyzeAsanEquipment()
  .catch((error) => {
    console.error('❌ 분석 중 오류 발생:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
