import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminPageLayout, PageHeader } from '@/components/admin';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Database, Download, Trash2, AlertTriangle, HardDrive, FileText, Mail, Users, ClipboardCheck, Shield } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { apiRequest } from '@/lib/queryClient';

interface DbStats {
  current: {
    users: number;
    teams: number;
    factories: number;
    equipment: number;
    courses: number;
    tbmReports: number;
    tbmChecklistItems: number;
    tbmSignatures: number;
    safetyInspections: number;
    safetyInspectionItems: number;
    emailLogs: number;
    sessions: number;
    notices: number;
  };
  oldData: {
    tbmReportsOver1Year: number;
    tbmChecklistItemsOver1Year: number;
    tbmSignaturesOver1Year: number;
    inspectionsOver1Year: number;
    inspectionItemsOver1Year: number;
    emailLogsOver6Months: number;
    expiredSessions: number;
    totalCleanupTarget: number;
  };
}

const fetchDbStats = async (): Promise<DbStats> => {
  const res = await fetch('/api/admin/db-stats');
  if (!res.ok) throw new Error('Failed to fetch DB stats');
  return res.json();
};

export default function DbManagementPage() {
  const { toast } = useToast();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const { data: dbStats, isLoading: dbStatsLoading, refetch: refetchDbStats } = useQuery<DbStats>({
    queryKey: ['dbStats'],
    queryFn: fetchDbStats,
  });

  // 백업 다운로드 핸들러
  const handleBackup = async () => {
    setIsBackingUp(true);
    try {
      const res = await apiRequest('POST', '/api/admin/backup');

      // 파일 다운로드
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({ title: '성공', description: '백업 파일이 다운로드되었습니다.' });
    } catch (error) {
      toast({ title: '오류', description: '백업에 실패했습니다.', variant: 'destructive' });
    } finally {
      setIsBackingUp(false);
    }
  };

  // 데이터 정리 핸들러
  const handleCleanup = async () => {
    setIsCleaning(true);
    try {
      const res = await apiRequest('POST', '/api/admin/cleanup');

      const result = await res.json();
      toast({ title: '성공', description: result.message });
      refetchDbStats();
    } catch (error) {
      toast({ title: '오류', description: '데이터 정리에 실패했습니다.', variant: 'destructive' });
    } finally {
      setIsCleaning(false);
    }
  };

  if (dbStatsLoading) {
    return (
      <AdminPageLayout>
        <PageHeader
          title="데이터베이스 관리"
          description="데이터 백업 및 오래된 데이터 정리"
          icon={<Database className="h-6 w-6" />}
          backUrl="/admin-dashboard"
          backText="대시보드"
        />
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-muted rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <PageHeader
        title="데이터베이스 관리"
        description="데이터 백업 및 오래된 데이터 정리"
        icon={<Database className="h-6 w-6" />}
        backUrl="/admin-dashboard"
        backText="대시보드"
      />

      {/* 현재 데이터 현황 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">현재 데이터 현황</h2>
          </div>

          {dbStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard
                icon={<Users className="h-5 w-5" />}
                label="사용자"
                value={dbStats.current.users}
                color="bg-blue-500"
              />
              <StatCard
                icon={<ClipboardCheck className="h-5 w-5" />}
                label="TBM 보고서"
                value={dbStats.current.tbmReports}
                color="bg-green-500"
              />
              <StatCard
                icon={<FileText className="h-5 w-5" />}
                label="TBM 항목"
                value={dbStats.current.tbmChecklistItems}
                color="bg-emerald-500"
              />
              <StatCard
                icon={<Shield className="h-5 w-5" />}
                label="안전점검"
                value={dbStats.current.safetyInspections}
                color="bg-amber-500"
              />
              <StatCard
                icon={<FileText className="h-5 w-5" />}
                label="점검 항목"
                value={dbStats.current.safetyInspectionItems}
                color="bg-orange-500"
              />
              <StatCard
                icon={<Mail className="h-5 w-5" />}
                label="이메일 로그"
                value={dbStats.current.emailLogs}
                color="bg-rose-500"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 정리 대상 데이터 */}
      {dbStats && dbStats.oldData.totalCleanupTarget > 0 && (
        <Card className="mb-6 border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">정리 가능한 오래된 데이터</h2>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {dbStats.oldData.tbmChecklistItemsOver1Year > 0 && (
                  <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                    <span>TBM 체크리스트 (1년+)</span>
                    <span className="font-bold">{dbStats.oldData.tbmChecklistItemsOver1Year}건</span>
                  </div>
                )}
                {dbStats.oldData.tbmSignaturesOver1Year > 0 && (
                  <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                    <span>TBM 서명 (1년+)</span>
                    <span className="font-bold">{dbStats.oldData.tbmSignaturesOver1Year}건</span>
                  </div>
                )}
                {dbStats.oldData.inspectionItemsOver1Year > 0 && (
                  <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                    <span>안전점검 항목 (1년+)</span>
                    <span className="font-bold">{dbStats.oldData.inspectionItemsOver1Year}건</span>
                  </div>
                )}
                {dbStats.oldData.emailLogsOver6Months > 0 && (
                  <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                    <span>이메일 로그 (6개월+)</span>
                    <span className="font-bold">{dbStats.oldData.emailLogsOver6Months}건</span>
                  </div>
                )}
                {dbStats.oldData.expiredSessions > 0 && (
                  <div className="flex justify-between p-2 bg-white dark:bg-gray-800 rounded">
                    <span>만료된 세션</span>
                    <span className="font-bold">{dbStats.oldData.expiredSessions}건</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-700">
                <div className="flex justify-between text-amber-800 dark:text-amber-200 font-medium">
                  <span>총 정리 가능 데이터</span>
                  <span className="text-lg">{dbStats.oldData.totalCleanupTarget}건</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 액션 버튼 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">데이터 관리 작업</h2>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleBackup}
              disabled={isBackingUp}
              size="lg"
              className="gap-2"
            >
              <Download className="h-5 w-5" />
              {isBackingUp ? '백업 중...' : '전체 백업 다운로드'}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={isCleaning || !dbStats || dbStats.oldData.totalCleanupTarget === 0}
                  className="gap-2"
                >
                  <Trash2 className="h-5 w-5" />
                  {isCleaning ? '정리 중...' : '오래된 데이터 정리'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>데이터 정리 확인</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div>
                      <p>다음 데이터가 영구적으로 삭제됩니다:</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li>1년 이상 된 TBM 체크리스트/서명</li>
                        <li>1년 이상 된 안전점검 항목</li>
                        <li>6개월 이상 된 이메일 로그</li>
                        <li>만료된 세션</li>
                      </ul>
                      <p className="mt-3 font-medium text-destructive">
                        총 {dbStats?.oldData.totalCleanupTarget || 0}건의 데이터가 삭제됩니다.
                      </p>
                      <p className="mt-2 text-amber-600 font-medium">삭제 전 반드시 백업을 먼저 받으세요!</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCleanup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    정리 실행
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-medium mb-2">백업 권장 사항</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- 6개월마다 정기적으로 백업을 수행하세요.</li>
              <li>- 백업 파일은 JSON 형식으로 다운로드됩니다.</li>
              <li>- 다운로드된 파일은 외장하드 또는 NAS에 안전하게 보관하세요.</li>
              <li>- 데이터 정리 전에는 반드시 백업을 먼저 받으세요.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </AdminPageLayout>
  );
}

// 통계 카드 컴포넌트
function StatCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="p-4 bg-muted/50 rounded-lg">
      <div className={`inline-flex p-2 rounded-lg ${color} text-white mb-2`}>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
