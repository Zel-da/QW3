import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminPageLayout, PageHeader } from '@/components/admin';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { User, Role, Team } from '@shared/schema';
import { SITES, ROLE_LABELS } from '@/lib/constants';
import { Search, Users, Database, Download, Trash2, AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface DbStats {
  current: {
    users: number;
    teams: number;
    factories: number;
    equipment: number;
    courses: number;
    tbmReports: number;
    tbmChecklistItems: number;
    tbmSignatures: number;
    safetyInspections: number;
    safetyInspectionItems: number;
    emailLogs: number;
    sessions: number;
    notices: number;
  };
  oldData: {
    tbmReportsOver1Year: number;
    tbmChecklistItemsOver1Year: number;
    tbmSignaturesOver1Year: number;
    inspectionsOver1Year: number;
    inspectionItemsOver1Year: number;
    emailLogsOver6Months: number;
    expiredSessions: number;
    totalCleanupTarget: number;
  };
}

const fetchDbStats = async (): Promise<DbStats> => {
  const res = await fetch('/api/admin/db-stats');
  if (!res.ok) throw new Error('Failed to fetch DB stats');
  return res.json();
};

const fetchUsers = async (): Promise<User[]> => {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

const fetchTeams = async (): Promise<Team[]> => {
  const res = await fetch('/api/teams');
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
};

const updateUserRole = async ({ userId, role }: { userId: string; role: Role }) => {
  const res = await fetch(`/api/users/${userId}/role`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error('Failed to update user role');
  return res.json();
};

const updateUserSite = async ({ userId, site }: { userId: string; site: string }) => {
  const res = await fetch(`/api/users/${userId}/site`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site }),
  });
  if (!res.ok) throw new Error('Failed to update user site');
  return res.json();
};

const deleteUser = async (userId: string) => {
  const res = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
};

