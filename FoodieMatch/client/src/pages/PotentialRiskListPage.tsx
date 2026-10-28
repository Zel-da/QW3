/**
 * 잠재위험 발굴 — 목록 + 필터 + 현황 카드
 */
import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { AlertTriangle, Plus, Search, Bell, CheckCircle2, Clock } from 'lucide-react';

interface PotentialRisk {
  id: string;
  site: string;
  discoveredAt: string;
  sitePhotos?: string[];
  location: string;
  riskDescription: string;
  assignedTeamId: number;
  assignedTeam?: { id: number; name: string; department?: { name: string } };
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  isCompleted: boolean;
  scheduledDate?: string;
  createdAt: string;
  createdBy?: { name?: string; username: string };
  repliedBy?: { name?: string; username: string };
}

export default function PotentialRiskListPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM';
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: risks = [], isLoading } = useQuery<PotentialRisk[]>({
    queryKey: ['potential-risks', siteFilter, teamFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (siteFilter !== 'all') params.set('site', siteFilter);
      if (teamFilter !== 'all') params.set('teamId', teamFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/potential-risks?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('조회 실패');
      return res.json();
    },
  });

  const { data: stats } = useQuery<{ total: number; completed: number; completionRate: number; perTeam: any[] }>({
    queryKey: ['potential-risk-stats', siteFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (siteFilter !== 'all') params.set('site', siteFilter);
      const res = await fetch(`/api/potential-risks/stats?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('통계 조회 실패');
      return res.json();
    },
  });

  const { data: teams = [] } = useQuery<Array<{ id: number; name: string; site: string }>>({
    queryKey: ['teams-active'],
    queryFn: async () => {
      const res = await fetch('/api/teams', { credentials: 'include' });
      if (!res.ok) throw new Error('팀 조회 실패');
      return res.json();
    },
  });

  const filtered = useMemo(() => {
    return risks.filter(r => {
      if (!search) return true;
      const q = search.toLowerCase();
      return r.location.toLowerCase().includes(q) || r.riskDescription.toLowerCase().includes(q)
        || r.assignedTeam?.name?.toLowerCase().includes(q);
    });
  }, [risks, search]);

  const remindMutation = useMutation({
    mutationFn: async () => {
      const body: any = {};
      if (siteFilter !== 'all') body.site = siteFilter;
      if (teamFilter !== 'all') body.teamIds = [parseInt(teamFilter)];
      const res = await apiRequest('POST', '/api/potential-risks/remind', body);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: '리마인더 발송', description: data.message });
    },
    onError: (err: any) => {
      toast({ title: '실패', description: err.message, variant: 'destructive' });
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-7xl">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              잠재위험 발굴 및 개선현황
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              현장 잠재위험을 등록하고 담당부서가 조치결과를 회신합니다
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {canCreate && (
              <>
                <Button
                  variant="outline"
                  onClick={() => remindMutation.mutate()}
                  disabled={remindMutation.isPending}
                >
                  <Bell className="w-4 h-4 mr-2" />
                  {remindMutation.isPending ? '발송 중...' : '리마인더 발송'}
                </Button>
                <Link href="/potential-risks/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    신규 등록
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 현황 카드 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">전체 발굴</div>
                <div className="text-2xl font-bold">{stats.total}건</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">개선 완료</div>
                <div className="text-2xl font-bold text-green-600">{stats.completed}건</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">완료율</div>
                <div className="text-2xl font-bold">{stats.completionRate}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 필터 */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="장소·위험요소·팀 검색" className="pl-9" />
              </div>
              <Select value={siteFilter} onValueChange={setSiteFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 사이트</SelectItem>
                  <SelectItem value="아산">아산</SelectItem>
                  <SelectItem value="화성">화성</SelectItem>
                </SelectContent>
              </Select>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">전체 부서</SelectItem>
                  {teams
                    .filter(t => siteFilter === 'all' || t.site === siteFilter)
                    .map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 상태</SelectItem>
                  <SelectItem value="PENDING">미회신</SelectItem>
                  <SelectItem value="IN_PROGRESS">진행중</SelectItem>
                  <SelectItem value="COMPLETED">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-10 text-center text-muted-foreground">로딩 중...</div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">조건에 맞는 항목이 없습니다</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">현장</TableHead>
                      <TableHead className="w-28">발굴일자</TableHead>
                      <TableHead className="w-20">사이트</TableHead>
                      <TableHead className="w-32">담당부서</TableHead>
                      <TableHead className="min-w-[200px]">위험장소/설비</TableHead>
                      <TableHead className="min-w-[200px]">위험요소</TableHead>
                      <TableHead className="w-24">상태</TableHead>
                      <TableHead className="w-28">조치일정</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => (
                      <TableRow key={r.id} className="cursor-pointer hover:bg-accent/50"
                        onClick={() => (window.location.href = `/potential-risks/${r.id}`)}>
                        <TableCell>
                          {Array.isArray(r.sitePhotos) && r.sitePhotos.length > 0 ? (
                            <a
                              href={r.sitePhotos[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="relative block w-14 h-14 rounded-md border overflow-hidden bg-muted hover:opacity-80"
                              title={`현장 사진 ${r.sitePhotos.length}장 — 클릭 시 원본`}
                            >
                              <img src={r.sitePhotos[0]} alt="" className="w-full h-full object-cover" />
                              {r.sitePhotos.length > 1 && (
                                <span className="absolute bottom-0 right-0 bg-black/60 text-white text-[10px] px-1 rounded-tl">+{r.sitePhotos.length - 1}</span>
                              )}
                            </a>
                          ) : (
                            <div className="w-14 h-14 rounded-md border bg-muted flex items-center justify-center text-[10px] text-muted-foreground">없음</div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{new Date(r.discoveredAt).toLocaleDateString('ko-KR')}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${r.site === '아산' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{r.site}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{r.assignedTeam?.name || '-'}</TableCell>
                        <TableCell className="text-sm max-w-[280px]">
                          <div className="truncate">{r.location}</div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[280px]">
                          <div className="truncate">{r.riskDescription}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {r.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />완료
                            </span>
                          ) : r.status === 'IN_PROGRESS' ? (
                            <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" />진행중
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3" />미회신
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {r.scheduledDate ? new Date(r.scheduledDate).toLocaleDateString('ko-KR') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
