const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'client', 'src', 'pages', 'MorePage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 월별 보고서 showTo에 APPROVER 추가
const oldPattern = `          href: '/monthly-report',
          icon: FileText,
          label: '월별 보고서',
          description: 'TBM 월별 보고서 및 통계',
          showTo: ['ADMIN', 'TEAM_LEADER'],`;

const newPattern = `          href: '/monthly-report',
          icon: FileText,
          label: '월별 보고서',
          description: 'TBM 월별 보고서 및 통계',
          showTo: ['ADMIN', 'TEAM_LEADER', 'APPROVER'],`;

if (content.includes(oldPattern)) {
  content = content.replace(oldPattern, newPattern);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('APPROVER 추가 완료');
} else if (content.includes("showTo: ['ADMIN', 'TEAM_LEADER', 'APPROVER']")) {
  console.log('이미 APPROVER가 추가되어 있음');
} else {
  console.log('패턴을 찾을 수 없음');
}
