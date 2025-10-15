import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';

const fetchTeamMembers = async () => {
  const res = await fetch('/api/my-team/members');
  if (!res.ok) throw new Error('팀원 정보를 불러오는데 실패했습니다.');
  return res.json();
};

const addTeamMember = async (name) => {
  const res = await fetch('/api/my-team/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error('팀원 추가에 실패했습니다.');
  return res.json();
};

const removeTeamMember = async (id) => {
  const res = await fetch(`/api/my-team/members/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('팀원 삭제에 실패했습니다.');
};

export default function TeamManagementPage() {
  const queryClient = useQueryClient();
  const [newMemberName, setNewMemberName] = useState('');

  const { data: members, isLoading, error } = useQuery({ 
    queryKey: ['teamMembers'], 
    queryFn: fetchTeamMembers 
  });

  const addMutation = useMutation({
    mutationFn: addTeamMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
      setNewMemberName('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeTeamMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });

  const handleAddMember = (e) => {
    e.preventDefault();
    if (newMemberName.trim()) {
      addMutation.mutate(newMemberName.trim());
    }
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>팀원 관리</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddMember} className="flex gap-2 mb-6">
              <Input 
                placeholder="새 팀원 이름" 
                value={newMemberName} 
                onChange={(e) => setNewMemberName(e.target.value)}
              />
              <Button type="submit" disabled={addMutation.isPending}>
                {addMutation.isPending ? '추가 중...' : '추가'}
              </Button>
            </form>
            {isLoading && <p>로딩 중...</p>}
            {error && <p className="text-destructive">오류: {error.message}</p>}
            <ul className="space-y-2">
              {members?.map(member => (
                <li key={member.id} className="flex justify-between items-center p-2 border rounded-md">
                  <span>{member.name}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeMutation.mutate(member.id)}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
