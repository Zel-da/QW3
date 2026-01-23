/**
 * 팀 데이터 이동 및 삭제 스크립트
 * 삭제할 팀의 데이터를 남길 팀으로 이동 후 삭제
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 이동 매핑: [남길 팀 ID, 삭제할 팀 ID]
const migrations: { keep: number; delete: number; name: string }[] = [
  { keep: 61, delete: 29, name: '2공장 ← BR로드생산' },
  { keep: 53, delete: 22, name: 'BKT ← BR생산 BKT조립' },
  { keep: 52, delete: 21, name: 'M/B ← BR생산 MB조립' },
  { keep: 50, delete: 19, name: '선삭 ← BR생산 선삭' },
  { keep: 51, delete: 20, name: '연삭 ← BR생산 연삭' },
  { keep: 55, delete: 23, name: '열처리 ← BR생산 열처리(주간)' },
  { keep: 55, delete: 24, name: '열처리 ← BR생산 열처리(야간1조)' },
  { keep: 55, delete: 25, name: '열처리 ← BR생산 열처리(야간2조)' },
  { keep: 55, delete: 26, name: '열처리 ← BR생산 열처리(야간3조)' },
  { keep: 56, delete: 36, name: 'CR자재 ← 자재관리' },
];

// 데이터 없이 그냥 삭제할 팀들
const deleteOnly: number[] = [
  31, // BR테스트
  33, // CR생산 팀장
  34, // CR생산 CR총괄
  37, // CR품질관리
  62, // 연구소
];

async function migrateTeamData(keepId: number, deleteId: number, name: string) {
  console.log(`\n📦 ${name}`);

  // 1. User 이동 (teamId 변경)
  const users = await prisma.user.findMany({ where: { teamId: deleteId } });
  if (users.length > 0) {
    // 이미 keepId에 있는 사용자 제외
    const existingUsers = await prisma.user.findMany({
      where: { teamId: keepId },
      select: { username: true }
    });
    const existingUsernames = new Set(existingUsers.map(u => u.username));

    for (const user of users) {
      if (!existingUsernames.has(user.username)) {
        await prisma.user.update({
          where: { id: user.id },
          data: { teamId: keepId }
        });
        console.log(`   User 이동: ${user.name}`);
      } else {
        console.log(`   User 스킵 (중복): ${user.name}`);
      }
    }
  }

  // 2. TeamMember 이동
  const members = await prisma.teamMember.findMany({ where: { teamId: deleteId } });
  if (members.length > 0) {
    const existingMembers = await prisma.teamMember.findMany({
      where: { teamId: keepId },
      select: { name: true }
    });
    const existingNames = new Set(existingMembers.map(m => m.name));

    for (const member of members) {
      if (!existingNames.has(member.name)) {
        await prisma.teamMember.update({
          where: { id: member.id },
          data: { teamId: keepId }
        });
        console.log(`   TeamMember 이동: ${member.name}`);
      } else {
        // 중복이면 삭제
        await prisma.teamMember.delete({ where: { id: member.id } });
        console.log(`   TeamMember 삭제 (중복): ${member.name}`);
      }
    }
  }

  // 3. DailyReport 이동
  const reports = await prisma.dailyReport.updateMany({
    where: { teamId: deleteId },
    data: { teamId: keepId }
  });
  if (reports.count > 0) console.log(`   DailyReport 이동: ${reports.count}개`);

  // 4. ChecklistTemplate - 중복 체크 후 삭제 (이동 어려움)
  const templates = await prisma.checklistTemplate.findMany({ where: { teamId: deleteId } });
  for (const template of templates) {
    // 템플릿과 아이템 삭제 (Cascade로 자동 삭제)
    await prisma.checklistTemplate.delete({ where: { id: template.id } });
  }
  if (templates.length > 0) console.log(`   ChecklistTemplate 삭제: ${templates.length}개`);

  // 5. InspectionTemplate 삭제 (중복 가능성 높음)
  const inspTemplates = await prisma.inspectionTemplate.deleteMany({ where: { teamId: deleteId } });
  if (inspTemplates.count > 0) console.log(`   InspectionTemplate 삭제: ${inspTemplates.count}개`);

  // 6. SafetyInspection 이동
  const inspections = await prisma.safetyInspection.updateMany({
    where: { teamId: deleteId },
    data: { teamId: keepId }
  });
  if (inspections.count > 0) console.log(`   SafetyInspection 이동: ${inspections.count}개`);

  // 7. MonthlyApproval 이동
  const approvals = await prisma.monthlyApproval.updateMany({
    where: { teamId: deleteId },
    data: { teamId: keepId }
  });
  if (approvals.count > 0) console.log(`   MonthlyApproval 이동: ${approvals.count}개`);

  // 8. TeamEquipment - 중복 체크 후 이동 또는 삭제
  const equipments = await prisma.teamEquipment.findMany({ where: { teamId: deleteId } });
  for (const eq of equipments) {
    const existing = await prisma.teamEquipment.findUnique({
      where: { teamId_equipmentName: { teamId: keepId, equipmentName: eq.equipmentName } }
    });
    if (!existing) {
      await prisma.teamEquipment.update({
        where: { id: eq.id },
        data: { teamId: keepId }
      });
    } else {
      await prisma.teamEquipment.delete({ where: { id: eq.id } });
    }
  }
  if (equipments.length > 0) console.log(`   TeamEquipment 처리: ${equipments.length}개`);

  // 9. 팀 삭제
  await prisma.team.delete({ where: { id: deleteId } });
  console.log(`   ✅ 팀 삭제 완료 (ID: ${deleteId})`);
}

async function deleteTeam(teamId: number) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return;

  console.log(`\n🗑️ ${team.name} (ID: ${teamId}) 삭제`);

  // User의 teamId를 null로
  await prisma.user.updateMany({ where: { teamId }, data: { teamId: null } });

  // TeamMember 삭제
  await prisma.teamMember.deleteMany({ where: { teamId } });

  // ChecklistTemplate 삭제 (Cascade)
  const templates = await prisma.checklistTemplate.findMany({ where: { teamId } });
  for (const t of templates) {
    await prisma.checklistTemplate.delete({ where: { id: t.id } });
  }

  // InspectionTemplate 삭제
  await prisma.inspectionTemplate.deleteMany({ where: { teamId } });

  // 팀 삭제
  await prisma.team.delete({ where: { id: teamId } });
  console.log(`   ✅ 삭제 완료`);
}

async function main() {
  console.log('========================================');
  console.log('팀 데이터 이동 및 삭제');
  console.log('========================================');

  // 1. 데이터 이동 후 삭제
  console.log('\n[ 데이터 이동 후 삭제 ]');
  for (const m of migrations) {
    await migrateTeamData(m.keep, m.delete, m.name);
  }

  // 2. 그냥 삭제
  console.log('\n[ 데이터 없이 삭제 ]');
  for (const id of deleteOnly) {
    await deleteTeam(id);
  }

  console.log('\n========================================');
  console.log('완료!');
  console.log('========================================');
}

main()
  .catch(e => { console.error('오류:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
