import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  User,
  Clock,
  MapPin,
  Download,
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

interface EducationApprovalData {
  id: string;
  site: string;
  year: number;
  month: number;
  status: string;
  downloadDay?: number;
  teamDates?: string;
  requestedAt: string;
  approvedAt?: string;
  rejectionReason?: string;
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

const fetchEducationApproval = async (id: string) => {
  const res = await axios.get(`/api/education-approvals/${id}`);
  return res.data;
};

export default function EducationApprovalPage() {
  const [, params] = useRoute('/education-approval/:id');
  const [, navigate] = useLocation();
  const approvalId = params?.id || '';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isSigDialogOpen, setIsSigDialogOpen] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalComplete, setApprovalComplete] = useState<'approved' | 'rejected' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: approval, isLoading, error } = useQuery<EducationApprovalData>({
    queryKey: ['educationApproval', approvalId],
    queryFn: () => fetchEducationApproval(approvalId),
    enabled: !!approvalId,
    staleTime: 0,
  });

  const approveMutation = useMutation({
    mutationFn: async (signature: string) => {
      const res = await axios.post(`/api/education-approvals/${approvalId}/approve`, { signature });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['educationApproval', approvalId] });
      toast({
        title: "결재 완료",
        description: "월간 결재가 성공적으로 완료되었습니다.",
      });
      setApprovalComplete('approved');
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['educationApproval', approvalId] });
      toast({
        title: "오류",
        description: error.response?.data?.message || "결재 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await axios.post(`/api/education-approvals/${approvalId}/reject`, { rejectionReason: reason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['educationApproval', approvalId] });
      toast({
        title: "반려 완료",
        description: "월간 결재가 반려되었습니다.",
      });
      setShowRejectDialog(false);
      setApprovalComplete('rejected');
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['educationApproval', approvalId] });
      toast({
        title: "오류",
        description: error.response?.data?.message || "반려 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const handleApprove = async () => {
    if (!signatureImage) {
      toast({ title: "서명 필요", description: "서명을 해주세요.", variant: "destructive" });
      return;
    }
    await approveMutation.mutateAsync(signatureImage);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({ title: "반려 사유 필요", description: "반려 사유를 입력해주세요.", variant: "destructive" });
      return;
    }
    await rejectMutation.mutateAsync(rejectionReason);
  };

  const handleDownloadExcel = async () => {
    if (!approval) return;
    setIsDownloading(true);
    try {
      toast({ title: "안전교육 현황 다운로드 중...", description: "데이터를 수집하고 있습니다." });

      // 결재 요청 시 저장된 설정 사용
      const day = approval.downloadDay
        || new Date(approval.year, approval.month, 0).getDate(); // fallback: 해당 월 마지막 날

      const params = new URLSearchParams({
        site: approval.site,
        year: String(approval.year),
        month: String(approval.month),
        date: String(day),
        educationApprovalId: approval.id,
      });
      if (approval.teamDates) {
        params.append('teamDates', approval.teamDates);
      }

      const response = await fetch(`/api/tbm/safety-education-excel?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Safety_Education_${approval.site}_${approval.year}-${String(approval.month).padStart(2, '0')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: "성공", description: "안전교육 현황이 다운로드되었습니다." });
    } catch (error) {
      console.error("Failed to download education Excel:", error);
      toast({ title: "오류", description: "다운로드 중 오류가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !approval) {
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
                  <p className="text-muted-foreground mb-4">결재를 진행하려면 먼저 로그인해 주세요.</p>
                  <Button onClick={() => navigate(`/login?redirect=/education-approval/${approvalId}`)}>로그인하기</Button>
                </>
              ) : isForbidden ? (
                <>
                  <h2 className="text-xl font-semibold mb-2">결재 권한이 없습니다</h2>
                  <p className="text-muted-foreground">이 결재는 지정된 결재자만 승인할 수 있습니다.</p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-2">결재 요청을 찾을 수 없습니다</h2>
                  <p className="text-muted-foreground">유효하지 않은 링크이거나 이미 처리된 결재 요청입니다.</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 방금 처리 완료
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
                  ? '월간 결재가 성공적으로 완료되었습니다. 요청자에게 알림이 발송되었습니다.'
                  : '월간 결재가 반려되었습니다. 요청자에게 알림이 발송되었습니다.'}
              </p>
              <Button onClick={() => navigate('/')}>대시보드로 이동</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 이미 처리된 결재
  if (approval.status === 'APPROVED') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">결재가 완료되었습니다</h2>
              <p className="text-muted-foreground mb-2">이 문서는 이미 승인되었습니다.</p>
              <div className="text-sm text-muted-foreground space-y-1 mb-4">
                <p>결재자: {approval.approver?.name || '-'}</p>
                <p>결재 일시: {approval.approvedAt ? new Date(approval.approvedAt).toLocaleString('ko-KR') : '-'}</p>
              </div>
              <Button onClick={() => navigate('/')}>대시보드로 이동</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (approval.status === 'REJECTED') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">결재가 반려되었습니다</h2>
              <p className="text-muted-foreground mb-2">이 문서는 반려 처리되었습니다.</p>
              <div className="text-sm text-muted-foreground space-y-1 mb-4">
                <p>결재자: {approval.approver?.name || '-'}</p>
                <p>처리 일시: {approval.approvedAt ? new Date(approval.approvedAt).toLocaleString('ko-KR') : '-'}</p>
              </div>
              <Button onClick={() => navigate('/')}>대시보드로 이동</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const requesterName = approval.requester.name || approval.requester.username;

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 헤더 */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl lg:text-2xl">월간 결재</CardTitle>
                <Badge variant="outline" className="mt-1">결재 대기</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>현장:</span>
                <span className="font-medium text-foreground">{approval.site}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4 shrink-0" />
                <span>기간:</span>
                <span className="font-medium text-foreground">{approval.year}년 {approval.month}월</span>
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
                  {new Date(approval.requestedAt).toLocaleString('ko-KR')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 결재 대상 확인 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">결재 대상</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="p-4 bg-muted/30 rounded-lg border space-y-2">
              <p className="text-sm">
                <span className="font-semibold">{approval.site}</span> 현장의{' '}
                <span className="font-semibold">{approval.year}년 {approval.month}월</span> 안전교육 현황 및 TBM 종합 보고서에 대한 월간 결재입니다.
              </p>
              <p className="text-xs text-muted-foreground">
                결재 완료 시 해당 월 종합 보고서에 결재자 서명이 반영됩니다.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 gap-2"
                onClick={handleDownloadExcel}
                disabled={isDownloading}
              >
                <Download className="h-4 w-4" />
                {isDownloading ? '다운로드 중...' : '안전교육 현황 다운로드'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 서명 + 결재 버튼 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
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
                    서명하기
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">결재를 위해 서명을 해주세요.</p>
                </div>
              )}
            </div>

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

        {/* 반려 사유 Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>결재 반려</DialogTitle>
              <DialogDescription>결재를 반려하는 사유를 입력해주세요.</DialogDescription>
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
                onClick={() => { setShowRejectDialog(false); setRejectionReason(''); }}
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
          userName={approval.approver?.name || '결재자'}
        />
      </div>
    </div>
  );
}
