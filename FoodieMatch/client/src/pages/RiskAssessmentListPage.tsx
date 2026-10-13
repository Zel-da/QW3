/**
 * 위험성평가 메인 — 사업장·부서 선택 → 바로 평가 신규 작성.
 * 공정 관리는 상세 페이지 안에서.
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import { apiRequest } from '@/lib/queryClient';
import { ShieldAlert, FileText, CheckCircle2, Clock, AlertTriangle, Trash2 } from 'lucide-react';

export default function RiskAssessmentListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [, navigate] = useLocation();
  const [site, setSite] = useState<string>(user?.site || '아산');
  const [teamId, setTeamId] = useState<string>('');
  const canDelete = user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM';

  const { data: teams = [] } = useQuery<Array<{ id: number; name: string; site: string }>>({
    queryKey: ['teams-active'],
    queryFn: async () => {
      const res = await fetch('/api/teams', { credentials: 'include' });
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const { data: assessments = [], refetch: refetchAssessments } = useQuery<any[]>({
    queryKey: ['risk-assessments', site, teamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (site) params.set('site', site);
      if (teamId) params.set('teamId', teamId);
      const res = await fetch(`/api/risk-assessments?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!site,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/risk-assessments', {
        site, teamId: parseInt(teamId),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: '평가 생성', description: '편집 화면으로 이동합니다' });
      navigate(`/risk-assessments/${data.id}`);
    },
    onError: (err: any) => {
      toast({ title: '생성 실패', description: err.message, variant: 'destructive' });
    },
  });

  const deleteAssessmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/risk-assessments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '평가 삭제 완료' });
      refetchAssessments();
    },
    onError: (err: any) => {
      toast({ title: '삭제 실패', description: err.message, variant: 'destructive' });
    },
  });

  const siteTeams = useMemo(() => teams.filter(t => t.site === site), [teams, site]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-500" />
            위험성평가
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            사업장 → 부서를 선택해 평가를 작성·관리합니다. 공정은 각 평가 안에서 추가·관리합니다.
          </p>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">사업장 · 부서 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <Label>사업장</Label>
                <Select value={site} onValueChange={v => { setSite(v); setTeamId(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="아산">아산</SelectItem>
                    <SelectItem value="화성">화성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>부서</Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger><SelectValue placeholder="부서 선택" /></SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    {siteTeams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!teamId || createMutation.isPending}
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  {createMutation.isPending ? '생성 중...' : '평가 신규 작성'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">평가 목록 ({assessments.length})</CardTitle>
            <CardDescription>클릭하면 편집 화면으로 이동합니다</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">상태</TableHead>
                    <TableHead className="w-24">사이트</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead className="w-28">평가일</TableHead>
                    <TableHead>작성자 / 결재자</TableHead>
                    {canDelete && <TableHead className="w-12 text-right">삭제</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map(a => (
                    <TableRow key={a.id} className="cursor-pointer hover:bg-accent/50"
                      onClick={() => navigate(`/risk-assessments/${a.id}`)}>
                      <TableCell>
                        {a.status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />승인</span>
                        ) : a.status === 'SUBMITTED' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" />제출</span>
                        ) : a.status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />반려</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">작성중</span>
                        )}
                      </TableCell>
                      <TableCell>{a.site}</TableCell>
                      <TableCell>{a.team?.name}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{a.evaluatedAt ? new Date(a.evaluatedAt).toLocaleDateString('ko-KR') : '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.author?.name || '-'} / {a.approver?.name || '-'}
                      </TableCell>
                      {canDelete && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const ok = await confirm({
                                title: '위험성평가 삭제',
                                description: `${a.site} / ${a.team?.name}\n이 평가를 삭제할까요?\n\n⚠ 공정·6개 섹션·사진·서명 모두 영구 삭제됩니다.`,
                                confirmText: '영구 삭제',
                                destructive: true,
                              });
                              if (ok) deleteAssessmentMutation.mutate(a.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {assessments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={canDelete ? 6 : 5} className="text-center text-muted-foreground py-10">평가가 없습니다</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
