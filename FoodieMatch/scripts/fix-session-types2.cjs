const fs = require('fs');
const path = require('path');

// middleware/auth.ts
const authPath = path.join(__dirname, '..', 'server', 'middleware', 'auth.ts');
let authContent = fs.readFileSync(authPath, 'utf8');

if (authContent.includes('sites?: string[]')) {
  console.log('middleware/auth.ts: 이미 수정됨');
} else {
  // 정규식으로 패턴 찾기
  const regex = /(site\?: string \| null;\s*\n\s*\};\s*\n\s*\}\s*\n\})/;

  if (regex.test(authContent)) {
    authContent = authContent.replace(regex, 'site?: string | null;\n      sites?: string[];\n    };\n  }\n}');
    fs.writeFileSync(authPath, authContent, 'utf8');
    console.log('middleware/auth.ts: 수정 완료');
  } else {
    console.log('middleware/auth.ts: 패턴 없음');
    // 디버그
    const idx = authContent.indexOf('site?:');
    if (idx > 0) {
      console.log('site 근처:', authContent.substring(idx, idx + 100));
    }
  }
}
