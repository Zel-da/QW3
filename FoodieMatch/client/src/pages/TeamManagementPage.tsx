import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Search, Users as UsersIcon } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import type { User, Team } from '@shared/schema';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

const fetchAllTeams = async (): Promise<Team[]> => {
  const res = await fetch('/api/teams');
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
};

const fetchTeams = async (site: string): Promise<Team[]> => {
  const res = await fetch(`/api/teams?site=${site}`);
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
};

const fetchTeamData = async (teamId: number) => {
  const res = await fetch(`/api/teams/${teamId}`); // Assuming an endpoint to get team details including leader
  if (!res.ok) throw new Error('Failed to fetch team data');
  return res.json();
};

const fetchAllUsers = async (): Promise<User[]> => {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to fetch all users');
  return res.json();
};

const fetchTeamMembers = async (teamId: number) => {
  const res = await fetch(`/api/teams/${teamId}/team-members`);
  if (!res.ok) throw new Error('Failed to fetch team members');
  return res.json();
};

const addTeamMember = async ({ teamId, name, position }: { teamId: number; name: string; position?: string }) => {
  const res = await fetch(`/api/teams/${teamId}/team-members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, position }),
  });
  if (!res.ok) throw new Error('Failed to add team member');
  return res.json();
};

const deleteTeamMember = async ({ teamId, memberId }: { teamId: number; memberId: string }) => {
  await fetch(`/api/teams/${teamId}/team-members/${memberId}`, { method: 'DELETE' });
};

const addUserToTeam = async ({ teamId, userId }: { teamId: number; userId: string }) => {
  const res = await fetch(`/api/teams/${teamId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Failed to add user');
  return res.json();
};

const removeUserFromTeam = async ({ teamId, userId }: { teamId: number; userId: string }) => {
  await fetch(`/api/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
};

const setTeamLeader = async ({ teamId, userId }: { teamId: number; userId: string }) => {
  const res = await fetch(`/api/teams/${teamId}/leader`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) throw new Error('Failed to set team leader');
  return res.json();
};

export default function TeamManagementPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPosition, setNewMemberPosition] = useState('');
  const ITEMS_PER_PAGE = 10;

  // Set initial team selection
  useEffect(() => {
    if (currentUser?.role === 'TEAM_LEADER' && currentUser.teamId) {
      setSelectedTeamId(currentUser.teamId);
    }
  }, [currentUser]);

  // Queries
  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['teams', currentUser?.role === 'ADMIN' ? 'all' : currentUser?.site],
    queryFn: () => currentUser?.role === 'ADMIN' ? fetchAllTeams() : fetchTeams(currentUser!.site!),
    enabled: !!currentUser,
  });

  const { data: teamData, isLoading: teamDataLoading } = useQuery<Team & { members: User[] }>({
    queryKey: ['teamData', selectedTeamId],
    queryFn: () => fetchTeamData(selectedTeamId!),
    enabled: !!selectedTeamId,
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['allUsers'],
    queryFn: fetchAllUsers,
    enabled: currentUser?.role === 'ADMIN' || currentUser?.role === 'TEAM_LEADER',
  });

  const { data: teamMembers = [], isLoading: teamMembersLoading } = useQuery<any[]>({
    queryKey: ['teamMembers', selectedTeamId],
    queryFn: () => fetchTeamMembers(selectedTeamId!),
    enabled: !!selectedTeamId,
  });

  // Mutations
  const addMutation = useMutation({ mutationFn: addUserToTeam, 
    onSuccess: () => {
      toast({ title: '성공', description: '사용자가 팀에 추가되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['teamData', selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
      setSelectedUser(null);
    }
  });

  const removeMutation = useMutation({ mutationFn: removeUserFromTeam, 
    onSuccess: () => {
      toast({ title: '성공', description: '사용자가 팀에서 삭제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['teamData', selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ['allUsers'] });
    }
  });

  const leaderMutation = useMutation({ mutationFn: setTeamLeader,
    onSuccess: () => {
      toast({ title: '성공', description: '팀장이 지정되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['teamData', selectedTeamId] });
    }
  });

  const addMemberMutation = useMutation({ mutationFn: addTeamMember,
    onSuccess: () => {
      toast({ title: '성공', description: '팀원이 추가되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['teamMembers', selectedTeamId] });
      setNewMemberName('');
      setNewMemberPosition('');
    },
    onError: (error: any) => {
      console.error('팀원 추가 에러:', error);
      toast({
        title: '오류',
        description: error.response?.data?.message || error.message || '팀원 추가에 실패했습니다.',
        variant: 'destructive'
      });
    }
  });

  const deleteMemberMutation = useMutation({ mutationFn: deleteTeamMember,
    onSuccess: () => {
      toast({ title: '성공', description: '팀원이 삭제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['teamMembers', selectedTeamId] });
    }
  });

  // Handlers
  const handleAddUser = () => {
    if (selectedUser && selectedTeamId) {
      addMutation.mutate({ teamId: selectedTeamId, userId: selectedUser });
    }
  };

  const handleRemoveUser = (userId: string) => {
    if (selectedTeamId) {
      removeMutation.mutate({ teamId: selectedTeamId, userId });
    }
  };

  const handleSetLeader = (userId: string) => {
    if (selectedTeamId) {
      leaderMutation.mutate({ teamId: selectedTeamId, userId });
    }
  };

  const handleAddMember = () => {
    if (newMemberName.trim() && selectedTeamId) {
      addMemberMutation.mutate({ teamId: selectedTeamId, name: newMemberName.trim(), position: newMemberPosition.trim() || undefined });
    }
  };

  const handleDeleteMember = (memberId: string) => {
    if (selectedTeamId) {
      deleteMemberMutation.mutate({ teamId: selectedTeamId, memberId });
    }
  };

  // Render Logic
  const unassignedUsers = allUsers.filter(u => !u.teamId);
  const currentLeader = teamData?.members.find(m => m.id === teamData.leaderId);

  // Filter team members based on search
  const filteredMembers = teamData?.members.filter(member => {
    const searchMatch = searchTerm === '' ||
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.username.toLowerCase().includes(searchTerm.toLowerCase());
    return searchMatch;
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>팀 관리</CardTitle>
            <CardDescription>관리할 팀을 선택하세요.</CardDescription>
          </CardHeader>
          <CardContent>
            {currentUser?.role === 'ADMIN' ? (
              <Select onValueChange={(val) => setSelectedTeamId(Number(val))}>
                <SelectTrigger>
                  <SelectValue placeholder="팀을 선택하세요..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p>{teamData?.name || '당신의 팀'}</p>
            )}
          </CardContent>
        </Card>

        {selectedTeamId && (
          <div className="grid gap-8 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>팀원 목록</CardTitle>
                {currentLeader && <CardDescription>현재 팀장: {currentLeader.name}</CardDescription>}
              </CardHeader>
              <CardContent>
                {teamDataLoading ? <LoadingSpinner size="md" text="팀원 정보를 불러오는 중..." className="py-8" /> : (
                  <>
                    {teamData && teamData.members.length > 0 && (
                      <div className="mb-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="이름 또는 아이디로 검색..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    )}
                    {!teamData || teamData.members.length === 0 ? (
                      <EmptyState
                        icon={UsersIcon}
                        title="팀원이 없습니다"
                        description="오른쪽 카드에서 팀원을 추가하세요."
                      />
                    ) : filteredMembers.length === 0 ? (
                      <EmptyState
                        icon={UsersIcon}
                        title="검색 결과가 없습니다"
                        description={`"${searchTerm}"에 대한 검색 결과가 없습니다.`}
                      />
                    ) : (
                      <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>아이디</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMembers.map((member) => (
                        <TableRow key={member.id} className={member.id === teamData.leaderId ? 'bg-primary/10' : ''}>
                          <TableCell>{member.name}</TableCell>
                          <TableCell>{member.username}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleSetLeader(member.id)} disabled={leaderMutation.isPending || member.id === teamData.leaderId}>
                              팀장 지정
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleRemoveUser(member.id)} disabled={removeMutation.isPending}>
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
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>팀원 추가</CardTitle>
                <CardDescription>팀에 소속되지 않은 사용자를 추가합니다.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {usersLoading ? <LoadingSpinner size="md" text="사용자 목록을 불러오는 중..." className="py-8" /> : (
                  <>
                    <Select onValueChange={setSelectedUser}>
                      <SelectTrigger>
                        <SelectValue placeholder="사용자를 선택하세요..." />
                      </SelectTrigger>
                      <SelectContent>
                        {unassignedUsers.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddUser} disabled={!selectedUser || addMutation.isPending}>
                      {addMutation.isPending ? '추가 중...' : '팀에 추가'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 계정 없는 팀원 관리 */}
        {selectedTeamId && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>계정 없는 팀원 관리</CardTitle>
              <CardDescription>TBM 서명만 하는 팀원을 관리합니다 (로그인 불필요)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-8 md:grid-cols-2">
                {/* 팀원 목록 */}
                <div>
                  <h3 className="font-semibold mb-4">등록된 팀원</h3>
                  {teamMembersLoading ? (
                    <LoadingSpinner size="md" text="팀원 목록을 불러오는 중..." className="py-8" />
                  ) : teamMembers.length === 0 ? (
                    <EmptyState
                      icon={UsersIcon}
                      title="등록된 팀원이 없습니다"
                      description="오른쪽에서 팀원을 추가하세요."
                    />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>이름</TableHead>
                          <TableHead>직책</TableHead>
                          <TableHead className="text-right">작업</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamMembers.filter(m => m.isActive).map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>{member.name}</TableCell>
                            <TableCell>{member.position || '-'}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteMember(member.id)}
                                disabled={deleteMemberMutation.isPending}
                              >
                                삭제
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* 팀원 추가 폼 */}
                <div>
                  <h3 className="font-semibold mb-4">새 팀원 추가</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="memberName">이름 *</Label>
                      <Input
                        id="memberName"
                        placeholder="팀원 이름"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="memberPosition">직책 (선택)</Label>
                      <Input
                        id="memberPosition"
                        placeholder="예: 반장, 작업자 등"
                        value={newMemberPosition}
                        onChange={(e) => setNewMemberPosition(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleAddMember}
                      disabled={!newMemberName.trim() || addMemberMutation.isPending}
                      className="w-full"
                    >
                      {addMemberMutation.isPending ? '추가 중...' : '팀원 추가'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}