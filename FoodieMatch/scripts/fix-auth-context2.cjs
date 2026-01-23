const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'client', 'src', 'context', 'AuthContext.tsx');
let content = fs.readFileSync(filePath, 'utf8');

if (content.includes('sites?: string[]')) {
  console.log('이미 sites 필드가 있습니다.');
  process.exit(0);
}

// 정규식으로 AuthUser 인터페이스 찾기
const regex = /(interface AuthUser \{[^}]*site\?: string \| null;)(\s*\})/;

if (regex.test(content)) {
  content = content.replace(regex, '$1\n  sites?: string[]; // 다중 사이트 접근 가능 목록$2');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('AuthContext.tsx 수정 완료');
} else {
  console.log('패턴을 찾을 수 없습니다.');
  // 디버그
  const idx = content.indexOf('interface AuthUser');
  if (idx > 0) {
    console.log('AuthUser 근처:');
    console.log(content.substring(idx, idx + 300));
  }
}
