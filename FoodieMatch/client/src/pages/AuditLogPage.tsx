import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import {
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Shield,
  Activity,
  AlertTriangle,
  User,
  Clock,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

// 액션 타입별 색상 및 라벨
const actionConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  CREATE: { label: '생성', color: 'bg-green-100 text-green-800', icon: <Activity className="h-3 w-3" /> },
  UPDATE: { label: '수정', color: 'bg-blue-100 text-blue-800', icon: <Activity className="h-3 w-3" /> },
  DELETE: { label: '삭제', color: 'bg-red-100 text-red-800', icon: <Activity className="h-3 w-3" /> },
  LOGIN: { label: '로그인', color: 'bg-purple-100 text-purple-800', icon: <User className="h-3 w-3" /> },
  LOGOUT: { label: '로그아웃', color: 'bg-gray-100 text-gray-800', icon: <User className="h-3 w-3" /> },
  LOGIN_FAILED: { label: '로그인 실패', color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-3 w-3" /> },
  APPROVE: { label: '승인', color: 'bg-green-100 text-green-800', icon: <Shield className="h-3 w-3" /> },
  REJECT: { label: '반려', color: 'bg-red-100 text-red-800', icon: <Shield className="h-3 w-3" /> },
  VIEW: { label: '조회', color: 'bg-gray-100 text-gray-800', icon: <Eye className="h-3 w-3" /> },
  EXPORT: { label: '내보내기', color: 'bg-orange-100 text-orange-800', icon: <Download className="h-3 w-3" /> },
  IMPORT: { label: '가져오기', color: 'bg-cyan-100 text-cyan-800', icon: <Download className="h-3 w-3" /> },
  PASSWORD_CHANGE: { label: '비밀번호 변경', color: 'bg-yellow-100 text-yellow-800', icon: <Shield className="h-3 w-3" /> },
};

// 엔티티 타입별 라벨
const entityTypeLabels: Record<string, string> = {
  USER: '사용자',
  TEAM: '팀',
  TBM_REPORT: 'TBM 보고서',
  INSPECTION: '안전점검',
  COURSE: '교육과정',
  APPROVAL: '결재',
  HOLIDAY: '공휴일',
  NOTICE: '공지사항',
  EQUIPMENT: '장비',
  TEMPLATE: '템플릿',
  SESSION: '세션',
};

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  userId: string | null;
  oldValue: any;
  newValue: any;
  metadata: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    name: string | null;
  } | null;
}

