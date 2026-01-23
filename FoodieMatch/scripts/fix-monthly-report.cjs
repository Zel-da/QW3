const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'client', 'src', 'pages', 'MonthlyReportPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// "조치 내용" -> "위험예측사항"
content = content.replace(/<TableHead>조치 내용<\/TableHead>/g, '<TableHead>위험예측사항</TableHead>');

fs.writeFileSync(filePath, content, 'utf8');
console.log('MonthlyReportPage.tsx 수정 완료');
