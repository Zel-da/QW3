const fs = require('fs');
const path = require('path');

const authPath = path.join(__dirname, '..', 'server', 'routes', 'auth.ts');
let content = fs.readFileSync(authPath, 'utf8');

const oldStr1 = `      // Set session user data
      req.session.user = { id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site };

      // 감사 로그
      await logLoginSuccess(req, user.id);

      // Explicitly save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "세션 저장 중 오류가 발생했습니다" });
        }
        res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site });
      });`;

const newStr1 = `      // sites 필드 파싱 (쉼표 구분 문자열 -> 배열)
      const sitesArray = user.sites ? user.sites.split(',').map(s => s.trim()) : (user.site ? [user.site] : []);

      // Set session user data
      req.session.user = { id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site, sites: sitesArray };

      // 감사 로그
      await logLoginSuccess(req, user.id);

      // Explicitly save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "세션 저장 중 오류가 발생했습니다" });
        }
        res.json({ id: user.id, username: user.username, role: user.role, teamId: user.teamId, name: user.name, site: user.site, sites: sitesArray });
      });`;

if (content.includes('sitesArray')) {
  console.log('이미 sitesArray가 존재합니다.');
} else if (content.includes(oldStr1)) {
  content = content.replace(oldStr1, newStr1);
  fs.writeFileSync(authPath, content, 'utf8');
  console.log('로그인 로직에 sites 배열 추가 완료');
} else {
  console.log('패턴을 찾을 수 없습니다.');
  // 디버그
  const idx = content.indexOf('Set session user data');
  if (idx > 0) {
    console.log('근처 코드:');
    console.log(content.substring(idx, idx + 500));
  }
}