interface AuditLogResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AuditLogPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // 감사 로그 조회
  const { data, isLoading, error } = useQuery<AuditLogResponse>({
    queryKey: ['audit-logs', page, search, actionFilter, entityFilter, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30',
      });
      if (search) params.append('search', search);
      if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter);
      if (entityFilter && entityFilter !== 'all') params.append('entityType', entityFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/audit-logs?${params}`);
      if (!res.ok) throw new Error('감사 로그 조회 실패');
      return res.json();
    },
  });

  // 통계 조회
  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const res = await fetch('/api/audit-logs/stats?days=7');
      if (!res.ok) throw new Error('통계 조회 실패');
      return res.json();
    },
  });

  // Excel 내보내기
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (actionFilter && actionFilter !== 'all') params.append('action', actionFilter);
      if (entityFilter && entityFilter !== 'all') params.append('entityType', entityFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/audit-logs/export?${params}`);
      if (!res.ok) throw new Error('내보내기 실패');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({ title: '내보내기 완료', description: '감사 로그가 다운로드되었습니다.' });
    } catch (error) {
      toast({ title: '내보내기 실패', description: '다시 시도해주세요.', variant: 'destructive' });
    }
  };

  const renderActionBadge = (action: string) => {
    const config = actionConfig[action] || { label: action, color: 'bg-gray-100 text-gray-800', icon: null };
    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">감사 로그를 불러오는데 실패했습니다.</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            감사 로그
          </h1>
          <p className="text-gray-500 mt-1">시스템 활동 기록 및 변경 이력 추적</p>
        </div>
        <Button onClick={handleExport} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Excel 내보내기
        </Button>
      </div>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">총 활동</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.actionStats.reduce((sum: number, s: any) => sum + s.count, 0).toLocaleString()}
              </div>
              <p className="text-xs text-gray-500">최근 {stats.period}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">생성</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.actionStats.find((s: any) => s.action === 'CREATE')?.count || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">수정</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.actionStats.find((s: any) => s.action === 'UPDATE')?.count || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-500 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                로그인 실패
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.securityAlerts?.loginFailures || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ID 또는 IP 주소로 검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="액션" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 액션</SelectItem>
                {Object.entries(actionConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="대상 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 유형</SelectItem>
                {Object.entries(entityTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[150px]"
              placeholder="시작일"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[150px]"
              placeholder="종료일"
            />
          </div>
        </CardContent>
      </Card>

      {/* 테이블 */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">일시</TableHead>
                <TableHead className="w-[100px]">액션</TableHead>
                <TableHead className="w-[120px]">대상 유형</TableHead>
                <TableHead>대상 ID</TableHead>
                <TableHead>사용자</TableHead>
                <TableHead className="w-[120px]">IP 주소</TableHead>
                <TableHead className="w-[80px]">상세</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : data?.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    감사 로그가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50">
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-3 w-3" />
                        {format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}
                      </div>
                    </TableCell>
                    <TableCell>{renderActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <span className="text-sm">{entityTypeLabels[log.entityType] || log.entityType}</span>
                    </TableCell>
                    <TableCell className="font-mono text-sm text-gray-600 truncate max-w-[200px]">
                      {log.entityId || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-sm">{log.user?.name || '-'}</div>
                          <div className="text-xs text-gray-500">{log.user?.username || '-'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Globe className="h-3 w-3" />
                        {log.ipAddress || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 페이지네이션 */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          <span className="text-sm text-gray-600">
            {page} / {data.pagination.totalPages} 페이지
            <span className="ml-2 text-gray-400">
              (총 {data.pagination.total.toLocaleString()}건)
            </span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page === data.pagination.totalPages}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 상세 다이얼로그 */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              감사 로그 상세
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">일시</label>
                  <p>{format(new Date(selectedLog.createdAt), 'yyyy-MM-dd HH:mm:ss', { locale: ko })}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">액션</label>
                  <div className="mt-1">{renderActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">대상 유형</label>
                  <p>{entityTypeLabels[selectedLog.entityType] || selectedLog.entityType}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">대상 ID</label>
                  <p className="font-mono text-sm">{selectedLog.entityId || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">사용자</label>
                  <p>{selectedLog.user?.name || '-'} ({selectedLog.user?.username || '-'})</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">IP 주소</label>
                  <p>{selectedLog.ipAddress || '-'}</p>
                </div>
              </div>

              {selectedLog.userAgent && (
                <div>
                  <label className="text-sm font-medium text-gray-500">User Agent</label>
                  <p className="text-sm text-gray-600 break-all">{selectedLog.userAgent}</p>
                </div>
              )}

              {selectedLog.oldValue && (
                <div>
                  <label className="text-sm font-medium text-gray-500">변경 전 값</label>
                  <pre className="mt-1 p-3 bg-red-50 rounded text-sm overflow-auto max-h-[200px]">
                    {JSON.stringify(selectedLog.oldValue, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <label className="text-sm font-medium text-gray-500">변경 후 값</label>
                  <pre className="mt-1 p-3 bg-green-50 rounded text-sm overflow-auto max-h-[200px]">
                    {JSON.stringify(selectedLog.newValue, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.metadata && (
                <div>
                  <label className="text-sm font-medium text-gray-500">메타데이터</label>
                  <pre className="mt-1 p-3 bg-gray-50 rounded text-sm overflow-auto max-h-[200px]">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
