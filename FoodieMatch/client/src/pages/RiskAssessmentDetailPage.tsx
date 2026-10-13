/**
 * 위험성평가 상세 — 6개 섹션 탭 + 제출/승인/반려 + Excel 다운로드
 */
import { useState, useEffect, useMemo } from 'react';
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
import { ArrowLeft, Save, Send, CheckCircle2, XCircle, Download, Plus, Trash2 } from 'lucide-react';

const CHECKLIST_ITEMS = [
  '작업표준·절차에 관한 정보',
  '기계·기구 및 설비의 사양서',
  '물질안전보건자료 등의 유해위험요인 정보',
  '도급(일부, 전부 또는 혼재작업)',
  '재해사례, 재해통계 등에 관한 정보',
  '중량물 인력취급 (들기/밀기/끌기)',
  '작업환경측정 (측정/미측정/해당무)',
  '근로자 건강진단 유무',
  '근로자 구성 및 경력특성',
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
                    description: `${ra.site} / ${ra.team?.name} / ${ra.processName}\n이 평가를 영구 삭제할까요?\n\n⚠ 6개 섹션·사진·서명·버전 이력 모두 삭제됩니다.`,
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
              {ra.site} · {ra.team?.name} · {ra.processName}
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
            <SubmitApproveBar ra={ra} isApprover={isApprover} />
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
          <TabsContent value="opinion"><SectionWorkerOpinions raId={id!} data={ra.workerOpinions || []} teamMembers={teamMembers} readOnly={isReadOnly} /></TabsContent>
          <TabsContent value="info"><SectionSafetyInfo raId={id!} data={ra.safetyInfo} readOnly={isReadOnly} /></TabsContent>
          <TabsContent value="eval"><SectionEvaluations raId={id!} data={ra.evaluations || []} teams={teams} readOnly={isReadOnly} /></TabsContent>
          <TabsContent value="imp"><SectionImprovements raId={id!} data={ra.improvements || []} teams={teams} readOnly={isReadOnly} /></TabsContent>
          <TabsContent value="feedback"><SectionEducation raId={id!} data={ra.feedbackEducation} teamMembers={teamMembers} readOnly={isReadOnly} endpoint="feedback-education" title="피드백교육" /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function SubmitApproveBar({ ra, isApprover }: { ra: any; isApprover: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [sig, setSig] = useState('');
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

  if (ra.status === 'DRAFT' || ra.status === 'REJECTED') {
    return (
      <div className="flex gap-2 flex-wrap items-center">
        <Input value={sig} onChange={e => setSig(e.target.value)} placeholder="작성자 서명 텍스트 (선택)" className="max-w-xs" />
        <Button onClick={() => submitMut.mutate()} disabled={submitMut.isPending}>
          <Send className="w-4 h-4 mr-1.5" />{submitMut.isPending ? '제출 중...' : '제출(결재 요청)'}
        </Button>
      </div>
    );
  }
  if (ra.status === 'SUBMITTED' && isApprover) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2 flex-wrap">
          <Input value={sig} onChange={e => setSig(e.target.value)} placeholder="결재자 서명 (선택)" className="max-w-xs" />
          <Button onClick={() => approveMut.mutate()} disabled={approveMut.isPending}>
            <CheckCircle2 className="w-4 h-4 mr-1.5" />{approveMut.isPending ? '승인 중...' : '승인'}
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input value={rejReason} onChange={e => setRejReason(e.target.value)} placeholder="반려 사유" className="max-w-xs" />
          <Button variant="destructive" onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending}>
            <XCircle className="w-4 h-4 mr-1.5" />{rejectMut.isPending ? '반려 중...' : '반려'}
          </Button>
        </div>
      </div>
    );
  }
  if (ra.status === 'SUBMITTED') return <div className="text-sm text-muted-foreground">결재자 승인 대기 중입니다</div>;
  if (ra.status === 'APPROVED') return <div className="text-sm text-green-700">승인 완료 — 수정 불가 (조회만 가능)</div>;
  return null;
}

