import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { User, Role, Team } from '@shared/schema';
import { SITES, ROLE_LABELS } from '@/lib/constants';
import { Search, Users } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

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

  const roleMutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      toast({ title: '성공', description: '사용자 역할이 변경되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const siteMutation = useMutation({
    mutationFn: updateUserSite,
    onSuccess: () => {
      toast({ title: '성공', description: '사용자의 소속 현장이 변경되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
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
      </main>
    </div>
  );
}