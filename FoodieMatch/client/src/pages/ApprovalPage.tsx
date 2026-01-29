import { useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  CheckCircle,
  XCircle,
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  Users,
  FileText,
  ExternalLink,
  Calendar,
  User,
  Clock,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SignatureDialog } from '@/components/SignatureDialog';

interface ApprovalRequest {
  id: string;
  status: string;
  requestedAt: string;
  approvedAt?: string;
  monthlyReport: {
    id: string;
    teamId: number;
    year: number;
    month: number;
    team?: {
      id: number;
      name: string;
    };
  };
  requester: {
    id: string;
    name: string;
    username: string;
  };
  approver: {
    id: string;
    name: string;
    username: string;
  };
}

interface DailyReport {
  id: number;
  reportDate: string;
  managerName?: string;
  remarks?: string;
  reportDetails: {
    id: number;
    checkState?: string;
    actionDescription?: string;
    actionTaken?: string;
    actionStatus?: string;
  }[];
  reportSignatures: {
    id: number;
    userId?: string;
    memberId?: number;
    signedAt: string;
    signatureImage?: string;
  }[];
}

interface MonthlyData {
  dailyReports: DailyReport[];
  teamName?: string;
  year: string;
  month: string;
  checklistTemplate?: any;
  monthlyApproval?: any;
  approver?: any;
}

const fetchApprovalRequest = async (approvalId: string) => {
  const res = await axios.get(`/api/approvals/${approvalId}`);
  return res.data;
};

const fetchMonthlyData = async (teamId: number, year: number, month: number) => {
  const res = await axios.get(`/api/tbm/monthly?teamId=${teamId}&year=${year}&month=${month}`);
  return res.data;
};

