const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'client', 'src', 'pages', 'MorePage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 간단한 문자열 치환
const oldStr = "showTo: ['ADMIN', 'TEAM_LEADER'],\n        },\n        {\n          href: '/inspection-gallery',";
const newStr = "showTo: ['ADMIN', 'TEAM_LEADER', 'APPROVER'],\n        },\n        {\n          href: '/inspection-gallery',";

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('APPROVER 추가 완료');
} else if (content.includes("'APPROVER'],\n        },\n        {\n          href: '/inspection-gallery',")) {
  console.log('이미 APPROVER가 추가되어 있음');
} else {
  // 디버그
  const idx = content.indexOf("href: '/monthly-report'");
  if (idx > 0) {
    console.log('월별 보고서 근처 코드:');
    console.log(content.substring(idx, idx + 300));
  }
}
