/**
 * 위험성평가 메인 — 사업장·부서·공정 선택 + 평가 목록 + 신규 생성
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import { apiRequest } from '@/lib/queryClient';
import { ShieldAlert, Plus, FileText, CheckCircle2, Clock, AlertTriangle, Pencil, Trash2, Check, X } from 'lucide-react';

export default function RiskAssessmentListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [, navigate] = useLocation();
  const [site, setSite] = useState<string>(user?.site || '아산');
  const [teamId, setTeamId] = useState<string>('');
  const [processId, setProcessId] = useState<string>('');
  const [newProcessName, setNewProcessName] = useState('');
  const [editingProcess, setEditingProcess] = useState(false);
  const [editProcessName, setEditProcessName] = useState('');
  const canManageProcess = user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM';

  const { data: teams = [] } = useQuery<Array<{ id: number; name: string; site: string }>>({
    queryKey: ['teams-active'],
    queryFn: async () => {
      const res = await fetch('/api/teams', { credentials: 'include' });
      if (!res.ok) throw new Error();
      return res.json();
    },
  });

  const { data: processes = [], refetch: refetchProcesses } = useQuery<Array<{ id: number; name: string; teamId: number }>>({
    queryKey: ['work-processes', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const res = await fetch(`/api/work-processes?teamId=${teamId}`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!teamId,
  });

  const { data: assessments = [], refetch: refetchAssessments } = useQuery<any[]>({
    queryKey: ['risk-assessments', site, teamId, processId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (site) params.set('site', site);
      if (teamId) params.set('teamId', teamId);
      if (processId) params.set('processId', processId);
      const res = await fetch(`/api/risk-assessments?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: !!site,
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

  const addProcessMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/work-processes', {
        teamId: parseInt(teamId), name: newProcessName.trim(),
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: '공정 추가 완료' });
      setNewProcessName('');
      refetchProcesses();
      setProcessId(String(data.id));
    },
    onError: (err: any) => {
      toast({ title: '추가 실패', description: err.message, variant: 'destructive' });
    },
  });

  const renameProcessMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', `/api/work-processes/${processId}`, { name: editProcessName.trim() });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '공정 이름 변경 완료' });
      setEditingProcess(false);
      refetchProcesses();
    },
    onError: (err: any) => {
      toast({ title: '변경 실패', description: err.message, variant: 'destructive' });
    },
  });

  const deleteProcessMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/work-processes/${processId}`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: '공정 처리 완료', description: data.message || '삭제되었습니다' });
      setProcessId('');
      refetchProcesses();
    },
    onError: (err: any) => {
      toast({ title: '삭제 실패', description: err.message, variant: 'destructive' });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const proc = processes.find(p => p.id === parseInt(processId));
      const res = await apiRequest('POST', '/api/risk-assessments', {
        site, teamId: parseInt(teamId), processId: parseInt(processId),
        processName: proc?.name,
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
            사업장 → 부서 → 공정을 선택해 평가를 작성·관리합니다
          </p>
        </div>

        {/* 선택 패널 */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">사업장 · 부서 · 공정 선택</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>사업장</Label>
                <Select value={site} onValueChange={v => { setSite(v); setTeamId(''); setProcessId(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="아산">아산</SelectItem>
                    <SelectItem value="화성">화성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>부서</Label>
                <Select value={teamId} onValueChange={v => { setTeamId(v); setProcessId(''); }}>
                  <SelectTrigger><SelectValue placeholder="부서 선택" /></SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    {siteTeams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>공정</Label>
                <div className="flex gap-1">
                  <Select value={processId} onValueChange={v => { setProcessId(v); setEditingProcess(false); }} disabled={!teamId}>
                    <SelectTrigger><SelectValue placeholder={teamId ? '공정 선택' : '부서 먼저 선택'} /></SelectTrigger>
                    <SelectContent className="max-h-[320px]">
                      {processes.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                      {processes.length === 0 && (
                        <div className="px-2 py-3 text-sm text-muted-foreground">등록된 공정이 없습니다</div>
                      )}
                    </SelectContent>
                  </Select>
                  {processId && canManageProcess && (
                    <>
                      <Button
                        size="icon"
                        variant="outline"
                        title="공정 이름 수정"
                        onClick={() => {
                          const p = processes.find(x => x.id === parseInt(processId));
                          setEditProcessName(p?.name || '');
                          setEditingProcess(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        title="공정 삭제"
                        onClick={async () => {
                          const p = processes.find(x => x.id === parseInt(processId));
                          const ok = await confirm({
                            title: '공정 삭제',
                            description: `"${p?.name || ''}" 공정을 삭제할까요?\n연결된 평가가 있으면 삭제 대신 목록에서만 숨겨집니다 (평가 데이터는 보존).`,
                            confirmText: '삭제',
                            destructive: true,
                          });
                          if (ok) deleteProcessMutation.mutate();
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 공정 이름 수정 인라인 폼 */}
            {editingProcess && (
              <div className="flex gap-2 items-end pt-2 border-t">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">공정 이름 변경</Label>
                  <Input value={editProcessName} onChange={e => setEditProcessName(e.target.value)} />
                </div>
                <Button
                  size="sm"
                  onClick={() => renameProcessMutation.mutate()}
                  disabled={!editProcessName.trim() || renameProcessMutation.isPending}
                >
                  <Check className="w-4 h-4 mr-1.5" />저장
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingProcess(false)}>
                  <X className="w-4 h-4 mr-1.5" />취소
                </Button>
              </div>
            )}

            {teamId && (
              <div className="flex gap-2 flex-wrap items-end pt-2 border-t">
                <div className="flex-1 min-w-[200px]">
                  <Label className="text-xs text-muted-foreground">새 공정 추가 (이 부서)</Label>
                  <Input value={newProcessName} onChange={e => setNewProcessName(e.target.value)} placeholder="예: CR조립" />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addProcessMutation.mutate()}
                  disabled={!newProcessName.trim() || addProcessMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-1.5" />공정 추가
                </Button>
                {processId && (
                  <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
                    <FileText className="w-4 h-4 mr-1.5" />이 공정으로 평가 신규 작성
                  </Button>
                )}
              </div>
            )}
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
                    <TableHead>공정</TableHead>
                    <TableHead className="w-28">평가일</TableHead>
                    <TableHead>작성자 / 결재자</TableHead>
                    {canManageProcess && <TableHead className="w-12 text-right">삭제</TableHead>}
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
                      <TableCell>{a.process?.name || a.processName}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{a.evaluatedAt ? new Date(a.evaluatedAt).toLocaleDateString('ko-KR') : '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.author?.name || '-'} / {a.approver?.name || '-'}
                      </TableCell>
                      {canManageProcess && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            title="평가 삭제"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const ok = await confirm({
                                title: '위험성평가 삭제',
                                description: `${a.site} / ${a.team?.name} / ${a.process?.name || a.processName}\n이 평가를 삭제할까요?\n\n⚠ 작성한 6개 섹션 데이터·사진·서명·버전 이력 모두 영구 삭제됩니다.\n이미 승인된 평가는 감사 목적상 삭제보다 보존을 권장합니다.`,
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
                      <TableCell colSpan={canManageProcess ? 7 : 6} className="text-center text-muted-foreground py-10">평가가 없습니다</TableCell>
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