// Skeleton 로딩 컴포넌트
function TBMSummarySkeleton() {
  return (
    <div className="space-y-6">
      {/* 통계 카드 스켈레톤 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
              <Skeleton className="h-2 w-full mt-3" />
            </CardContent>
          </Card>
        ))}
      </div>
      {/* 테이블 스켈레톤 */}
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ApprovalPage() {
  const [, params] = useRoute('/approval/:approvalId');
  const [, navigate] = useLocation();
  const approvalId = params?.approvalId || '';
  const { toast } = useToast();

  const queryClient = useQueryClient();
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isSigDialogOpen, setIsSigDialogOpen] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComplete, setApprovalComplete] = useState<'approved' | 'rejected' | null>(null);

  const { data: approvalRequest, isLoading, error } = useQuery<ApprovalRequest>({
    queryKey: ['approvalRequest', approvalId],
    queryFn: () => fetchApprovalRequest(approvalId),
    enabled: !!approvalId,
    staleTime: 0, // 항상 최신 데이터 가져오기 (이미 처리된 결재 상태 즉시 반영)
  });

  // TBM 월별 데이터 조회
  const { data: monthlyData, isLoading: isMonthlyLoading } = useQuery<MonthlyData>({
    queryKey: [
      'tbmMonthly',
      approvalRequest?.monthlyReport.teamId,
      approvalRequest?.monthlyReport.year,
      approvalRequest?.monthlyReport.month,
    ],
    queryFn: () =>
      fetchMonthlyData(
        approvalRequest!.monthlyReport.teamId,
        approvalRequest!.monthlyReport.year,
        approvalRequest!.monthlyReport.month
      ),
    enabled: !!approvalRequest && approvalRequest.status === 'PENDING',
  });

  // 요약 통계 계산
  const summary = useMemo(() => {
    if (!monthlyData?.dailyReports) return null;

    const reports = monthlyData.dailyReports;
    const totalDays = new Date(
      approvalRequest!.monthlyReport.year,
      approvalRequest!.monthlyReport.month,
      0
    ).getDate();
    const writtenDays = reports.length;
    const writeRate = totalDays > 0 ? Math.round((writtenDays / totalDays) * 100) : 0;

    // 점검 결과 집계
    let checkOk = 0;
    let checkWarning = 0;
    let checkBad = 0;
    let totalItems = 0;

    reports.forEach((r) => {
      r.reportDetails.forEach((d) => {
        totalItems++;
        const state = d.checkState?.toUpperCase();
        if (state === 'O' || state === 'OK' || state === 'GOOD' || state === '양호' || state === '○') {
          checkOk++;
        } else if (state === 'X' || state === 'BAD' || state === 'NG' || state === '불량' || state === '×') {
          checkBad++;
        } else if (state === '△' || state === 'WARNING' || state === '주의') {
          checkWarning++;
        } else if (state) {
          // 다른 상태값이 있으면 양호로 처리
          checkOk++;
        }
      });
    });

    // 서명 현황
    const totalSignatures = reports.reduce((sum, r) => sum + r.reportSignatures.length, 0);

    // 특이사항 (불량/주의 건수)
    const issueCount = checkBad + checkWarning;

    return {
      totalDays,
      writtenDays,
      writeRate,
      checkOk,
      checkWarning,
      checkBad,
      totalItems,
      totalSignatures,
      issueCount,
    };
  }, [monthlyData, approvalRequest]);

  const approveMutation = useMutation({
    mutationFn: async (signature: string) => {
      const res = await axios.post(`/api/approvals/${approvalId}/approve`, {
        signature,
      });
      return res.data;
    },
    onSuccess: () => {
      // 캐시 무효화하여 다음 접근 시 최신 데이터 로드
      queryClient.invalidateQueries({ queryKey: ['approvalRequest', approvalId] });
      toast({
        title: "결재 완료",
        description: "결재가 성공적으로 완료되었습니다. 관리자에게 알림이 발송되었습니다.",
      });
      setApprovalComplete('approved');
    },
    onError: (error: any) => {
      // 에러 시 데이터 다시 불러오기 (이미 처리된 결재인 경우 UI 갱신)
      queryClient.invalidateQueries({ queryKey: ['approvalRequest', approvalId] });
      toast({
        title: "오류",
        description: error.response?.data?.message || "결재 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await axios.post(`/api/approvals/${approvalId}/reject`, {
        rejectionReason: reason,
      });
      return res.data;
    },
    onSuccess: () => {
      // 캐시 무효화하여 다음 접근 시 최신 데이터 로드
      queryClient.invalidateQueries({ queryKey: ['approvalRequest', approvalId] });
      toast({
        title: "반려 완료",
        description: "결재가 반려되었습니다. 요청자에게 알림이 발송되었습니다.",
      });
      setShowRejectDialog(false);
      setApprovalComplete('rejected');
    },
    onError: (error: any) => {
      // 에러 시 데이터 다시 불러오기 (이미 처리된 결재인 경우 UI 갱신)
      queryClient.invalidateQueries({ queryKey: ['approvalRequest', approvalId] });
      toast({
        title: "오류",
        description: error.response?.data?.message || "반려 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = async () => {
    if (!signatureImage) {
      toast({
        title: "서명 필요",
        description: "서명을 해주세요.",
        variant: "destructive",
      });
      return;
    }

    await approveMutation.mutateAsync(signatureImage);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "반려 사유 필요",
        description: "반려 사유를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    await rejectMutation.mutateAsync(rejectionReason);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !approvalRequest) {
    const isUnauthorized = error && 'response' in error && (error as any).response?.status === 401;
    const isForbidden = error && 'response' in error && (error as any).response?.status === 403;

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              {isUnauthorized ? (
                <>
                  <h2 className="text-xl font-semibold mb-2">로그인이 필요합니다</h2>
                  <p className="text-muted-foreground mb-4">
                    결재를 진행하려면 먼저 로그인해 주세요.
                  </p>
                  <Button
                    onClick={() => navigate(`/login?redirect=/approval/${approvalId}`)}
                    className="mt-2"
                  >
                    로그인하기
                  </Button>
                </>
              ) : isForbidden ? (
                <>
                  <h2 className="text-xl font-semibold mb-2">결재 권한이 없습니다</h2>
                  <p className="text-muted-foreground">
                    이 결재는 지정된 결재자만 승인할 수 있습니다.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-2">결재 요청을 찾을 수 없습니다</h2>
                  <p className="text-muted-foreground">
                    유효하지 않은 링크이거나 이미 처리된 결재 요청입니다.
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 방금 처리 완료된 경우
  if (approvalComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              {approvalComplete === 'approved' ? (
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              )}
              <h2 className="text-xl font-semibold mb-2">
                {approvalComplete === 'approved' ? '결재가 완료되었습니다' : '결재가 반려되었습니다'}
              </h2>
              <p className="text-muted-foreground mb-4">
                {approvalComplete === 'approved'
                  ? '결재가 성공적으로 완료되었습니다. 관리자에게 알림이 발송되었습니다.'
                  : '결재가 반려되었습니다. 요청자에게 알림이 발송되었습니다.'}
              </p>
              <Button onClick={() => navigate('/')}>
                대시보드로 이동
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (approvalRequest.status === 'APPROVED') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">결재가 완료되었습니다</h2>
              <p className="text-muted-foreground mb-2">
                이 문서는 이미 승인되었습니다.
              </p>
              <div className="text-sm text-muted-foreground space-y-1 mb-4">
                <p>결재자: {approvalRequest.approver?.name || approvalRequest.approver?.username || '-'}</p>
                <p>결재 일시: {approvalRequest.approvedAt ? new Date(approvalRequest.approvedAt).toLocaleString('ko-KR') : '-'}</p>
              </div>
              <Button
                onClick={() => navigate('/')}
              >
                대시보드로 이동
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (approvalRequest.status === 'REJECTED') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">결재가 반려되었습니다</h2>
              <p className="text-muted-foreground mb-2">
                이 문서는 반려 처리되었습니다.
              </p>
              <div className="text-sm text-muted-foreground space-y-1 mb-4">
                <p>결재자: {approvalRequest.approver?.name || approvalRequest.approver?.username || '-'}</p>
                <p>처리 일시: {approvalRequest.approvedAt ? new Date(approvalRequest.approvedAt).toLocaleString('ko-KR') : '-'}</p>
              </div>
              <Button
                onClick={() => navigate('/')}
              >
                대시보드로 이동
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const teamName = approvalRequest.monthlyReport.team?.name || '알 수 없음';
  const year = approvalRequest.monthlyReport.year;
  const month = approvalRequest.monthlyReport.month;
  const requesterName = approvalRequest.requester.name || approvalRequest.requester.username;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* A. 페이지 헤더 */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl lg:text-2xl">TBM 월별 보고서 결재</CardTitle>
                <Badge variant="outline" className="mt-1">결재 대기</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span>팀:</span>
                <span className="font-medium text-foreground">{teamName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>기간:</span>
                <span className="font-medium text-foreground">{year}년 {month}월</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4 shrink-0" />
                <span>요청자:</span>
                <span className="font-medium text-foreground">{requesterName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0" />
                <span>요청일:</span>
                <span className="font-medium text-foreground">
                  {new Date(approvalRequest.requestedAt).toLocaleString('ko-KR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* B-C. TBM 요약 및 일별 현황 */}
        {isMonthlyLoading ? (
          <TBMSummarySkeleton />
        ) : summary && monthlyData ? (
          <>
            {/* B. 요약 통계 카드 (3열 그리드) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 보고서 작성 */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <ClipboardCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">보고서 작성</p>
                      <p className="text-lg font-bold">
                        {summary.writtenDays}<span className="text-sm font-normal text-muted-foreground">/{summary.totalDays}일</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">작성률</span>
                      <span className="font-medium">{summary.writeRate}%</span>
                    </div>
                    <Progress value={summary.writeRate} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* 점검 결과 */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">점검 결과</p>
                      <p className="text-lg font-bold">
                        {summary.totalItems}<span className="text-sm font-normal text-muted-foreground"> 항목</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 hover:bg-green-100">
                      ○ {summary.checkOk}
                    </Badge>
                    <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 hover:bg-yellow-100">
                      △ {summary.checkWarning}
                    </Badge>
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 hover:bg-red-100">
                      X {summary.checkBad}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* 특이사항 */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      summary.issueCount > 0
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-emerald-100 dark:bg-emerald-900/30'
                    }`}>
                      <AlertTriangle className={`h-5 w-5 ${
                        summary.issueCount > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">특이사항</p>
                      <p className="text-lg font-bold">
                        {summary.issueCount > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400">주의 {summary.issueCount}건</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">양호</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    {summary.issueCount > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        불량 {summary.checkBad}건, 주의 {summary.checkWarning}건이 확인되었습니다.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        점검 항목에서 특이사항이 없습니다.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* C. 일별 작성 현황 테이블 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">일별 작성 현황</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="max-h-[400px] overflow-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[100px]">날짜</TableHead>
                        <TableHead>작성자</TableHead>
                        <TableHead className="text-center">서명</TableHead>
                        <TableHead className="text-center">점검상태</TableHead>
                        <TableHead>비고</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyData.dailyReports.length > 0 ? (
                        monthlyData.dailyReports.map((report) => {
                          const badCount = report.reportDetails.filter((d) => {
                            const s = d.checkState?.toUpperCase();
                            return s === 'X' || s === 'BAD' || s === 'NG' || s === '불량' || s === '×'
                              || s === '△' || s === 'WARNING' || s === '주의';
                          }).length;
                          const date = new Date(report.reportDate);
                          const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
                          const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
                          const dayStr = dayNames[date.getDay()];

                          return (
                            <TableRow key={report.id}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {dateStr} ({dayStr})
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {report.managerName || '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {report.reportSignatures.length > 0 ? (
                                  <Badge variant="outline" className="text-green-600 border-green-300">
                                    {report.reportSignatures.length}명
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {badCount > 0 ? (
                                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 hover:bg-amber-100">
                                    주의 {badCount}건
                                  </Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 hover:bg-green-100">
                                    정상
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                {report.remarks || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            작성된 보고서가 없습니다.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}

        {/* D. 상세 보고서 링크 */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">상세 보고서</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {teamName}의 {year}년 {month}월 TBM 일지 전체 내역을 확인합니다.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={`/monthly-report?teamId=${approvalRequest.monthlyReport.teamId}&year=${year}&month=${month}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-1.5"
                >
                  <ExternalLink className="h-4 w-4" />
                  보고서 보기
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* E. 서명 + 결재 버튼 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            {/* 서명 영역 */}
            <div className="space-y-2">
              <label className="font-semibold text-sm">결재 서명</label>
              {signatureImage ? (
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <span className="text-sm text-green-600 font-medium">서명 완료</span>
                  <img
                    src={signatureImage}
                    alt="결재 서명"
                    className="h-16 w-32 object-contain border rounded bg-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSigDialogOpen(true)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                  >
                    다시 서명
                  </Button>
                </div>
              ) : (
                <div className="p-6 border-2 border-dashed rounded-lg bg-muted/20 text-center">
                  <Button
                    onClick={() => setIsSigDialogOpen(true)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    variant="outline"
                    className="gap-2"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    서명하기
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    결재를 위해 서명을 해주세요.
                  </p>
                </div>
              )}
            </div>

            {/* 결재 버튼 */}
            <div className="flex justify-between gap-4 pt-2 border-t">
              <Button
                onClick={() => setShowRejectDialog(true)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                variant="destructive"
                size="lg"
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                반려
              </Button>
              <Button
                onClick={handleApprove}
                disabled={!signatureImage || approveMutation.isPending || rejectMutation.isPending}
                size="lg"
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                {approveMutation.isPending ? '처리 중...' : '결재 완료'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 반려 사유 입력 Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>결재 반려</DialogTitle>
              <DialogDescription>
                결재를 반려하는 사유를 입력해주세요. 요청자에게 반려 사유가 전달됩니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">반려 사유</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="반려 사유를 상세히 입력해주세요..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
                disabled={rejectMutation.isPending}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
              >
                {rejectMutation.isPending ? '처리 중...' : '반려 확인'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <SignatureDialog
          isOpen={isSigDialogOpen}
          onClose={() => setIsSigDialogOpen(false)}
          onSave={(data) => { setSignatureImage(data); setIsSigDialogOpen(false); }}
          userName={approvalRequest.approver?.name || approvalRequest.approver?.username || '결재자'}
        />
      </div>
    </div>
  );
}
