import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminPageLayout, PageHeader } from '@/components/admin';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { User, Role, Team } from '@shared/schema';
import { SITES, ROLE_LABELS } from '@/lib/constants';
import { Search, Users, UserCheck, UserX, Key, Copy, Clock } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { apiRequest } from '@/lib/queryClient';

const fetchUsers = async (): Promise<User[]> => {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
};

const fetchPendingUsers = async (): Promise<User[]> => {
  const res = await fetch('/api/users/pending');
  if (!res.ok) throw new Error('Failed to fetch pending users');
  return res.json();
};

const fetchTeams = async (): Promise<Team[]> => {
  const res = await fetch('/api/teams');
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
};

const updateUserRole = async ({ userId, role }: { userId: string; role: Role }) => {
  const res = await apiRequest('PUT', `/api/users/${userId}/role`, { role });
  return res.json();
};

const updateUserSite = async ({ userId, site }: { userId: string; site: string }) => {
  const res = await apiRequest('PUT', `/api/users/${userId}/site`, { site });
  return res.json();
};

const deleteUser = async (userId: string) => {
  const res = await apiRequest('DELETE', `/api/users/${userId}`);
  return res.json();
};

const approveUser = async ({ userId, role, teamId, site }: { userId: string; role: Role; teamId?: number; site?: string }) => {
  const res = await apiRequest('PUT', `/api/users/${userId}/approve`, { role, teamId, site });
  return res.json();
};

const rejectUser = async (userId: string) => {
  const res = await apiRequest('DELETE', `/api/users/${userId}/reject`);
  return res.json();
};

const resetPassword = async (userId: string) => {
  const res = await apiRequest('PUT', `/api/users/${userId}/reset-password`, {});
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
  const [activeTab, setActiveTab] = useState('all');
  const ITEMS_PER_PAGE = 10;

  // 승인 다이얼로그 상태
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedUserForApproval, setSelectedUserForApproval] = useState<User | null>(null);
  const [approvalRole, setApprovalRole] = useState<Role>('TEAM_LEADER');
  const [approvalTeamId, setApprovalTeamId] = useState<string>('');
  const [approvalSite, setApprovalSite] = useState<string>('');

  // 비밀번호 리셋 다이얼로그 상태
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<string>('');
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<User | null>(null);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]> ({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  const { data: pendingUsers = [], isLoading: pendingLoading } = useQuery<User[]>({
    queryKey: ['pendingUsers'],
    queryFn: fetchPendingUsers,
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]> ({
    queryKey: ['teams'],
    queryFn: fetchTeams,
  });

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

  const approveMutation = useMutation({
    mutationFn: approveUser,
    onSuccess: () => {
      toast({ title: '성공', description: '사용자가 승인되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
      setApproveDialogOpen(false);
      setSelectedUserForApproval(null);
    },
    onError: (error: Error) => {
      toast({ title: '오류', description: error.message, variant: 'destructive' });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: rejectUser,
    onSuccess: () => {
      toast({ title: '성공', description: '가입 요청이 거절되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
    },
    onError: (error: Error) => {
      toast({ title: '오류', description: error.message, variant: 'destructive' });
    }
  });

  const passwordResetMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: (data) => {
      setTempPassword(data.tempPassword);
      toast({ title: '성공', description: '임시 비밀번호가 생성되었습니다.' });
    },
    onError: (error: Error) => {
      toast({ title: '오류', description: error.message, variant: 'destructive' });
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

  const openApproveDialog = (user: User) => {
    setSelectedUserForApproval(user);
    setApprovalRole('TEAM_LEADER');
    setApprovalTeamId('');
    setApprovalSite('');
    setApproveDialogOpen(true);
  };

  const handleApprove = () => {
    if (!selectedUserForApproval) return;
    approveMutation.mutate({
      userId: selectedUserForApproval.id,
      role: approvalRole,
      teamId: approvalTeamId ? parseInt(approvalTeamId, 10) : undefined,
      site: approvalSite || undefined
    });
  };

  const handleReject = (userId: string, username: string) => {
    if (window.confirm(`${username}님의 가입 요청을 정말로 거절하시겠습니까?\n계정이 삭제됩니다.`)) {
      rejectMutation.mutate(userId);
    }
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUserForPassword(user);
    setTempPassword('');
    setPasswordDialogOpen(true);
  };

  const handlePasswordReset = () => {
    if (!selectedUserForPassword) return;
    passwordResetMutation.mutate(selectedUserForPassword.id);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '복사됨', description: '클립보드에 복사되었습니다.' });
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <Users className="h-4 w-4" />
            전체 사용자
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            승인 대기
            {pendingUsers.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingUsers.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 승인 대기 탭 */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                승인 대기 사용자
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : pendingUsers.length === 0 ? (
                <EmptyState
                  icon={UserCheck}
                  title="승인 대기 중인 사용자가 없습니다"
                  description="모든 가입 요청이 처리되었습니다."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>사용자명</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>가입일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => openApproveDialog(user)}
                              className="gap-1"
                            >
                              <UserCheck className="h-4 w-4" />
                              승인
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReject(user.id, user.name || user.username)}
                              className="gap-1"
                            >
                              <UserX className="h-4 w-4" />
                              거절
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 전체 사용자 탭 */}
        <TabsContent value="all">
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
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPasswordDialog(user)}
                                title="비밀번호 초기화"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUser(user.id, user.username)}
                                disabled={currentUser?.id === user.id}
                              >
                                삭제
                              </Button>
                            </div>
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
        </TabsContent>
      </Tabs>

      {/* 승인 다이얼로그 */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 승인</DialogTitle>
            <DialogDescription>
              {selectedUserForApproval?.name || selectedUserForApproval?.username}님의 가입을 승인하고 역할을 지정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">역할 선택</label>
              <Select value={approvalRole} onValueChange={(value) => setApprovalRole(value as Role)}>
                <SelectTrigger>
                  <SelectValue placeholder="역할 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS)
                    .filter(([role]) => role !== 'PENDING')
                    .map(([role, label]) => (
                      <SelectItem key={role} value={role}>{label}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">현장 선택</label>
              <Select value={approvalSite} onValueChange={setApprovalSite}>
                <SelectTrigger>
                  <SelectValue placeholder="현장 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {SITES.map(site => (
                    <SelectItem key={site} value={site}>{site}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">팀 선택</label>
              <Select value={approvalTeamId} onValueChange={setApprovalTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="팀 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? '처리 중...' : '승인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 리셋 다이얼로그 */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>비밀번호 초기화</DialogTitle>
            <DialogDescription>
              {selectedUserForPassword?.name || selectedUserForPassword?.username}님의 비밀번호를 초기화합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {tempPassword ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  임시 비밀번호가 생성되었습니다. 사용자에게 전달해주세요.
                </p>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <code className="flex-1 font-mono text-lg">{tempPassword}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(tempPassword)}
                    title="복사"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  사용자는 로그인 후 비밀번호를 변경하도록 안내해주세요.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                임시 비밀번호가 생성되며, 사용자에게 전달해야 합니다.
              </p>
            )}
          </div>
          <DialogFooter>
            {tempPassword ? (
              <Button onClick={() => setPasswordDialogOpen(false)}>
                확인
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                  취소
                </Button>
                <Button onClick={handlePasswordReset} disabled={passwordResetMutation.isPending}>
                  {passwordResetMutation.isPending ? '처리 중...' : '비밀번호 초기화'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}