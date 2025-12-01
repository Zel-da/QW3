import * as fs from 'fs';
import * as path from 'path';

const backupFiles = [
  'backup_INITIAL_2025-11-19T07-05-49.json',
  'backup_AFTER_phase1_2025-11-19T07-12-39.json',
  'backup_BEFORE_phase2_2025-11-19T07-13-55.json',
  'backup_AFTER_phase2_2025-11-19T07-17-38.json',
  'backup_BEFORE_phase3_2025-11-19T07-20-16.json',
  'backup_AFTER_phase3_2025-11-19T07-22-52.json',
  'backup_BEFORE_phase4_2025-11-19T07-23-13.json',
  'backup_AFTER_phase4_FINAL_2025-11-19T07-24-09.json',
  'backup_teams_2025-11-19T00-30-07.json',
  'backup_equipment_BEFORE_cleanup_2025-11-20T08-02-40.json',
];

console.log('모든 백업 파일 검색 중...\n');

for (const file of backupFiles) {
  if (!fs.existsSync(file)) {
    console.log(`❌ ${file} - 파일 없음`);
    continue;
  }

  try {
    const content = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(content);

    const teams = data.teams?.length || 0;
    const notices = data.notices?.length || 0;
    const dailyReports = data.dailyReports?.length || 0;

    // 팀 내부에 dailyReports가 있는지 확인
    let teamDailyReports = 0;
    let teamSafetyInspections = 0;
    if (data.teams && Array.isArray(data.teams)) {
      for (const team of data.teams) {
        if (team.dailyReports) teamDailyReports += team.dailyReports.length;
        if (team.safetyInspections) teamSafetyInspections += team.safetyInspections.length;
      }
    }

    console.log(`📦 ${file}`);
    console.log(`   Teams: ${teams}, Notices: ${notices}`);
    console.log(`   DailyReports(팀내): ${teamDailyReports}, SafetyInspections(팀내): ${teamSafetyInspections}`);

    if (notices > 0 || teamDailyReports > 0 || teamSafetyInspections > 0) {
      console.log(`   ⭐ 이 백업에 데이터 있음!`);
    }
    console.log('');
  } catch (e: any) {
    console.log(`❌ ${file} - 읽기 실패: ${e.message}`);
  }
}
