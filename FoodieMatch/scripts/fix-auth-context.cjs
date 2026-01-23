const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'client', 'src', 'context', 'AuthContext.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// AuthUser 인터페이스에 sites 추가
const oldInterface = `interface AuthUser {
  id: string;
  username: string;
  name?: string | null;
  role: string;
  teamId?: number | null;
  site?: string | null;
}`;

const newInterface = `interface AuthUser {
  id: string;
  username: string;
  name?: string | null;
  role: string;
  teamId?: number | null;
  site?: string | null;
  sites?: string[]; // 다중 사이트 접근 가능 목록
}`;

if (content.includes('sites?: string[]')) {
  console.log('이미 sites 필드가 있습니다.');
} else if (content.includes(oldInterface)) {
  content = content.replace(oldInterface, newInterface);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('AuthContext.tsx 수정 완료');
} else {
  console.log('패턴을 찾을 수 없습니다.');
}
