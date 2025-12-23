import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminPageLayout, PageHeader } from '@/components/admin';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Search, Users as UsersIcon, Building2 } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import type { User, Team } from '@shared/schema';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { apiRequest } from '@/lib/queryClient';

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
  const res = await apiRequest('POST', `/api/teams/${teamId}/team-members`, { name, position });
  return res.json();
};

const deleteTeamMember = async ({ teamId, memberId }: { teamId: number; memberId: string }) => {
  await apiRequest('DELETE', `/api/teams/${teamId}/team-members/${memberId}`);
};

const createTeam = async ({ name, site }: { name: string; site: string }) => {
  const res = await apiRequest('POST', '/api/teams', { name, site });
  return res.json();
};

const createTeamsBulk = async ({ site, teamNames }: { site: string; teamNames: string[] }) => {
  const res = await apiRequest('POST', '/api/teams/bulk', { site, teamNames });
  return res.json();
};

const updateTeam = async ({ teamId, name, site }: { teamId: number; name?: string; site?: string }) => {
  const res = await apiRequest('PUT', `/api/teams/${teamId}`, { name, site });
  return res.json();
};

const deleteTeam = async (teamId: number) => {
  await apiRequest('DELETE', `/api/teams/${teamId}`);
};

const addUserToTeam = async ({ teamId, userId }: { teamId: number; userId: string }) => {
  const res = await apiRequest('POST', `/api/teams/${teamId}/members`, { userId });
  return res.json();
};

const removeUserFromTeam = async ({ teamId, userId }: { teamId: number; userId: string }) => {
  await apiRequest('DELETE', `/api/teams/${teamId}/members/${userId}`);
};

const setTeamLeader = async ({ teamId, userId }: { teamId: number; userId: string }) => {
  const res = await apiRequest('PUT', `/api/teams/${teamId}/leader`, { userId });
  return res.json();
};

