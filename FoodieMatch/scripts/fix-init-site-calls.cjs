const fs = require('fs');
const path = require('path');

// TbmPage.tsx
const tbmPath = path.join(__dirname, '..', 'client', 'src', 'pages', 'TbmPage.tsx');
let tbmContent = fs.readFileSync(tbmPath, 'utf8');

// user.site -> user.site, user.sites
tbmContent = tbmContent.replace(
  /initSiteFromUser\(user\.site, user\.role === 'ADMIN'\)/g,
  "initSiteFromUser(user.site, user.sites, user.role === 'ADMIN')"
);
fs.writeFileSync(tbmPath, tbmContent, 'utf8');
console.log('TbmPage.tsx 수정 완료');

// MonthlyReportPage.tsx
const reportPath = path.join(__dirname, '..', 'client', 'src', 'pages', 'MonthlyReportPage.tsx');
let reportContent = fs.readFileSync(reportPath, 'utf8');

reportContent = reportContent.replace(
  /initSiteFromUser\(user\.site, user\.role === 'ADMIN'\)/g,
  "initSiteFromUser(user.site, user.sites, user.role === 'ADMIN')"
);
fs.writeFileSync(reportPath, reportContent, 'utf8');
console.log('MonthlyReportPage.tsx 수정 완료');
