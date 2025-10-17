import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Role, Team } from '@shared/schema';

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

const deleteUser = async (userId: string) => {
  const res = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete user');
  return res.json();
};

export default function AdminPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState('all');

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: currentUser?.role === 'ADMIN',
  });

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: fetchTeams,
    enabled: currentUser?.role === 'ADMIN',
  });

  const mutation = useMutation({
    mutationFn: updateUserRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const handleRoleChange = (userId: string, role: Role) => {
    mutation.mutate({ userId, role });
  };

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const handleDeleteUser = (userId: string, username: string) => {
    if (currentUser?.id === userId) {
      alert("현재 로그인된 관리자 계정은 삭제할 수 없습니다.");
      return;
    }
    if (window.confirm(`${username} 사용자를 정말로 삭제하시겠습니까?`)) {
      deleteMutation.mutate(userId);
    }
  };

  const filteredUsers = users.filter(user => {
    if (selectedTeamId === 'all') return true;
    return user.teamId === parseInt(selectedTeamId);
  });

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">사용자 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="팀별로 보기" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">모든 팀</SelectItem>
                        {teams.map(team => (
                            <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.id.substring(0, 8)}...</TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                                      <TableCell>
                                        <Select value={user.role} onValueChange={(newRole) => handleRoleChange(user.id, newRole as Role)}>
                                          <SelectTrigger className="w-[180px]">
                                            <SelectValue placeholder="Select role" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Object.values(Role).map(role => (
                                              <SelectItem key={role} value={role}>{role}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => handleDeleteUser(user.id, user.username)}
                                          disabled={currentUser?.id === user.id}
                                        >
                                          삭제
                                        </Button>
                                      </TableCell>
                                    </TableRow>                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}