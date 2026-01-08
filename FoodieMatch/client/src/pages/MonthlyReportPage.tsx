import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext';
import { useSite, Site } from '@/hooks/use-site';
import { stripSiteSuffix, getInspectionYearRange, sortTeams } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Filter, Search, FileDown, UserCheck, AlertTriangle, CheckCircle, XCircle, Clock, BookOpen, History, X } from 'lucide-react';
import type { DailyReport, User, Team, Course, UserProgress, UserAssessment, TeamMember } from '@shared/schema';
import { SITES } from '@/lib/constants';
import { SignatureDialog } from '@/components/SignatureDialog';
import { DualSignatureDialog } from '@/components/DualSignatureDialog';

// ==================== API Functions ====================

const fetchMonthlyReport = async (teamId: number | null, year: number, month: number) => {
  if (!teamId) return null;
  const res = await apiRequest('GET', `/api/tbm/monthly?teamId=${teamId}&year=${year}&month=${month}`);
  return res.json();
};

const fetchTeams = async (site: Site) => {
  if (!site) return [];
  const res = await apiRequest('GET', `/api/teams?site=${site}`);
  return res.json();
};

interface EducationOverviewData {
  users: (User & { team?: Team })[];
  courses: Course[];
  allProgress: UserProgress[];
  allAssessments: UserAssessment[];
}

const fetchEducationOverview = async (): Promise<EducationOverviewData> => {
  const res = await apiRequest('GET', '/api/admin/education-overview');
  return res.json();
};

interface AttendanceOverviewTeam {
  teamId: number;
  teamName: string;
  dailyStatuses: {
    [day: number]: {
      status: 'not-submitted' | 'completed' | 'has-issues',
      reportId: number | null
    }
  };
  hasApproval: boolean;
  educationCompleted: boolean;
}

interface NonWorkdayInfo {
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

interface AttendanceOverviewData {
  teams: AttendanceOverviewTeam[];
  daysInMonth: number;
  nonWorkdays?: { [day: number]: NonWorkdayInfo };
}

const fetchAttendanceOverview = async (year: number, month: number, site: Site): Promise<AttendanceOverviewData | null> => {
  if (!site) return null;
  const res = await apiRequest('GET', `/api/tbm/attendance-overview?year=${year}&month=${month}&site=${site}`);
  return res.json();
};

const fetchTeamMembers = async (teamId: number): Promise<TeamMember[]> => {
  const res = await apiRequest('GET', `/api/teams/${teamId}/members`);
  return res.json();
};

const createApprovalRequest = async (payload: {
  teamId: number;
  year: number;
  month: number;
}) => {
  console.log('[createApprovalRequest] 함수 시작', payload);
  try {
    console.log('[createApprovalRequest] apiRequest 호출 중...');
    const res = await apiRequest('POST', '/api/monthly-approvals/request', payload);
    const data = await res.json();
    console.log('[createApprovalRequest] 성공 응답:', data);
    return data;
  } catch (error: any) {
    console.error('[createApprovalRequest] 에러 발생:', error);
    throw error;
  }
};

// ==================== Helper Functions ====================

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function isWeekend(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function isFutureDate(year: number, month: number, day: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cellDate = new Date(year, month - 1, day);
  return cellDate > today;
}

function getStatusColor(status: 'not-submitted' | 'completed' | 'has-issues' | undefined): string {
  if (!status || status === 'completed') return 'bg-white';
  if (status === 'has-issues') return 'bg-yellow-200';
  if (status === 'not-submitted') return 'bg-red-200';
  return 'bg-white';
}

function getStatusSymbol(status: 'not-submitted' | 'completed' | 'has-issues' | undefined): string {
  if (!status || status === 'completed') return '✓';
  if (status === 'has-issues') return '△';
  if (status === 'not-submitted') return '✗';
  return '';
}

function getStatusText(status: 'not-submitted' | 'completed' | 'has-issues' | undefined): string {
  if (!status || status === 'completed') return '작성완료';
  if (status === 'has-issues') return '문제점 및 위험예측 사항';
  if (status === 'not-submitted') return '미작성';
  return '';
}

// ==================== Main Component ====================

export default function MonthlyReportPage() {
  const { user } = useAuth();
  const { site, setSite, initSiteFromUser } = useSite();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // ==================== State Management ====================
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [date, setDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });
  const [activeTab, setActiveTab] = useState<'attendance' | 'statistics' | 'comprehensive'>('attendance');

  const reportDetailRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [filterNoApproval, setFilterNoApproval] = useState(false);
  const [filterNoEducation, setFilterNoEducation] = useState(false);
  const [filterHasIssues, setFilterHasIssues] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showDatePickerDialog, setShowDatePickerDialog] = useState(false);
  const [showEducationDatePicker, setShowEducationDatePicker] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [executiveName, setExecutiveName] = useState('');
  const [executiveSignature, setExecutiveSignature] = useState('');

  // Download states
  const [downloadYear, setDownloadYear] = useState(new Date().getFullYear());
  const [downloadMonth, setDownloadMonth] = useState(new Date().getMonth() + 1);
  const [downloadDay, setDownloadDay] = useState(new Date().getDate());

