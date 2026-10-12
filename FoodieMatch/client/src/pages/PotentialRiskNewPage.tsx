/**
 * 잠재위험 발굴 — 신규 등록 (ADMIN/SAFETY_TEAM 전용)
 */
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { PhotoDropzone } from '@/components/PhotoDropzone';
import { ArrowLeft, Save } from 'lucide-react';

export default function PotentialRiskNewPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM';

  const [site, setSite] = useState<string>(user?.site || '아산');
  const [discoveredAt, setDiscoveredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [discoveredBy, setDiscoveredBy] = useState('');
  const [riskDescription, setRiskDescription] = useState('');
  const [assignedTeamId, setAssignedTeamId] = useState<string>('');
  const [sitePhotos, setSitePhotos] = useState<string[]>([]);

  const { data: teams = [] } = useQuery<Array<{ id: number; name: string; site: string }>>({
    queryKey: ['teams-active'],
    queryFn: async () => {
      const res = await fetch('/api/teams', { credentials: 'include' });
      if (!res.ok) throw new Error('팀 조회 실패');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/potential-risks', {
        site, discoveredAt, location, discoveredBy, riskDescription,
        assignedTeamId: parseInt(assignedTeamId), sitePhotos,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: '등록 완료', description: '담당부서 팀장에게 알림이 발송되었습니다.' });
      navigate(`/potential-risks/${data.id}`);
    },
    onError: (err: any) => {
      toast({ title: '등록 실패', description: err.message, variant: 'destructive' });
    },
  });

  if (!canCreate) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-6 max-w-2xl">
          <Card><CardContent className="p-10 text-center text-muted-foreground">
            ADMIN 또는 SAFETY_TEAM 권한이 필요합니다
          </CardContent></Card>
        </main>
      </div>
    );
  }

  const canSubmit = site && discoveredAt && location.trim() && riskDescription.trim() && assignedTeamId;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-3xl">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/potential-risks">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" />목록</Button>
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>잠재위험 발굴 — 신규 등록</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>사이트 *</Label>
                <Select value={site} onValueChange={setSite}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="아산">아산</SelectItem>
                    <SelectItem value="화성">화성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>발굴일자 *</Label>
                <Input type="date" value={discoveredAt} onChange={e => setDiscoveredAt(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>위험장소/설비 *</Label>
              <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="예: CR조립 라인 2단계 호이스트 부근" />
            </div>
            <div>
              <Label>발굴/제안자 (선택)</Label>
              <Input value={discoveredBy} onChange={e => setDiscoveredBy(e.target.value)} placeholder="예: 김안전 (안전팀)" />
            </div>
            <div>
              <Label>위험요소 (잠재위험) *</Label>
              <Textarea value={riskDescription} onChange={e => setRiskDescription(e.target.value)} rows={4} placeholder="구체적으로 작성" />
            </div>
            <div>
              <Label>담당부서 *</Label>
              <Select value={assignedTeamId} onValueChange={setAssignedTeamId}>
                <SelectTrigger><SelectValue placeholder="담당부서 선택" /></SelectTrigger>
                <SelectContent className="max-h-[320px]">
                  {teams.filter(t => t.site === site).map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <PhotoDropzone label="현장 사진" value={sitePhotos} onChange={setSitePhotos} />

            <div className="pt-2 flex justify-end gap-2">
              <Link href="/potential-risks">
                <Button variant="outline">취소</Button>
              </Link>
              <Button onClick={() => createMutation.mutate()} disabled={!canSubmit || createMutation.isPending}>
                <Save className="w-4 h-4 mr-1.5" />
                {createMutation.isPending ? '등록 중...' : '등록'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
