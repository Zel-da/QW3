import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminPageLayout, PageHeader } from '@/components/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Save } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const fetchSettings = async () => {
  const res = await apiRequest('GET', '/api/settings/approval');
  return res.json();
};

export default function ApprovalSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<{
    siteManagers: Record<string, string>;
    approver: string;
  }>({
    queryKey: ['approval-settings'],
    queryFn: fetchSettings,
  });

  const [asanManager, setAsanManager] = useState('');
  const [hwaseongManager, setHwaseongManager] = useState('');
  const [approver, setApprover] = useState('');

  useEffect(() => {
    if (settings) {
      setAsanManager(settings.siteManagers?.['아산'] || '');
      setHwaseongManager(settings.siteManagers?.['화성'] || '');
      setApprover(settings.approver || '');
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', '/api/settings/approval', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-settings'] });
      toast({ title: "저장 완료", description: "결재 설정이 저장되었습니다." });
    },
    onError: () => {
      toast({ title: "오류", description: "저장에 실패했습니다.", variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      siteManagers: { '아산': asanManager, '화성': hwaseongManager },
      approver,
    });
  };

  return (
    <AdminPageLayout>
      <PageHeader
        title="결재 설정"
        description="월간 결재 담당자 및 결재자를 관리합니다."
        icon={<Shield className="h-6 w-6" />}
        backUrl="/admin-dashboard"
        backText="대시보드"
      />

      <Card>
        <CardHeader>
          <CardTitle>사이트별 담당자</CardTitle>
          <CardDescription>안전교육 현황 보고서의 사이트별 담당자 이름입니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asan-manager">아산 담당자</Label>
              <Input
                id="asan-manager"
                value={asanManager}
                onChange={(e) => setAsanManager(e.target.value)}
                placeholder="담당자 이름"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hwaseong-manager">화성 담당자</Label>
              <Input
                id="hwaseong-manager"
                value={hwaseongManager}
                onChange={(e) => setHwaseongManager(e.target.value)}
                placeholder="담당자 이름"
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>월간 결재자</CardTitle>
          <CardDescription>월간 결재 요청 시 결재 승인을 받는 사람입니다. 해당 이름의 사용자 계정이 존재해야 합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-sm space-y-2">
            <Label htmlFor="approver">결재자</Label>
            <Input
              id="approver"
              value={approver}
              onChange={(e) => setApprover(e.target.value)}
              placeholder="결재자 이름"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? '저장 중...' : '설정 저장'}
        </Button>
      </div>
    </AdminPageLayout>
  );
}