  // 안전교육 엑셀 다운로드용 상태
  const [educationManager, setEducationManager] = useState(''); // 담당자
  const [educationApprover, setEducationApprover] = useState(''); // 승인자
  const [showEducationSignature, setShowEducationSignature] = useState(false); // 서명 다이얼로그
  const [educationSignatureData, setEducationSignatureData] = useState(''); // 담당 서명 데이터
  const [approverSignatureData, setApproverSignatureData] = useState(''); // 승인 서명 데이터
  const [teamDateMap, setTeamDateMap] = useState<Record<number, number>>({}); // 팀별 날짜 선택
  const [useTeamSpecificDates, setUseTeamSpecificDates] = useState(false); // 팀별 날짜 사용 여부
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null); // 이미지 확대 보기

  // ==================== Queries ====================

  // 사용자 소속 사이트로 자동 초기화
  useEffect(() => {
    if (user) {
      initSiteFromUser(user.site, user.sites, user.role === 'ADMIN');
    }
  }, [user, initSiteFromUser]);

  // 사이트별 담당자/승인자 기본값 불러오기
  useEffect(() => {
    if (site) {
      const savedManager = localStorage.getItem(`educationManager_${site}`);
      const savedApprover = localStorage.getItem(`educationApprover_${site}`);
      if (savedManager) {
        setEducationManager(savedManager);
      } else {
        setEducationManager('');
      }
      if (savedApprover) {
        setEducationApprover(savedApprover);
      } else {
        setEducationApprover('');
      }
    }
  }, [site]);

  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['teams', site],
    queryFn: () => fetchTeams(site),
    enabled: !!site,
  });

  useEffect(() => {
    setSelectedTeam(null);
  }, [site]);

  // 교육 다운로드 다이얼로그가 열릴 때 teamDateMap 초기화
  useEffect(() => {
    if (showEducationDatePicker && teams && teams.length > 0) {
      const initialMap: Record<number, number> = {};
      teams.forEach((team) => {
        initialMap[team.id] = downloadDay; // 기본값으로 현재 선택된 날짜 사용
      });
      setTeamDateMap(initialMap);
    }
  }, [showEducationDatePicker, teams, downloadDay]);

  // 팀장의 경우 해당 팀 자동 선택
  useEffect(() => {
    if (user?.role === 'TEAM_LEADER' && user.teamId && teams && teams.length > 0) {
      const userTeam = teams.find(t => t.id === user.teamId);
      if (userTeam) {
        setSelectedTeam(user.teamId);
      }
    }
  }, [user, teams]);

  const { data: report, isLoading: reportLoading, isError: reportError } = useQuery({
    queryKey: ['monthlyReport', selectedTeam, date.year, date.month],
    queryFn: () => fetchMonthlyReport(selectedTeam, date.year, date.month),
    enabled: !!selectedTeam,
  });

  const { data: educationData } = useQuery<EducationOverviewData>({
    queryKey: ['education-overview'],
    queryFn: fetchEducationOverview,
    enabled: !!(user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM'),
  });

  const { data: attendanceOverview } = useQuery<AttendanceOverviewData | null>({
    queryKey: ['attendance-overview', date.year, date.month, site],
    queryFn: () => fetchAttendanceOverview(date.year, date.month, site),
    enabled: !!site,
  });

  const { data: teamMembers } = useQuery<TeamMember[]>({
    queryKey: ['team-members', selectedTeam],
    queryFn: () => fetchTeamMembers(selectedTeam!),
    enabled: !!selectedTeam,
  });

  // ==================== Approval Mutation ====================

  const approvalMutation = useMutation({
    mutationFn: createApprovalRequest,
    onSuccess: () => {
      toast({
        title: '결재 요청 완료',
        description: '결재 요청이 성공적으로 제출되었습니다. 결재자에게 알림이 발송되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['attendance-overview'] });
      setShowApprovalDialog(false);
      setExecutiveName('');
      setExecutiveSignature('');

      // 1.5초 후 승인 이력 페이지로 이동
      setTimeout(() => {
        setLocation('/approval-history');
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: '결재 요청 실패',
        description: error.response?.data?.message || '결재 요청 중 오류가 발생했습니다.',
        variant: 'destructive'
      });
    },
  });

  // ==================== Computed Values ====================

  // Filtered teams for attendance overview
  const filteredTeams = useMemo(() => {
    if (!attendanceOverview?.teams) return [];

    let filtered = attendanceOverview.teams;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(team =>
        stripSiteSuffix(team.teamName).toLowerCase().includes(query)
      );
    }

    // Apply approval filter
    if (filterNoApproval) {
      filtered = filtered.filter(team => !team.hasApproval);
    }

    // Apply education filter
    if (filterNoEducation) {
      filtered = filtered.filter(team => !team.educationCompleted);
    }

    // Apply issues filter
    if (filterHasIssues) {
      filtered = filtered.filter(team => {
        const dailyStatuses = Object.values(team.dailyStatuses);
        return dailyStatuses.some(status =>
          status.status === 'has-issues' || status.status === 'not-submitted'
        );
      });
    }

    // Sort teams by priority order (current site first)
    return sortTeams(filtered.map(t => ({ ...t, name: t.teamName })), site).map(t => {
      const original = filtered.find(f => f.teamName === t.name);
      return original!;
    });
  }, [attendanceOverview?.teams, searchQuery, filterNoApproval, filterNoEducation, filterHasIssues, site]);

  // 팀원별 교육 통계 (Team education statistics)
  // TeamMember는 userId를 통해 User와 연결되며, User의 교육 진행률을 추적
  // userId가 없는 TeamMember는 교육 통계에서 제외됨
  const teamEducationStats = useMemo(() => {
    if (!educationData || !selectedTeam || !teams || !teamMembers) return null;

    // teamMembers가 배열인지 확인
    if (!Array.isArray(teamMembers)) return null;

    const currentTeam = teams.find(t => t.id === selectedTeam);
    if (!currentTeam) return null;

    const totalCourses = educationData.courses.length;
    const stats = teamMembers.map(member => {
      // TeamMember.userId로 User 조회 (User 계정이 연결된 경우에만 교육 추적 가능)
      if (!member.userId) return null; // userId가 없으면 교육 추적 불가

      const user = educationData.users.find(u => u.id === member.userId);
      if (!user) return null; // User를 찾지 못하면 교육 추적 불가

      // 사용자의 모든 교육 진행률 조회
      const memberProgress = educationData.allProgress.filter(p => p.userId === user.id);
      const completedCourses = memberProgress.filter(p => p.completed).length;
      const inProgressCourses = memberProgress.filter(p => !p.completed && p.progress > 0).length;
      const avgProgress = memberProgress.length > 0
        ? Math.round(memberProgress.reduce((sum, p) => sum + p.progress, 0) / memberProgress.length)
        : 0;

      return {
        userId: user.id,
        userName: user.name || user.username,
        isLeader: currentTeam.leaderId === user.id,
        totalCourses,
        completedCourses,
        inProgressCourses,
        avgProgress,
        status: completedCourses === totalCourses && totalCourses > 0 ? 'completed' :
                inProgressCourses > 0 || completedCourses > 0 ? 'in-progress' : 'not-started'
      };
    }).filter(Boolean); // null 값 제거 (userId가 없거나 User를 찾지 못한 TeamMember)

    return stats;
  }, [educationData, selectedTeam, teams, teamMembers]);

  // Team leader education stat (for single display)
  const teamLeaderEducationStat = useMemo(() => {
    if (!teamEducationStats) return null;
    return teamEducationStats.find(stat => stat?.isLeader) || null;
  }, [teamEducationStats]);

  // Statistics calculations
  const statistics = useMemo(() => {
    if (!attendanceOverview?.teams) return null;

    const totalTeams = attendanceOverview.teams.length;
    const teamsWithApproval = attendanceOverview.teams.filter(t => t.hasApproval).length;
    const teamsWithEducation = attendanceOverview.teams.filter(t => t.educationCompleted).length;

    const totalDays = attendanceOverview.daysInMonth;
    // 주말과 미래 날짜 제외한 평일만 계산
    const weekdaysList = Array.from({ length: totalDays }, (_, i) => i + 1)
      .filter(day => !isWeekend(date.year, date.month, day) && !isFutureDate(date.year, date.month, day));
    const weekdays = weekdaysList.length;

    let totalSubmissions = 0;
    let totalIssues = 0;
    let totalNotSubmitted = 0;

    // 주말과 미래 날짜를 제외하고 계산
    attendanceOverview.teams.forEach(team => {
      weekdaysList.forEach(day => {
        const status = team.dailyStatuses[day]?.status;
        if (status === 'completed') totalSubmissions++;
        else if (status === 'has-issues') totalIssues++;
        else if (status === 'not-submitted') totalNotSubmitted++;
      });
    });

    // 이슈 있는 팀 계산 (주말/미래 제외)
    const teamsWithIssues = attendanceOverview.teams.filter(t => {
      return weekdaysList.some(day => {
        const status = t.dailyStatuses[day]?.status;
        return status === 'has-issues' || status === 'not-submitted';
      });
    }).length;

    return {
      totalTeams,
      teamsWithApproval,
      teamsWithEducation,
      teamsWithIssues,
      approvalRate: totalTeams > 0 ? Math.round((teamsWithApproval / totalTeams) * 100) : 0,
      educationRate: totalTeams > 0 ? Math.round((teamsWithEducation / totalTeams) * 100) : 0,
      totalDays,
      weekdays,
      totalSubmissions,
      totalIssues,
      totalNotSubmitted,
    };
  }, [attendanceOverview?.teams, date.year, date.month]);

  // Problematic items from selected team report
  const problematicItems = useMemo(() => {
    if (!report?.dailyReports) return [];

    const items: any[] = [];
    report.dailyReports.forEach((dailyReport: any) => {
      if (dailyReport.reportDetails) {
        dailyReport.reportDetails.forEach((detail: any) => {
          if (detail.checkState === '△' || detail.checkState === 'X') {
            const templateItem = report.checklistTemplate?.templateItems.find(
              (item: any) => item.id === detail.itemId
            );
            items.push({
              date: new Date(dailyReport.reportDate).toLocaleDateString('ko-KR'),
              reportId: dailyReport.id,
              reportDate: dailyReport.reportDate,
              category: templateItem?.category || '알 수 없음',
              description: templateItem?.description || '알 수 없음',
              checkState: detail.checkState,
              actionDescription: detail.actionDescription || '',
              actionTaken: detail.actionTaken || '',
              attachments: detail.attachments || []
            });
          }
        });
      }
    });

    return items;
  }, [report]);

  // Team-wise statistics for attendance
  const teamStatistics = useMemo(() => {
    if (!attendanceOverview?.teams) return [];

    return attendanceOverview.teams.map(team => {
      const totalDays = attendanceOverview.daysInMonth;
      // 주말과 미래 날짜 제외한 평일만 계산
      const weekdaysList = Array.from({ length: totalDays }, (_, i) => i + 1)
        .filter(day => !isWeekend(date.year, date.month, day) && !isFutureDate(date.year, date.month, day));
      const weekdays = weekdaysList.length;

      let completed = 0;
      let issues = 0;
      let notSubmitted = 0;

      // 주말과 미래 날짜를 제외하고 계산
      weekdaysList.forEach(day => {
        const status = team.dailyStatuses[day]?.status;
        if (status === 'completed') completed++;
        else if (status === 'has-issues') issues++;
        else if (status === 'not-submitted') notSubmitted++;
      });

      const rate = weekdays > 0 ? Math.round((completed / weekdays) * 100) : 0;

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        totalDays,
        weekdays,
        completed,
        issues,
        notSubmitted,
        rate,
        hasApproval: team.hasApproval,
        educationCompleted: team.educationCompleted
      };
    });
  }, [attendanceOverview, date.year, date.month]);

  // ==================== Event Handlers ====================

  const handleExcelDownload = useCallback(async () => {
    if (!selectedTeam) {
      toast({
        title: "오류",
        description: "먼저 팀을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "엑셀 파일 다운로드 중...",
      description: "서버에서 파일을 생성하고 있습니다."
    });

    try {
      const params = new URLSearchParams({
        teamId: String(selectedTeam),
        year: String(date.year),
        month: String(date.month),
        site: site || '',
      });
      const response = await fetch(`/api/tbm/monthly-excel?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const teamName = teams?.find(t => t.id === selectedTeam)?.name || 'Unknown';
      const fileName = `TBM_Report_${stripSiteSuffix(teamName)}_${date.year}_${String(date.month).padStart(2, '0')}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);

      toast({
        title: "성공",
        description: "엑셀 파일이 다운로드되었습니다."
      });
    } catch (error) {
      console.error("Failed to download Excel report:", error);
      toast({
        title: "오류",
        description: "엑셀 파일을 다운로드하는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  }, [selectedTeam, date, site, teams, toast]);

  const handleComprehensiveExcelDownload = useCallback(async () => {
    if (!site) {
      toast({
        title: "오류",
        description: "현장을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setShowDatePickerDialog(true);
  }, [site, toast]);

  const handleConfirmComprehensiveDownload = useCallback(async () => {
    toast({
      title: "종합 엑셀 파일 다운로드 중...",
      description: "모든 팀의 데이터를 수집하고 있습니다. 시간이 걸릴 수 있습니다."
    });

    try {
      const params = new URLSearchParams({
        year: String(downloadYear),
        month: String(downloadMonth),
        site: site || '',
      });
      const response = await fetch(`/api/tbm/comprehensive-excel?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `TBM_Comprehensive_${site}_${downloadYear}_${String(downloadMonth).padStart(2, '0')}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);

      toast({
        title: "성공",
        description: "종합 엑셀 파일이 다운로드되었습니다."
      });
      setShowDatePickerDialog(false);
    } catch (error) {
      console.error("Failed to download comprehensive Excel:", error);
      toast({
        title: "오류",
        description: "종합 엑셀 파일을 다운로드하는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  }, [downloadYear, downloadMonth, site, toast]);

  const handleEducationExcelDownload = useCallback(() => {
    if (!site) {
      toast({
        title: "오류",
        description: "현장을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    // 안전교육 날짜 선택 다이얼로그 열기
    setShowEducationDatePicker(true);
  }, [site, toast]);

  // 날짜 선택 후 서명 다이얼로그 열기
  const handleEducationExcelDownloadConfirm = useCallback(() => {
    if (!site) {
      toast({
        title: "오류",
        description: "현장을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setShowEducationDatePicker(false);
    // 서명 다이얼로그 열기
    setShowEducationSignature(true);
  }, [site, toast]);

  // 서명 완료 후 실제 다운로드 (담당 + 승인 서명 2개)
  const handleEducationSignatureSave = useCallback(async (managerSignature: string, approverSignature: string) => {
    setEducationSignatureData(managerSignature);
    setApproverSignatureData(approverSignature);
    setShowEducationSignature(false);

    // 담당자/승인자 이름을 사이트별로 localStorage에 저장
    if (site && educationManager.trim()) {
      localStorage.setItem(`educationManager_${site}`, educationManager.trim());
    }
    if (site && educationApprover.trim()) {
      localStorage.setItem(`educationApprover_${site}`, educationApprover.trim());
    }

    toast({
      title: "안전교육 현황 다운로드 중...",
      description: "교육 데이터를 수집하고 있습니다."
    });

    try {
      // 팀별 날짜 데이터 준비
      const teamDatesParam = useTeamSpecificDates ? JSON.stringify(teamDateMap) : null;

      const params = new URLSearchParams({
        site: site || '',
        year: String(downloadYear),
        month: String(downloadMonth),
        date: String(downloadDay),
        manager: educationManager,
        approver: educationApprover,
        managerSignature: managerSignature,
        approverSignature: approverSignature,
      });
      if (teamDatesParam) params.append('teamDates', teamDatesParam);

      const response = await fetch(`/api/tbm/safety-education-excel?${params}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `Safety_Education_${site}_${downloadYear}-${String(downloadMonth).padStart(2, '0')}-${String(downloadDay).padStart(2, '0')}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);

      toast({
        title: "성공",
        description: "안전교육 현황이 다운로드되었습니다."
      });
    } catch (error) {
      console.error("Failed to download education Excel:", error);
      toast({
        title: "오류",
        description: "안전교육 현황을 다운로드하는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  }, [site, downloadYear, downloadMonth, downloadDay, educationManager, educationApprover, toast, useTeamSpecificDates, teamDateMap]);

  const handleApprovalRequest = useCallback(() => {
    console.log('[결재 요청] 버튼 클릭됨', { selectedTeam, date });

    if (!selectedTeam) {
      console.log('[결재 요청] 팀이 선택되지 않음');
      toast({
        title: "오류",
        description: "팀을 먼저 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    // 검증: 보고서 존재 여부 확인
    if (!report || !report.dailyReports || report.dailyReports.length === 0) {
      toast({
        title: "보고서 없음",
        description: "제출된 TBM 보고서가 없습니다. 먼저 TBM 일지를 작성해주세요.",
        variant: "destructive"
      });
      return;
    }

    // 검증: 교육 완료 여부 확인
    if (teamLeaderEducationStat && teamLeaderEducationStat.status !== 'completed') {
      toast({
        title: "교육 미완료",
        description: `팀장의 안전교육이 완료되지 않았습니다. (${teamLeaderEducationStat.completedCourses}/${teamLeaderEducationStat.totalCourses}) 모든 교육을 완료한 후 결재 요청하세요.`,
        variant: "destructive"
      });
      return;
    }

    // 경고: 문제 항목이 있는 경우
    if (problematicItems.length > 0) {
      const confirmMessage = `${problematicItems.length}개의 이슈(△/X)가 있습니다.\n\n그래도 결재 요청하시겠습니까?`;
      if (!confirm(confirmMessage)) {
        return;
      }
    }

    console.log('[결재 요청] mutation 실행 중...', {
      teamId: selectedTeam,
      year: date.year,
      month: date.month,
    });

    // 즉시 결재 요청 전송 (Team.approverId 자동 사용)
    approvalMutation.mutate({
      teamId: selectedTeam,
      year: date.year,
      month: date.month,
    });
  }, [selectedTeam, date, approvalMutation, toast, report, teamLeaderEducationStat, problematicItems]);

  const handleClearFilters = useCallback(() => {
    setFilterNoApproval(false);
    setFilterNoEducation(false);
    setFilterHasIssues(false);
    setSearchQuery('');
  }, []);

  // ==================== Render ====================

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8 print-container">
        {/* Top Control Card */}
        <Card className="no-print">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              월별 TBM 보고서
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Site, Team, Month Selection Row */}
              <div className="flex flex-wrap items-center gap-4">
                {user?.role === 'ADMIN' && (
                  <div className="space-y-2">
                    <Label>현장 선택</Label>
                    <Select onValueChange={(value: Site) => setSite(value)} value={site}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="현장 선택" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                        {SITES.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>기간 선택</Label>
                  <Input
                    type="month"
                    value={`${date.year}-${String(date.month).padStart(2, '0')}`}
                    onChange={e => {
                      const [year, month] = e.target.value.split('-');
                      setDate({ year: parseInt(year), month: parseInt(month) });
                    }}
                    className="w-[200px]"
                  />
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={handleExcelDownload}
                  disabled={!report}
                  variant="outline"
                  size="sm"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  팀 엑셀
                </Button>
                <Button
                  onClick={handleApprovalRequest}
                  disabled={
                    !selectedTeam ||
                    approvalMutation.isPending ||
                    !report ||
                    !report.dailyReports ||
                    report.dailyReports.length === 0 ||
                    !!(teamLeaderEducationStat && teamLeaderEducationStat.status !== 'completed')
                  }
                  variant="default"
                  size="sm"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  {approvalMutation.isPending ? '결재 요청 중...' : '결재 요청'}
                </Button>
                <Button
                  onClick={() => setLocation('/approval-history')}
                  variant="outline"
                  size="sm"
                >
                  <History className="h-4 w-4 mr-2" />
                  결재내역
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 관리감독자 서명란 */}
        {report?.monthlyApproval?.approvalRequests?.[0] && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="h-4 w-4" />
                관리감독자 결재 정보
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const approvalRequest = report.monthlyApproval.approvalRequests[0];
                const isApproved = approvalRequest.status === 'APPROVED';
                const isPending = approvalRequest.status === 'PENDING';
                const isRejected = approvalRequest.status === 'REJECTED';

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">결재자</Label>
                        <p className="font-medium">{approvalRequest.approver?.name || approvalRequest.approver?.username || '미지정'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">요청자</Label>
                        <p className="font-medium">{approvalRequest.requester?.name || approvalRequest.requester?.username || '미지정'}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">결재 상태</Label>
                        <div className="flex items-center gap-2 mt-1">
                          {isApproved && (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <Badge variant="default" className="bg-green-600">승인 완료</Badge>
                            </>
                          )}
                          {isPending && (
                            <>
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">승인 대기</Badge>
                            </>
                          )}
                          {isRejected && (
                            <>
                              <XCircle className="h-4 w-4 text-red-600" />
                              <Badge variant="destructive">반려됨</Badge>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isApproved && approvalRequest.approvedAt && (
                      <div className="pt-4 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <Label className="text-sm text-muted-foreground">승인 일시</Label>
                            <p className="font-medium">
                              {new Date(approvalRequest.approvedAt).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {approvalRequest.approverSignature && (
                            <div>
                              <Label className="text-sm text-muted-foreground">결재자 서명</Label>
                              <div className="mt-2 border rounded-md p-2 bg-white inline-block">
                                <img
                                  src={approvalRequest.approverSignature}
                                  alt="결재자 서명"
                                  className="h-20 object-contain"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isRejected && approvalRequest.rejectionReason && (
                      <div className="pt-4 border-t">
                        <Label className="text-sm text-muted-foreground">반려 사유</Label>
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-900">{approvalRequest.rejectionReason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-6">
          <TabsList className={`grid w-full max-w-md ${user?.role === 'ADMIN' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="attendance">출석 현황</TabsTrigger>
            <TabsTrigger value="statistics">통계</TabsTrigger>
            {user?.role === 'ADMIN' && (
              <TabsTrigger value="comprehensive">종합 보고서</TabsTrigger>
            )}
          </TabsList>

          {/* Tab 1: Attendance Overview */}
          <TabsContent value="attendance" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4" />
                  필터 및 검색
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-no-approval"
                      checked={filterNoApproval}
                      onCheckedChange={(checked) => setFilterNoApproval(!!checked)}
                    />
                    <Label htmlFor="filter-no-approval" className="text-sm cursor-pointer">
                      결재 미완료
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-no-education"
                      checked={filterNoEducation}
                      onCheckedChange={(checked) => setFilterNoEducation(!!checked)}
                    />
                    <Label htmlFor="filter-no-education" className="text-sm cursor-pointer">
                      교육 미완료
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="filter-has-issues"
                      checked={filterHasIssues}
                      onCheckedChange={(checked) => setFilterHasIssues(!!checked)}
                    />
                    <Label htmlFor="filter-has-issues" className="text-sm cursor-pointer">
                      출석 이슈 있음
                    </Label>
                  </div>
                  <Button
                    onClick={handleClearFilters}
                    variant="ghost"
                    size="sm"
                  >
                    필터 초기화
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="팀명 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Attendance Overview Table */}
            {attendanceOverview && filteredTeams.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>
                    전체 팀 TBM 출석 현황 ({date.year}년 {date.month}월)
                  </CardTitle>
                  <CardDescription>
                    {filteredTeams.length}개 팀 / 총 {attendanceOverview.teams.length}개 팀
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table className="border-collapse border border-slate-400">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="border border-slate-300 bg-slate-100 sticky left-0 z-10 min-w-[150px]">
                          팀명
                        </TableHead>
                        <TableHead className="border border-slate-300 bg-slate-100 text-center w-16">
                          결재
                        </TableHead>
                        <TableHead className="border border-slate-300 bg-slate-100 text-center w-16">
                          교육
                        </TableHead>
                        {Array.from({ length: attendanceOverview.daysInMonth }, (_, i) => i + 1).map(day => {
                          const nonWorkday = attendanceOverview.nonWorkdays?.[day];
                          const isWknd = nonWorkday?.isWeekend || isWeekend(date.year, date.month, day);
                          const isHoliday = nonWorkday?.isHoliday;

                          let bgClass = 'bg-slate-100';
                          let title = '';
                          if (isHoliday) {
                            bgClass = 'bg-red-100';
                            title = nonWorkday?.holidayName || '공휴일';
                          } else if (isWknd) {
                            bgClass = 'bg-blue-100';
                            title = '주말';
                          }

                          return (
                            <TableHead
                              key={day}
                              className={`border border-slate-300 text-center w-8 p-1 ${bgClass}`}
                              title={title}
                            >
                              {day}
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTeams.map(team => {
                        // 팀의 TBM 완료 여부 확인
                        const hasIncomplete = Array.from({ length: attendanceOverview.daysInMonth }, (_, i) => i + 1).some(day => {
                          const nonWorkday = attendanceOverview.nonWorkdays?.[day];
                          const isWknd = nonWorkday?.isWeekend || isWeekend(date.year, date.month, day);
                          const isHoliday = nonWorkday?.isHoliday;
                          const isFuture = isFutureDate(date.year, date.month, day);

                          // 주말, 공휴일, 미래 날짜는 제외
                          if (isWknd || isHoliday || isFuture) return false;

                          const statusData = team.dailyStatuses[day];
                          const status = statusData?.status;

                          // 미제출인 경우만 미완료로 간주
                          return status === 'not-submitted';
                        });

                        return (
                        <TableRow key={team.teamId}>
                          <TableCell
                            className={`border border-slate-300 font-medium sticky left-0 z-10 cursor-pointer hover:bg-blue-50 transition-colors ${
                              selectedTeam === team.teamId ? 'bg-blue-100' : hasIncomplete ? 'bg-red-100' : 'bg-white'
                            }`}
                            onClick={() => {
                              setSelectedTeam(team.teamId);
                              setTimeout(() => {
                                reportDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }, 100);
                            }}
                            title="클릭하여 팀 선택"
                          >
                            {stripSiteSuffix(team.teamName)}
                          </TableCell>
                          <TableCell className="border border-slate-300 text-center">
                            {team.hasApproval ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                            )}
                          </TableCell>
                          <TableCell className="border border-slate-300 text-center">
                            {team.educationCompleted ? (
                              <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                            ) : (
                              <Clock className="h-4 w-4 text-orange-600 mx-auto" />
                            )}
                          </TableCell>
                          {Array.from({ length: attendanceOverview.daysInMonth }, (_, i) => i + 1).map(day => {
                            const nonWorkday = attendanceOverview.nonWorkdays?.[day];
                            const isWknd = nonWorkday?.isWeekend || isWeekend(date.year, date.month, day);
                            const isHoliday = nonWorkday?.isHoliday;
                            const isFuture = isFutureDate(date.year, date.month, day);

                            if (isFuture) {
                              return (
                                <TableCell
                                  key={day}
                                  className="border border-slate-300 text-center p-1 bg-gray-50 text-gray-400"
                                  title="미래 날짜"
                                >
                                  -
                                </TableCell>
                              );
                            }

                            // 공휴일 표시 (주말보다 우선)
                            if (isHoliday) {
                              return (
                                <TableCell
                                  key={day}
                                  className="border border-slate-300 text-center p-1 bg-red-50 text-red-500"
                                  title={nonWorkday?.holidayName || '공휴일'}
                                >
                                  -
                                </TableCell>
                              );
                            }

                            if (isWknd) {
                              return (
                                <TableCell
                                  key={day}
                                  className="border border-slate-300 text-center p-1 bg-blue-50 text-blue-500"
                                  title="주말"
                                >
                                  -
                                </TableCell>
                              );
                            }

                            const statusData = team.dailyStatuses[day];
                            const status = statusData?.status;
                            const reportId = statusData?.reportId;

                            const bgColor = getStatusColor(status);
                            const symbol = getStatusSymbol(status);
                            const titleText = getStatusText(status);

                            const cellContent = status === 'has-issues' && reportId ? (
                              <a
                                href={`/tbm?reportId=${reportId}`}
                                className="text-yellow-900 hover:underline cursor-pointer font-bold"
                                title="해당 TBM 일지로 이동"
                              >
                                {symbol}
                              </a>
                            ) : (
                              symbol
                            );

                            return (
                              <TableCell
                                key={day}
                                className={`border border-slate-300 text-center p-1 ${bgColor}`}
                                title={titleText}
                              >
                                {cellContent}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex gap-6 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-white border border-slate-300 flex items-center justify-center text-green-900">✓</div>
                      <span>작성완료</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-yellow-200 border border-slate-300 flex items-center justify-center text-yellow-900">△</div>
                      <span>문제점 및 위험예측 사항</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-200 border border-slate-300 flex items-center justify-center text-red-900">✗</div>
                      <span>미작성</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-50 border border-slate-300 flex items-center justify-center text-blue-500">-</div>
                      <span>주말</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-red-50 border border-slate-300 flex items-center justify-center text-red-500">-</div>
                      <span>공휴일</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>결재/교육 완료</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <span>결재 미완료</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600" />
                      <span>교육 미완료</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : attendanceOverview && filteredTeams.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  필터 조건에 맞는 팀이 없습니다.
                </CardContent>
              </Card>
            ) : null}

            {/* Team Detail Report Section - shown when team is selected */}
            {report && selectedTeam && (
              <div ref={reportDetailRef} className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-2xl">TBM 월별 점검 보고서</CardTitle>
                    <div className="flex justify-between items-center pt-2">
                      <p className="text-lg">팀: {stripSiteSuffix(report.teamName)}</p>
                      <p className="text-lg">기간: {report.year}년 {report.month}월</p>
                    </div>
                  </CardHeader>
                </Card>

                {/* Team Leader Education Status */}
                {teamLeaderEducationStat && (
                  <Card>
                    <CardHeader>
                      <CardTitle>팀장 안전교육 이수 현황</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <Table className="border-collapse border border-slate-400">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="border border-slate-300">이름</TableHead>
                            <TableHead className="border border-slate-300 text-center">완료 과정</TableHead>
                            <TableHead className="border border-slate-300 text-center">진행중 과정</TableHead>
                            <TableHead className="border border-slate-300 text-center">평균 진행률</TableHead>
                            <TableHead className="border border-slate-300 text-center">상태</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="border border-slate-300 font-medium">
                              {teamLeaderEducationStat.userName} (팀장)
                            </TableCell>
                            <TableCell className="border border-slate-300 text-center">
                              {teamLeaderEducationStat.completedCourses} / {teamLeaderEducationStat.totalCourses}
                            </TableCell>
                            <TableCell className="border border-slate-300 text-center">
                              {teamLeaderEducationStat.inProgressCourses}
                            </TableCell>
                            <TableCell className="border border-slate-300 text-center">
                              {teamLeaderEducationStat.avgProgress}%
                            </TableCell>
                            <TableCell className="border border-slate-300 text-center">
                              <Badge
                                className={
                                  teamLeaderEducationStat.status === 'completed' ? 'bg-green-500' :
                                  teamLeaderEducationStat.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'
                                }
                              >
                                {teamLeaderEducationStat.status === 'completed' ? '완료' :
                                 teamLeaderEducationStat.status === 'in-progress' ? '진행중' : '미시작'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Monthly Checklist Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>월별 점검 항목</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 overflow-x-auto">
                    <Table className="border-collapse border border-slate-400">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="border border-slate-300">구분</TableHead>
                          <TableHead className="border border-slate-300">점검내용</TableHead>
                          {Array.from({ length: getDaysInMonth(report.year, report.month) }, (_, i) => i + 1).map(day => (
                            <TableHead key={day} className="border border-slate-300 text-center w-5">
                              {day}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.checklistTemplate?.templateItems.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="border border-slate-300 whitespace-nowrap">
                              {item.category}
                            </TableCell>
                            <TableCell className="border border-slate-300 whitespace-nowrap">
                              {item.description}
                            </TableCell>
                            {Array.from({ length: getDaysInMonth(report.year, report.month) }, (_, i) => i + 1).map(day => {
                              const reportForDay = report.dailyReports.find(
                                (r: any) => new Date(r.reportDate).getDate() === day
                              );
                              const detail = reportForDay?.reportDetails?.find(
                                (d: any) => d.itemId === item.id
                              );
                              return (
                                <TableCell key={day} className="border border-slate-300 text-center">
                                  {detail?.checkState || ''}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Problematic Items Detail */}
                {problematicItems.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl text-red-600 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        문제점 및 위험예측 사항 ({problematicItems.length}건)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">날짜</TableHead>
                            <TableHead className="w-[100px]">구분</TableHead>
                            <TableHead>점검항목</TableHead>
                            <TableHead className="w-[80px] text-center">결과</TableHead>
                            <TableHead>위험예측사항</TableHead>
                            <TableHead>조치사항</TableHead>
                            <TableHead className="w-[100px]">첨부</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {problematicItems.map((item, index) => (
                            <TableRow
                              key={index}
                              className={item.checkState === 'X' ? 'bg-red-50' : 'bg-yellow-50'}
                            >
                              <TableCell>
                                <a
                                  href={`/tbm?reportId=${item.reportId}`}
                                  className="text-blue-600 hover:underline cursor-pointer"
                                  title="해당 TBM 일지로 이동"
                                >
                                  {item.date}
                                </a>
                              </TableCell>
                              <TableCell>{item.category}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={item.checkState === 'X' ? 'destructive' : 'secondary'}
                                  className={item.checkState === '△' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                                >
                                  {item.checkState}
                                </Badge>
                              </TableCell>
                              <TableCell className="whitespace-pre-wrap">
                                {item.actionDescription}
                              </TableCell>
                              <TableCell className="whitespace-pre-wrap">
                                {item.actionTaken || '-'}
                              </TableCell>
                              <TableCell>
                                {item.attachments.length > 0 ? (
                                  <div className="flex gap-1 flex-wrap">
                                    {item.attachments.map((att: any, idx: number) => (
                                      <img
                                        key={idx}
                                        src={att.url}
                                        alt={`첨부${idx + 1}`}
                                        className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setEnlargedImage(att.url)}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Tab 2: Statistics */}
          <TabsContent value="statistics" className="space-y-6">
            {statistics ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        총 팀 수
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.totalTeams}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        결재 완료율
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {statistics.approvalRate}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {statistics.teamsWithApproval} / {statistics.totalTeams} 팀
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        교육 완료율
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {statistics.educationRate}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {statistics.teamsWithEducation} / {statistics.totalTeams} 팀
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        이슈 발생 팀
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {statistics.teamsWithIssues}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        총 {statistics.totalTeams} 팀 중
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>출석 통계</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">총 일수</p>
                          <p className="text-xl font-semibold">{statistics.totalDays}일</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">평일</p>
                          <p className="text-xl font-semibold">{statistics.weekdays}일</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">작성 완료</p>
                          <p className="text-xl font-semibold text-green-600">{statistics.totalSubmissions}건</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">문제점 및 위험예측 사항</p>
                          <p className="text-xl font-semibold text-yellow-600">{statistics.totalIssues}건</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">미작성</p>
                          <p className="text-xl font-semibold text-red-600">{statistics.totalNotSubmitted}건</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {teamEducationStats && (
                  <Card>
                    <CardHeader>
                      <CardTitle>
                        팀원 안전교육 현황
                        {selectedTeam && teams && (
                          <span className="text-sm font-normal text-muted-foreground ml-2">
                            ({stripSiteSuffix(teams.find(t => t.id === selectedTeam)?.name || '')})
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table className="border-collapse border border-slate-400">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="border border-slate-300">이름</TableHead>
                              <TableHead className="border border-slate-300 text-center">구분</TableHead>
                              <TableHead className="border border-slate-300 text-center">완료 과정</TableHead>
                              <TableHead className="border border-slate-300 text-center">진행중 과정</TableHead>
                              <TableHead className="border border-slate-300 text-center">평균 진행률</TableHead>
                              <TableHead className="border border-slate-300 text-center">상태</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamEducationStats.map((stat: any) => (
                              <TableRow key={stat.userId}>
                                <TableCell className="border border-slate-300 font-medium">
                                  {stat.userName}
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  {stat.isLeader ? (
                                    <Badge variant="default">팀장</Badge>
                                  ) : (
                                    <Badge variant="outline">팀원</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  {stat.completedCourses} / {stat.totalCourses}
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  {stat.inProgressCourses}
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  {stat.avgProgress}%
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  <Badge
                                    className={
                                      stat.status === 'completed' ? 'bg-green-500' :
                                      stat.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'
                                    }
                                  >
                                    {stat.status === 'completed' ? '완료' :
                                     stat.status === 'in-progress' ? '진행중' : '미시작'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Team-wise Attendance Statistics */}
                {teamStatistics.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>팀별 출석 상세 통계</CardTitle>
                      <CardDescription>
                        각 팀의 출석 현황을 상세하게 분석합니다.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table className="border-collapse border border-slate-400">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="border border-slate-300">팀명</TableHead>
                              <TableHead className="border border-slate-300 text-center">총 일수</TableHead>
                              <TableHead className="border border-slate-300 text-center">평일</TableHead>
                              <TableHead className="border border-slate-300 text-center">작성 완료</TableHead>
                              <TableHead className="border border-slate-300 text-center">문제점 및 위험예측 사항</TableHead>
                              <TableHead className="border border-slate-300 text-center">미작성</TableHead>
                              <TableHead className="border border-slate-300 text-center">출석률</TableHead>
                              <TableHead className="border border-slate-300 text-center">결재</TableHead>
                              <TableHead className="border border-slate-300 text-center">교육</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {teamStatistics.map((stat) => (
                              <TableRow key={stat.teamId}>
                                <TableCell className="border border-slate-300 font-medium">
                                  {stripSiteSuffix(stat.teamName)}
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  {stat.totalDays}일
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  {stat.weekdays}일
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  <span className="text-green-600 font-semibold">{stat.completed}건</span>
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  <span className="text-yellow-600 font-semibold">{stat.issues}건</span>
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  <span className="text-red-600 font-semibold">{stat.notSubmitted}건</span>
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  <Badge
                                    className={
                                      stat.rate >= 90 ? 'bg-green-500' :
                                      stat.rate >= 70 ? 'bg-blue-500' :
                                      stat.rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                    }
                                  >
                                    {stat.rate}%
                                  </Badge>
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  {stat.hasApproval ? (
                                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                                  ) : (
                                    <XCircle className="h-5 w-5 text-red-600 mx-auto" />
                                  )}
                                </TableCell>
                                <TableCell className="border border-slate-300 text-center">
                                  {stat.educationCompleted ? (
                                    <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                                  ) : (
                                    <Clock className="h-5 w-5 text-orange-600 mx-auto" />
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  통계를 표시할 데이터가 없습니다. 현장을 선택하고 기간을 설정해주세요.
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 3: Comprehensive Report - ADMIN Only */}
          {user?.role === 'ADMIN' && (
          <TabsContent value="comprehensive" className="space-y-6">
            {/* Comprehensive Report Action Buttons */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    onClick={handleComprehensiveExcelDownload}
                    disabled={!site}
                    variant="outline"
                    size="sm"
                    id="comprehensive-excel-download"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    TBM 종합 보고서
                  </Button>
                  <Button
                    onClick={handleEducationExcelDownload}
                    disabled={!site}
                    variant="outline"
                    size="sm"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    안전교육 현황 다운로드
                  </Button>
                  <div className="ml-auto text-sm text-muted-foreground">
                    {site ? `선택된 현장: ${site}` : '현장을 선택해주세요'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {reportLoading && (
              <Card>
                <CardContent className="p-8 flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>보고서 데이터를 불러오는 중...</span>
                </CardContent>
              </Card>
            )}

            {reportError && (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-500">데이터를 불러오지 못했습니다.</p>
                </CardContent>
              </Card>
            )}

            {report && (
              <div className="space-y-4" id="report-content">
                {/* TBM 월별 점검 보고서 헤더 - 숨김 처리 */}
                {false && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-2xl">TBM 월별 점검 보고서</CardTitle>
                      <div className="flex justify-between items-center pt-2">
                        <p className="text-lg">팀: {stripSiteSuffix(report.teamName)}</p>
                        <p className="text-lg">기간: {report.year}년 {report.month}월</p>
                      </div>
                    </CardHeader>
                  </Card>
                )}

                {/* Team Leader Education Status */}
                {teamLeaderEducationStat && (
                  <Card>
                    <CardHeader>
                      <CardTitle>팀장 안전교육 이수 현황</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      <Table className="border-collapse border border-slate-400">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="border border-slate-300">이름</TableHead>
                            <TableHead className="border border-slate-300 text-center">완료 과정</TableHead>
                            <TableHead className="border border-slate-300 text-center">진행중 과정</TableHead>
                            <TableHead className="border border-slate-300 text-center">평균 진행률</TableHead>
                            <TableHead className="border border-slate-300 text-center">상태</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell className="border border-slate-300 font-medium">
                              {teamLeaderEducationStat.userName} (팀장)
                            </TableCell>
                            <TableCell className="border border-slate-300 text-center">
                              {teamLeaderEducationStat.completedCourses} / {teamLeaderEducationStat.totalCourses}
                            </TableCell>
                            <TableCell className="border border-slate-300 text-center">
                              {teamLeaderEducationStat.inProgressCourses}
                            </TableCell>
                            <TableCell className="border border-slate-300 text-center">
                              {teamLeaderEducationStat.avgProgress}%
                            </TableCell>
                            <TableCell className="border border-slate-300 text-center">
                              <Badge
                                className={
                                  teamLeaderEducationStat.status === 'completed' ? 'bg-green-500' :
                                  teamLeaderEducationStat.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'
                                }
                              >
                                {teamLeaderEducationStat.status === 'completed' ? '완료' :
                                 teamLeaderEducationStat.status === 'in-progress' ? '진행중' : '미시작'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}

                {/* Monthly Checklist Table - 종합 보고서에서는 숨김 */}
                {false && (
                  <Card>
                    <CardHeader>
                      <CardTitle>월별 점검 항목</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 overflow-x-auto">
                      <Table className="border-collapse border border-slate-400">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="border border-slate-300">구분</TableHead>
                            <TableHead className="border border-slate-300">점검내용</TableHead>
                            {Array.from({ length: getDaysInMonth(report.year, report.month) }, (_, i) => i + 1).map(day => (
                              <TableHead key={day} className="border border-slate-300 text-center w-5">
                                {day}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.checklistTemplate?.templateItems.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="border border-slate-300 whitespace-nowrap">
                                {item.category}
                              </TableCell>
                              <TableCell className="border border-slate-300 whitespace-nowrap">
                                {item.description}
                              </TableCell>
                              {Array.from({ length: getDaysInMonth(report.year, report.month) }, (_, i) => i + 1).map(day => {
                                const reportForDay = report.dailyReports.find(
                                  (r: any) => new Date(r.reportDate).getDate() === day
                                );
                                const detail = reportForDay?.reportDetails?.find(
                                  (d: any) => d.itemId === item.id
                                );
                                return (
                                  <TableCell key={day} className="border border-slate-300 text-center">
                                    {detail?.checkState || ''}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>
          )}
        </Tabs>

        {/* Comprehensive Excel Download Date Picker Dialog */}
        <Dialog open={showDatePickerDialog} onOpenChange={setShowDatePickerDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>종합 엑셀 다운로드</DialogTitle>
              <DialogDescription>
                다운로드할 기간을 선택해주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="download-year">년도</Label>
                <Select
                  value={downloadYear.toString()}
                  onValueChange={(v) => setDownloadYear(parseInt(v))}
                >
                  <SelectTrigger id="download-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                    {getInspectionYearRange().map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="download-month">월</Label>
                <Select
                  value={downloadMonth.toString()}
                  onValueChange={(v) => setDownloadMonth(parseInt(v))}
                >
                  <SelectTrigger id="download-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString()}>
                        {month}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button onClick={handleConfirmComprehensiveDownload}>
                다운로드
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Education Excel Download Date Picker Dialog */}
        <Dialog open={showEducationDatePicker} onOpenChange={setShowEducationDatePicker}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>안전교육 현황 다운로드</DialogTitle>
              <DialogDescription>
                다운로드할 날짜와 담당자 정보를 입력해주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edu-download-year">년도</Label>
                  <Select
                    value={downloadYear.toString()}
                    onValueChange={(v) => setDownloadYear(parseInt(v))}
                  >
                    <SelectTrigger id="edu-download-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                      {getInspectionYearRange().map(year => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}년
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edu-download-month">월</Label>
                  <Select
                    value={downloadMonth.toString()}
                    onValueChange={(v) => setDownloadMonth(parseInt(v))}
                  >
                    <SelectTrigger id="edu-download-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <SelectItem key={month} value={month.toString()}>
                          {month}월
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edu-download-day">기본 날짜</Label>
                  <Select
                    value={downloadDay.toString()}
                    onValueChange={(v) => {
                      const newDay = parseInt(v);
                      setDownloadDay(newDay);
                      // 팀별 날짜가 비활성화된 경우 모든 팀의 날짜를 기본 날짜로 동기화
                      if (!useTeamSpecificDates && teams) {
                        const newMap: Record<number, number> = {};
                        teams.forEach((team) => {
                          newMap[team.id] = newDay;
                        });
                        setTeamDateMap(newMap);
                      }
                    }}
                  >
                    <SelectTrigger id="edu-download-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                      {Array.from({ length: getDaysInMonth(downloadYear, downloadMonth) }, (_, i) => i + 1).map(day => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}일
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edu-manager">담당자</Label>
                  <Input
                    id="edu-manager"
                    placeholder="담당자 이름 입력"
                    value={educationManager}
                    onChange={(e) => setEducationManager(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edu-approver">승인자</Label>
                  <Input
                    id="edu-approver"
                    placeholder="승인자 이름 입력"
                    value={educationApprover}
                    onChange={(e) => setEducationApprover(e.target.value)}
                  />
                </div>
              </div>

              {/* 팀별 날짜 선택 옵션 */}
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox
                    id="use-team-dates"
                    checked={useTeamSpecificDates}
                    onCheckedChange={(checked) => {
                      setUseTeamSpecificDates(!!checked);
                      // 비활성화 시 모든 팀의 날짜를 기본 날짜로 리셋
                      if (!checked && teams) {
                        const newMap: Record<number, number> = {};
                        teams.forEach((team) => {
                          newMap[team.id] = downloadDay;
                        });
                        setTeamDateMap(newMap);
                      }
                    }}
                  />
                  <Label htmlFor="use-team-dates" className="text-sm cursor-pointer font-medium">
                    팀별로 다른 날짜 사용
                  </Label>
                </div>

                {useTeamSpecificDates && teams && teams.length > 0 && (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto border rounded-md p-3 bg-gray-50">
                    <div className="text-xs text-muted-foreground mb-2">
                      각 팀의 교육 날짜를 개별적으로 설정합니다.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sortTeams(teams, site).map((team) => (
                        <div key={team.id} className="flex items-center gap-2 bg-white p-2 rounded border">
                          <span className="text-sm flex-1 truncate" title={stripSiteSuffix(team.name)}>
                            {stripSiteSuffix(team.name)}
                          </span>
                          <Select
                            value={(teamDateMap[team.id] || downloadDay).toString()}
                            onValueChange={(v) => {
                              setTeamDateMap(prev => ({
                                ...prev,
                                [team.id]: parseInt(v)
                              }));
                            }}
                          >
                            <SelectTrigger className="w-[80px] h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] overflow-y-auto scrollbar-visible">
                              {Array.from({ length: getDaysInMonth(downloadYear, downloadMonth) }, (_, i) => i + 1).map(day => (
                                <SelectItem key={day} value={day.toString()}>
                                  {day}일
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button onClick={handleEducationExcelDownloadConfirm}>
                다음 (서명)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Education Dual Signature Dialog (담당 + 승인) */}
        <DualSignatureDialog
          isOpen={showEducationSignature}
          onClose={() => setShowEducationSignature(false)}
          onSave={handleEducationSignatureSave}
          managerName={educationManager || '담당자'}
          approverName={educationApprover || '승인자'}
        />

        {/* Image Viewer Dialog */}
        <Dialog open={!!enlargedImage} onOpenChange={(open) => !open && setEnlargedImage(null)}>
          <DialogContent className="max-w-4xl w-full p-0">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                onClick={() => setEnlargedImage(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              <img
                src={enlargedImage || ''}
                alt="확대된 이미지"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
