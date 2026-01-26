import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminPageLayout, PageHeader } from '@/components/admin';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Search, Users as UsersIcon, BookOpen, TrendingUp, AlertCircle, Eye, GraduationCap } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import type { User, Team, Course, UserProgress, UserAssessment } from '@shared/schema';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { SiteSelector } from '@/components/SiteSelector';
import { useSite } from '@/hooks/use-site';

interface EducationOverviewData {
  users: (User & { team?: Team })[];
  courses: Course[];
  allProgress: UserProgress[];
  allAssessments: UserAssessment[];
}

interface UserStatistics {
  userId: string;
  userName: string;
  userRole: string;
  site?: string;
  teamName?: string;
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  notStartedCourses: number;
  avgProgress: number;
  lastActivity?: Date;
}

const fetchEducationOverview = async (): Promise<EducationOverviewData> => {
  const res = await fetch('/api/admin/education-overview');
  if (!res.ok) throw new Error('Failed to fetch education overview');
  return res.json();
};

export default function EducationMonitoringPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { site: selectedSite } = useSite();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress' | 'not-started'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10;

  // Query education overview data
  const { data, isLoading, isError: overviewError, refetch: refetchOverview } = useQuery<EducationOverviewData>({
    queryKey: ['education-overview'],
    queryFn: fetchEducationOverview,
    enabled: !!currentUser && currentUser.role === 'ADMIN',
  });

  // Calculate user statistics
  const userStatistics: UserStatistics[] = React.useMemo(() => {
    if (!data) return [];

    return data.users.map(user => {
      const userProgress = data.allProgress.filter(p => p.userId === user.id);
      const totalCourses = data.courses.length;
      const completedCourses = userProgress.filter(p => p.completed).length;
      const inProgressCourses = userProgress.filter(p => !p.completed && p.progress > 0).length;
      const notStartedCourses = totalCourses - completedCourses - inProgressCourses;

      const avgProgress = userProgress.length > 0
        ? userProgress.reduce((sum, p) => sum + p.progress, 0) / userProgress.length
        : 0;

      const lastActivity = userProgress.length > 0
        ? new Date(Math.max(...userProgress.map(p => p.lastAccessed ? new Date(p.lastAccessed).getTime() : 0)))
        : undefined;

      return {
        userId: user.id,
        userName: user.name || user.username,
        userRole: user.role,
        site: user.site || undefined,
        teamName: user.team?.name,
        totalCourses,
        completedCourses,
        inProgressCourses,
        notStartedCourses,
        avgProgress: Math.round(avgProgress),
        lastActivity: lastActivity && lastActivity.getTime() > 0 ? lastActivity : undefined,
      };
    });
  }, [data]);

  // Calculate course statistics
  const courseStatistics = React.useMemo(() => {
    if (!data) return [];

    return data.courses.map(course => {
      const courseProgress = data.allProgress.filter(p => p.courseId === course.id);
      const totalUsers = data.users.length;
      const completedUsers = courseProgress.filter(p => p.completed).length;
      const inProgressUsers = courseProgress.filter(p => !p.completed && p.progress > 0).length;
      const notStartedUsers = totalUsers - completedUsers - inProgressUsers;

      const avgProgress = courseProgress.length > 0
        ? courseProgress.reduce((sum, p) => sum + p.progress, 0) / courseProgress.length
        : 0;

      return {
        courseId: course.id,
        courseTitle: course.title,
        totalUsers,
        completedUsers,
        inProgressUsers,
        notStartedUsers,
        avgProgress: Math.round(avgProgress),
        completionRate: totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0,
      };
    });
  }, [data]);

  // Calculate team statistics (라인별 통계)
  const teamStatistics = React.useMemo(() => {
    if (!data) return [];

    // Group users by team
    const teamMap = new Map<string, User[]>();
    data.users.forEach(user => {
      const teamName = user.team?.name || '팀 미지정';
      if (!teamMap.has(teamName)) {
        teamMap.set(teamName, []);
      }
      teamMap.get(teamName)!.push(user);
    });

    // Calculate statistics for each team
    return Array.from(teamMap.entries()).map(([teamName, teamUsers]) => {
      const teamUserIds = teamUsers.map(u => u.id);
      const teamUserStats = userStatistics.filter(s => teamUserIds.includes(s.userId));

      const totalMembers = teamUsers.length;
      const totalCourses = data.courses.length;
      const completedMembers = teamUserStats.filter(u => u.completedCourses === totalCourses && totalCourses > 0).length;
      const inProgressMembers = teamUserStats.filter(u => u.inProgressCourses > 0 || (u.completedCourses > 0 && u.completedCourses < totalCourses)).length;
      const notStartedMembers = teamUserStats.filter(u => u.completedCourses === 0 && u.inProgressCourses === 0).length;

      const avgProgress = teamUserStats.length > 0
        ? teamUserStats.reduce((sum, u) => sum + u.avgProgress, 0) / teamUserStats.length
        : 0;

      const completionRate = totalMembers > 0 ? Math.round((completedMembers / totalMembers) * 100) : 0;

      return {
        teamName,
        totalMembers,
        completedMembers,
        inProgressMembers,
        notStartedMembers,
        avgProgress: Math.round(avgProgress),
        completionRate,
      };
    }).sort((a, b) => b.completionRate - a.completionRate); // Sort by completion rate descending
  }, [data, userStatistics]);

  // Overall statistics
  const overallStats = React.useMemo(() => {
    if (!data) return { total: 0, completed: 0, inProgress: 0, notStarted: 0 };

    const total = data.users.length;
    const completed = userStatistics.filter(u => u.completedCourses === u.totalCourses && u.totalCourses > 0).length;
    const inProgress = userStatistics.filter(u => u.inProgressCourses > 0 || (u.completedCourses > 0 && u.completedCourses < u.totalCourses)).length;
    const notStarted = userStatistics.filter(u => u.completedCourses === 0 && u.inProgressCourses === 0).length;

    return { total, completed, inProgress, notStarted };
  }, [data, userStatistics]);

  // Get unique sites and teams for filtering
  const sites = React.useMemo(() => {
    if (!data) return [];
    const uniqueSites = Array.from(new Set(data.users.map(u => u.site).filter(Boolean)));
    return uniqueSites.sort();
  }, [data]);

  const teams = React.useMemo(() => {
    if (!data) return [];
    const uniqueTeams = Array.from(new Set(data.users.map(u => u.team?.name).filter(Boolean)));
    return uniqueTeams.sort();
  }, [data]);

  // 선택된 교육의 사용자별 수강 현황
  const selectedCourseUserStatus = React.useMemo(() => {
    if (!data || !selectedCourseId) return null;

    const course = data.courses.find(c => c.id === selectedCourseId);
    if (!course) return null;

    const usersWithStatus = data.users.map(user => {
      const progress = data.allProgress.find(p => p.userId === user.id && p.courseId === selectedCourseId);
      const assessment = data.allAssessments.find(a => a.userId === user.id && a.courseId === selectedCourseId);

      let status: 'completed' | 'in-progress' | 'not-started' = 'not-started';
      let progressPercent = 0;

      if (progress) {
        progressPercent = progress.progress;
        if (progress.completed) {
          status = 'completed';
        } else if (progress.progress > 0) {
          status = 'in-progress';
        }
      }

      return {
        userId: user.id,
        userName: user.name || user.username,
        teamName: user.team?.name || '-',
        site: user.site,
        status,
        progress: progressPercent,
        assessmentPassed: assessment?.passed || false,
        assessmentScore: assessment?.score,
        lastAccessed: progress?.lastAccessed ? new Date(progress.lastAccessed) : null,
      };
    });

    // 현장 필터 적용
    let filtered = usersWithStatus;
    if (selectedSite !== '전체') {
      filtered = filtered.filter(u => u.site === selectedSite);
    }

    // 팀 필터 적용
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(u => u.teamName === selectedTeam);
    }

    // 검색 필터 적용
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.teamName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const completed = filtered.filter(u => u.status === 'completed');
    const inProgress = filtered.filter(u => u.status === 'in-progress');
    const notStarted = filtered.filter(u => u.status === 'not-started');

    return {
      course,
      completed,
      inProgress,
      notStarted,
      total: filtered.length,
    };
  }, [data, selectedCourseId, selectedSite, selectedTeam, searchTerm]);

  // Filter user statistics
  const filteredUserStats = React.useMemo(() => {
    let filtered = [...userStatistics];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.teamName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Site filter
    if (selectedSite !== '전체') {
      filtered = filtered.filter(u => u.site === selectedSite);
    }

    // Team filter
    if (selectedTeam !== 'all') {
      filtered = filtered.filter(u => u.teamName === selectedTeam);
    }

    // Status filter
    if (statusFilter === 'completed') {
      filtered = filtered.filter(u => u.completedCourses === u.totalCourses && u.totalCourses > 0);
    } else if (statusFilter === 'in-progress') {
      filtered = filtered.filter(u => u.inProgressCourses > 0 || (u.completedCourses > 0 && u.completedCourses < u.totalCourses));
    } else if (statusFilter === 'not-started') {
      filtered = filtered.filter(u => u.completedCourses === 0 && u.inProgressCourses === 0);
    }

    return filtered;
  }, [userStatistics, searchTerm, selectedSite, selectedTeam, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUserStats.length / ITEMS_PER_PAGE);
  const paginatedUserStats = filteredUserStats.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedSite, selectedTeam, statusFilter]);

  const getStatusBadge = (stats: UserStatistics) => {
    if (stats.completedCourses === stats.totalCourses && stats.totalCourses > 0) {
      return <Badge className="bg-green-500">완료</Badge>;
    } else if (stats.inProgressCourses > 0 || stats.completedCourses > 0) {
      return <Badge className="bg-blue-500">진행중</Badge>;
    } else {
      return <Badge variant="outline">미시작</Badge>;
    }
  };

  if (authLoading || isLoading) {
    return (
      <AdminPageLayout>
        <PageHeader
          title="교육 현황 모니터링"
          description="전체 사용자의 안전교육 진행 상황을 확인하고 관리합니다."
          icon={<GraduationCap className="h-6 w-6" />}
          backUrl="/admin-dashboard"
          backText="대시보드"
        />
        <LoadingSpinner size="lg" text="교육 현황을 불러오는 중..." className="py-16" />
      </AdminPageLayout>
    );
  }

  if (overviewError) {
    return (
      <AdminPageLayout>
        <PageHeader
          title="교육 현황 모니터링"
          description="전체 사용자의 안전교육 진행 상황을 확인하고 관리합니다."
          icon={<GraduationCap className="h-6 w-6" />}
          backUrl="/admin-dashboard"
          backText="대시보드"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h2 className="text-lg font-semibold mb-2">교육 현황을 불러올 수 없습니다</h2>
              <p className="text-muted-foreground mb-4">네트워크 연결을 확인하고 다시 시도해주세요.</p>
              <Button onClick={() => refetchOverview()} variant="outline">다시 시도</Button>
            </div>
          </CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <AdminPageLayout>
        <EmptyState
          icon={AlertCircle}
          title="접근 권한이 없습니다"
          description="이 페이지는 관리자만 접근할 수 있습니다."
        />
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <PageHeader
        title="교육 현황 모니터링"
        description="전체 사용자의 안전교육 진행 상황을 확인하고 관리합니다."
        icon={<GraduationCap className="h-6 w-6" />}
        backUrl="/admin-dashboard"
        backText="대시보드"
      />

      {/* Overall Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 사용자</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <UsersIcon className="h-8 w-8 text-blue-500 mr-3" />
                <span className="text-3xl font-bold">{overallStats.total}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">전체 완료</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-500 mr-3" />
                <span className="text-3xl font-bold">{overallStats.completed}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">진행 중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-blue-500 mr-3" />
                <span className="text-3xl font-bold">{overallStats.inProgress}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">미시작</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-orange-500 mr-3" />
                <span className="text-3xl font-bold">{overallStats.notStarted}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Statistics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>과정별 수강 현황</CardTitle>
            <CardDescription>교육을 클릭하면 해당 교육의 수강자 목록을 확인할 수 있습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {courseStatistics.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="등록된 교육 과정이 없습니다"
                description="교육 과정을 추가하면 여기에 표시됩니다."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>과정명</TableHead>
                    <TableHead className="text-center">완료</TableHead>
                    <TableHead className="text-center">진행중</TableHead>
                    <TableHead className="text-center">미시작</TableHead>
                    <TableHead className="text-center">평균 진행률</TableHead>
                    <TableHead className="text-center">완료율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courseStatistics.map((stat) => (
                    <TableRow
                      key={stat.courseId}
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedCourseId === stat.courseId ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                      onClick={() => setSelectedCourseId(selectedCourseId === stat.courseId ? null : stat.courseId)}
                    >
                      <TableCell className="font-medium">
                        {stat.courseTitle}
                        {selectedCourseId === stat.courseId && <span className="ml-2 text-blue-600 text-xs">(선택됨)</span>}
                      </TableCell>
                      <TableCell className="text-center">{stat.completedUsers} / {stat.totalUsers}</TableCell>
                      <TableCell className="text-center">{stat.inProgressUsers}</TableCell>
                      <TableCell className="text-center">{stat.notStartedUsers}</TableCell>
                      <TableCell className="text-center">{stat.avgProgress}%</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={stat.completionRate >= 80 ? "default" : stat.completionRate >= 50 ? "secondary" : "outline"}>
                          {stat.completionRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 선택된 교육의 수강자 목록 */}
        {selectedCourseUserStatus && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    {selectedCourseUserStatus.course.title} - 수강자 현황
                  </CardTitle>
                  <CardDescription>
                    총 {selectedCourseUserStatus.total}명 중 완료 {selectedCourseUserStatus.completed.length}명, 진행중 {selectedCourseUserStatus.inProgress.length}명, 미시작 {selectedCourseUserStatus.notStarted.length}명
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedCourseId(null)}>
                  닫기
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* 필터 */}
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="이름 또는 팀으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {currentUser?.role === 'ADMIN' && (
                  <SiteSelector />
                )}
                {teams.length > 0 && (
                  <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="팀 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 팀</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team} value={team!}>{team}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* 완료 */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge className="bg-green-500">완료</Badge>
                    <span className="text-sm text-muted-foreground">({selectedCourseUserStatus.completed.length}명)</span>
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedCourseUserStatus.completed.length === 0 ? (
                      <p className="text-sm text-muted-foreground">완료한 사용자가 없습니다.</p>
                    ) : (
                      selectedCourseUserStatus.completed.map(user => (
                        <div key={user.userId} className="flex justify-between items-center p-2 bg-green-50 rounded text-sm">
                          <div>
                            <span className="font-medium">{user.userName}</span>
                            <span className="text-muted-foreground ml-2">({user.teamName})</span>
                          </div>
                          {user.assessmentPassed && (
                            <Badge variant="outline" className="text-xs">평가통과</Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 진행중 */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge className="bg-blue-500">진행중</Badge>
                    <span className="text-sm text-muted-foreground">({selectedCourseUserStatus.inProgress.length}명)</span>
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedCourseUserStatus.inProgress.length === 0 ? (
                      <p className="text-sm text-muted-foreground">진행중인 사용자가 없습니다.</p>
                    ) : (
                      selectedCourseUserStatus.inProgress.map(user => (
                        <div key={user.userId} className="flex justify-between items-center p-2 bg-blue-50 rounded text-sm">
                          <div>
                            <span className="font-medium">{user.userName}</span>
                            <span className="text-muted-foreground ml-2">({user.teamName})</span>
                          </div>
                          <span className="text-xs text-blue-600">{user.progress}%</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 미시작 */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge variant="outline">미시작</Badge>
                    <span className="text-sm text-muted-foreground">({selectedCourseUserStatus.notStarted.length}명)</span>
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedCourseUserStatus.notStarted.length === 0 ? (
                      <p className="text-sm text-muted-foreground">미시작 사용자가 없습니다.</p>
                    ) : (
                      selectedCourseUserStatus.notStarted.map(user => (
                        <div key={user.userId} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                          <div>
                            <span className="font-medium">{user.userName}</span>
                            <span className="text-muted-foreground ml-2">({user.teamName})</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Team Statistics (라인별 수강 현황) */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>라인별 수강 현황</CardTitle>
            <CardDescription>각 라인(팀)별 교육 진행 상황을 비교합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {teamStatistics.length === 0 ? (
              <EmptyState
                icon={UsersIcon}
                title="팀 정보가 없습니다"
                description="팀을 추가하면 여기에 표시됩니다."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>팀명</TableHead>
                    <TableHead className="text-center">총 인원</TableHead>
                    <TableHead className="text-center">완료</TableHead>
                    <TableHead className="text-center">진행중</TableHead>
                    <TableHead className="text-center">미시작</TableHead>
                    <TableHead className="text-center">평균 진행률</TableHead>
                    <TableHead className="text-center">완료율</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamStatistics.map((stat) => (
                    <TableRow key={stat.teamName}>
                      <TableCell className="font-medium">{stat.teamName}</TableCell>
                      <TableCell className="text-center">{stat.totalMembers}</TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-500">{stat.completedMembers}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-blue-500">{stat.inProgressMembers}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{stat.notStartedMembers}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2">
                          <Progress value={stat.avgProgress} className="h-2 w-20" />
                          <span className="text-sm font-medium">{stat.avgProgress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            stat.completionRate >= 80 ? "bg-green-600" :
                            stat.completionRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                          }
                        >
                          {stat.completionRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </AdminPageLayout>
  );
}
