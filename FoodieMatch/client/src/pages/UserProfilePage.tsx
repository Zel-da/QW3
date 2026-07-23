import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from '@/components/ui/skeleton';
import { HelpCircle, RefreshCw, Loader2 } from 'lucide-react';
import { resetAppCache, reloadWithNoCache } from '@/lib/cacheReset';
import { useConfirm } from '@/hooks/useConfirm';
import type { User, Team } from '@shared/schema';
import { SITES } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';

const fetchUser = async (userId: string): Promise<User> => {
  const res = await fetch(`/api/users/${userId}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch user data');
  return res.json();
};

const fetchTeam = async (teamId: number): Promise<Team> => {
    const res = await fetch(`/api/teams/${teamId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch team data');
    return res.json();
}

const updateUser = async ({ userId, userData }: { userId: string; userData: Partial<User> }) => {
  const res = await apiRequest('PUT', `/api/users/${userId}`, userData);
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
  const confirm = useConfirm();
  const [isResettingCache, setIsResettingCache] = useState(false);

  const handleResetCache = async () => {
    const ok = await confirm({
      title: '앱 캐시 삭제',
      description: '앱의 저장된 코드 캐시를 삭제하고 새로 로드합니다.\n\n' +
        '· 로그인 세션·작성 중인 TBM·녹음 데이터는 유지됩니다.\n' +
        '· 실행 후 페이지가 자동으로 새로고침됩니다.\n' +
        '· 진행 시 잠깐 화면이 흰색으로 바뀔 수 있습니다.',
      confirmText: '실행',
    });
    if (!ok) return;
    setIsResettingCache(true);
    try {
      const result = await resetAppCache();
      console.log('[Profile] 캐시 삭제 결과:', result);
      toast({
        title: '캐시 삭제 완료',
        description: `삭제된 캐시 ${result.cachesDeleted}개. 잠시 후 새로 로드합니다.`,
      });
      // 짧게 대기 후 새로고침
      setTimeout(() => reloadWithNoCache(), 800);
    } catch (e: any) {
      console.error('[Profile] 캐시 삭제 실패:', e);
      toast({
        title: '캐시 삭제 실패',
        description: e?.message || '다시 시도해주세요.',
        variant: 'destructive',
      });
      setIsResettingCache(false);
    }
  };
  const [, setLocation] = useLocation();

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
      setSite(userProfile.site || '아산');
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
      // 비밀번호 검증: 8자 이상, 영문, 숫자, 특수문자 포함
      if (password.length < 8) {
        toast({ title: '오류', description: '비밀번호는 8자 이상이어야 합니다.', variant: 'destructive' });
        return;
      }
      if (!/[a-zA-Z]/.test(password)) {
        toast({ title: '오류', description: '비밀번호에 영문자를 포함해야 합니다.', variant: 'destructive' });
        return;
      }
      if (!/[0-9]/.test(password)) {
        toast({ title: '오류', description: '비밀번호에 숫자를 포함해야 합니다.', variant: 'destructive' });
        return;
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        toast({ title: '오류', description: '비밀번호에 특수문자를 포함해야 합니다.', variant: 'destructive' });
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
                                {SITES.map(site => (
                                    <SelectItem key={site} value={site}>{site}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Security */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-primary">보안</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="password">새 비밀번호 (8자 이상, 영문+숫자+특수문자)</Label>
                            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="변경할 경우에만 입력" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/help')}
                    className="flex items-center gap-2"
                  >
                    <HelpCircle className="h-4 w-4" />
                    도움말
                  </Button>
                </div>
            </CardContent>
            </Card>
        </form>

        {/* 앱 문제 해결 — 캐시 삭제 + 가이드 링크 */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">앱 문제 해결</CardTitle>
            <CardDescription>
              앱이 이상하게 동작하거나 화면이 최신 버전으로 보이지 않으면 아래 버튼을 눌러 앱을 새로 로드하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResetCache}
                disabled={isResettingCache}
                className="flex items-center gap-2"
              >
                {isResettingCache ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    앱 캐시 삭제 후 새로 로드
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLocation('/troubleshooting')}
                className="flex items-center gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                자세한 문제 해결 가이드
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              작성 중인 TBM·녹음·로그인 세션은 그대로 유지됩니다.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}