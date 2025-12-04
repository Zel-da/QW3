/**
 * AI 챗봇용 데이터베이스 조회 함수
 * - 로그인 정보(password, session 등) 제외
 * - Gemini Function Calling에서 사용
 */

import { prisma } from "./db";

// ========== TBM 관련 ==========

// 이번 달 TBM 작성 현황
export async function getTbmMonthlyStats(teamId?: number, site?: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const where: any = {
    reportDate: { gte: startOfMonth, lte: endOfMonth }
  };
  if (teamId) where.teamId = teamId;
  if (site) where.site = site;

  const reports = await prisma.dailyReport.count({ where });
  const teams = await prisma.team.count(site ? { where: { site } } : undefined);

  // 영업일 계산 (주말, 공휴일 제외)
  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: startOfMonth, lte: endOfMonth },
      OR: [{ site: null }, { site }]
    }
  });
  const holidayDays = new Set(holidays.map(h => new Date(h.date).getUTCDate()));

  let businessDays = 0;
  const today = now.getDate();
  for (let day = 1; day <= today; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDays.has(day)) {
      businessDays++;
    }
  }

  return {
    year,
    month,
    totalReports: reports,
    businessDays,
    expectedReports: teams * businessDays,
    completionRate: teams > 0 && businessDays > 0
      ? Math.round((reports / (teams * businessDays)) * 100)
      : 0
  };
}

// 팀별 TBM 작성률
export async function getTeamTbmStats(site?: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  const teams = await prisma.team.findMany({
    where: site ? { site } : undefined,
    include: {
      dailyReports: {
        where: { reportDate: { gte: startOfMonth, lte: endOfMonth } }
      },
      leader: { select: { name: true, username: true } }
    }
  });

  return teams.map(team => ({
    teamId: team.id,
    teamName: team.name,
    leaderName: team.leader?.name || team.leader?.username || '미지정',
    site: team.site,
    reportsThisMonth: team.dailyReports.length
  }));
}

// ========== 교육 관련 ==========

// 교육 현황 요약
export async function getEducationStats() {
  const courses = await prisma.course.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          userProgress: true,
          certificates: true
        }
      }
    }
  });

  const totalUsers = await prisma.user.count({
    where: { role: { not: 'PENDING' } }
  });

  return {
    totalCourses: courses.length,
    totalActiveUsers: totalUsers,
    courses: courses.map(c => ({
      id: c.id,
      title: c.title,
      type: c.type,
      duration: c.duration,
      enrolledUsers: c._count.userProgress,
      completedUsers: c._count.certificates
    }))
  };
}

// 교육 미이수자 목록
export async function getIncompleteEducationUsers(courseId?: string) {
  const activeUsers = await prisma.user.findMany({
    where: { role: { not: 'PENDING' } },
    select: {
      id: true,
      name: true,
      username: true,
      site: true,
      team: { select: { name: true } },
      certificates: courseId ? {
        where: { courseId }
      } : true,
      userProgress: courseId ? {
        where: { courseId }
      } : true
    }
  });

  // 수료증이 없는 사용자 필터링
  const incompleteUsers = activeUsers.filter(user => {
    if (courseId) {
      return user.certificates.length === 0;
    }
    return true; // courseId 없으면 전체 반환
  });

  return incompleteUsers.map(u => ({
    name: u.name || u.username,
    team: u.team?.name || '미소속',
    site: u.site || '미지정',
    hasCertificate: u.certificates.length > 0,
    progressPercent: u.userProgress.length > 0
      ? (u.userProgress[0] as any).progress || 0
      : 0
  }));
}

// ========== 안전점검 관련 ==========

// 이번 달 안전점검 현황
export async function getSafetyInspectionStats(site?: string) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const teams = await prisma.team.findMany({
    where: site ? { site } : undefined,
    include: {
      safetyInspections: {
        where: { year, month }
      }
    }
  });

  const completed = teams.filter(t =>
    t.safetyInspections.some(i => i.isCompleted)
  ).length;

  return {
    year,
    month,
    totalTeams: teams.length,
    completedTeams: completed,
    pendingTeams: teams.length - completed,
    completionRate: teams.length > 0
      ? Math.round((completed / teams.length) * 100)
      : 0,
    teams: teams.map(t => ({
      teamName: t.name,
      site: t.site,
      isCompleted: t.safetyInspections.some(i => i.isCompleted)
    }))
  };
}

