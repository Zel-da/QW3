/**
 * 잠재위험 상세 + 담당부서 회신 입력
 */
import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import { apiRequest } from '@/lib/queryClient';
import { PhotoDropzone } from '@/components/PhotoDropzone';
import { ArrowLeft, Save, Trash2, CheckCircle2, Clock, AlertTriangle, Pencil, X } from 'lucide-react';

export default function PotentialRiskDetailPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [, params] = useRoute('/potential-risks/:id');
  const id = params?.id;

  const { data: risk, isLoading } = useQuery<any>({
    queryKey: ['potential-risk', id],
    queryFn: async () => {
      const res = await fetch(`/api/potential-risks/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('조회 실패');
      return res.json();
    },
    enabled: !!id,
  });

  // 담당부서 회신 폼 state
  const [actionResult, setActionResult] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [improvementPhotos, setImprovementPhotos] = useState<string[]>([]);

  // 안전팀 입력란 수정 모드 state (안전팀만)
  const [editingSafety, setEditingSafety] = useState(false);
  const [editSite, setEditSite] = useState('');
  const [editDiscoveredAt, setEditDiscoveredAt] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editDiscoveredBy, setEditDiscoveredBy] = useState('');
  const [editRiskDescription, setEditRiskDescription] = useState('');
  const [editAssignedTeamId, setEditAssignedTeamId] = useState<string>('');
  const [editSitePhotos, setEditSitePhotos] = useState<string[]>([]);

  const { data: teams = [] } = useQuery<Array<{ id: number; name: string; site: string }>>({
    queryKey: ['teams-active'],
    queryFn: async () => (await fetch('/api/teams', { credentials: 'include' })).json(),
  });

  useEffect(() => {
    if (!risk) return;
    setActionResult(risk.actionResult || '');
    setScheduledDate(risk.scheduledDate ? risk.scheduledDate.slice(0, 10) : '');
    setAssigneeName(risk.assigneeName || '');
    setIsCompleted(!!risk.isCompleted);
    setRemarks(risk.remarks || '');
    setImprovementPhotos(Array.isArray(risk.improvementPhotos) ? risk.improvementPhotos : []);
  }, [risk]);

  const isSafetyTeam = user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM';
  const isAssignedLeader = risk && user?.teamId === risk.assignedTeamId && (user.role === 'TEAM_LEADER' || user.role === 'EXECUTIVE_LEADER');
  const canReply = isSafetyTeam || isAssignedLeader;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', `/api/potential-risks/${id}`, {
        actionResult, scheduledDate: scheduledDate || null, assigneeName,
        isCompleted, remarks, improvementPhotos,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '저장 완료', description: '안전팀에 알림이 발송되었습니다.' });
      qc.invalidateQueries({ queryKey: ['potential-risk', id] });
      qc.invalidateQueries({ queryKey: ['potential-risks'] });
      qc.invalidateQueries({ queryKey: ['potential-risk-stats'] });
    },
    onError: (err: any) => {
      toast({ title: '저장 실패', description: err.message, variant: 'destructive' });
    },
  });

  const safetyEditMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('PUT', `/api/potential-risks/${id}`, {
        site: editSite,
        discoveredAt: editDiscoveredAt,
        location: editLocation,
        discoveredBy: editDiscoveredBy,
        riskDescription: editRiskDescription,
        assignedTeamId: parseInt(editAssignedTeamId),
        sitePhotos: editSitePhotos,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '안전팀 입력란 수정 완료' });
      setEditingSafety(false);
      qc.invalidateQueries({ queryKey: ['potential-risk', id] });
      qc.invalidateQueries({ queryKey: ['potential-risks'] });
    },
    onError: (err: any) => {
      toast({ title: '수정 실패', description: err.message, variant: 'destructive' });
    },
  });

  const startEditSafety = () => {
    if (!risk) return;
    setEditSite(risk.site);
    setEditDiscoveredAt(risk.discoveredAt ? risk.discoveredAt.slice(0, 10) : '');
    setEditLocation(risk.location);
    setEditDiscoveredBy(risk.discoveredBy || '');
    setEditRiskDescription(risk.riskDescription);
    setEditAssignedTeamId(String(risk.assignedTeamId));
    setEditSitePhotos(Array.isArray(risk.sitePhotos) ? risk.sitePhotos : []);
    setEditingSafety(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/potential-risks/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '삭제됨' });
      navigate('/potential-risks');
    },
    onError: (err: any) => {
      toast({ title: '삭제 실패', description: err.message, variant: 'destructive' });
    },
  });

  if (isLoading || !risk) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-6 max-w-3xl">
          <Card><CardContent className="p-10 text-center text-muted-foreground">로딩 중...</CardContent></Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-4">
          <Link href="/potential-risks">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" />목록</Button>
          </Link>
          {isSafetyTeam && (
            <Button variant="ghost" size="sm" className="text-destructive"
              onClick={async () => {
                const ok = await confirm({ title: '삭제', description: '이 잠재위험을 삭제할까요?', confirmText: '삭제', destructive: true });
                if (ok) deleteMutation.mutate();
              }}>
              <Trash2 className="w-4 h-4 mr-1.5" />삭제
            </Button>
          )}
        </div>

        {/* 안전팀 입력란 — 조회 or 수정 모드 */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">안전팀 입력란</CardTitle>
              <div className="flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${risk.site === '아산' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{risk.site}</span>
                {risk.status === 'COMPLETED' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" />완료</span>
                ) : risk.status === 'IN_PROGRESS' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" />진행중</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />미회신</span>
                )}
                {/* 안전팀만 수정 버튼 노출 */}
                {isSafetyTeam && !editingSafety && (
                  <Button variant="outline" size="sm" onClick={startEditSafety}>
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />수정
                  </Button>
                )}
              </div>
            </div>
            <CardDescription>
              등록자: {risk.createdBy?.name || risk.createdBy?.username} · 등록일: {new Date(risk.createdAt).toLocaleString('ko-KR')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!editingSafety ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">발굴일자: </span>{new Date(risk.discoveredAt).toLocaleDateString('ko-KR')}</div>
                  <div><span className="text-muted-foreground">담당부서: </span>{risk.assignedTeam?.name}{risk.assignedTeam?.department ? ` (${risk.assignedTeam.department.name})` : ''}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">위험장소/설비: </span>{risk.location}</div>
                  <div className="md:col-span-2"><span className="text-muted-foreground">발굴/제안자: </span>{risk.discoveredBy || '-'}</div>
                  <div className="md:col-span-2">
                    <span className="text-muted-foreground">위험요소: </span>
                    <p className="whitespace-pre-wrap mt-1">{risk.riskDescription}</p>
                  </div>
                </div>
                {Array.isArray(risk.sitePhotos) && risk.sitePhotos.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">현장 사진 ({risk.sitePhotos.length}장)</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-1">
                      {risk.sitePhotos.map((url: string, i: number) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square border rounded-md overflow-hidden bg-muted">
                          <img src={url} alt="" className="w-full h-full object-cover hover:opacity-90" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* 수정 모드 폼 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>사이트 *</Label>
                    <Select value={editSite} onValueChange={setEditSite}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="아산">아산</SelectItem>
                        <SelectItem value="화성">화성</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>발굴일자 *</Label>
                    <Input type="date" value={editDiscoveredAt} onChange={e => setEditDiscoveredAt(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>위험장소/설비 *</Label>
                    <Input value={editLocation} onChange={e => setEditLocation(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>발굴/제안자</Label>
                    <Input value={editDiscoveredBy} onChange={e => setEditDiscoveredBy(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>위험요소 *</Label>
                    <Textarea rows={4} value={editRiskDescription} onChange={e => setEditRiskDescription(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>담당부서 *</Label>
                    <Select value={editAssignedTeamId} onValueChange={setEditAssignedTeamId}>
                      <SelectTrigger><SelectValue placeholder="담당부서 선택" /></SelectTrigger>
                      <SelectContent className="max-h-[320px]">
                        {teams.filter(t => t.site === editSite).map(t => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <PhotoDropzone label="현장 사진" value={editSitePhotos} onChange={setEditSitePhotos} />
                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setEditingSafety(false)}>
                    <X className="w-4 h-4 mr-1.5" />취소
                  </Button>
                  <Button
                    onClick={() => safetyEditMutation.mutate()}
                    disabled={safetyEditMutation.isPending || !editLocation.trim() || !editRiskDescription.trim() || !editAssignedTeamId}
                  >
                    <Save className="w-4 h-4 mr-1.5" />
                    {safetyEditMutation.isPending ? '저장 중...' : '수정 저장'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 담당부서 회신 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">담당부서 회신란 {!canReply && <span className="text-xs text-muted-foreground">(담당 부서 팀장/안전팀만 작성 가능)</span>}</CardTitle>
            {risk.repliedBy && (
              <CardDescription>
                회신자: {risk.repliedBy.name || risk.repliedBy.username} · 최근 수정: {new Date(risk.updatedAt).toLocaleString('ko-KR')}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>조치일정</Label>
                <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} disabled={!canReply} />
              </div>
              <div>
                <Label>담당자</Label>
                <Input value={assigneeName} onChange={e => setAssigneeName(e.target.value)} disabled={!canReply} placeholder="회신 담당자 이름" />
              </div>
            </div>
            <div>
              <Label>조치결과 / 개선계획</Label>
              <Textarea value={actionResult} onChange={e => setActionResult(e.target.value)} rows={4} disabled={!canReply} />
            </div>
            <PhotoDropzone label="개선 사진" value={improvementPhotos} onChange={setImprovementPhotos} disabled={!canReply} />
            <div>
              <Label>비고</Label>
              <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} disabled={!canReply} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={isCompleted} onChange={e => setIsCompleted(e.target.checked)} disabled={!canReply} className="w-4 h-4" />
              <span className="text-sm font-medium">완료 처리</span>
            </label>
            {canReply && (
              <div className="pt-2 flex justify-end">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  <Save className="w-4 h-4 mr-1.5" />
                  {saveMutation.isPending ? '저장 중...' : '회신 저장'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
