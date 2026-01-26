import { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

interface DualSignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (managerSignature: string, approverSignature: string) => void;
  managerName: string;
  approverName: string;
}

export function DualSignatureDialog({
  isOpen,
  onClose,
  onSave,
  managerName,
  approverName
}: DualSignatureDialogProps) {
  const managerSigCanvas = useRef<SignatureCanvas>(null);
  const approverSigCanvas = useRef<SignatureCanvas>(null);
  const [activeTab, setActiveTab] = useState('manager');
  const [managerSigned, setManagerSigned] = useState(false);
  const [approverSigned, setApproverSigned] = useState(false);
  const [savedManagerSignature, setSavedManagerSignature] = useState<string>('');
  const [savedApproverSignature, setSavedApproverSignature] = useState<string>('');

  // 다이얼로그 열릴 때 캔버스 초기화 (DPR 처리는 react-signature-canvas가 자동 처리)
  useEffect(() => {
    if (isOpen) {
      setManagerSigned(false);
      setApproverSigned(false);
      setSavedManagerSignature('');
      setSavedApproverSignature('');
      setActiveTab('manager');
      const timer = setTimeout(() => {
        managerSigCanvas.current?.clear();
        approverSigCanvas.current?.clear();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const clearManager = () => {
    managerSigCanvas.current?.clear();
    setManagerSigned(false);
    setSavedManagerSignature('');
  };

  const clearApprover = () => {
    approverSigCanvas.current?.clear();
    setApproverSigned(false);
    setSavedApproverSignature('');
  };

  const confirmManager = () => {
    if (managerSigCanvas.current?.isEmpty()) {
      toast({ title: '담당자 서명을 입력해주세요.', variant: 'destructive' });
      return;
    }
    // 담당 서명 데이터를 미리 저장
    const sigData = managerSigCanvas.current?.toDataURL('image/png') || '';
    setSavedManagerSignature(sigData);
    setManagerSigned(true);
    setActiveTab('approver');
  };

  const confirmApprover = () => {
    if (approverSigCanvas.current?.isEmpty()) {
      toast({ title: '승인자 서명을 입력해주세요.', variant: 'destructive' });
      return;
    }
    // 승인 서명 데이터를 미리 저장
    const sigData = approverSigCanvas.current?.toDataURL('image/png') || '';
    setSavedApproverSignature(sigData);
    setApproverSigned(true);
  };

  const save = () => {
    if (!managerSigned || !savedManagerSignature) {
      toast({ title: '담당자 서명을 먼저 입력해주세요.', variant: 'destructive' });
      setActiveTab('manager');
      return;
    }
    if (!approverSigned || !savedApproverSignature) {
      toast({ title: '승인자 서명을 입력해주세요.', variant: 'destructive' });
      setActiveTab('approver');
      return;
    }

    // 미리 저장해둔 서명 데이터 사용
    onSave(savedManagerSignature, savedApproverSignature);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>결재 서명</DialogTitle>
          <DialogDescription>담당자와 승인자 서명을 순서대로 입력해주세요.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manager" className="relative">
              담당
              {managerSigned && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="approver" className="relative">
              승인
              {approverSigned && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manager" className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                담당자: <span className="text-primary">{managerName || '미지정'}</span>
              </Label>
              <div className="border rounded-md bg-white p-2">
                <SignatureCanvas
                  ref={managerSigCanvas}
                  penColor='black'
                  canvasProps={{
                    className: 'touch-none w-full',
                    style: { height: '150px' }
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                위 영역에 마우스나 터치로 서명해 주세요.
              </p>
            </div>
            <div className="flex justify-between">
              <Button onClick={clearManager} variant="outline" size="sm">초기화</Button>
              <Button onClick={confirmManager} size="sm">
                {managerSigned ? '서명 완료 ✓' : '서명 확인 →'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="approver" className="space-y-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                승인자: <span className="text-primary">{approverName || '미지정'}</span>
              </Label>
              <div className="border rounded-md bg-white p-2">
                <SignatureCanvas
                  ref={approverSigCanvas}
                  penColor='black'
                  canvasProps={{
                    className: 'touch-none w-full',
                    style: { height: '150px' }
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                위 영역에 마우스나 터치로 서명해 주세요.
              </p>
            </div>
            <div className="flex justify-between">
              <Button onClick={clearApprover} variant="outline" size="sm">초기화</Button>
              <Button onClick={confirmApprover} size="sm">
                {approverSigned ? '서명 완료 ✓' : '서명 확인'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
          <span>진행 상태:</span>
          <span className={managerSigned ? 'text-green-600' : 'text-gray-400'}>
            담당 {managerSigned ? '✓' : '○'}
          </span>
          <span>→</span>
          <span className={approverSigned ? 'text-green-600' : 'text-gray-400'}>
            승인 {approverSigned ? '✓' : '○'}
          </span>
        </div>

        <DialogFooter className="justify-between">
          <Button onClick={onClose} variant="ghost">취소</Button>
          <Button
            onClick={save}
            disabled={!managerSigned || !approverSigned}
          >
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
