import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import type { User, Team } from '@shared/schema';

const fetchUser = async (userId: string): Promise<User> => {
  const res = await fetch(`/api/users/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user data');
  return res.json();
};

const fetchTeam = async (teamId: number): Promise<Team> => {
    const res = await fetch(`/api/teams/${teamId}`);
    if (!res.ok) throw new Error('Failed to fetch team data');
    return res.json();
}

const updateUser = async ({ userId, userData }: { userId: string; userData: Partial<User> }) => {
  const res = await fetch(`/api/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
  });
  if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || 'Failed to update user data');
  }
  return res.json();
};

function ProfileSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                 <div className="space-y-4">
                    <Skeleton className="h-6 w-40 mb-4" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <Skeleton className="h-10 w-32" />
            </CardContent>
        </Card>
    )
}

export default function UserProfilePage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: userProfile, isLoading: profileLoading } = useQuery<User>({
    queryKey: ['userProfile', currentUser?.id],
    queryFn: () => fetchUser(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  const { data: team, isLoading: teamLoading } = useQuery<Team>({
      queryKey: ['team', userProfile?.teamId],
      queryFn: () => fetchTeam(userProfile!.teamId!),
      enabled: !!userProfile?.teamId,
  });

  const [name, setName] = useState('');
  const [site, setSite] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setSite(userProfile.site || 'Asan');
      setIsInitialized(true);
    }
  }, [userProfile]);

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: async () => {
      toast({ title: '성공', description: '사용자 정보가 성공적으로 업데이트되었습니다.' });
      await queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser?.id] });
      setPassword('');
      setConfirmPassword('');
    },
    onError: (error: Error) => {
      toast({ title: '오류', description: error.message, variant: 'destructive' });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    const userData: { name: string, site: string, password?: string } = { name, site };
    if (password) {
      if (password.length < 8) {
        toast({ title: '오류', description: '비밀번호는 8자 이상이어야 합니다.', variant: 'destructive' });
        return;
      }
      if (password !== confirmPassword) {
        toast({ title: '오류', description: '비밀번호가 일치하지 않습니다.', variant: 'destructive' });
        return;
      }
      userData.password = password;
    }

    updateMutation.mutate({ userId: currentUser.id, userData });
  };

  if (authLoading || !isInitialized) {
    return (
        <div>
            <Header />
            <main className="container mx-auto p-4 lg:p-8">
                <ProfileSkeleton />
            </main>
        </div>
    );
  }

  if (!currentUser || !userProfile) {
    return <div>로그인이 필요하거나 사용자 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <form onSubmit={handleSubmit}>
            <Card>
            <CardHeader>
                <CardTitle className="text-2xl">내 정보</CardTitle>
                <CardDescription>계정 및 프로필 정보를 확인하고 수정합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Account Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-primary">계정 정보</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">사용자 ID</Label>
                            <Input id="username" value={userProfile.username} disabled className="bg-gray-100 cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input id="email" type="email" value={userProfile.email || ''} disabled className="bg-gray-100 cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">권한</Label>
                            <Input id="role" value={userProfile.role} disabled className="bg-gray-100 cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="team">소속 팀</Label>
                            <Input id="team" value={teamLoading ? '로딩 중...' : (team?.name || '소속 없음')} disabled className="bg-gray-100 cursor-not-allowed" />
                        </div>
                    </div>
                </div>

                {/* Profile Info */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-primary">프로필 정보</h3>
                     <div className="space-y-2 max-w-md">
                        <Label htmlFor="name">이름</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2 max-w-md">
                        <Label htmlFor="site">소속 현장</Label>
                        <Select onValueChange={setSite} value={site}>
                            <SelectTrigger id="site" className="w-[180px]">
                                <SelectValue placeholder="현장 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Asan">아산</SelectItem>
                                <SelectItem value="Hwaseong">화성</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Security */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-primary">보안</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">새 비밀번호</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="변경할 경우에만 입력" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                    </div>
                </div>

                <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? '저장 중...' : '저장'}
                </Button>
            </CardContent>
            </Card>
        </form>
      </main>
    </div>
  );
}