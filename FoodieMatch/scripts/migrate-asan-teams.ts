/**
 * 아산 TBM/안전점검 데이터 이전 및 팀 정리 스크립트
 *
 * 1. 23개 정식 팀에 TBM/안전점검 데이터가 없으면 기존 팀에서 이전
 * 2. 팀명 기반 매칭 (공백 무시)
 * 3. 23개 팀 외 불필요한 팀 삭제
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 유지할 23개 팀 (정규화된 이름)
const KEEP_TEAMS = [
  '조립1라인', '조립2라인', '조립3라인', '전기라인', '제관라인', '가공라인',
  '생산팀', '생산기술팀', '자재팀', '고객지원팀', '부품팀', '품질관리팀', '총무지원팀',
  '구조해석팀', '기술관리팀', '천공기개발1팀', '천공기개발2팀', '특장개발1팀', '특장개발2팀',
  '제어1팀', '제어2팀', 'CR개발팀', '선행기술팀'
];

// 팀명 정규화 함수 (공백 제거)
function normalizeTeamName(name: string): string {
  return name.replace(/\s+/g, '');
}

// 팀명 매칭 함수
function findMatchingTeam(oldName: string, newTeams: Map<string, number>): number | null {
  const normalized = normalizeTeamName(oldName);

  // 직접 매칭
  if (newTeams.has(normalized)) {
    return newTeams.get(normalized)!;
  }

  // 특수 매칭
  const specialMappings: Record<string, string> = {
    '조립전기라인': '전기라인',
  };

  if (specialMappings[normalized]) {
    return newTeams.get(specialMappings[normalized]) || null;
  }

  return null;
}

async function main() {
  console.log('========================================');
  console.log('아산 TBM/안전점검 데이터 이전 및 팀 정리');
  console.log('========================================\n');

  // 1. 아산 팀 목록 조회
  const allTeams = await prisma.team.findMany({
    where: { site: '아산' },
    select: { id: true, name: true }
  });
  console.log('전체 아산 팀:', allTeams.length + '개');

  // 2. 유지할 팀과 삭제할 팀 분류
  const keepTeamMap = new Map<string, number>(); // 정규화된 이름 -> ID
  const teamsToDelete: { id: number; name: string }[] = [];
  const teamsToKeep: { id: number; name: string }[] = [];

  for (const team of allTeams) {
    const normalized = normalizeTeamName(team.name);
    if (KEEP_TEAMS.includes(normalized)) {
      keepTeamMap.set(normalized, team.id);
      teamsToKeep.push(team);
    } else {
      teamsToDelete.push(team);
    }
  }

  console.log('유지할 팀:', teamsToKeep.length + '개');
  console.log('삭제 대상 팀:', teamsToDelete.length + '개\n');

  if (teamsToDelete.length > 0) {
    console.log('삭제 대상:');
    teamsToDelete.forEach(t => console.log('  - ' + t.name + ' (ID: ' + t.id + ')'));
    console.log('');
  }

  // 3. 데이터 이전
  console.log('데이터 이전 시작...\n');

  for (const oldTeam of teamsToDelete) {
    const newTeamId = findMatchingTeam(oldTeam.name, keepTeamMap);

    if (!newTeamId) {
      console.log('⏭️  매칭 없음: ' + oldTeam.name);
      continue;
    }

    const newTeam = teamsToKeep.find(t => t.id === newTeamId);
    console.log('🔄 ' + oldTeam.name + ' → ' + (newTeam?.name || newTeamId));

    // 3-1. ChecklistTemplate 이전
    const templates = await prisma.checklistTemplate.findMany({
      where: { teamId: oldTeam.id }
    });
    if (templates.length > 0) {
      // 새 팀에 이미 템플릿이 있는지 확인
      const existingTemplate = await prisma.checklistTemplate.findFirst({
        where: { teamId: newTeamId }
      });

      if (!existingTemplate) {
        await prisma.checklistTemplate.updateMany({
          where: { teamId: oldTeam.id },
          data: { teamId: newTeamId }
        });
        console.log('   ✅ ChecklistTemplate: ' + templates.length + '개 이전');
      } else {
        console.log('   ⏭️  ChecklistTemplate: 새 팀에 이미 존재');
      }
    }

    // 3-2. DailyReport 이전
    const reports = await prisma.dailyReport.findMany({
      where: { teamId: oldTeam.id }
    });
    if (reports.length > 0) {
      await prisma.dailyReport.updateMany({
        where: { teamId: oldTeam.id },
        data: { teamId: newTeamId }
      });
      console.log('   ✅ DailyReport: ' + reports.length + '개 이전');
    }

    // 3-3. MonthlyApproval 이전
    const approvals = await prisma.monthlyApproval.findMany({
      where: { teamId: oldTeam.id }
    });
    if (approvals.length > 0) {
      // 중복 확인 (같은 year, month)
      for (const approval of approvals) {
        const existing = await prisma.monthlyApproval.findFirst({
          where: { teamId: newTeamId, year: approval.year, month: approval.month }
        });
        if (!existing) {
          await prisma.monthlyApproval.update({
            where: { id: approval.id },
            data: { teamId: newTeamId }
          });
        }
      }
      console.log('   ✅ MonthlyApproval: ' + approvals.length + '개 처리');
    }

    // 3-4. InspectionTemplate 이전
    const inspTemplates = await prisma.inspectionTemplate.findMany({
      where: { teamId: oldTeam.id }
    });
    if (inspTemplates.length > 0) {
      for (const tmpl of inspTemplates) {
        const existing = await prisma.inspectionTemplate.findFirst({
          where: { teamId: newTeamId, month: tmpl.month, equipmentName: tmpl.equipmentName }
        });
        if (!existing) {
          await prisma.inspectionTemplate.update({
            where: { id: tmpl.id },
            data: { teamId: newTeamId }
          });
        }
      }
      console.log('   ✅ InspectionTemplate: ' + inspTemplates.length + '개 처리');
    }

    // 3-5. SafetyInspection 이전
    const safetyInsp = await prisma.safetyInspection.findMany({
      where: { teamId: oldTeam.id }
    });
    if (safetyInsp.length > 0) {
      for (const insp of safetyInsp) {
        const existing = await prisma.safetyInspection.findFirst({
          where: { teamId: newTeamId, year: insp.year, month: insp.month }
        });
        if (!existing) {
          await prisma.safetyInspection.update({
            where: { id: insp.id },
            data: { teamId: newTeamId }
          });
        }
      }
      console.log('   ✅ SafetyInspection: ' + safetyInsp.length + '개 처리');
    }
  }

  console.log('\n데이터 이전 완료!\n');

  // 4. 불필요한 팀 삭제
  console.log('불필요한 팀 삭제...\n');

  for (const team of teamsToDelete) {
    try {
      // 관련 데이터 먼저 삭제 (cascade 안되는 경우)

      // TeamMember 삭제
      await prisma.teamMember.deleteMany({ where: { teamId: team.id } });

      // 남아있는 ChecklistTemplate 삭제 (이전 안된 것들)
      const templates = await prisma.checklistTemplate.findMany({
        where: { teamId: team.id },
        select: { id: true }
      });
      for (const t of templates) {
        await prisma.templateItem.deleteMany({ where: { templateId: t.id } });
      }
      await prisma.checklistTemplate.deleteMany({ where: { teamId: team.id } });

      // 남아있는 DailyReport 관련 데이터 삭제
      const reports = await prisma.dailyReport.findMany({
        where: { teamId: team.id },
        select: { id: true }
      });
      for (const r of reports) {
        await prisma.reportDetail.deleteMany({ where: { reportId: r.id } });
        await prisma.reportSignature.deleteMany({ where: { reportId: r.id } });
        await prisma.absenceRecord.deleteMany({ where: { reportId: r.id } });
      }
      await prisma.dailyReport.deleteMany({ where: { teamId: team.id } });

      // MonthlyApproval 삭제
      await prisma.monthlyApproval.deleteMany({ where: { teamId: team.id } });

      // InspectionTemplate 삭제
      await prisma.inspectionTemplate.deleteMany({ where: { teamId: team.id } });

      // SafetyInspection 관련 삭제
      const inspections = await prisma.safetyInspection.findMany({
        where: { teamId: team.id },
        select: { id: true }
      });
      for (const i of inspections) {
        await prisma.inspectionItem.deleteMany({ where: { inspectionId: i.id } });
      }
      await prisma.safetyInspection.deleteMany({ where: { teamId: team.id } });

      // TeamEquipment 삭제
      await prisma.teamEquipment.deleteMany({ where: { teamId: team.id } });

      // 팀 삭제
      await prisma.team.delete({ where: { id: team.id } });
      console.log('✅ 삭제: ' + team.name);
    } catch (err: any) {
      console.log('❌ 삭제 실패: ' + team.name + ' - ' + err.message);
    }
  }

  // 5. 최종 확인
  console.log('\n========================================');
  console.log('최종 아산 팀 목록:');
  const finalTeams = await prisma.team.findMany({
    where: { site: '아산' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });
  finalTeams.forEach(t => console.log('  ' + t.name));
  console.log('\n총: ' + finalTeams.length + '개 팀');
  console.log('========================================');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