// ───────── 사전/피드백 교육 공용 ─────────
function SectionEducation({ raId, data, teamMembers, readOnly, endpoint, title }: {
  raId: string; data: any; teamMembers: any[]; readOnly: boolean; endpoint: string; title: string;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [conductedAt, setConductedAt] = useState('');
  const [attendees, setAttendees] = useState<Array<{ name: string; department: string; signature: string; signedAt?: string; isAbsent?: boolean }>>([]);

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

  const update = (i: number, patch: any) => setAttendees(a => a.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  const add = () => setAttendees(a => [...a, { name: '', department: '', signature: '', isAbsent: false }]);
  const remove = (i: number) => setAttendees(a => a.filter((_, idx) => idx !== i));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title} — 참여자 서명</CardTitle>
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
                <TableHead>서명 텍스트</TableHead>
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
                  <TableCell><Input value={a.signature} onChange={e => update(i, { signature: e.target.value, signedAt: e.target.value ? new Date().toISOString() : undefined })} disabled={readOnly || a.isAbsent} placeholder="서명 or 사인" /></TableCell>
                  <TableCell><input type="checkbox" checked={a.isAbsent} onChange={e => update(i, { isAbsent: e.target.checked })} disabled={readOnly} /></TableCell>
                  {!readOnly && <TableCell><Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button></TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
function SectionWorkerOpinions({ raId, data, teamMembers, readOnly }: { raId: string; data: any[]; teamMembers: any[]; readOnly: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { setItems(data || []); }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => (await apiRequest('PUT', `/api/risk-assessments/${raId}/worker-opinions`, { items })).json(),
    onSuccess: () => { toast({ title: '저장 완료' }); qc.invalidateQueries({ queryKey: ['risk-assessment', raId] }); },
    onError: (e: any) => toast({ title: '저장 실패', description: e.message, variant: 'destructive' }),
  });

  const update = (i: number, k: string, v: any) => setItems(items.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const add = () => setItems([...items, { workContent: '', hazardFactor: '', currentAction: '', riskLevel: '', improvement: '', participantsSig: [], remarks: '' }]);
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">근로자 의견·토론</CardTitle>
        <CardDescription>작업내용별 유해위험요인 + 위험성 수준 (상·중·하) + 개선대책</CardDescription>
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
                <TableHead>작업내용·기계기구</TableHead>
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
                  <TableCell><Textarea rows={2} value={it.workContent || ''} onChange={e => update(i, 'workContent', e.target.value)} disabled={readOnly} /></TableCell>
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

// ───────── 3. 안전보건정보 ─────────
function SectionSafetyInfo({ raId, data, readOnly }: { raId: string; data: any; readOnly: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rawMaterial, setRawMaterial] = useState('');
  const [product, setProduct] = useState('');
  const [workerCount, setWorkerCount] = useState('');
  const [processSteps, setProcessSteps] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<Record<string, string>>({});

  useEffect(() => {
    setRawMaterial(data?.rawMaterial || '');
    setProduct(data?.product || '');
    setWorkerCount(data?.workerCount != null ? String(data.workerCount) : '');
    setProcessSteps(Array.isArray(data?.processSteps) ? data.processSteps : []);
    setChecklist(data?.checklist && typeof data.checklist === 'object' ? data.checklist : {});
  }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => (await apiRequest('PUT', `/api/risk-assessments/${raId}/safety-info`, {
      rawMaterial, product, workerCount: workerCount || null, processSteps, checklist,
    })).json(),
    onSuccess: () => { toast({ title: '저장 완료' }); qc.invalidateQueries({ queryKey: ['risk-assessment', raId] }); },
    onError: (e: any) => toast({ title: '저장 실패', description: e.message, variant: 'destructive' }),
  });

  const addStep = () => setProcessSteps([...processSteps, { order: processSteps.length + 1, description: '', equipment: [], chemicals: [] }]);
  const removeStep = (i: number) => setProcessSteps(processSteps.filter((_, idx) => idx !== i));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">안전보건정보 조사표</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
                    <Input placeholder="공정 설명" value={s.description || ''} onChange={e => setProcessSteps(processSteps.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))} disabled={readOnly} />
                    {!readOnly && <Button variant="ghost" size="icon" onClick={() => removeStep(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">기계·기구·설비 (쉼표로 구분)</Label>
                      <Input value={(s.equipment || []).map((e: any) => `${e.name}(${e.qty || 1})`).join(', ')}
                        onChange={e => {
                          const arr = e.target.value.split(',').map(t => t.trim()).filter(Boolean).map(t => {
                            const m = t.match(/^(.+?)\((\d+)\)$/);
                            return m ? { name: m[1].trim(), qty: parseInt(m[2]) } : { name: t, qty: 1 };
                          });
                          setProcessSteps(processSteps.map((x, idx) => idx === i ? { ...x, equipment: arr } : x));
                        }} disabled={readOnly} placeholder="예: 호이스트(3), 지게차(1)" />
                    </div>
                    <div>
                      <Label className="text-xs">유해화학물질 (쉼표로 구분)</Label>
                      <Input value={(s.chemicals || []).map((c: any) => `${c.name}(${c.dailyAmount || '-'})`).join(', ')}
                        onChange={e => {
                          const arr = e.target.value.split(',').map(t => t.trim()).filter(Boolean).map(t => {
                            const m = t.match(/^(.+?)\((.+?)\)$/);
                            return m ? { name: m[1].trim(), dailyAmount: m[2] } : { name: t };
                          });
                          setProcessSteps(processSteps.map((x, idx) => idx === i ? { ...x, chemicals: arr } : x));
                        }} disabled={readOnly} placeholder="예: LOCTITE(250ml), AZOLLA(54L)" />
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
              <div key={item} className="flex items-center justify-between gap-2 border-b py-1">
                <span className="text-sm flex-1">{item}</span>
                <Select value={checklist[item] || ''} onValueChange={v => setChecklist({ ...checklist, [item]: v })} disabled={readOnly}>
                  <SelectTrigger className="w-28"><SelectValue placeholder="-" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="유">유</SelectItem>
                    <SelectItem value="무">무</SelectItem>
                    <SelectItem value="해당없음">해당없음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {!readOnly && <div className="pt-2 flex justify-end"><Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="w-4 h-4 mr-1.5" />{saveMut.isPending ? '저장 중...' : '저장'}</Button></div>}
      </CardContent>
    </Card>
  );
}

// ───────── 4. 위험성평가 ─────────
function SectionEvaluations({ raId, data, teams, readOnly }: { raId: string; data: any[]; teams: any[]; readOnly: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { setItems(data || []); }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => (await apiRequest('PUT', `/api/risk-assessments/${raId}/evaluations`, { items })).json(),
    onSuccess: () => { toast({ title: '저장 완료' }); qc.invalidateQueries({ queryKey: ['risk-assessment', raId] }); },
    onError: (e: any) => toast({ title: '저장 실패', description: e.message, variant: 'destructive' }),
  });

  const update = (i: number, k: string, v: any) => setItems(items.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const add = () => setItems([...items, { workContent: '', hazardFactor: '', currentAction: '', riskLevel: '', improvement: '', responsibleTeamId: null, responsibleName: '', scheduledDate: null, completedDate: null, remarks: '' }]);
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const fmtDate = (d: any) => d ? String(d).slice(0, 10) : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">위험성평가 (3단계 평가법)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!readOnly && <Button variant="outline" size="sm" onClick={add}><Plus className="w-4 h-4 mr-1.5" />항목 추가</Button>}
        <div className="overflow-x-auto">
          <Table className="min-w-[1400px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>공정(작업내용)</TableHead>
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
                  <TableCell><Textarea rows={2} value={it.workContent || ''} onChange={e => update(i, 'workContent', e.target.value)} disabled={readOnly} /></TableCell>
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
                    <Select value={it.responsibleTeamId ? String(it.responsibleTeamId) : ''} onValueChange={v => update(i, 'responsibleTeamId', v ? parseInt(v) : null)} disabled={readOnly}>
                      <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {teams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
function SectionImprovements({ raId, data, teams, readOnly }: { raId: string; data: any[]; teams: any[]; readOnly: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { setItems(data || []); }, [data]);

  const saveMut = useMutation({
    mutationFn: async () => (await apiRequest('PUT', `/api/risk-assessments/${raId}/improvements`, { items })).json(),
    onSuccess: () => { toast({ title: '저장 완료' }); qc.invalidateQueries({ queryKey: ['risk-assessment', raId] }); },
    onError: (e: any) => toast({ title: '저장 실패', description: e.message, variant: 'destructive' }),
  });

  const update = (i: number, k: string, v: any) => setItems(items.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const add = () => setItems([...items, { processName: '', hazardFactor: '', reductionPlan: '', responsibleTeamId: null, responsibleName: '', actionResult: '', improvedDate: null, beforePhotos: [], afterPhotos: [], remarks: '' }]);
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const fmtDate = (d: any) => d ? String(d).slice(0, 10) : '';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">개선실행 (조치결과·사진 전후)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!readOnly && <Button variant="outline" size="sm" onClick={add}><Plus className="w-4 h-4 mr-1.5" />항목 추가</Button>}
        {items.map((it, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold">#{i + 1}</span>
                {!readOnly && <Button variant="ghost" size="icon" onClick={() => remove(i)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>단위공정</Label><Input value={it.processName || ''} onChange={e => update(i, 'processName', e.target.value)} disabled={readOnly} /></div>
                <div><Label>조치결과</Label><Input value={it.actionResult || ''} onChange={e => update(i, 'actionResult', e.target.value)} disabled={readOnly} placeholder="○ / X / 진행중" /></div>
                <div className="md:col-span-2"><Label>유해위험요인</Label><Textarea rows={2} value={it.hazardFactor || ''} onChange={e => update(i, 'hazardFactor', e.target.value)} disabled={readOnly} /></div>
                <div className="md:col-span-2"><Label>감소대책</Label><Textarea rows={2} value={it.reductionPlan || ''} onChange={e => update(i, 'reductionPlan', e.target.value)} disabled={readOnly} /></div>
                <div>
                  <Label>담당부서</Label>
                  <Select value={it.responsibleTeamId ? String(it.responsibleTeamId) : ''} onValueChange={v => update(i, 'responsibleTeamId', v ? parseInt(v) : null)} disabled={readOnly}>
                    <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">{teams.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>담당자</Label><Input value={it.responsibleName || ''} onChange={e => update(i, 'responsibleName', e.target.value)} disabled={readOnly} /></div>
                <div><Label>개선일자</Label><Input type="date" value={fmtDate(it.improvedDate)} onChange={e => update(i, 'improvedDate', e.target.value || null)} disabled={readOnly} /></div>
                <div><Label>비고</Label><Input value={it.remarks || ''} onChange={e => update(i, 'remarks', e.target.value)} disabled={readOnly} /></div>
              </div>
              <PhotoDropzone label="개선 前 사진" value={it.beforePhotos || []} onChange={v => update(i, 'beforePhotos', v)} disabled={readOnly} />
              <PhotoDropzone label="개선 後 사진" value={it.afterPhotos || []} onChange={v => update(i, 'afterPhotos', v)} disabled={readOnly} />
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <div className="text-center text-muted-foreground py-6">항목이 없습니다</div>}
        {!readOnly && <div className="pt-2 flex justify-end"><Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}><Save className="w-4 h-4 mr-1.5" />{saveMut.isPending ? '저장 중...' : '저장'}</Button></div>}
      </CardContent>
    </Card>
  );
}
