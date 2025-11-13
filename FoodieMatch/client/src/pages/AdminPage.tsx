import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { User, Role, Team } from '@shared/schema';
import { SITES, ROLE_LABELS } from '@/lib/constants';
import { Search, Users, Mail, Send, CheckCircle, XCircle } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

  // Email test states
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [emailConfig, setEmailConfig] = useState<any>(null);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [testEmailType, setTestEmailType] = useState<'education' | 'tbm' | 'inspection' | 'custom'>('education');
  const [customSubject, setCustomSubject] = useState('');
  const [customHtml, setCustomHtml] = useState('');
  const [isSending, setIsSending] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]> ({
    queryKey: ['users'],
    queryFn: fetchUsers,
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

  // Email test functions
  const verifyEmail = async () => {
    try {
      const res = await fetch('/api/email/verify');
      const data = await res.json();
      setEmailVerified(data.success);
      setEmailConfig(data.config);
      toast({
        title: data.success ? '성공' : '실패',
        description: data.message,
        variant: data.success ? 'default' : 'destructive'
      });
    } catch (error) {
      toast({ title: '오류', description: '이메일 서비스 확인 중 오류 발생', variant: 'destructive' });
    }
  };

  const sendTestEmail = async () => {
    if (!testEmailTo) {
      toast({ title: '오류', description: '수신자 이메일을 입력하세요', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      let endpoint = '';
      let body: any = { to: testEmailTo };

      if (testEmailType === 'custom') {
        if (!customSubject || !customHtml) {
          toast({ title: '오류', description: '제목과 내용을 모두 입력하세요', variant: 'destructive' });
          setIsSending(false);
          return;
        }
        endpoint = '/api/email/test/custom';
        body = { ...body, subject: customSubject, html: customHtml };
      } else {
        endpoint = `/api/email/test/${testEmailType}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: '성공', description: '테스트 이메일이 전송되었습니다.' });
      } else {
        toast({ title: '실패', description: data.message || '이메일 전송 실패', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '오류', description: '이메일 전송 중 오류 발생', variant: 'destructive' });
    } finally {
      setIsSending(false);
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
      <div>
        <Header />
        <main className="container mx-auto p-4 lg:p-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">사용자 관리</CardTitle>
            </CardHeader>
            <CardContent>
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
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="users">사용자 관리</TabsTrigger>
            <TabsTrigger value="email">이메일 테스트</TabsTrigger>
          </TabsList>

          {/* 사용자 관리 탭 */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">사용자 관리</CardTitle>
              </CardHeader>
              <CardContent>
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
                <SelectContent>
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
                <SelectContent>
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
                          <SelectContent>
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
                          <SelectContent>
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
          </TabsContent>

          {/* 이메일 테스트 탭 */}
          <TabsContent value="email">
            <div className="space-y-6">
              {/* 이메일 서비스 확인 */}
              <Card>
                <CardHeader>
                  <CardTitle>이메일 서비스 확인</CardTitle>
                  <CardDescription>SMTP 설정을 확인하고 이메일 전송 가능 여부를 테스트합니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={verifyEmail} className="w-full sm:w-auto">
                    <Mail className="mr-2 h-4 w-4" />
                    이메일 서비스 확인
                  </Button>

                  {emailVerified !== null && (
                    <div className={`flex items-center gap-2 p-4 rounded-lg ${emailVerified ? 'bg-green-50' : 'bg-red-50'}`}>
                      {emailVerified ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={emailVerified ? 'text-green-800' : 'text-red-800'}>
                        {emailVerified ? '이메일 서비스 연결 성공' : '이메일 서비스 연결 실패'}
                      </span>
                    </div>
                  )}

                  {emailConfig && (
                    <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
                      <div><strong>SMTP 호스트:</strong> {emailConfig.host}</div>
                      <div><strong>포트:</strong> {emailConfig.port}</div>
                      <div><strong>사용자:</strong> {emailConfig.user}</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 테스트 이메일 전송 */}
              <Card>
                <CardHeader>
                  <CardTitle>테스트 이메일 전송</CardTitle>
                  <CardDescription>실제 이메일 템플릿을 테스트해볼 수 있습니다</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="testEmailTo">수신자 이메일</Label>
                    <Input
                      id="testEmailTo"
                      type="email"
                      placeholder="test@example.com"
                      value={testEmailTo}
                      onChange={(e) => setTestEmailTo(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="testEmailType">이메일 유형</Label>
                    <Select value={testEmailType} onValueChange={(value: any) => setTestEmailType(value)}>
                      <SelectTrigger id="testEmailType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="education">안전교육 알림</SelectItem>
                        <SelectItem value="tbm">TBM 작성 알림</SelectItem>
                        <SelectItem value="inspection">안전점검 알림</SelectItem>
                        <SelectItem value="custom">커스텀 이메일</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {testEmailType === 'custom' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="customSubject">제목</Label>
                        <Input
                          id="customSubject"
                          placeholder="이메일 제목"
                          value={customSubject}
                          onChange={(e) => setCustomSubject(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="customHtml">내용 (HTML)</Label>
                        <Textarea
                          id="customHtml"
                          placeholder="<h1>제목</h1><p>내용...</p>"
                          value={customHtml}
                          onChange={(e) => setCustomHtml(e.target.value)}
                          rows={10}
                          className="font-mono text-sm"
                        />
                      </div>
                    </>
                  )}

                  <Button onClick={sendTestEmail} disabled={isSending} className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    {isSending ? '전송 중...' : '테스트 이메일 전송'}
                  </Button>
                </CardContent>
              </Card>

              {/* 이메일 템플릿 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle>이메일 템플릿 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <h3 className="font-semibold">📚 안전교육 알림</h3>
                    <p className="text-muted-foreground">사용자에게 미이수 교육을 알리는 이메일입니다. 교육명과 마감일이 포함됩니다.</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">📋 TBM 작성 알림</h3>
                    <p className="text-muted-foreground">팀장에게 TBM 일지 작성을 요청하는 이메일입니다. 팀명과 날짜가 포함됩니다.</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">🔍 안전점검 알림</h3>
                    <p className="text-muted-foreground">관리자에게 월별 안전점검을 요청하는 이메일입니다. 점검 기한이 포함됩니다.</p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">✉️ 커스텀 이메일</h3>
                    <p className="text-muted-foreground">HTML을 직접 작성하여 원하는 내용의 이메일을 전송할 수 있습니다.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}