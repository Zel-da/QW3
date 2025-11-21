import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DuplicateTeam {
  name: string;
  count: bigint;
  team_ids: number[];
}

async function mergeTeams() {
  console.log('🔄 팀 병합 작업 시작...\n');

  try {
    // 1. 중복 팀 찾기
    const duplicates = await prisma.$queryRaw<DuplicateTeam[]>`
      SELECT name, COUNT(*) as count, array_agg(id) as team_ids
      FROM "Teams"
      GROUP BY name
      HAVING COUNT(*) > 1
      ORDER BY name
    `;

    console.log(`🔍 중복 팀 발견: ${duplicates.length}개\n`);

    if (duplicates.length === 0) {
      console.log('✅ 병합할 중복 팀이 없습니다.');
      return;
    }

    let mergedCount = 0;

    for (const dup of duplicates) {
      console.log(`\n📝 처리 중: ${dup.name} (${dup.count}개 팀)`);

      // 해당 이름의 모든 팀 조회
      const teams = await prisma.team.findMany({
        where: { id: { in: dup.team_ids } },
        include: {
          checklistTemplates: {
            include: { templateItems: true },
          },
          inspectionTemplates: true,
        },
      });

      // 같은 사이트끼리만 병합
      const teamsBySite = teams.reduce((acc, team) => {
        const site = team.site || 'null';
        if (!acc[site]) acc[site] = [];
        acc[site].push(team);
        return acc;
      }, {} as Record<string, typeof teams>);

      for (const [site, siteTeams] of Object.entries(teamsBySite)) {
        if (siteTeams.length < 2) continue; // 같은 사이트에 1개뿐이면 스킵

        console.log(`   사이트: ${site === 'null' ? '(없음)' : site} - ${siteTeams.length}개 팀`);

        // 템플릿이 있는 팀을 메인으로 선택
        const teamWithTemplates = siteTeams.find(
          (t) =>
            t.checklistTemplates.some((ct) => ct.templateItems.length > 0) ||
            t.inspectionTemplates.length > 0
        );

        const mainTeam = teamWithTemplates || siteTeams[0];
        const duplicateTeams = siteTeams.filter((t) => t.id !== mainTeam.id);

        console.log(`   ✅ 메인 팀: ID ${mainTeam.id} (${mainTeam.factoryId ? `공장 ${mainTeam.factoryId}` : '공장 없음'})`);

        for (const dupTeam of duplicateTeams) {
          console.log(`   🔄 병합 중: ID ${dupTeam.id} → ID ${mainTeam.id}`);

          // factoryId가 없는 메인 팀에 중복 팀의 factoryId 복사
          if (!mainTeam.factoryId && dupTeam.factoryId) {
            await prisma.team.update({
              where: { id: mainTeam.id },
              data: { factoryId: dupTeam.factoryId },
            });
            console.log(`      - factoryId ${dupTeam.factoryId} 복사됨`);
          }

          // 사용자의 teamId 업데이트
          const userCount = await prisma.user.updateMany({
            where: { teamId: dupTeam.id },
            data: { teamId: mainTeam.id },
          });
          if (userCount.count > 0) {
            console.log(`      - User.teamId 업데이트: ${userCount.count}개`);
          }

          // TeamMember 업데이트
          const teamMemberCount = await prisma.teamMember.updateMany({
            where: { teamId: dupTeam.id },
            data: { teamId: mainTeam.id },
          });
          if (teamMemberCount.count > 0) {
            console.log(`      - TeamMember 업데이트: ${teamMemberCount.count}개`);
          }

          // ChecklistTemplate 이동
          const checklistCount = await prisma.checklistTemplate.updateMany({
            where: { teamId: dupTeam.id },
            data: { teamId: mainTeam.id },
          });
          if (checklistCount.count > 0) {
            console.log(`      - ChecklistTemplate 이동: ${checklistCount.count}개`);
          }

          // InspectionTemplate 이동
          const inspectionTemplateCount = await prisma.inspectionTemplate.updateMany({
            where: { teamId: dupTeam.id },
            data: { teamId: mainTeam.id },
          });
          if (inspectionTemplateCount.count > 0) {
            console.log(`      - InspectionTemplate 이동: ${inspectionTemplateCount.count}개`);
          }

          // DailyReport 이동
          const dailyReportCount = await prisma.dailyReport.updateMany({
            where: { teamId: dupTeam.id },
            data: { teamId: mainTeam.id },
          });
          if (dailyReportCount.count > 0) {
            console.log(`      - DailyReport 이동: ${dailyReportCount.count}개`);
          }

          // SafetyInspection 이동
          const safetyInspectionCount = await prisma.safetyInspection.updateMany({
            where: { teamId: dupTeam.id },
            data: { teamId: mainTeam.id },
          });
          if (safetyInspectionCount.count > 0) {
            console.log(`      - SafetyInspection 이동: ${safetyInspectionCount.count}개`);
          }

          // TeamEquipment 이동
          const teamEquipmentCount = await prisma.teamEquipment.updateMany({
            where: { teamId: dupTeam.id },
            data: { teamId: mainTeam.id },
          });
          if (teamEquipmentCount.count > 0) {
            console.log(`      - TeamEquipment 이동: ${teamEquipmentCount.count}개`);
          }

          // MonthlyApproval 이동
          const monthlyApprovalCount = await prisma.monthlyApproval.updateMany({
            where: { teamId: dupTeam.id },
            data: { teamId: mainTeam.id },
          });
          if (monthlyApprovalCount.count > 0) {
            console.log(`      - MonthlyApproval 이동: ${monthlyApprovalCount.count}개`);
          }

          // 중복 팀 삭제
          await prisma.team.delete({ where: { id: dupTeam.id } });
          console.log(`      ✅ 중복 팀 삭제됨 (ID: ${dupTeam.id})`);

          mergedCount++;
        }
      }
    }

    console.log(`\n✅ 병합 완료! 총 ${mergedCount}개 팀이 병합되었습니다.\n`);
    console.log('💡 결과 확인: npx tsx server/analyzeTeams.ts');

  } catch (error) {
    console.error('❌ 병합 실패:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

mergeTeams();
