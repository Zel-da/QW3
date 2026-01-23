const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

const oldStr = `  site                   String?
  teamId                 Int?`;

const newStr = `  site                   String?
  sites                  String?           // 다중 사이트 접근 ("화성,아산")
  teamId                 Int?`;

if (content.includes('sites                  String?')) {
  console.log('이미 sites 필드가 존재합니다.');
} else if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log('sites 필드 추가 완료');
} else {
  console.log('패턴을 찾을 수 없습니다.');
}
