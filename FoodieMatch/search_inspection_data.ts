import * as fs from 'fs';

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

console.log('안전점검 관련 데이터 검색 중...\n');

for (const file of backupFiles) {
  if (!fs.existsSync(file)) continue;

  try {
    const content = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(content);

    let safetyInspections = 0;
    let inspectionItems = 0;
    let inspectionTemplates = 0;
    let inspectionScheduleTemplates = 0;

    // 최상위 레벨 확인
    if (data.safetyInspections) safetyInspections += data.safetyInspections.length;
    if (data.inspectionItems) inspectionItems += data.inspectionItems.length;
    if (data.inspectionTemplates) inspectionTemplates += data.inspectionTemplates.length;
    if (data.inspectionScheduleTemplates) inspectionScheduleTemplates += data.inspectionScheduleTemplates.length;

    // 팀 내부 확인
    if (data.teams && Array.isArray(data.teams)) {
      for (const team of data.teams) {
        if (team.safetyInspections) safetyInspections += team.safetyInspections.length;
        if (team.inspectionItems) inspectionItems += team.inspectionItems.length;
        if (team.inspectionTemplates) inspectionTemplates += team.inspectionTemplates.length;
      }
    }

    const total = safetyInspections + inspectionItems + inspectionTemplates + inspectionScheduleTemplates;

    if (total > 0) {
      console.log(`⭐ ${file}`);
      if (safetyInspections > 0) console.log(`   SafetyInspections: ${safetyInspections}개`);
      if (inspectionItems > 0) console.log(`   InspectionItems: ${inspectionItems}개`);
      if (inspectionTemplates > 0) console.log(`   InspectionTemplates: ${inspectionTemplates}개`);
      if (inspectionScheduleTemplates > 0) console.log(`   InspectionScheduleTemplates: ${inspectionScheduleTemplates}개`);
      console.log('');
    }
  } catch (e: any) {
    console.log(`❌ ${file} - 읽기 실패: ${e.message}`);
  }
}

console.log('\n완료.');