const setTeamApprover = async ({ teamId, userId }: { teamId: number; userId: string | null }) => {
  const res = await apiRequest('PUT', `/api/teams/${teamId}/approver`, { userId });
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

  // Team CRUD states
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamSite, setNewTeamSite] = useState<string>('아산');
  const [bulkTeamsText, setBulkTeamsText] = useState('');
  const [bulkTeamsSite, setBulkTeamsSite] = useState<string>('화성');
  const [isEditingTeam, setIsEditingTeam] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamSite, setEditTeamSite] = useState('');

  // Team selection filter
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('아산');

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
    staleTime: 5 * 60 * 1000, // 5분 캐시 (Neon Compute 절약)
  });

  const { data: allUsers = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['allUsers'],
    queryFn: fetchAllUsers,
    enabled: currentUser?.role === 'ADMIN' || currentUser?.role === 'TEAM_LEADER',
    staleTime: 5 * 60 * 1000, // 5분 캐시 (Neon Compute 절약)
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

  const approverMutation = useMutation({ mutationFn: setTeamApprover,
    onSuccess: () => {
      toast({ title: '성공', description: '결재자가 지정되었습니다.' });
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

  // Team CRUD mutations
  const createTeamMutation = useMutation({ mutationFn: createTeam,
    onSuccess: () => {
      toast({ title: '성공', description: '팀이 생성되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setNewTeamName('');
      setNewTeamSite('아산');
    },
    onError: (error: any) => {
      toast({
        title: '오류',
        description: error.message || '팀 생성에 실패했습니다.',
        variant: 'destructive'
      });
    }
  });

  const createTeamsBulkMutation = useMutation({ mutationFn: createTeamsBulk,
    onSuccess: (data) => {
      toast({ title: '성공', description: data.message || '팀들이 생성되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setBulkTeamsText('');
    },
    onError: (error: any) => {
      toast({
        title: '오류',
        description: error.message || '팀 대량 생성에 실패했습니다.',
        variant: 'destructive'
      });
    }
  });

  const updateTeamMutation = useMutation({ mutationFn: updateTeam,
    onSuccess: () => {
      toast({ title: '성공', description: '팀 정보가 수정되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['teamData', selectedTeamId] });
      setIsEditingTeam(false);
    },
    onError: (error: any) => {
      toast({
        title: '오류',
        description: error.message || '팀 정보 수정에 실패했습니다.',
        variant: 'destructive'
      });
    }
  });

  const deleteTeamMutation = useMutation({ mutationFn: deleteTeam,
    onSuccess: () => {
      toast({ title: '성공', description: '팀이 삭제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      setSelectedTeamId(null);
    },
    onError: (error: any) => {
      toast({
        title: '오류',
        description: error.message || '팀 삭제에 실패했습니다.',
        variant: 'destructive'
      });
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

  const handleSetApprover = (userId: string | null) => {
    if (selectedTeamId) {
      approverMutation.mutate({ teamId: selectedTeamId, userId });
    }
  };

  const handleAddMember = () => {
    const trimmedName = newMemberName.trim();

    // 검증: 이름이 비어있는지 확인
    if (!trimmedName) {
      toast({
        title: '이름 입력 필수',
        description: '팀원 이름을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 검증: 이름 최소 길이 확인
    if (trimmedName.length < 2) {
      toast({
        title: '이름 입력 오류',
        description: '이름은 최소 2자 이상이어야 합니다.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedTeamId) {
      addMemberMutation.mutate({ teamId: selectedTeamId, name: trimmedName, position: newMemberPosition.trim() || undefined });
    }
  };

  const handleDeleteMember = (memberId: string) => {
    if (selectedTeamId) {
      deleteMemberMutation.mutate({ teamId: selectedTeamId, memberId });
    }
  };

  // Team CRUD handlers
  const handleCreateTeam = () => {
    const trimmedName = newTeamName.trim();

    // 검증: 팀명이 비어있는지 확인
    if (!trimmedName) {
      toast({
        title: '팀명 입력 필수',
        description: '팀명을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 검증: 사이트가 선택되었는지 확인
    if (!newTeamSite) {
      toast({
        title: '사이트 선택 필수',
        description: '사이트를 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }

    // 검증: 중복 팀명 확인 (같은 사이트 내에서)
    const isDuplicate = teams.some(
      team => team.name.toLowerCase() === trimmedName.toLowerCase() &&
              team.site === newTeamSite
    );

    if (isDuplicate) {
      toast({
        title: '중복된 팀명',
        description: `"${trimmedName}"는 이미 ${newTeamSite}에 존재하는 팀명입니다.`,
        variant: 'destructive',
      });
      return;
    }

    createTeamMutation.mutate({ name: trimmedName, site: newTeamSite });
  };

  const handleBulkCreate = () => {
    const teamNames = bulkTeamsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (teamNames.length > 0 && bulkTeamsSite) {
      createTeamsBulkMutation.mutate({ site: bulkTeamsSite, teamNames });
    }
  };

  const handleStartEditTeam = () => {
    if (teamData) {
      setEditTeamName(teamData.name);
      setEditTeamSite(teamData.site || '아산');
      setIsEditingTeam(true);
    }
  };

  const handleSaveTeamEdit = () => {
    if (selectedTeamId && (editTeamName.trim() || editTeamSite)) {
      updateTeamMutation.mutate({
        teamId: selectedTeamId,
        name: editTeamName.trim() || undefined,
        site: editTeamSite || undefined
      });
    }
  };

  const handleCancelTeamEdit = () => {
    setIsEditingTeam(false);
    setEditTeamName('');
    setEditTeamSite('');
  };

  const handleDeleteTeam = () => {
    if (selectedTeamId && teamData) {
      if (confirm(`정말 "${teamData.name}" 팀을 삭제하시겠습니까?\n팀에 사용자가 없어야 삭제 가능합니다.`)) {
        deleteTeamMutation.mutate(selectedTeamId);
      }
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
    <AdminPageLayout>
      <PageHeader
        title="팀 관리"
        description="팀을 생성하고 팀원을 관리합니다."
        icon={<Building2 className="h-6 w-6" />}
        backUrl="/admin-dashboard"
        backText="대시보드"
      />

      {/* 관리자 전용: 팀 생성 */}
        {currentUser?.role === 'ADMIN' && (
          <div className="grid gap-8 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>팀 생성</CardTitle>
                <CardDescription>새로운 팀을 생성합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="newTeamName">팀명</Label>
                  <Input
                    id="newTeamName"
                    placeholder="예: 아산 조립 전기라인"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="newTeamSite">사업장</Label>
                  <Select value={newTeamSite} onValueChange={setNewTeamSite}>
                    <SelectTrigger id="newTeamSite">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                      <SelectItem value="아산">아산</SelectItem>
                      <SelectItem value="화성">화성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreateTeam}
                  disabled={!newTeamName.trim() || !newTeamSite || createTeamMutation.isPending}
                  className="w-full"
                >
                  {createTeamMutation.isPending ? '생성 중...' : '팀 생성'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>팀 대량 생성</CardTitle>
                <CardDescription>여러 팀을 한번에 생성합니다 (한 줄에 하나씩)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="bulkTeamsSite">사업장</Label>
                  <Select value={bulkTeamsSite} onValueChange={setBulkTeamsSite}>
                    <SelectTrigger id="bulkTeamsSite">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                      <SelectItem value="아산">아산</SelectItem>
                      <SelectItem value="화성">화성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bulkTeamsText">팀명 목록</Label>
                  <textarea
                    id="bulkTeamsText"
                    className="w-full min-h-[150px] p-2 border rounded-md"
                    placeholder="화성 조립라인&#10;화성 가공라인&#10;화성 품질팀&#10;..."
                    value={bulkTeamsText}
                    onChange={(e) => setBulkTeamsText(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {bulkTeamsText.split('\n').filter(l => l.trim()).length}개 팀
                  </p>
                </div>
                <Button
                  onClick={handleBulkCreate}
                  disabled={!bulkTeamsText.trim() || createTeamsBulkMutation.isPending}
                  className="w-full"
                >
                  {createTeamsBulkMutation.isPending ? '생성 중...' : '대량 생성'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>팀 선택 및 관리</CardTitle>
            <CardDescription>관리할 팀을 선택하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentUser?.role === 'ADMIN' ? (
              <>
                {/* 사이트 필터 */}
                <div>
                  <Label>사업장 선택</Label>
                  <Select value={selectedSiteFilter} onValueChange={setSelectedSiteFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                      <SelectItem value="아산">아산</SelectItem>
                      <SelectItem value="화성">화성</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 팀 선택 */}
                <div>
                  <Label>팀 선택</Label>
                  <Select onValueChange={(val) => setSelectedTeamId(Number(val))} value={selectedTeamId ? String(selectedTeamId) : undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="팀을 선택하세요..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                      {teams
                        .filter(team => team.site === selectedSiteFilter)
                        .map(team => (
                          <SelectItem key={team.id} value={String(team.id)}>
                            {team.name.replace(/^(아산|화성)\s*/, '')}
                          </SelectItem>
                        ))}
                      {teams.filter(team => team.site === selectedSiteFilter).length === 0 && (
                        <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                          {selectedSiteFilter} 사업장에 팀이 없습니다.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTeamId && teamData && (
                  <div className="flex gap-2 pt-2">
                    {isEditingTeam ? (
                      <>
                        <div className="flex-1 space-y-2">
                          <Input
                            placeholder="팀명"
                            value={editTeamName}
                            onChange={(e) => setEditTeamName(e.target.value)}
                          />
                          <Select value={editTeamSite} onValueChange={setEditTeamSite}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                              <SelectItem value="아산">아산</SelectItem>
                              <SelectItem value="화성">화성</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button
                            onClick={handleSaveTeamEdit}
                            disabled={updateTeamMutation.isPending}
                            size="sm"
                          >
                            저장
                          </Button>
                          <Button
                            onClick={handleCancelTeamEdit}
                            variant="outline"
                            size="sm"
                          >
                            취소
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={handleStartEditTeam}
                          variant="outline"
                          size="sm"
                        >
                          수정
                        </Button>
                        <Button
                          onClick={handleDeleteTeam}
                          variant="destructive"
                          size="sm"
                          disabled={deleteTeamMutation.isPending}
                        >
                          삭제
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-lg font-semibold">{teamData?.name || '당신의 팀'}</p>
            )}
          </CardContent>
        </Card>

        {/* 결재자 설정 (관리자 전용) */}
        {currentUser?.role === 'ADMIN' && selectedTeamId && teamData && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>월별보고서 결재자 설정</CardTitle>
              <CardDescription>
                {teamData.approver
                  ? `현재 결재자: ${teamData.approver.name} (${teamData.approver.username})`
                  : '결재자가 설정되지 않았습니다.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>결재자 선택</Label>
                <Select
                  onValueChange={(value) => handleSetApprover(value === 'none' ? null : value)}
                  value={teamData.approverId || 'none'}
                  disabled={usersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={usersLoading ? "사용자 목록 로딩 중..." : "결재자를 선택하세요..."} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                    <SelectItem value="none">결재자 없음</SelectItem>
                    {usersLoading ? (
                      <SelectItem value="loading" disabled>
                        사용자 목록을 불러오는 중...
                      </SelectItem>
                    ) : allUsers.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        등록된 사용자가 없습니다
                      </SelectItem>
                    ) : (
                      (() => {
                        // 결재자는 ADMIN, TEAM_LEADER, APPROVER, EXECUTIVE 역할 가능
                        const eligibleApprovers = allUsers.filter(user =>
                          user.role === 'ADMIN' || user.role === 'TEAM_LEADER' ||
                          user.role === 'APPROVER' || user.role === 'EXECUTIVE'
                        );

                        if (eligibleApprovers.length === 0) {
                          return (
                            <SelectItem value="no-approvers" disabled>
                              결재 가능한 사용자가 없습니다
                            </SelectItem>
                          );
                        }

                        return eligibleApprovers.map(user => {
                          let roleLabel = '사용자';
                          if (user.role === 'ADMIN') roleLabel = '관리자';
                          else if (user.role === 'TEAM_LEADER') roleLabel = '팀장';
                          else if (user.role === 'APPROVER' || user.role === 'EXECUTIVE') roleLabel = '임원';
                          else if (user.role === 'PENDING') roleLabel = '가입대기';

                          return (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} ({user.username}) - {roleLabel}
                            </SelectItem>
                          );
                        });
                      })()
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

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
                      <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
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
                      disabled={newMemberName.trim().length < 2 || addMemberMutation.isPending}
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
    </AdminPageLayout>
  );
}