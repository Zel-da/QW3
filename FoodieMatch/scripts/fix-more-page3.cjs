const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'client', 'src', 'pages', 'MorePage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 정규식으로 치환
const regex = /showTo: \['ADMIN', 'TEAM_LEADER'\],(\s*}\s*,\s*{\s*href: '\/inspection-gallery')/;

if (regex.test(content)) {
  content = content.replace(regex, "showTo: ['ADMIN', 'TEAM_LEADER', 'APPROVER'],$1");
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('APPROVER 추가 완료');
} else if (content.includes("'APPROVER']")) {
  console.log('이미 APPROVER가 추가되어 있음');
} else {
  console.log('패턴을 찾을 수 없음');
}
