/**
 * 위험성평가 상세 — 6개 섹션 탭 + 제출/승인/반려 + Excel 다운로드
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, Link, useLocation } from 'wouter';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import { apiRequest } from '@/lib/queryClient';
import { PhotoDropzone } from '@/components/PhotoDropzone';
import { SignatureDialog } from '@/components/SignatureDialog';
import { ArrowLeft, Save, Send, CheckCircle2, XCircle, Download, Plus, Trash2, Pen, Loader2 } from 'lucide-react';

// 체크리스트 — type: 'single' (유/무/해당없음) 또는 'multi' (여러개 중복 선택)
interface ChecklistItemDef {
  key: string;
  label: string;
  type: 'single' | 'multi';
  options?: string[]; // multi일 때 선택지
}

const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { key: '작업표준·절차에 관한 정보', label: '작업표준·절차에 관한 정보', type: 'single' },
  { key: '기계·기구 및 설비의 사양서', label: '기계·기구 및 설비의 사양서', type: 'single' },
  { key: '물질안전보건자료 등의 유해위험요인 정보', label: '물질안전보건자료 등의 유해위험요인 정보', type: 'single' },
  { key: '도급(일부, 전부 또는 혼재작업)', label: '도급(일부, 전부 또는 혼재작업)', type: 'single' },
  { key: '재해사례, 재해통계 등에 관한 정보', label: '재해사례, 재해통계 등에 관한 정보', type: 'single' },
  {
    key: '중량물 인력취급시 단위중량(5kg) 및 취급형태',
    label: '중량물 인력취급시 단위중량(5kg) 및 취급형태',
    type: 'multi',
    options: ['들기', '밀기', '끌기'],
  },
  { key: '작업환경측정 (측정/미측정/해당무)', label: '작업환경측정 (측정/미측정/해당무)', type: 'single' },
  { key: '근로자 건강진단 유무', label: '근로자 건강진단 유무', type: 'single' },
  {
    key: '근로자 구성 및 경력특성',
    label: '근로자 구성 및 경력특성',
    type: 'multi',
    options: ['여성근로자', '1년 미만 미숙련자', '고령근로자', '비정규직 근로자', '외국인 근로자', '장애근로자'],
  },
];

export default function RiskAssessmentDetailPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [, params] = useRoute('/risk-assessments/:id');
  const id = params?.id;
  const [tab, setTab] = useState<'pre' | 'opinion' | 'info' | 'eval' | 'imp' | 'feedback'>('pre');

  const { data: ra, isLoading } = useQuery<any>({
    queryKey: ['risk-assessment', id],
    queryFn: async () => {
      const res = await fetch(`/api/risk-assessments/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('조회 실패');
      return res.json();
    },
    enabled: !!id,
  });

  // 팀 전체 구성원 로드 (교육 참여자 자동 로드용)
  //  (1) Team.leader — 팀장
  //  (2) /api/teams/:teamId/members — 그 팀의 User 계정 (팀원)
  //  (3) /api/teams/:teamId/team-members — 계정 없는 팀원(TeamMember)
  // 셋을 이름 기준 중복제거해서 하나의 명단으로 합침.
  const { data: teamUsers = [] } = useQuery<any[]>({
    queryKey: ['team-users-full', ra?.teamId],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${ra.teamId}/members`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!ra?.teamId,
  });
  const { data: teamMemberOnlyList = [] } = useQuery<any[]>({
    queryKey: ['team-member-only', ra?.teamId],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${ra.teamId}/team-members`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!ra?.teamId,
  });

  // 통합 명단 (팀장 + User 팀원 + TeamMember), 이름 기준 중복제거
  const teamMembers = useMemo(() => {
    const merged: Array<{ name: string; position: string; role?: string }> = [];
    const seen = new Set<string>();

    // (1) 팀장 — ra.team.leader
    if (ra?.team?.leader?.name) {
      const n = String(ra.team.leader.name).trim();
      if (n && !seen.has(n)) {
        seen.add(n);
        merged.push({ name: n, position: '팀장', role: ra.team.leader.role });
      }
    }
    // (2) User 팀원 (팀장 외)
    for (const u of (teamUsers as any[])) {
      const n = String(u?.name || u?.username || '').trim();
      if (!n || seen.has(n)) continue;
      if (ra?.team?.leader?.id === u.id) continue; // 이미 팀장으로 추가됨
      seen.add(n);
      merged.push({ name: n, position: u.role === 'TEAM_LEADER' ? '팀장' : '팀원', role: u.role });
    }
    // (3) 계정 없는 TeamMember
    for (const m of (teamMemberOnlyList as any[])) {
      const n = String(m?.name || '').trim();
      if (!n || seen.has(n)) continue;
      seen.add(n);
      merged.push({ name: n, position: m.position || '팀원' });
    }
    return merged;
  }, [ra?.team?.leader, teamUsers, teamMemberOnlyList]);

  const { data: teams = [] } = useQuery<Array<{ id: number; name: string; site: string }>>({
    queryKey: ['teams-active'],
    queryFn: async () => (await fetch('/api/teams', { credentials: 'include' })).json(),
  });

  // 이 평가 부서의 공정 목록 (각 섹션 Select용 + 상단 관리 패널용)
  const { data: processes = [], refetch: refetchProcesses } = useQuery<Array<{ id: number; name: string; teamId: number }>>({
    queryKey: ['work-processes', ra?.teamId],
    queryFn: async () => {
      if (!ra?.teamId) return [];
      const res = await fetch(`/api/work-processes?teamId=${ra.teamId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!ra?.teamId,
  });

  // Hook은 반드시 조건부 return 전에 선언 (React Rules of Hooks)
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/risk-assessments/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '삭제됨' });
      navigate('/risk-assessments');
    },
    onError: (err: any) => {
      toast({ title: '삭제 실패', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading || !ra) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-6"><Card><CardContent className="p-10 text-center text-muted-foreground">로딩 중...</CardContent></Card></main>
      </div>
    );
  }

  const isReadOnly = ra.status === 'APPROVED';
  const isApprover = user?.role === 'ADMIN' || ra.team?.approverId === user?.id;
  const canDelete = user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <Link href="/risk-assessments">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" />목록</Button>
          </Link>
          <div className="flex gap-2 flex-wrap">
            <a href={`/api/risk-assessments/${id}/excel`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-1.5" />엑셀 다운로드</Button>
            </a>
            {canDelete && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={async () => {
                  const ok = await confirm({
                    title: '위험성평가 삭제',
                    description: `${ra.site} / ${ra.team?.name}\n이 평가를 영구 삭제할까요?\n\n⚠ 공정 선택·6개 섹션·사진·서명·버전 이력 모두 삭제됩니다.`,
                    confirmText: '영구 삭제',
                    destructive: true,
                  });
                  if (ok) deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />{deleteMutation.isPending ? '삭제 중...' : '평가 삭제'}
              </Button>
            )}
          </div>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 flex-wrap">
              {ra.site} · {ra.team?.name}
              {ra.status === 'APPROVED' && <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">승인 완료</span>}
              {ra.status === 'SUBMITTED' && <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">결재 대기</span>}
              {ra.status === 'DRAFT' && <span className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">작성중</span>}
              {ra.status === 'REJECTED' && <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full">반려</span>}
            </CardTitle>
            <CardDescription>
              평가일: {ra.evaluatedAt ? new Date(ra.evaluatedAt).toLocaleDateString('ko-KR') : '-'}
              · 작성자: {ra.author?.name || '-'} · 결재자: {ra.approver?.name || ra.team?.approver?.name || '-'}
            </CardDescription>
            {ra.status === 'REJECTED' && ra.rejectionReason && (
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-2">반려 사유: {ra.rejectionReason}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SubmitApproveBar ra={ra} isApprover={isApprover} userName={user?.name || user?.username || '사용자'} />
              <ProcessManagerPanel
                teamId={ra.teamId}
                teamName={ra.team?.name}
                processes={processes}
                readOnly={isReadOnly}
                onChanged={refetchProcesses}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="pre">1. 사전교육</TabsTrigger>
            <TabsTrigger value="opinion">2. 의견·토론</TabsTrigger>
            <TabsTrigger value="info">3. 안전보건정보</TabsTrigger>
            <TabsTrigger value="eval">4. 위험성평가</TabsTrigger>
            <TabsTrigger value="imp">5. 개선실행</TabsTrigger>
            <TabsTrigger value="feedback">6. 피드백교육</TabsTrigger>
          </TabsList>
          <TabsContent value="pre"><SectionEducation raId={id!} data={ra.preEducation} teamMembers={teamMembers} readOnly={isReadOnly} endpoint="pre-education" title="사전교육" /></TabsContent>
          <TabsContent value="opinion"><SectionWorkerOpinions raId={id!} data={ra.workerOpinions || []} processes={processes} readOnly={isReadOnly} /></TabsContent>
          <TabsContent value="info"><SectionSafetyInfos raId={id!} infos={ra.safetyInfos || []} processes={processes} readOnly={isReadOnly} /></TabsContent>
          <TabsContent value="eval"><SectionEvaluations raId={id!} data={ra.evaluations || []} teams={teams} processes={processes} raSite={ra.site} readOnly={isReadOnly} /></TabsContent>
          <TabsContent value="imp"><SectionImprovements raId={id!} data={ra.improvements || []} evaluations={ra.evaluations || []} teams={teams} processes={processes} raSite={ra.site} readOnly={isReadOnly} /></TabsContent>
          <TabsContent value="feedback"><SectionEducation raId={id!} data={ra.feedbackEducation} teamMembers={teamMembers} readOnly={isReadOnly} endpoint="feedback-education" title="피드백교육" /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SubmitApproveBar({ ra, isApprover, userName }: { ra: any; isApprover: boolean; userName: string }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [sig, setSig] = useState('');       // base64 PNG
  const [sigDialogOpen, setSigDialogOpen] = useState(false);
  const [rejReason, setRejReason] = useState('');
  const submitMut = useMutation({
    mutationFn: async () => (await apiRequest('POST', `/api/risk-assessments/${ra.id}/submit`, { authorSignature: sig || undefined })).json(),
    onSuccess: () => { toast({ title: '제출 완료', description: '결재자 승인 대기' }); qc.invalidateQueries({ queryKey: ['risk-assessment', ra.id] }); },
    onError: (e: any) => toast({ title: '제출 실패', description: e.message, variant: 'destructive' }),
  });
  const approveMut = useMutation({
    mutationFn: async () => (await apiRequest('POST', `/api/risk-assessments/${ra.id}/approve`, { signature: sig || undefined })).json(),
    onSuccess: () => { toast({ title: '승인 완료' }); qc.invalidateQueries({ queryKey: ['risk-assessment', ra.id] }); },
    onError: (e: any) => toast({ title: '승인 실패', description: e.message, variant: 'destructive' }),
  });
  const rejectMut = useMutation({
    mutationFn: async () => (await apiRequest('POST', `/api/risk-assessments/${ra.id}/reject`, { reason: rejReason })).json(),
    onSuccess: () => { toast({ title: '반려 처리' }); qc.invalidateQueries({ queryKey: ['risk-assessment', ra.id] }); },
    onError: (e: any) => toast({ title: '반려 실패', description: e.message, variant: 'destructive' }),
  });

  const SignatureBox = (
    <div className="flex items-center gap-2">
      <div className="h-14 w-32 border rounded bg-white flex items-center justify-center">
        {sig ? <img src={sig} alt="서명" className="h-full object-contain" />
             : <span className="text-xs text-muted-foreground">서명 없음</span>}
      </div>
      <Button variant="outline" size="sm" onClick={() => setSigDialogOpen(true)}>
        <Pen className="w-4 h-4 mr-1.5" />{sig ? '서명 다시' : '서명하기'}
      </Button>
    </div>
  );

  if (ra.status === 'DRAFT' || ra.status === 'REJECTED') {
    return (
      <>
        <div className="flex gap-3 flex-wrap items-center">
          {SignatureBox}
          <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending || !sig}>
            <Send className="w-4 h-4 mr-1.5" />{submitMut.isPending ? '제출 중...' : '제출(결재 요청)'}
          </Button>
          {!sig && <span className="text-xs text-muted-foreground">※ 작성자 서명을 먼저 입력하세요</span>}
        </div>
        <SignatureDialog isOpen={sigDialogOpen} onClose={() => setSigDialogOpen(false)} onSave={setSig} userName={userName} />
      </>
    );
  }
  if (ra.status === 'SUBMITTED' && isApprover) {
    return (
      <>
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap items-center">
            {SignatureBox}
            <Button onClick={() => approveMut.mutate()} disabled={approveMut.isPending || !sig}>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />{approveMut.isPending ? '승인 중...' : '승인'}
            </Button>
            {!sig && <span className="text-xs text-muted-foreground">※ 결재자 서명을 먼저 입력하세요</span>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Input value={rejReason} onChange={e => setRejReason(e.target.value)} placeholder="반려 사유" className="max-w-xs" />
            <Button variant="destructive" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
              <XCircle className="w-4 h-4 mr-1.5" />{rejectMut.isPending ? '반려 중...' : '반려'}
            </Button>
          </div>
        </div>
        <SignatureDialog isOpen={sigDialogOpen} onClose={() => setSigDialogOpen(false)} onSave={setSig} userName={userName} />
      </>
    );
  }
  if (ra.status === 'SUBMITTED') return <div className="text-sm text-muted-foreground">결재자 승인 대기 중입니다</div>;
  if (ra.status === 'APPROVED') return <div className="text-sm text-green-700">승인 완료 — 수정 불가 (조회만 가능)</div>;
  return null;
}

// ───────── 자동 저장 훅 ─────────
// data(의존성)이 바뀔 때마다 디바운스로 save() 호출. 첫 렌더는 skip.
type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
function useAutoSave(
  data: any,
  save: () => Promise<any>,
  options: { enabled?: boolean; delay?: number } = {}
) {
  const { enabled = true, delay = 2500 } = options;
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const firstRun = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (firstRun.current) { firstRun.current = false; return; }
    const timer = setTimeout(async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      setStatus('saving');
      try {
        await save();
        setStatus('saved');
        setLastSavedAt(new Date());
      } catch {
        setStatus('error');
      } finally {
        inFlight.current = false;
      }
    }, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), enabled]);

  return { status, lastSavedAt };
}

function AutoSaveBadge({ status, lastSavedAt }: { status: AutoSaveStatus; lastSavedAt: Date | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);
  if (status === 'idle' && !lastSavedAt) return null;
  if (status === 'saving') {
    return <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
      <Loader2 className="w-3 h-3 animate-spin" />자동 저장 중...
    </span>;
  }
  if (status === 'error') {
    return <span className="text-xs text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">⚠ 자동 저장 실패 (수동 저장 필요)</span>;
  }
  if (lastSavedAt) {
    const sec = Math.max(0, Math.round((now - lastSavedAt.getTime()) / 1000));
    const text = sec < 5 ? '방금' : sec < 60 ? `${sec}초 전` : sec < 3600 ? `${Math.floor(sec / 60)}분 전` : `${Math.floor(sec / 3600)}시간 전`;
    return <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />자동 저장됨 · {text}
    </span>;
  }
  return null;
}

// ───────── 담당부서 검색 Select (site 필터 + 이름 검색) ─────────
function TeamSearchSelect({ value, onChange, teams, site, disabled, placeholder = '담당부서 선택' }: {
  value: string;
  onChange: (teamId: string) => void;
  teams: Array<{ id: number; name: string; site: string }>;
  site?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    let arr = teams;
    if (site) arr = arr.filter(t => t.site === site);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter(t => t.name.toLowerCase().includes(needle));
    }
    return arr;
  }, [teams, site, q]);
  const selected = teams.find(t => String(t.id) === String(value));
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 px-3 border rounded-md text-left text-sm bg-background flex items-center justify-between disabled:opacity-50"
      >
        <span className={selected ? '' : 'text-muted-foreground'}>{selected ? selected.name : placeholder}</span>
        <span className="text-muted-foreground">▾</span>
      </button>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full border rounded-md bg-popover shadow-md max-h-[280px] overflow-hidden">
          <input
            type="text"
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="부서 이름 검색..."
            className="w-full px-3 py-2 text-sm border-b outline-none"
          />
          <div className="max-h-[220px] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">일치하는 부서 없음</div>
            )}
            {filtered.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onChange(String(t.id)); setOpen(false); setQ(''); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-accent ${String(value) === String(t.id) ? 'bg-accent/50 font-medium' : ''}`}
              >
                {t.name}
                <span className="ml-2 text-[10px] text-muted-foreground">[{t.site}]</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────── 공정 관리 패널 (상단, 엑셀/제출 옆) ─────────
function ProcessManagerPanel({ teamId, teamName, processes, readOnly, onChanged }: {
  teamId: number; teamName: string | undefined; processes: Array<{ id: number; name: string }>; readOnly: boolean; onChanged: () => void;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  const addMut = useMutation({
    mutationFn: async () => (await apiRequest('POST', '/api/work-processes', { teamId, name: name.trim() })).json(),
    onSuccess: () => { toast({ title: '공정 추가' }); setName(''); onChanged(); },
    onError: (e: any) => toast({ title: '추가 실패', description: e.message, variant: 'destructive' }),
  });
  const renameMut = useMutation({
    mutationFn: async () => (await apiRequest('PUT', `/api/work-processes/${editingId}`, { name: editName.trim() })).json(),
    onSuccess: () => { toast({ title: '공정 이름 변경' }); setEditingId(null); onChanged(); },
    onError: (e: any) => toast({ title: '변경 실패', description: e.message, variant: 'destructive' }),
  });
  const deleteMut = useMutation({
    mutationFn: async (id: number) => (await apiRequest('DELETE', `/api/work-processes/${id}`)).json(),
    onSuccess: (data: any) => { toast({ title: '처리됨', description: data?.message }); onChanged(); },
    onError: (e: any) => toast({ title: '삭제 실패', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="border rounded-md p-3 bg-muted/20 flex flex-col" style={{ maxHeight: '260px' }}>
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="text-sm font-semibold">공정 관리 ({teamName || '-'})</div>
        <span className="text-xs text-muted-foreground">{processes.length}개</span>
      </div>
      {!readOnly && (
        <div className="flex gap-2 mb-2 flex-shrink-0">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="새 공정명" />
          <Button size="sm" onClick={() => addMut.mutate()} disabled={!name.trim() || addMut.isPending}>
            <Plus className="w-4 h-4 mr-1" />추가
          </Button>
        </div>
      )}
      {/* 공정 리스트 — flex-1 min-h-0 로 남은 공간만 사용 후 스크롤 */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-1">
        {processes.length === 0 && <div className="text-xs text-muted-foreground py-3 text-center">공정이 없습니다. 추가하세요.</div>}
        {processes.map(p => (
          <div key={p.id} className="flex items-center gap-2 py-1 border-b last:border-b-0">
            {editingId === p.id ? (
              <>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-7 text-sm" />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => renameMut.mutate()}><CheckCircle2 className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><XCircle className="w-4 h-4" /></Button>
              </>
            ) : (
              <>
                <span className="text-sm flex-1 truncate">{p.name}</span>
                {!readOnly && (
                  <>
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="수정"
                      onClick={() => { setEditingId(p.id); setEditName(p.name); }}>
                      <Pen className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="삭제"
                      onClick={async () => {
                        const ok = await confirm({
                          title: '공정 삭제',
                          description: `"${p.name}" 공정을 삭제할까요?\n연결된 평가가 있으면 숨김(soft delete)만 됩니다.`,
                          confirmText: '삭제', destructive: true,
                        });
                        if (ok) deleteMut.mutate(p.id);
                      }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────── 사전/피드백 교육 공용 ─────────
function SectionEducation({ raId, data, teamMembers, readOnly, endpoint, title }: {
  raId: string; data: any; teamMembers: any[]; readOnly: boolean; endpoint: string; title: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [conductedAt, setConductedAt] = useState('');
  const [attendees, setAttendees] = useState<Array<{ name: string; department: string; signature: string; signedAt?: string; isAbsent?: boolean }>>([]);
  // 전자서명 다이얼로그 - 어떤 참여자에게 서명을 받을지 index 기억
  const [sigDialogIdx, setSigDialogIdx] = useState<number | null>(null);

  useEffect(() => {
    setConductedAt(data?.conductedAt ? String(data.conductedAt).slice(0, 10) : '');
    const existing = Array.isArray(data?.attendees) ? data.attendees : [];
    if (existing.length > 0) {
      setAttendees(existing);
    } else if (teamMembers.length > 0) {
      // 저장된 명단이 없고 팀 전체 명단(팀장+팀원+TeamMember)이 로드되면 기본값으로 주입
      setAttendees(teamMembers.map((m: any) => ({
        name: m.name, department: m.position || '', signature: '', isAbsent: false,
      })));
    } else {
      setAttendees([]);
    }
  }, [data, teamMembers]);

  const reloadFromTeam = () => {
    if (teamMembers.length === 0) {
      toast({ title: '팀 명단이 비어있습니다', variant: 'destructive' });
      return;
    }
    const existingNames = new Set(attendees.map(a => a.name));
    const toAdd = teamMembers
      .filter((m: any) => !existingNames.has(m.name))
      .map((m: any) => ({ name: m.name, department: m.position || '', signature: '', isAbsent: false }));
    if (toAdd.length === 0) {
      toast({ title: '추가할 신규 팀원이 없습니다' });
      return;
    }
    setAttendees([...attendees, ...toAdd]);
    toast({ title: `${toAdd.length}명 추가됨` });
  };

  const saveMut = useMutation({
    mutationFn: async () => (await apiRequest('PUT', `/api/risk-assessments/${raId}/${endpoint}`, { conductedAt: conductedAt || null, attendees })).json(),
    onSuccess: () => { toast({ title: '저장 완료' }); qc.invalidateQueries({ queryKey: ['risk-assessment', raId] }); },
    onError: (e: any) => toast({ title: '저장 실패', description: e.message, variant: 'destructive' }),
  });

  // 자동 저장 (readOnly 아닐 때, 참여자 명단이나 교육 실시일 변경 시 2.5초 디바운스)
  const autoSave = useAutoSave(
    { conductedAt, attendees },
    () => apiRequest('PUT', `/api/risk-assessments/${raId}/${endpoint}`, { conductedAt: conductedAt || null, attendees }),
    { enabled: !readOnly }
  );

  const update = (i: number, patch: any) => setAttendees(a => a.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const add = () => setAttendees(a => [...a, { name: '', department: '', signature: '', isAbsent: false }]);
  const remove = (i: number) => setAttendees(a => a.filter((_, idx) => idx !== i));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">{title} — 참여자 서명</CardTitle>
          <AutoSaveBadge status={autoSave.status} lastSavedAt={autoSave.lastSavedAt} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <Label>교육 실시일</Label>
            <Input type="date" value={conductedAt} onChange={e => setConductedAt(e.target.value)} disabled={readOnly} />
          </div>
          {!readOnly && (
            <>
              <Button variant="outline" size="sm" onClick={reloadFromTeam} title="팀장 + 팀원(User) + TeamMember 전부 불러오기 (중복 제외)">
                팀 명단 불러오기
              </Button>
              <Button variant="outline" size="sm" onClick={add}><Plus className="w-4 h-4 mr-1.5" />참여자 추가</Button>
            </>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            현재 {attendees.length}명 · 팀 전체 {teamMembers.length}명
          </span>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>부서/공정</TableHead>
                <TableHead>성명</TableHead>
                <TableHead className="w-48">전자서명</TableHead>
                <TableHead className="w-20">미참석</TableHead>
                {!readOnly && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendees.map((a, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell><Input value={a.department} onChange={e => update(i, { department: e.target.value })} disabled={readOnly} /></TableCell>
                  <TableCell><Input value={a.name} onChange={e => update(i, { name: e.target.value })} disabled={readOnly} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-24 border rounded bg-white flex items-center justify-center">
                        {a.signature
                          ? <img src={a.signature} alt="서명" className="h-full object-contain" />
                          : <span className="text-[10px] text-muted-foreground">서명 없음</span>}
                      </div>
                      {!readOnly && !a.isAbsent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSigDialogIdx(i)}
                          title={a.signature ? '서명 다시 입력' : '전자서명 입력'}
                        >
                          <Pen className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {a.signature && !readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => update(i, { signature: '', signedAt: undefined })}
                          title="서명 지우기"
                          className="text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><input type="checkbox" checked={a.isAbsent} onChange={e => update(i, { isAbsent: e.target.checked, signature: e.target.checked ? '' : a.signature })} disabled={readOnly} /></TableCell>
                  {!readOnly && <TableCell><Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* 전자서명 다이얼로그 */}
        <SignatureDialog
          isOpen={sigDialogIdx !== null}
          onClose={() => setSigDialogIdx(null)}
          onSave={(sig) => {
            if (sigDialogIdx !== null) {
              update(sigDialogIdx, { signature: sig, signedAt: new Date().toISOString() });
            }
            setSigDialogIdx(null);
          }}
          userName={sigDialogIdx !== null ? (attendees[sigDialogIdx]?.name || '참여자') : '참여자'}
        />
        {!readOnly && (
          <div className="pt-2 flex justify-end">
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              <Save className="w-4 h-4 mr-1.5" />{saveMut.isPending ? '저장 중...' : '저장'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ───────── 2. 의견·토론 ─────────
function SectionWorkerOpinions({ raId, data, processes, readOnly }: { raId: string; data: any[]; processes: Array<{ id: number; name: string }>; readOnly: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { setItems(data || []); }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => (await apiRequest('PUT', `/api/risk-assessments/${raId}/worker-opinions`, { items })).json(),
    onSuccess: () => { toast({ title: '저장 완료' }); qc.invalidateQueries({ queryKey: ['risk-assessment', raId] }); },
    onError: (e: any) => toast({ title: '저장 실패', description: e.message, variant: 'destructive' }),
  });
  const autoSave = useAutoSave(items, () => apiRequest('PUT', `/api/risk-assessments/${raId}/worker-opinions`, { items }), { enabled: !readOnly });

  const update = (i: number, k: string, v: any) => setItems(items.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const updateProcess = (i: number, pid: string) => {
    const p = processes.find(x => x.id === parseInt(pid));
    setItems(items.map((x, idx) => idx === i ? { ...x, processId: p?.id ?? null, workContent: p?.name ?? x.workContent } : x));
  };
  const add = () => setItems([...items, { processId: null, workContent: '', hazardFactor: '', currentAction: '', riskLevel: '', improvement: '', participantsSig: [], remarks: '' }]);
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base">근로자 의견·토론</CardTitle>
            <CardDescription>작업내용별 유해위험요인 + 위험성 수준 (상·중·하) + 개선대책</CardDescription>
          </div>
          <AutoSaveBadge status={autoSave.status} lastSavedAt={autoSave.lastSavedAt} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          {!readOnly && <Button variant="outline" size="sm" onClick={add}><Plus className="w-4 h-4 mr-1.5" />항목 추가</Button>}
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-40">공정 (작업내용·기계기구)</TableHead>
                <TableHead>유해위험요인</TableHead>
                <TableHead>현재 안전조치</TableHead>
                <TableHead className="w-20">위험성</TableHead>
                <TableHead>추가 개선대책</TableHead>
                <TableHead>비고</TableHead>
                {!readOnly && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Select value={it.processId ? String(it.processId) : ''} onValueChange={v => updateProcess(i, v)} disabled={readOnly}>
                      <SelectTrigger><SelectValue placeholder="공정 선택" /></SelectTrigger>
                      <SelectContent className="max-h-[280px]">
                        {processes.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">상단에서 공정을 먼저 추가하세요</div>}
                        {processes.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Textarea rows={2} value={it.hazardFactor || ''} onChange={e => update(i, 'hazardFactor', e.target.value)} disabled={readOnly} /></TableCell>
                  <TableCell><Textarea rows={2} value={it.currentAction || ''} onChange={e => update(i, 'currentAction', e.target.value)} disabled={readOnly} /></TableCell>
                  <TableCell>
                    <Select value={it.riskLevel || ''} onValueChange={v => update(i, 'riskLevel', v)} disabled={readOnly}>
                      <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="상">상</SelectItem>
                        <SelectItem value="중">중</SelectItem>
                        <SelectItem value="하">하</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Textarea rows={2} value={it.improvement || ''} onChange={e => update(i, 'improvement', e.target.value)} disabled={readOnly} /></TableCell>
                  <TableCell><Input value={it.remarks || ''} onChange={e => update(i, 'remarks', e.target.value)} disabled={readOnly} /></TableCell>
                  {!readOnly && <TableCell><Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>}
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={readOnly ? 7 : 8} className="text-center text-muted-foreground py-6">항목이 없습니다</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        {!readOnly && <div className="pt-2 flex justify-end"><Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="w-4 h-4 mr-1.5" />{saveMut.isPending ? '저장 중...' : '저장'}</Button></div>}
      </CardContent>
    </Card>
  );
}

// ───────── 3. 안전보건정보 — 다중 조사표 Wrapper ─────────
function SectionSafetyInfos({ raId, infos, processes, readOnly }: {
  raId: string; infos: any[]; processes: Array<{ id: number; name: string }>; readOnly: boolean;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [activeId, setActiveId] = useState<string | null>(null);

  // 선택된 조사표가 없으면 첫 번째 자동 선택
  useEffect(() => {
    if (infos.length > 0 && (!activeId || !infos.find(x => x.id === activeId))) {
      setActiveId(infos[0].id);
    } else if (infos.length === 0) {
      setActiveId(null);
    }
  }, [infos, activeId]);

  const addMut = useMutation({
    mutationFn: async () => (await apiRequest('POST', `/api/risk-assessments/${raId}/safety-infos`, {})).json(),
    onSuccess: (data: any) => {
      toast({ title: '조사표 추가됨' });
      qc.invalidateQueries({ queryKey: ['risk-assessment', raId] });
      setActiveId(data.id);
    },
    onError: (e: any) => toast({ title: '추가 실패', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: async (infoId: string) => (await apiRequest('DELETE', `/api/risk-assessments/${raId}/safety-infos/${infoId}`)).json(),
    onSuccess: () => {
      toast({ title: '조사표 삭제됨' });
      qc.invalidateQueries({ queryKey: ['risk-assessment', raId] });
    },
    onError: (e: any) => toast({ title: '삭제 실패', description: e.message, variant: 'destructive' }),
  });

  const activeInfo = infos.find(x => x.id === activeId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">안전보건정보 조사표</CardTitle>
          {!readOnly && (
            <Button size="sm" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
              <Plus className="w-4 h-4 mr-1.5" />
              조사표 추가
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* 조사표 탭 네비 */}
        {infos.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-4 border-b pb-2">
            {infos.map((info, i) => (
              <div key={info.id} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveId(info.id)}
                  className={`px-3 py-1.5 text-sm rounded-md ${activeId === info.id ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-accent'}`}
                >
                  {info.title || `조사표 ${i + 1}`}
                </button>
                {!readOnly && infos.length > 1 && activeId === info.id && (
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await confirm({
                        title: '조사표 삭제',
                        description: `"${info.title || `조사표 ${i + 1}`}"을 삭제할까요? 이 조사표의 모든 내용(공정·화학물질·체크리스트)이 영구 삭제됩니다.`,
                        confirmText: '삭제',
                        destructive: true,
                      });
                      if (ok) deleteMut.mutate(info.id);
                    }}
                    className="ml-1 w-6 h-6 rounded hover:bg-destructive/10 text-destructive flex items-center justify-center"
                    title="이 조사표 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {infos.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            조사표가 없습니다. 상단의 <b>조사표 추가</b> 버튼을 눌러 작성하세요.
          </div>
        ) : activeInfo ? (
          <SectionSafetyInfo
            key={activeInfo.id}
            raId={raId}
            infoId={activeInfo.id}
            data={activeInfo}
            processes={processes}
            readOnly={readOnly}
            onTitleChange={(title) => qc.invalidateQueries({ queryKey: ['risk-assessment', raId] })}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function SectionSafetyInfo({ raId, infoId, data, processes, readOnly, onTitleChange }: {
  raId: string; infoId: string; data: any; processes: Array<{ id: number; name: string }>; readOnly: boolean;
  onTitleChange?: (title: string) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [rawMaterial, setRawMaterial] = useState('');
  const [product, setProduct] = useState('');
  const [workerCount, setWorkerCount] = useState('');
  const [processSteps, setProcessSteps] = useState<any[]>([]);
  // checklist 값: single은 string, multi는 string[]
  const [checklist, setChecklist] = useState<Record<string, string | string[]>>({});

  useEffect(() => {
    setTitle(data?.title || '');
    setRawMaterial(data?.rawMaterial || '');
    setProduct(data?.product || '');
    setWorkerCount(data?.workerCount != null ? String(data.workerCount) : '');
    setProcessSteps(Array.isArray(data?.processSteps) ? data.processSteps : []);
    setChecklist(data?.checklist && typeof data.checklist === 'object' ? data.checklist : {});
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => (await apiRequest('PUT', `/api/risk-assessments/${raId}/safety-infos/${infoId}`, {
      title, rawMaterial, product, workerCount: workerCount || null, processSteps, checklist,
    })).json(),
    onSuccess: () => { toast({ title: '저장 완료' }); qc.invalidateQueries({ queryKey: ['risk-assessment', raId] }); },
    onError: (e: any) => toast({ title: '저장 실패', description: e.message, variant: 'destructive' }),
  });
  const autoSave = useAutoSave(
    { title, rawMaterial, product, workerCount, processSteps, checklist },
    () => apiRequest('PUT', `/api/risk-assessments/${raId}/safety-infos/${infoId}`, {
      title, rawMaterial, product, workerCount: workerCount || null, processSteps, checklist,
    }),
    { enabled: !readOnly }
  );

  const addStep = () => setProcessSteps([...processSteps, { order: processSteps.length + 1, processId: null, description: '', equipment: [], chemicals: [] }]);
  const removeStep = (i: number) => setProcessSteps(processSteps.filter((_, idx) => idx !== i));
  const updateStepProcess = (i: number, pid: string) => {
    const p = processes.find(x => x.id === parseInt(pid));
    setProcessSteps(processSteps.map((x, idx) => idx === i ? { ...x, processId: p?.id ?? null, description: x.description || p?.name || '' } : x));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AutoSaveBadge status={autoSave.status} lastSavedAt={autoSave.lastSavedAt} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-1"><Label>조사표 제목</Label><Input value={title} onChange={e => setTitle(e.target.value)} disabled={readOnly} placeholder="예: 조사표 1" /></div>
        <div><Label>원재료</Label><Input value={rawMaterial} onChange={e => setRawMaterial(e.target.value)} disabled={readOnly} /></div>
        <div><Label>생산품</Label><Input value={product} onChange={e => setProduct(e.target.value)} disabled={readOnly} /></div>
        <div><Label>근로자수</Label><Input type="number" value={workerCount} onChange={e => setWorkerCount(e.target.value)} disabled={readOnly} /></div>
      </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>공정 순서</Label>
            {!readOnly && <Button variant="outline" size="sm" onClick={addStep}><Plus className="w-4 h-4 mr-1.5" />공정 추가</Button>}
          </div>
          <div className="space-y-2">
            {processSteps.map((s, i) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">#{i + 1}</span>
                    <div className="w-48">
                      <Select value={s.processId ? String(s.processId) : ''} onValueChange={v => updateStepProcess(i, v)} disabled={readOnly}>
                        <SelectTrigger><SelectValue placeholder="공정 선택" /></SelectTrigger>
                        <SelectContent className="max-h-[280px]">
                          {processes.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">상단에서 공정을 먼저 추가하세요</div>}
                          {processes.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input placeholder="공정 설명 (선택)" value={s.description || ''} onChange={e => setProcessSteps(processSteps.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} disabled={readOnly} />
                    {!readOnly && <Button variant="ghost" size="icon" onClick={() => removeStep(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 기계·기구·설비 — 설비명 + 수량 */}
                    <div className="border rounded-md p-2 bg-background">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-semibold">기계·기구·설비</Label>
                        {!readOnly && (
                          <Button
                            type="button" variant="outline" size="sm"
                            onClick={() => setProcessSteps(processSteps.map((x, idx) => idx === i
                              ? { ...x, equipment: [...(x.equipment || []), { name: '', qty: 1 }] } : x))}
                          >
                            <Plus className="w-3 h-3 mr-1" />추가
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="grid grid-cols-[1fr_80px_32px] gap-1 text-[11px] text-muted-foreground px-1">
                          <span>설비명</span><span>수량</span><span></span>
                        </div>
                        {(s.equipment || []).map((eq: any, k: number) => (
                          <div key={k} className="grid grid-cols-[1fr_80px_32px] gap-1 items-center">
                            <Input
                              className="h-8 text-sm"
                              placeholder="설비명"
                              value={eq.name || ''}
                              disabled={readOnly}
                              onChange={e => {
                                const name = e.target.value;
                                setProcessSteps(processSteps.map((x, idx) => idx === i
                                  ? { ...x, equipment: (x.equipment || []).map((it: any, kk: number) => kk === k ? { ...it, name } : it) } : x));
                              }}
                            />
                            <Input
                              className="h-8 text-sm"
                              placeholder="수량"
                              type="number"
                              value={eq.qty ?? ''}
                              disabled={readOnly}
                              onChange={e => {
                                const qty = e.target.value === '' ? '' : parseInt(e.target.value);
                                setProcessSteps(processSteps.map((x, idx) => idx === i
                                  ? { ...x, equipment: (x.equipment || []).map((it: any, kk: number) => kk === k ? { ...it, qty } : it) } : x));
                              }}
                            />
                            {!readOnly && (
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => setProcessSteps(processSteps.map((x, idx) => idx === i
                                  ? { ...x, equipment: (x.equipment || []).filter((_: any, kk: number) => kk !== k) } : x))}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {(s.equipment || []).length === 0 && (
                          <div className="text-[11px] text-muted-foreground text-center py-2">설비 없음</div>
                        )}
                      </div>
                    </div>

                    {/* 유해화학물질 — 명칭 + 취급량/일 + 취급시간 */}
                    <div className="border rounded-md p-2 bg-background">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-semibold">유해화학물질</Label>
                        {!readOnly && (
                          <Button
                            type="button" variant="outline" size="sm"
                            onClick={() => setProcessSteps(processSteps.map((x, idx) => idx === i
                              ? { ...x, chemicals: [...(x.chemicals || []), { name: '', dailyAmount: '', duration: '' }] } : x))}
                          >
                            <Plus className="w-3 h-3 mr-1" />추가
                          </Button>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="grid grid-cols-[1.3fr_1fr_1fr_32px] gap-1 text-[11px] text-muted-foreground px-1">
                          <span>화학물질명</span><span>취급량/일</span><span>취급시간</span><span></span>
                        </div>
                        {(s.chemicals || []).map((ch: any, k: number) => (
                          <div key={k} className="grid grid-cols-[1.3fr_1fr_1fr_32px] gap-1 items-center">
                            <Input className="h-8 text-sm" placeholder="예: LOCTITE 242" value={ch.name || ''} disabled={readOnly}
                              onChange={e => {
                                const name = e.target.value;
                                setProcessSteps(processSteps.map((x, idx) => idx === i
                                  ? { ...x, chemicals: (x.chemicals || []).map((it: any, kk: number) => kk === k ? { ...it, name } : it) } : x));
                              }} />
                            <Input className="h-8 text-sm" placeholder="예: 250ml" value={ch.dailyAmount || ''} disabled={readOnly}
                              onChange={e => {
                                const dailyAmount = e.target.value;
                                setProcessSteps(processSteps.map((x, idx) => idx === i
                                  ? { ...x, chemicals: (x.chemicals || []).map((it: any, kk: number) => kk === k ? { ...it, dailyAmount } : it) } : x));
                              }} />
                            <Input className="h-8 text-sm" placeholder="예: 30분" value={ch.duration || ''} disabled={readOnly}
                              onChange={e => {
                                const duration = e.target.value;
                                setProcessSteps(processSteps.map((x, idx) => idx === i
                                  ? { ...x, chemicals: (x.chemicals || []).map((it: any, kk: number) => kk === k ? { ...it, duration } : it) } : x));
                              }} />
                            {!readOnly && (
                              <Button variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => setProcessSteps(processSteps.map((x, idx) => idx === i
                                  ? { ...x, chemicals: (x.chemicals || []).filter((_: any, kk: number) => kk !== k) } : x))}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {(s.chemicals || []).length === 0 && (
                          <div className="text-[11px] text-muted-foreground text-center py-2">화학물질 없음</div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <Label>그 밖의 유해위험정보 체크리스트</Label>
          <div className="space-y-1 mt-2">
            {CHECKLIST_ITEMS.map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-2 border-b py-2">
                <span className="text-sm flex-1 whitespace-pre-wrap">{item.label}</span>
                {item.type === 'single' ? (
                  <Select value={(checklist[item.key] as string) || ''} onValueChange={v => setChecklist({ ...checklist, [item.key]: v })} disabled={readOnly}>
                    <SelectTrigger className="w-28"><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="유">유</SelectItem>
                      <SelectItem value="무">무</SelectItem>
                      <SelectItem value="해당없음">해당없음</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 max-w-[60%] justify-end">
                    {(item.options || []).map((opt) => {
                      const current = Array.isArray(checklist[item.key]) ? (checklist[item.key] as string[]) : [];
                      const isChecked = current.includes(opt);
                      return (
                        <label key={opt} className="inline-flex items-center gap-1.5 text-sm cursor-pointer whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={isChecked}
                            disabled={readOnly}
                            onChange={e => {
                              const next = e.target.checked
                                ? [...current, opt]
                                : current.filter(x => x !== opt);
                              setChecklist({ ...checklist, [item.key]: next });
                            }}
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {!readOnly && <div className="pt-2 flex justify-end"><Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="w-4 h-4 mr-1.5" />{saveMut.isPending ? '저장 중...' : '저장'}</Button></div>}
    </div>
  );
}

// ───────── 4. 위험성평가 ─────────
function SectionEvaluations({ raId, data, teams, processes, raSite, readOnly }: { raId: string; data: any[]; teams: any[]; processes: Array<{ id: number; name: string }>; raSite?: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { setItems(data || []); }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => (await apiRequest('PUT', `/api/risk-assessments/${raId}/evaluations`, { items })).json(),
    onSuccess: () => { toast({ title: '저장 완료' }); qc.invalidateQueries({ queryKey: ['risk-assessment', raId] }); },
    onError: (e: any) => toast({ title: '저장 실패', description: e.message, variant: 'destructive' }),
  });
  const autoSave = useAutoSave(items, () => apiRequest('PUT', `/api/risk-assessments/${raId}/evaluations`, { items }), { enabled: !readOnly });

  const update = (i: number, k: string, v: any) => setItems(items.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const updateProcess = (i: number, pid: string) => {
    const p = processes.find(x => x.id === parseInt(pid));
    setItems(items.map((x, idx) => idx === i ? { ...x, processId: p?.id ?? null, workContent: p?.name ?? x.workContent } : x));
  };
  const add = () => setItems([...items, { processId: null, workContent: '', hazardFactor: '', currentAction: '', riskLevel: '', improvement: '', responsibleTeamId: null, responsibleName: '', scheduledDate: null, completedDate: null, remarks: '' }]);
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const fmtDate = (d: any) => d ? String(d).slice(0, 10) : '';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">위험성평가 (3단계 평가법)</CardTitle>
          <AutoSaveBadge status={autoSave.status} lastSavedAt={autoSave.lastSavedAt} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!readOnly && <Button variant="outline" size="sm" onClick={add}><Plus className="w-4 h-4 mr-1.5" />항목 추가</Button>}
        <div className="overflow-x-auto">
          <Table className="min-w-[1400px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead className="w-40">공정(작업내용)</TableHead>
                <TableHead>유해위험요인</TableHead>
                <TableHead>현재 안전조치</TableHead>
                <TableHead className="w-20">위험성</TableHead>
                <TableHead>개선대책</TableHead>
                <TableHead className="w-32">담당부서</TableHead>
                <TableHead>담당자</TableHead>
                <TableHead className="w-32">예정일</TableHead>
                <TableHead className="w-32">완료일</TableHead>
                {!readOnly && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it, i) => (
                <TableRow key={i}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Select value={it.processId ? String(it.processId) : ''} onValueChange={v => updateProcess(i, v)} disabled={readOnly}>
                      <SelectTrigger><SelectValue placeholder="공정 선택" /></SelectTrigger>
                      <SelectContent className="max-h-[280px]">
                        {processes.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">상단에서 공정을 먼저 추가하세요</div>}
                        {processes.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Textarea rows={2} value={it.hazardFactor || ''} onChange={e => update(i, 'hazardFactor', e.target.value)} disabled={readOnly} /></TableCell>
                  <TableCell><Textarea rows={2} value={it.currentAction || ''} onChange={e => update(i, 'currentAction', e.target.value)} disabled={readOnly} /></TableCell>
                  <TableCell>
                    <Select value={it.riskLevel || ''} onValueChange={v => update(i, 'riskLevel', v)} disabled={readOnly}>
                      <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="상">상</SelectItem>
                        <SelectItem value="중">중</SelectItem>
                        <SelectItem value="하">하</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Textarea rows={2} value={it.improvement || ''} onChange={e => update(i, 'improvement', e.target.value)} disabled={readOnly} /></TableCell>
                  <TableCell>
                    <TeamSearchSelect
                      value={it.responsibleTeamId ? String(it.responsibleTeamId) : ''}
                      onChange={(v) => update(i, 'responsibleTeamId', v ? parseInt(v) : null)}
                      teams={teams}
                      site={raSite}
                      disabled={readOnly}
                    />
                  </TableCell>
                  <TableCell><Input value={it.responsibleName || ''} onChange={e => update(i, 'responsibleName', e.target.value)} disabled={readOnly} /></TableCell>
                  <TableCell><Input type="date" value={fmtDate(it.scheduledDate)} onChange={e => update(i, 'scheduledDate', e.target.value || null)} disabled={readOnly} /></TableCell>
                  <TableCell><Input type="date" value={fmtDate(it.completedDate)} onChange={e => update(i, 'completedDate', e.target.value || null)} disabled={readOnly} /></TableCell>
                  {!readOnly && <TableCell><Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>}
                </TableRow>
              ))}
              {items.length === 0 && <TableRow><TableCell colSpan={readOnly ? 10 : 11} className="text-center text-muted-foreground py-6">항목이 없습니다</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
        {!readOnly && <div className="pt-2 flex justify-end"><Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="w-4 h-4 mr-1.5" />{saveMut.isPending ? '저장 중...' : '저장'}</Button></div>}
      </CardContent>
    </Card>
  );
}

// ───────── 5. 개선실행 ─────────
function SectionImprovements({ raId, data, evaluations, teams, processes, raSite, readOnly }: { raId: string; data: any[]; evaluations: any[]; teams: any[]; processes: Array<{ id: number; name: string }>; raSite?: string; readOnly: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { setItems(data || []); }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => (await apiRequest('PUT', `/api/risk-assessments/${raId}/improvements`, { items })).json(),
    onSuccess: () => { toast({ title: '저장 완료' }); qc.invalidateQueries({ queryKey: ['risk-assessment', raId] }); },
    onError: (e: any) => toast({ title: '저장 실패', description: e.message, variant: 'destructive' }),
  });
  const autoSave = useAutoSave(items, () => apiRequest('PUT', `/api/risk-assessments/${raId}/improvements`, { items }), { enabled: !readOnly });

  const update = (i: number, k: string, v: any) => setItems(items.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const updateProcess = (i: number, pid: string) => {
    const p = processes.find(x => x.id === parseInt(pid));
    setItems(items.map((x, idx) => idx === i ? { ...x, processId: p?.id ?? null, processName: p?.name ?? x.processName } : x));
  };
  const add = () => setItems([...items, { processId: null, processName: '', hazardFactor: '', reductionPlan: '', responsibleTeamId: null, responsibleName: '', actionResult: '진행중', improvedDate: null, beforePhotos: [], afterPhotos: [], remarks: '' }]);
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const fmtDate = (d: any) => d ? String(d).slice(0, 10) : '';

  // 위험성평가 항목을 선택해 개선실행 1건에 자동 채우기
  const importFromEval = (i: number, evalIndex: number) => {
    const ev = evaluations[evalIndex];
    if (!ev) return;
    setItems(items.map((x, idx) => idx === i ? {
      ...x,
      processId: ev.processId ?? x.processId,
      processName: ev.workContent ?? x.processName,
      hazardFactor: ev.hazardFactor ?? x.hazardFactor,
      reductionPlan: ev.improvement ?? x.reductionPlan,
      responsibleTeamId: ev.responsibleTeamId ?? x.responsibleTeamId,
      responsibleName: ev.responsibleName ?? x.responsibleName,
    } : x));
    toast({ title: '위험성평가 항목에서 자동 채움', description: `${evalIndex + 1}번 항목의 공정·유해위험요인·개선대책·담당부서를 불러왔습니다` });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">개선실행 (조치결과·사진 전후)</CardTitle>
          <AutoSaveBadge status={autoSave.status} lastSavedAt={autoSave.lastSavedAt} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!readOnly && <Button variant="outline" size="sm" onClick={add}><Plus className="w-4 h-4 mr-1.5" />항목 추가</Button>}
        {items.map((it, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <span className="text-sm font-semibold">#{i + 1}</span>
                {!readOnly && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* 위험성평가에서 불러오기 */}
                    {evaluations.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">위험성평가에서 불러오기:</span>
                        <Select
                          value=""
                          onValueChange={(v) => importFromEval(i, parseInt(v))}
                        >
                          <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="평가 항목 선택..." /></SelectTrigger>
                          <SelectContent className="max-h-[300px]">
                            {evaluations.map((ev, idx) => (
                              <SelectItem key={idx} value={String(idx)}>
                                {idx + 1}. {ev.workContent?.slice(0, 20) || '-'}
                                {ev.hazardFactor ? ` · ${ev.hazardFactor.slice(0, 20)}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>단위공정</Label>
                  <Select value={it.processId ? String(it.processId) : ''} onValueChange={v => updateProcess(i, v)} disabled={readOnly}>
                    <SelectTrigger><SelectValue placeholder="공정 선택" /></SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {processes.length === 0 && <div className="px-2 py-3 text-xs text-muted-foreground">상단에서 공정을 먼저 추가하세요</div>}
                      {processes.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>조치결과</Label>
                  <Select value={it.actionResult || ''} onValueChange={v => update(i, 'actionResult', v)} disabled={readOnly}>
                    <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="진행중">진행중</SelectItem>
                      <SelectItem value="조치완료">조치완료</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2"><Label>유해위험요인</Label><Textarea rows={2} value={it.hazardFactor || ''} onChange={e => update(i, 'hazardFactor', e.target.value)} disabled={readOnly} /></div>
                <div className="md:col-span-2"><Label>감소대책</Label><Textarea rows={2} value={it.reductionPlan || ''} onChange={e => update(i, 'reductionPlan', e.target.value)} disabled={readOnly} /></div>
                <div>
                  <Label>담당부서</Label>
                  <TeamSearchSelect
                    value={it.responsibleTeamId ? String(it.responsibleTeamId) : ''}
                    onChange={v => update(i, 'responsibleTeamId', v ? parseInt(v) : null)}
                    teams={teams}
                    site={raSite}
                    disabled={readOnly}
                  />
                </div>
                <div><Label>담당자</Label><Input value={it.responsibleName || ''} onChange={e => update(i, 'responsibleName', e.target.value)} disabled={readOnly} /></div>
                <div><Label>개선일자</Label><Input type="date" value={fmtDate(it.improvedDate)} onChange={e => update(i, 'improvedDate', e.target.value || null)} disabled={readOnly} /></div>
                <div><Label>비고</Label><Input value={it.remarks || ''} onChange={e => update(i, 'remarks', e.target.value)} disabled={readOnly} /></div>
              </div>
              {/* 조치결과에 따라 Ctrl+V 붙여넣기 영역 결정:
                  진행중 → 개선 전 사진에만 paste 수신
                  조치완료 → 개선 후 사진에만 paste 수신 */}
              <PhotoDropzone
                label="개선 전 사진"
                value={it.beforePhotos || []}
                onChange={v => update(i, 'beforePhotos', v)}
                disabled={readOnly}
                acceptPaste={it.actionResult !== '조치완료'}
              />
              <PhotoDropzone
                label="개선 후 사진"
                value={it.afterPhotos || []}
                onChange={v => update(i, 'afterPhotos', v)}
                disabled={readOnly}
                acceptPaste={it.actionResult === '조치완료'}
              />
              <div className="text-[11px] text-muted-foreground">
                💡 Ctrl+V 로 캡쳐 붙여넣기: 조치결과가 <b>진행중</b>이면 <b>개선 전</b> 사진으로, <b>조치완료</b>면 <b>개선 후</b> 사진으로 들어갑니다.
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <div className="text-center text-muted-foreground py-6">항목이 없습니다</div>}
        {!readOnly && <div className="pt-2 flex justify-end"><Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="w-4 h-4 mr-1.5" />{saveMut.isPending ? '저장 중...' : '저장'}</Button></div>}
      </CardContent>
    </Card>
  );
}
