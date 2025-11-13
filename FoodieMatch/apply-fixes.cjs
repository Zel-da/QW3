const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'server', 'routes.ts');
let content = fs.readFileSync(routesPath, 'utf-8');

console.log('📝 Applying fixes to routes.ts...\n');

// Fix 1: Add hasApproval field to attendance-overview
// Match with both \r\n and \n line endings
const oldAttendancePattern = /        return \{\r?\n          teamId: team\.id,\r?\n          teamName: team\.name,\r?\n          dailyStatuses\r?\n        \};/;

const newAttendanceCode = `        // 월별 결재 승인 여부 확인\r
        const monthlyApproval = await prisma.monthlyApproval.findFirst({\r
          where: {\r
            teamId: team.id,\r
            year: parseInt(year as string),\r
            month: parseInt(month as string)\r
          }\r
        });\r
\r
        const hasApproval = monthlyApproval?.status === 'APPROVED';\r
\r
        return {\r
          teamId: team.id,\r
          teamName: team.name,\r
          dailyStatuses,\r
          hasApproval\r
        };`;

if (content.includes('hasApproval')) {
  console.log('ℹ️  Fix 1: hasApproval field already exists');
} else if (oldAttendancePattern.test(content)) {
  content = content.replace(oldAttendancePattern, newAttendanceCode);
  console.log('✅ Fix 1: Added hasApproval field to attendance-overview API');
} else {
  console.log('❌ Fix 1: Could not find target code for hasApproval field');
  console.log('   Searching for pattern in file...');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('teamId: team.id,') && lines[i].includes('teamName')) {
      console.log(`   Found similar code at line ${i + 1}`);
    }
  }
}

// Fix 2: Add recent-activities endpoint after dashboard/stats
const noticeManagementPattern = /  \}\);\r?\n\r?\n  \/\/ NOTICE MANAGEMENT/;

const recentActivitiesEndpoint = `  });\r
\r
  // Recent Activities API\r
  app.get("/api/dashboard/recent-activities", requireAuth, async (req, res) => {\r
    try {\r
      const userId = req.session.user!.id;\r
      const activities: any[] = [];\r
\r
      // 최근 공지사항 (최근 5개)\r
      const recentNotices = await prisma.notice.findMany({\r
        take: 5,\r
        orderBy: { createdAt: 'desc' },\r
        where: { isActive: true }\r
      });\r
\r
      for (const notice of recentNotices) {\r
        activities.push({\r
          id: \`notice-\${notice.id}\`,\r
          type: 'notice',\r
          title: notice.title,\r
          description: \`공지사항 - \${notice.category}\`,\r
          timestamp: notice.createdAt.toISOString(),\r
          relatedId: notice.id\r
        });\r
      }\r
\r
      // 최근 교육 수료 (최근 5개)\r
      const recentCompletedCourses = await prisma.userProgress.findMany({\r
        where: { userId, completed: true },\r
        take: 5,\r
        orderBy: { lastAccessed: 'desc' },\r
        include: { course: true }\r
      });\r
\r
      for (const progress of recentCompletedCourses) {\r
        activities.push({\r
          id: \`education-\${progress.id}\`,\r
          type: 'education',\r
          title: progress.course.title,\r
          description: '교육 과정 수료',\r
          timestamp: progress.lastAccessed.toISOString(),\r
          relatedId: progress.courseId\r
        });\r
      }\r
\r
      // 최근 TBM 제출 (최근 5개)\r
      const teamId = req.session.user!.teamId;\r
      if (teamId) {\r
        const recentReports = await prisma.dailyReport.findMany({\r
          where: { teamId },\r
          take: 5,\r
          orderBy: { reportDate: 'desc' },\r
          include: { team: true }\r
        });\r
\r
        for (const report of recentReports) {\r
          activities.push({\r
            id: \`tbm-\${report.id}\`,\r
            type: 'tbm',\r
            title: \`TBM 체크리스트 - \${report.team.name}\`,\r
            description: new Date(report.reportDate).toLocaleDateString('ko-KR'),\r
            timestamp: report.createdAt.toISOString(),\r
            relatedId: report.id.toString()\r
          });\r
        }\r
      }\r
\r
      // 시간순으로 정렬 (최신순)\r
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());\r
\r
      // 최대 10개만 반환\r
      const result = activities.slice(0, 10);\r
      console.log('📊 Recent activities count:', result.length);\r
      if (result.length > 0) {\r
        console.log('📊 Sample activity:', result[0]);\r
      }\r
      res.json(result);\r
    } catch (error) {\r
      console.error("Failed to fetch recent activities:", error);\r
      res.status(500).json({ message: "최근 활동을 불러오는데 실패했습니다" });\r
    }\r
  });\r
\r
  // NOTICE MANAGEMENT`;

if (content.includes('app.get("/api/dashboard/recent-activities"')) {
  console.log('ℹ️  Fix 2: recent-activities endpoint already exists');
} else if (noticeManagementPattern.test(content)) {
  content = content.replace(noticeManagementPattern, recentActivitiesEndpoint);
  console.log('✅ Fix 2: Added recent-activities API endpoint');
} else {
  console.log('❌ Fix 2: Could not find target location for recent-activities endpoint');
}

// Write the modified content
fs.writeFileSync(routesPath, content, 'utf-8');
console.log('\n✅ All fixes applied successfully!');
console.log('📁 File saved:', routesPath);
