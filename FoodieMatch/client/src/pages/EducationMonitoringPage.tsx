import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Search, Users as UsersIcon, BookOpen, TrendingUp, AlertCircle, Eye } from 'lucide-react';
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
  const ITEMS_PER_PAGE = 10;

  // Query education overview data
  const { data, isLoading } = useQuery<EducationOverviewData>({
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
      <div>
        <Header />
        <main className="container mx-auto p-4 lg:p-8">
          <LoadingSpinner size="lg" text="교육 현황을 불러오는 중..." className="py-16" />
        </main>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'ADMIN') {
    return (
      <div>
        <Header />
        <main className="container mx-auto p-4 lg:p-8">
          <EmptyState
            icon={AlertCircle}
            title="접근 권한이 없습니다"
            description="이 페이지는 관리자만 접근할 수 있습니다."
          />
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">교육 현황 모니터링</h1>
          <p className="text-muted-foreground">전체 사용자의 안전교육 진행 상황을 확인하고 관리합니다.</p>
        </div>

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
            <CardDescription>각 교육 과정의 전체 진행 상황입니다.</CardDescription>
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
                    <TableRow key={stat.courseId}>
                      <TableCell className="font-medium">{stat.courseTitle}</TableCell>
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

        {/* User Statistics with Filters */}
        <Card>
          <CardHeader>
            <CardTitle>사용자별 학습 현황</CardTitle>
            <CardDescription>개별 사용자의 교육 진행 상황을 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름 또는 팀으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              {currentUser.role === 'ADMIN' && (
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
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="상태 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="completed">완료</SelectItem>
                  <SelectItem value="in-progress">진행중</SelectItem>
                  <SelectItem value="not-started">미시작</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User Table */}
            {filteredUserStats.length === 0 ? (
              <EmptyState
                icon={UsersIcon}
                title="사용자가 없습니다"
                description={searchTerm || selectedSite !== '전체' || selectedTeam !== 'all' || statusFilter !== 'all'
                  ? "검색 조건에 맞는 사용자가 없습니다."
                  : "등록된 사용자가 없습니다."}
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>팀</TableHead>
                      <TableHead className="text-center">완료</TableHead>
                      <TableHead className="text-center">진행중</TableHead>
                      <TableHead className="text-center">미시작</TableHead>
                      <TableHead className="text-center">평균 진행률</TableHead>
                      <TableHead className="text-center">상태</TableHead>
                      <TableHead className="text-center">최근 활동</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUserStats.map((stat) => (
                      <TableRow key={stat.userId}>
                        <TableCell className="font-medium">{stat.userName}</TableCell>
                        <TableCell>{stat.teamName || '-'}</TableCell>
                        <TableCell className="text-center">{stat.completedCourses} / {stat.totalCourses}</TableCell>
                        <TableCell className="text-center">{stat.inProgressCourses}</TableCell>
                        <TableCell className="text-center">{stat.notStartedCourses}</TableCell>
                        <TableCell className="text-center">{stat.avgProgress}%</TableCell>
                        <TableCell className="text-center">{getStatusBadge(stat)}</TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {stat.lastActivity
                            ? new Date(stat.lastActivity).toLocaleDateString('ko-KR')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setCurrentPage(page)}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
