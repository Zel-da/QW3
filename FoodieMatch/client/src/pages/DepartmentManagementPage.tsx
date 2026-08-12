/**
 * 부서 관리 페이지 (ADMIN 전용)
 * 부서 = TBM 팀 선택 UI의 "큰 분류". 각 부서에 여러 팀이 소속.
 * 기존 하드코딩(teamDepartments.ts)에서 DB 관리로 전환.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminPageLayout, PageHeader } from '@/components/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/useConfirm';
import { Building2, Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import { SITES } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';

interface Department {
  id: number;
  name: string;
  site: string;
  displayOrder: number;
  teams: Array<{ id: number; name: string; site: string | null }>;
  createdAt: string;
}

export default function DepartmentManagementPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();

  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: '', site: SITES[0] as string, displayOrder: 0 });

  const { data: departments = [], isLoading } = useQuery<Department[]>({
    queryKey: ['departments', siteFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (siteFilter !== 'all') params.set('site', siteFilter);
      const res = await fetch(`/api/departments?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('부서 조회 실패');
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = { name: form.name.trim(), site: form.site, displayOrder: form.displayOrder };
      if (editTarget) {
        const res = await apiRequest('PUT', `/api/departments/${editTarget.id}`, body);
        return res.json();
      } else {
        const res = await apiRequest('POST', '/api/departments', body);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: editTarget ? '부서 수정 완료' : '부서 생성 완료' });
      qc.invalidateQueries({ queryKey: ['departments'] });
      qc.invalidateQueries({ queryKey: ['teams'] }); // 팀 목록도 department 정보 갱신
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: (err: any) => {
      toast({ title: '저장 실패', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/departments/${id}`);
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: '부서 삭제 완료', description: data?.message });
      qc.invalidateQueries({ queryKey: ['departments'] });
      qc.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (err: any) => {
      toast({ title: '삭제 실패', description: err.message, variant: 'destructive' });
    },
  });

  const openCreate = () => {
    setEditTarget(null);
    setForm({ name: '', site: siteFilter !== 'all' ? siteFilter : SITES[0], displayOrder: departments.length });
    setDialogOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditTarget(d);
    setForm({ name: d.name, site: d.site, displayOrder: d.displayOrder });
    setDialogOpen(true);
  };

  const handleDelete = async (d: Department) => {
    const ok = await confirm({
      title: '부서 삭제',
      description: `"${d.site}/${d.name}" 부서를 삭제하시겠습니까?\n소속 팀 ${d.teams?.length ?? 0}개는 삭제되지 않고 부서 소속만 해제됩니다.`,
      confirmText: '삭제',
      destructive: true,
    });
    if (ok) deleteMutation.mutate(d.id);
  };

  return (
    <AdminPageLayout>
      <PageHeader
        title="부서 관리"
        description="TBM 팀 선택 화면의 큰 분류입니다. 사이트별 부서 목록·순서를 관리합니다."
        icon={<Building2 className="h-6 w-6" />}
        backUrl="/admin-dashboard"
        backText="대시보드"
      />

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">사이트:</Label>
          <Select value={siteFilter} onValueChange={setSiteFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {SITES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          부서 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">부서 목록 ({departments.length})</CardTitle>
          <CardDescription>순서(displayOrder) 낮은 것부터 TBM 팀 선택 화면에 표시됩니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
          ) : departments.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">부서가 없습니다. 부서 추가 버튼으로 생성하세요.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">순서</TableHead>
                  <TableHead className="w-24">사이트</TableHead>
                  <TableHead>이름</TableHead>
                  <TableHead>소속 팀</TableHead>
                  <TableHead className="w-32 text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <GripVertical className="w-3.5 h-3.5" />
                        {d.displayOrder}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${d.site === '아산' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                        {d.site}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        {d.teams?.length ?? 0}개 팀
                        {d.teams && d.teams.length > 0 && (
                          <span className="ml-1 opacity-70">
                            ({d.teams.slice(0, 3).map(t => t.name).join(', ')}
                            {d.teams.length > 3 ? ` 외 ${d.teams.length - 3}개` : ''})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)} title="수정">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(d)} title="삭제" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 생성/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? '부서 수정' : '부서 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>사이트 *</Label>
              <Select value={form.site} onValueChange={v => setForm({ ...form, site: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SITES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>부서 이름 *</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="예: 생산팀"
              />
            </div>
            <div>
              <Label>표시 순서</Label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={e => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground mt-1">낮은 값이 먼저 표시됩니다.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? '저장 중...' : (editTarget ? '수정' : '생성')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageLayout>
  );
}
