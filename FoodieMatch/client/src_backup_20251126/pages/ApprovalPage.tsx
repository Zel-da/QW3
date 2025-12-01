import React, { useState, useRef, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { CheckCircle, XCircle } from 'lucide-react';
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

const fetchApprovalRequest = async (approvalId: string) => {
  const res = await axios.get(`/api/approvals/${approvalId}`);
  return res.data;
};

export default function ApprovalPage() {
  const [, params] = useRoute('/approval/:approvalId');
  const [, navigate] = useLocation();
  const approvalId = params?.approvalId || '';
  const { toast } = useToast();

  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: approvalRequest, isLoading, error } = useQuery<ApprovalRequest>({
    queryKey: ['approvalRequest', approvalId],
    queryFn: () => fetchApprovalRequest(approvalId),
    enabled: !!approvalId,
  });

  const approveMutation = useMutation({
    mutationFn: async (signature: string) => {
      const res = await axios.post(`/api/approvals/${approvalId}/approve`, {
        signature,
      });
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: "결재 완료",
        description: "결재가 성공적으로 완료되었습니다. 관리자에게 알림이 발송되었습니다.",
      });
      // 결재 완료 후 대시보드로 이동
      setTimeout(() => {
        navigate('/');
      }, 1500);
    },
    onError: (error: any) => {
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
      toast({
        title: "반려 완료",
        description: "결재가 반려되었습니다. 요청자에게 알림이 발송되었습니다.",
      });
      setShowRejectDialog(false);
      // 반려 완료 후 대시보드로 이동
      setTimeout(() => {
        navigate('/');
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "오류",
        description: error.response?.data?.message || "반려 처리 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // Canvas drawing functions with proper coordinate scaling
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent scrolling on touch devices
    if ('touches' in e) {
      e.preventDefault();
    }

    const rect = canvas.getBoundingClientRect();
    // Calculate scale factors between CSS size and actual canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get client coordinates and apply scaling
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent scrolling on touch devices
    if ('touches' in e) {
      e.preventDefault();
    }

    const rect = canvas.getBoundingClientRect();
    // Calculate scale factors between CSS size and actual canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get client coordinates and apply scaling
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleApprove = async () => {
    if (!hasSignature) {
      toast({
        title: "서명 필요",
        description: "서명을 해주세요.",
        variant: "destructive",
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert canvas to base64 image
    const signatureImage = canvas.toDataURL('image/png');
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

  // Initialize canvas with proper dimensions and high-DPI support
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get device pixel ratio for high-DPI displays
    const dpr = window.devicePixelRatio || 1;

    // Get display size from CSS
    const rect = canvas.getBoundingClientRect();

    // Set actual canvas size (scaled for high-DPI)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);

    // Fill white background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !approvalRequest) {
    // Check if it's a 401 error (not logged in)
    const isUnauthorized = error && 'response' in error && error.response?.status === 401;
    // Check if it's a 403 error (no permission)
    const isForbidden = error && 'response' in error && error.response?.status === 403;

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

  if (approvalRequest.status === 'APPROVED') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">✅ 결재가 완료되었습니다</h2>
              <p className="text-muted-foreground mb-2">
                이 문서는 이미 승인되었습니다.
              </p>
              <p className="text-sm text-muted-foreground">
                결재 일시: {approvalRequest.approvedAt ? new Date(approvalRequest.approvedAt).toLocaleString('ko-KR') : '-'}
              </p>
              <Button
                onClick={() => navigate('/')}
                className="mt-4"
              >
                대시보드로 이동
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="container mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">TBM 월별 보고서 결재</CardTitle>
            <div className="text-sm text-muted-foreground space-y-1 mt-2">
              <p>팀: <span className="font-medium">{approvalRequest.monthlyReport.team?.name || '알 수 없음'}</span></p>
              <p>기간: <span className="font-medium">{approvalRequest.monthlyReport.year}년 {approvalRequest.monthlyReport.month}월</span></p>
              <p>요청자: <span className="font-medium">{approvalRequest.requester.name || approvalRequest.requester.username}</span></p>
              <p>요청 일시: <span className="font-medium">{new Date(approvalRequest.requestedAt).toLocaleString('ko-KR')}</span></p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 보고서 내용 안내 */}
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">보고서 내용</h3>
              <p className="text-sm text-muted-foreground">
                {approvalRequest.monthlyReport.team?.name || '해당 팀'}의 {approvalRequest.monthlyReport.year}년 {approvalRequest.monthlyReport.month}월 TBM 일지 수행 내역을 확인하시고 결재해 주시기 바랍니다.
              </p>
              <div className="mt-4">
                <a
                  href={`/monthly-report?teamId=${approvalRequest.monthlyReport.teamId}&year=${approvalRequest.monthlyReport.year}&month=${approvalRequest.monthlyReport.month}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  → 상세 보고서 보기 (새 창)
                </a>
              </div>
            </div>

            {/* 서명 영역 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold">서명</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  disabled={!hasSignature}
                >
                  지우기
                </Button>
              </div>
              <div className="border-2 border-dashed rounded-lg p-2 bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-40 cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                위 영역에 마우스나 터치로 서명해 주세요.
              </p>
            </div>

            {/* 결재 버튼 */}
            <div className="flex justify-between gap-4 pt-4">
              <Button
                onClick={() => setShowRejectDialog(true)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                variant="destructive"
                size="lg"
              >
                반려
              </Button>
              <Button
                onClick={handleApprove}
                disabled={!hasSignature || approveMutation.isPending || rejectMutation.isPending}
                size="lg"
              >
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
      </div>
    </div>
  );
}