export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'username' | 'role'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]> ({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]> ({
    queryKey: ['teams'],
    queryFn: fetchTeams,
  });

  // DB 통계 쿼리
  const { data: dbStats, isLoading: dbStatsLoading, refetch: refetchDbStats } = useQuery<DbStats>({
    queryKey: ['dbStats'],
    queryFn: fetchDbStats,
  });

  // 백업 상태
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  // 백업 다운로드 핸들러
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' });
      if (!res.ok) throw new Error('Backup failed');

      // 파일 다운로드
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: '성공', description: '백업 파일이 다운로드되었습니다.' });
    } catch (error) {
      toast({ title: '오류', description: '백업에 실패했습니다.', variant: 'destructive' });
    } finally {
      setIsBackingUp(false);
    }
  };

  // 데이터 정리 핸들러
  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const res = await fetch('/api/admin/cleanup', { method: 'POST' });
      if (!res.ok) throw new Error('Cleanup failed');

      const result = await res.json();
      toast({ title: '성공', description: result.message });
      refetchDbStats();
    } catch (error) {
      toast({ title: '오류', description: '데이터 정리에 실패했습니다.', variant: 'destructive' });
    } finally {
      setIsCleaning(false);
    }
  };

  const roleMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      toast({ title: '성공', description: '사용자 역할이 변경되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] }); // TeamManagementPage 캐시도 갱신
    }
  });

  const siteMutation = useMutation({
    mutationFn: updateUserSite,
    onSuccess: () => {
      toast({ title: '성공', description: '사용자의 소속 현장이 변경되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] }); // TeamManagementPage 캐시도 갱신
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      toast({ title: '성공', description: '사용자가 삭제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const handleRoleChange = (userId: string, role: Role) => {
    roleMutation.mutate({ userId, role });
  };

  const handleSiteChange = (userId: string, site: string) => {
    siteMutation.mutate({ userId, site });
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (currentUser?.id === userId) {
      toast({ title: "오류", description: "현재 로그인된 관리자 계정은 삭제할 수 없습니다.", variant: "destructive" });
      return;
    }
    if (window.confirm(`${username} 사용자를 정말로 삭제하시겠습니까?`)) {
      deleteMutation.mutate(userId);
    }
  };

  const filteredUsers = users.filter(user => {
    // 팀 필터
    const teamMatch = selectedTeamId === 'all' || (user.teamId ? user.teamId === parseInt(selectedTeamId) : false);

    // 검색 필터 (이름 또는 사용자명)
    const searchMatch = searchTerm === '' ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());

    return teamMatch && searchMatch;
  });

  // Sort filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === 'name') {
      return (a.name || '').localeCompare(b.name || '', 'ko-KR');
    } else if (sortBy === 'username') {
      return a.username.localeCompare(b.username);
    } else {
      // role
      return (ROLE_LABELS[a.role] || '').localeCompare(ROLE_LABELS[b.role] || '', 'ko-KR');
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = sortedUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTeamId, searchTerm, sortBy]);

  if (usersLoading || teamsLoading) {
    return (
      <AdminPageLayout>
        <PageHeader
          title="사용자 관리"
          description="사용자 계정 생성, 수정, 삭제 및 권한 관리"
          icon={<Users className="h-6 w-6" />}
          backUrl="/admin-dashboard"
          backText="대시보드"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="h-10 w-64 bg-muted rounded animate-pulse" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="h-12 w-1/4 bg-muted rounded animate-pulse" />
                    <div className="h-12 w-1/4 bg-muted rounded animate-pulse" />
                    <div className="h-12 w-1/4 bg-muted rounded animate-pulse" />
                    <div className="h-12 w-1/4 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <PageHeader
        title="사용자 관리"
        description="사용자 계정 생성, 수정, 삭제 및 권한 관리"
        icon={<Users className="h-6 w-6" />}
        backUrl="/admin-dashboard"
        backText="대시보드"
      />
      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름 또는 사용자명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="팀별로 보기" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                  <SelectItem value="all">모든 팀</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'name' | 'username' | 'role')}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="정렬 기준" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                  <SelectItem value="name">이름순</SelectItem>
                  <SelectItem value="username">사용자명순</SelectItem>
                  <SelectItem value="role">권한순</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {sortedUsers.length === 0 ? (
              <EmptyState
                icon={Users}
                title={searchTerm ? "검색 결과가 없습니다" : "사용자가 없습니다"}
                description={searchTerm
                  ? `"${searchTerm}"에 대한 검색 결과가 없습니다. 다른 검색어를 입력해보세요.`
                  : "등록된 사용자가 없습니다."
                }
              />
            ) : (
              <>
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>사용자명</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>현장</TableHead>
                    <TableHead>권한</TableHead>
                    <TableHead className="text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>
                        <Select value={user.site || ''} onValueChange={(newSite) => handleSiteChange(user.id, newSite)}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="현장 선택" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                            {SITES.map(site => (
                              <SelectItem key={site} value={site}>{site}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={user.role} onValueChange={(newRole) => handleRoleChange(user.id, newRole as Role)}>
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="역할 선택" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                            {Object.entries(ROLE_LABELS).map(([role, label]) => (
                              <SelectItem key={role} value={role}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          disabled={currentUser?.id === user.id}
                        >
                          삭제
                        </Button>
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

      {/* 데이터베이스 관리 섹션 */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">데이터베이스 관리</h2>
          </div>

          {dbStatsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-6 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : dbStats ? (
            <div className="space-y-6">
              {/* 현재 DB 상태 */}
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">현재 데이터 현황</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dbStats.current.users}</div>
                    <div className="text-sm text-muted-foreground">사용자</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dbStats.current.tbmReports}</div>
                    <div className="text-sm text-muted-foreground">TBM 보고서</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dbStats.current.safetyInspections}</div>
                    <div className="text-sm text-muted-foreground">안전점검</div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{dbStats.current.emailLogs}</div>
                    <div className="text-sm text-muted-foreground">이메일 로그</div>
                  </div>
                </div>
              </div>

              {/* 정리 대상 데이터 */}
              {dbStats.oldData.totalCleanupTarget > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span className="font-medium text-amber-800 dark:text-amber-200">정리 가능한 오래된 데이터</span>
                  </div>
                  <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                    {dbStats.oldData.tbmChecklistItemsOver1Year > 0 && (
                      <div>TBM 체크리스트 (1년 이상): {dbStats.oldData.tbmChecklistItemsOver1Year}건</div>
                    )}
                    {dbStats.oldData.tbmSignaturesOver1Year > 0 && (
                      <div>TBM 서명 (1년 이상): {dbStats.oldData.tbmSignaturesOver1Year}건</div>
                    )}
                    {dbStats.oldData.inspectionItemsOver1Year > 0 && (
                      <div>안전점검 항목 (1년 이상): {dbStats.oldData.inspectionItemsOver1Year}건</div>
                    )}
                    {dbStats.oldData.emailLogsOver6Months > 0 && (
                      <div>이메일 로그 (6개월 이상): {dbStats.oldData.emailLogsOver6Months}건</div>
                    )}
                    {dbStats.oldData.expiredSessions > 0 && (
                      <div>만료된 세션: {dbStats.oldData.expiredSessions}건</div>
                    )}
                    <div className="font-medium mt-2">총 {dbStats.oldData.totalCleanupTarget}건 정리 가능</div>
                  </div>
                </div>
              )}

              {/* 버튼 영역 */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isBackingUp ? '백업 중...' : '전체 백업 다운로드'}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={isCleaning || dbStats.oldData.totalCleanupTarget === 0}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isCleaning ? '정리 중...' : '오래된 데이터 정리'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>데이터 정리 확인</AlertDialogTitle>
                      <AlertDialogDescription>
                        다음 데이터가 영구적으로 삭제됩니다:
                        <ul className="mt-2 list-disc list-inside space-y-1">
                          <li>1년 이상 된 TBM 체크리스트/서명</li>
                          <li>1년 이상 된 안전점검 항목</li>
                          <li>6개월 이상 된 이메일 로그</li>
                          <li>만료된 세션</li>
                        </ul>
                        <p className="mt-3 font-medium text-destructive">
                          총 {dbStats.oldData.totalCleanupTarget}건의 데이터가 삭제됩니다.
                        </p>
                        <p className="mt-2">삭제 전 반드시 백업을 먼저 받으세요!</p>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>취소</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        정리 실행
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <p className="text-xs text-muted-foreground">
                * 백업 파일은 JSON 형식으로 다운로드됩니다. 6개월마다 정기 백업을 권장합니다.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}