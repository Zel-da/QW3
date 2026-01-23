const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

if (content.includes('sites')) {
  console.log('이미 sites 필드가 존재합니다.');
  process.exit(0);
}

// 정규식으로 패턴 찾기
const regex = /(site\s+String\?\s*\n)(\s+teamId)/;

if (regex.test(content)) {
  content = content.replace(regex, '$1  sites                  String?           // 다중 사이트 접근 ("화성,아산")\n$2');
  fs.writeFileSync(schemaPath, content, 'utf8');
  console.log('sites 필드 추가 완료');
} else {
  console.log('패턴을 찾을 수 없습니다.');
  // 디버그
  const idx = content.indexOf('site');
  console.log('site 위치:', idx);
  console.log('근처 텍스트:', content.substring(idx, idx + 100));
}
