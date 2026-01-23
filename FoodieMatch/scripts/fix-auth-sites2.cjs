const fs = require('fs');
const path = require('path');

const authPath = path.join(__dirname, '..', 'server', 'routes', 'auth.ts');
let content = fs.readFileSync(authPath, 'utf8');

if (content.includes('sitesArray')) {
  console.log('이미 sitesArray가 존재합니다.');
  process.exit(0);
}

// 정규식으로 패턴 찾기
const regex = /(\/\/ Set session user data\s+req\.session\.user = \{ id: user\.id, username: user\.username, role: user\.role, teamId: user\.teamId, name: user\.name, site: user\.site \};)/;

if (regex.test(content)) {
  content = content.replace(regex, `// sites 필드 파싱 (쉼표 구분 문자열 -> 배열)
      const sitesArray = user.sites ? user.sites.split(',').map(s => s.trim()) : (user.site ? [user.site] : []);

      // Set session user data
      req.session.user = { id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site, sites: sitesArray };`);

  // 응답에도 sites 추가
  content = content.replace(
    /res\.json\(\{ id: user\.id, username: user\.username, role: user\.role, teamId: user\.teamId, name: user\.name, site: user\.site \}\);(\s+\}\);)/,
    'res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site, sites: sitesArray });$1'
  );

  fs.writeFileSync(authPath, content, 'utf8');
  console.log('로그인 로직에 sites 배열 추가 완료');
} else {
  console.log('패턴을 찾을 수 없습니다.');
}