// ========== 팀/사용자 관련 ==========

// 팀 목록
export async function getTeamList(site?: string) {
  const teams = await prisma.team.findMany({
    where: site ? { site } : undefined,
    include: {
      leader: { select: { name: true, username: true } },
      _count: { select: { members: true, teamMembers: true } }
    }
  });

  return teams.map(t => ({
    id: t.id,
    name: t.name,
    site: t.site,
    leaderName: t.leader?.name || t.leader?.username || '미지정',
    memberCount: t._count.members + t._count.teamMembers
  }));
}

// 사용자 목록 (비밀번호 제외)
export async function getUserList(role?: string, site?: string) {
  const where: any = {};
  if (role) where.role = role;
  if (site) where.site = site;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      name: true,
      email: true,
      role: true,
      site: true,
      team: { select: { name: true } },
      createdAt: true
    },
    orderBy: { createdAt: 'desc' },
    take: 100 // 최대 100명
  });

  return users.map(u => ({
    username: u.username,
    name: u.name || '미입력',
    email: u.email || '미입력',
    role: u.role,
    site: u.site || '미지정',
    team: u.team?.name || '미소속',
    joinDate: u.createdAt.toISOString().split('T')[0]
  }));
}

// 승인 대기 사용자
export async function getPendingUsers() {
  return prisma.user.findMany({
    where: { role: 'PENDING' },
    select: {
      username: true,
      name: true,
      email: true,
      createdAt: true
    }
  });
}

// ========== 결재 관련 ==========

// 결재 현황
export async function getApprovalStats() {
  const pending = await prisma.approvalRequest.count({
    where: { status: 'PENDING' }
  });
  const approved = await prisma.approvalRequest.count({
    where: { status: 'APPROVED' }
  });
  const rejected = await prisma.approvalRequest.count({
    where: { status: 'REJECTED' }
  });

  const recentPending = await prisma.approvalRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      requester: { select: { name: true, username: true } },
      monthlyReport: {
        include: { team: { select: { name: true } } }
      }
    },
    orderBy: { requestedAt: 'desc' },
    take: 10
  });

  return {
    pending,
    approved,
    rejected,
    total: pending + approved + rejected,
    recentPending: recentPending.map(r => ({
      teamName: r.monthlyReport.team.name,
      requesterName: r.requester.name || r.requester.username,
      year: r.monthlyReport.year,
      month: r.monthlyReport.month,
      requestedAt: r.requestedAt.toISOString().split('T')[0]
    }))
  };
}

// ========== 공지사항 관련 ==========

// 최근 공지사항
export async function getRecentNotices(limit: number = 5) {
  const notices = await prisma.notice.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      author: { select: { name: true, username: true } }
    }
  });

  return notices.map(n => ({
    id: n.id,
    title: n.title,
    category: n.category,
    author: n.author.name || n.author.username,
    createdAt: n.createdAt.toISOString().split('T')[0],
    viewCount: n.viewCount
  }));
}

// ========== 공휴일 관련 ==========

// 공휴일 목록
export async function getHolidays(year?: number) {
  const targetYear = year || new Date().getFullYear();
  const startDate = new Date(targetYear, 0, 1);
  const endDate = new Date(targetYear + 1, 0, 1);

  const holidays = await prisma.holiday.findMany({
    where: {
      date: { gte: startDate, lt: endDate }
    },
    orderBy: { date: 'asc' }
  });

  return holidays.map(h => ({
    date: new Date(h.date).toISOString().split('T')[0],
    name: h.name,
    isRecurring: h.isRecurring
  }));
}

// ========== 종합 대시보드 ==========

