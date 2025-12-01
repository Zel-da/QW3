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

console.log('모든 데이터 유형 검색 중...\n');

for (const file of backupFiles) {
  if (!fs.existsSync(file)) continue;

  try {
    const content = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(content);

    const counts: Record<string, number> = {};

    // 모든 가능한 필드 확인
    const fieldsToCheck = [
      'notices', 'comments', 'reportDetails', 'monthlyApprovals',
      'reportSignatures', 'safetyInspections', 'inspectionItems',
      'users', 'factories', 'courses', 'attachments'
    ];

    for (const field of fieldsToCheck) {
      if (data[field] && Array.isArray(data[field])) {
        counts[field] = data[field].length;
      }
    }

    // 팀 내부 필드도 확인
    if (data.teams && Array.isArray(data.teams)) {
      for (const team of data.teams) {
        for (const field of fieldsToCheck) {
          if (team[field] && Array.isArray(team[field])) {
            counts[field] = (counts[field] || 0) + team[field].length;
          }
        }
      }
    }

    const hasData = Object.values(counts).some(v => v > 0);
    if (hasData) {
      console.log(`📦 ${file}`);
      for (const [key, value] of Object.entries(counts)) {
        if (value > 0) {
          console.log(`   ${key}: ${value}개`);
        }
      }
      console.log('');
    }
  } catch (e: any) {
    console.log(`❌ ${file} - 읽기 실패: ${e.message}`);
  }
}

console.log('\n완료.');
