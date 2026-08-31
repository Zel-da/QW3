/**
 * Impersonation 상태 전역 배너 — Admin이 다른 사용자로 로그인 중일 때 상단에 표시.
 * 한 번 클릭으로 원래 admin 계정으로 복귀 가능.
 */
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import { UserCog, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ImpersonationBanner() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const impersonating = user?.impersonating;

  const exitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/impersonate/exit');
      return res.json();
    },
    onSuccess: async () => {
      toast({ title: '원래 admin 계정으로 복귀' });
      await refreshUser();
      window.location.href = '/admin-dashboard';
    },
    onError: (err: any) => {
      toast({ title: '복귀 실패', description: err.message, variant: 'destructive' });
    },
  });

  if (!impersonating) return null;

  return (
    <div className="w-full bg-amber-500 text-white px-4 py-2 flex items-center gap-3 text-sm">
      <UserCog className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="font-semibold">테스트 모드:</span>{' '}
        <span className="font-medium">
          {impersonating.asUser.name || impersonating.asUser.username}
        </span>
        <span className="opacity-90"> ({impersonating.asUser.role})</span>
        <span className="opacity-80 ml-2">
          · 원본: {impersonating.originalAdmin.name || impersonating.originalAdmin.username}
        </span>
      </div>
      <button
        onClick={() => exitMutation.mutate()}
        disabled={exitMutation.isPending}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-medium whitespace-nowrap"
      >
        <LogOut className="w-3.5 h-3.5" />
        {exitMutation.isPending ? '복귀 중...' : '원래 계정으로 복귀'}
      </button>
    </div>
  );
}