// 전체 현황 요약
export async function getDashboardSummary(site?: string) {
  const [tbmStats, educationStats, inspectionStats, approvalStats, pendingUsers] = await Promise.all([
    getTbmMonthlyStats(undefined, site),
    getEducationStats(),
    getSafetyInspectionStats(site),
    getApprovalStats(),
    getPendingUsers()
  ]);

  return {
    tbm: {
      작성률: `${tbmStats.completionRate}%`,
      이번달작성: tbmStats.totalReports,
      영업일: tbmStats.businessDays
    },
    교육: {
      총과정수: educationStats.totalCourses,
      활성사용자: educationStats.totalActiveUsers
    },
    안전점검: {
      완료율: `${inspectionStats.completionRate}%`,
      완료팀: inspectionStats.completedTeams,
      미완료팀: inspectionStats.pendingTeams
    },
    결재: {
      대기중: approvalStats.pending,
      승인됨: approvalStats.approved,
      반려됨: approvalStats.rejected
    },
    가입승인대기: pendingUsers.length
  };
}

// Function calling용 도구 정의
export const chatbotTools = [
  {
    name: "get_dashboard_summary",
    description: "전체 현황 요약을 조회합니다 (TBM, 교육, 안전점검, 결재 현황)",
    parameters: {
      type: "object",
      properties: {
        site: { type: "string", description: "사이트 필터 (아산, 화성)" }
      }
    }
  },
  {
    name: "get_tbm_stats",
    description: "이번 달 TBM 작성 현황을 조회합니다",
    parameters: {
      type: "object",
      properties: {
        site: { type: "string", description: "사이트 필터 (아산, 화성)" }
      }
    }
  },
  {
    name: "get_team_tbm_stats",
    description: "팀별 TBM 작성 현황을 조회합니다",
    parameters: {
      type: "object",
      properties: {
        site: { type: "string", description: "사이트 필터 (아산, 화성)" }
      }
    }
  },
  {
    name: "get_education_stats",
    description: "교육 현황을 조회합니다 (과정 목록, 수강 현황)",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "get_incomplete_education",
    description: "교육 미이수자 목록을 조회합니다",
    parameters: {
      type: "object",
      properties: {
        courseId: { type: "string", description: "특정 과정 ID (선택)" }
      }
    }
  },
  {
    name: "get_safety_inspection_stats",
    description: "이번 달 안전점검 현황을 조회합니다",
    parameters: {
      type: "object",
      properties: {
        site: { type: "string", description: "사이트 필터 (아산, 화성)" }
      }
    }
  },
  {
    name: "get_team_list",
    description: "팀 목록을 조회합니다",
    parameters: {
      type: "object",
      properties: {
        site: { type: "string", description: "사이트 필터 (아산, 화성)" }
      }
    }
  },
  {
    name: "get_user_list",
    description: "사용자 목록을 조회합니다 (비밀번호 제외)",
    parameters: {
      type: "object",
      properties: {
        role: { type: "string", description: "역할 필터 (ADMIN, TEAM_LEADER, APPROVER, PENDING)" },
        site: { type: "string", description: "사이트 필터 (아산, 화성)" }
      }
    }
  },
  {
    name: "get_pending_users",
    description: "가입 승인 대기 중인 사용자 목록을 조회합니다",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "get_approval_stats",
    description: "결재 현황을 조회합니다 (대기, 승인, 반려)",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "get_recent_notices",
    description: "최근 공지사항을 조회합니다",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "조회할 개수 (기본 5개)" }
      }
    }
  },
  {
    name: "get_holidays",
    description: "공휴일 목록을 조회합니다",
    parameters: {
      type: "object",
      properties: {
        year: { type: "number", description: "연도 (기본 올해)" }
      }
    }
  }
];

// 도구 실행 함수
export async function executeTool(name: string, params: any) {
  switch (name) {
    case "get_dashboard_summary":
      return getDashboardSummary(params.site);
    case "get_tbm_stats":
      return getTbmMonthlyStats(undefined, params.site);
    case "get_team_tbm_stats":
      return getTeamTbmStats(params.site);
    case "get_education_stats":
      return getEducationStats();
    case "get_incomplete_education":
      return getIncompleteEducationUsers(params.courseId);
    case "get_safety_inspection_stats":
      return getSafetyInspectionStats(params.site);
    case "get_team_list":
      return getTeamList(params.site);
    case "get_user_list":
      return getUserList(params.role, params.site);
    case "get_pending_users":
      return getPendingUsers();
    case "get_approval_stats":
      return getApprovalStats();
    case "get_recent_notices":
      return getRecentNotices(params.limit);
    case "get_holidays":
      return getHolidays(params.year);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
