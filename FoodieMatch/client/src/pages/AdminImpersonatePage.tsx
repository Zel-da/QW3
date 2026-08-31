/**
 * Admin 테스트 페이지 — 다른 사용자로 로그인해서 그 시점에서 시스템을 재현.
 *
 * 사용 시나리오:
 * - 특정 사용자(예: 정의건)가 결재 처리 시 화면이 안 넘어간다고 신고
 * - Admin이 여기서 그 계정으로 로그인 → 실제 경험 재현
 * - 상단 배너에서 언제든 원래 admin 계정으로 복귀
 *
 * ⚠ 이 화면에서 로그인 후 하는 모든 조작은 실제 DB에 반영됩니다.
 *   결재를 실제로 처리하지 않으려면 페이지 상태만 확인하세요.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminPageLayout, PageHeader } from '@/components/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { UserCog, Search, LogIn, AlertTriangle, RotateCcw } from 'lucide-react';

interface UserRow {
  id: string;
  username: string;
  name?: string | null;
  role: string;
  site?: string | null;
  teamId?: number | null;
  team?: { name: string } | null;
}

export default function AdminImpersonatePage() {
  const { toast } = useToast();
  const { refreshUser, user } = useAuth();
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');

  const impersonating = user?.impersonating;
  const isReallyAdmin = user?.role === 'ADMIN' || impersonating?.originalAdmin?.role === 'ADMIN';

  const { data: users = [], isLoading } = useQuery<UserRow[]>({
    queryKey: ['admin-users-for-impersonate'],
    queryFn: async () => {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (!res.ok) throw new Error('사용자 조회 실패');
      return res.json();
    },
    enabled: isReallyAdmin,
  });

  const impersonateMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await apiRequest('POST', `/api/admin/impersonate/${targetUserId}`);
      return res.json();
    },
    onSuccess: async (data) => {
      toast({ title: '테스트 로그인 성공', description: data.message });
      await refreshUser();
      // 대시보드로 이동해서 그 사용자 시점의 화면을 즉시 확인
      window.location.href = '/';
    },
    onError: (err: any) => {
      toast({ title: '실패', description: err.message, variant: 'destructive' });
    },
  });

  const exitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/impersonate/exit');
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: '원래 계정으로 복귀' });
      await refreshUser();
      window.location.href = '/admin-dashboard';
    },
    onError: (err: any) => {
      toast({ title: '복귀 실패', description: err.message, variant: 'destructive' });
    },
  });

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (siteFilter !== 'all' && u.site !== siteFilter) return false;
      if (q) {
        const query = q.toLowerCase();
        return (
          u.username?.toLowerCase().includes(query) ||
          u.name?.toLowerCase().includes(query) ||
          u.team?.name?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [users, q, roleFilter, siteFilter]);

  return (
    <AdminPageLayout>
      <PageHeader
        title="테스트: 다른 사용자로 로그인"
        description="특정 사용자 시점에서 화면·기능을 재현합니다. ADMIN 전용."
        icon={<UserCog className="h-6 w-6" />}
        backUrl="/admin-dashboard"
        backText="대시보드"
      />

      {/* 현재 impersonating 중이면 상단에 표시 */}
      {impersonating && (
        <Card className="mb-4 border-amber-400 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-900">
                  현재 <b>{impersonating.asUser.name || impersonating.asUser.username}</b>
                  ({impersonating.asUser.role}) 계정으로 로그인 중
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  원래 admin: {impersonating.originalAdmin.name || impersonating.originalAdmin.username}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => exitMutation.mutate()}
                  disabled={exitMutation.isPending}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  원래 admin 계정으로 복귀
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-4 border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-semibold mb-1">⚠ 주의</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>대상 계정으로 로그인한 상태에서 하는 모든 조작은 <b>실제 DB에 반영</b>됩니다.</li>
                <li>결재 처리 화면만 확인하려면 <b>승인/반려 버튼을 누르지 마세요</b>.</li>
                <li>세션이 실제로 그 사람으로 바뀌므로, 확인 후 반드시 상단 배너에서 복귀하세요.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">사용자 목록</CardTitle>
          <CardDescription>이름·아이디·팀 검색, 역할/사이트 필터.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="이름·아이디·팀명 검색..."
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 역할</SelectItem>
                <SelectItem value="ADMIN">ADMIN</SelectItem>
                <SelectItem value="APPROVER">APPROVER (결재자)</SelectItem>
                <SelectItem value="TEAM_LEADER">TEAM_LEADER (팀장)</SelectItem>
                <SelectItem value="EXECUTIVE_LEADER">EXECUTIVE_LEADER</SelectItem>
                <SelectItem value="EXECUTIVE">EXECUTIVE</SelectItem>
                <SelectItem value="SAFETY_TEAM">SAFETY_TEAM</SelectItem>
              </SelectContent>
            </Select>
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 사이트</SelectItem>
                <SelectItem value="아산">아산</SelectItem>
                <SelectItem value="화성">화성</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>이름</TableHead>
                    <TableHead>아이디</TableHead>
                    <TableHead>역할</TableHead>
                    <TableHead>사이트</TableHead>
                    <TableHead>팀</TableHead>
                    <TableHead className="w-32 text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name || '-'}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{u.username}</TableCell>
                      <TableCell>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell>{u.site || '-'}</TableCell>
                      <TableCell>{u.team?.name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => impersonateMutation.mutate(u.id)}
                          disabled={impersonateMutation.isPending || u.id === user?.id}
                        >
                          <LogIn className="w-4 h-4 mr-1.5" />
                          이 계정으로 로그인
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        조건에 맞는 사용자가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}
