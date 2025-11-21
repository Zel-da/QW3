import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function backupDatabase() {
  console.log('📦 데이터베이스 백업 시작...\n');

  try {
    // 모든 팀 데이터 조회 (모든 관계 포함)
    const teams = await prisma.team.findMany({
      include: {
        factory: true,
        leader: true,
        approver: true,
        members: true,
        teamMembers: true,
        checklistTemplates: {
          include: {
            templateItems: true,
          },
        },
        dailyReports: true,
        monthlyApprovals: true,
        inspectionTemplates: true,
        safetyInspections: {
          include: {
            inspectionItems: true,
          },
        },
        teamEquipments: true,
      },
    });

    // 백업 데이터 구조
    const backup = {
      timestamp: new Date().toISOString(),
      teamCount: teams.length,
      teams: teams,
    };

    // 백업 파일명 생성 (YYYYMMDD_HHMMSS)
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup_teams_${dateStr}.json`;
    const filepath = `./${filename}`;

    // JSON 파일로 저장
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');

    console.log('✅ 백업 완료!');
    console.log(`   - 파일: ${filename}`);
    console.log(`   - 팀 개수: ${teams.length}개`);
    console.log(`   - 용량: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB\n`);
    console.log('💡 복원 명령: npx tsx server/restoreDatabase.ts ' + filename);

  } catch (error) {
    console.error('❌ 백업 실패:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase();
