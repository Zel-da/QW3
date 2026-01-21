import React, { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DualSignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (managerSignature: string, approverSignature: string) => void;
  managerName: string;
  approverName: string;
}

// DPR을 고려한 캔버스 설정 함수
const setupCanvas = (
  containerRef: React.RefObject<HTMLDivElement>,
  sigCanvas: React.RefObject<SignatureCanvas>,
  cssHeight: number = 150
): { width: number; height: number } | null => {
  if (!containerRef.current || !sigCanvas.current) return null;

  const rect = containerRef.current.getBoundingClientRect();
  const ratio = Math.max(window.devicePixelRatio || 1, 1);

  const cssWidth = Math.max(rect.width - 16, 300);

  const canvas = sigCanvas.current.getCanvas();

  // 캔버스 실제 픽셀 크기 = CSS 크기 * DPR
  canvas.width = cssWidth * ratio;
  canvas.height = cssHeight * ratio;

  // CSS로 표시 크기 설정
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  // 드로잉 컨텍스트 스케일링 (좌표계를 CSS 픽셀 기준으로)
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  sigCanvas.current.clear();

  return { width: cssWidth, height: cssHeight };
};

export function DualSignatureDialog({
  isOpen,
  onClose,
  onSave,
  managerName,
  approverName
}: DualSignatureDialogProps) {
  const managerSigCanvas = useRef<SignatureCanvas>(null);
  const approverSigCanvas = useRef<SignatureCanvas>(null);
  const managerContainerRef = useRef<HTMLDivElement>(null);
  const approverContainerRef = useRef<HTMLDivElement>(null);
  const [cssSize, setCssSize] = useState({ width: 300, height: 150 });
  const [activeTab, setActiveTab] = useState('manager');
  const [managerSigned, setManagerSigned] = useState(false);
  const [approverSigned, setApproverSigned] = useState(false);
  const [savedManagerSignature, setSavedManagerSignature] = useState<string>('');
  const [savedApproverSignature, setSavedApproverSignature] = useState<string>('');

  // DPR을 고려한 캔버스 설정
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const containerRef = activeTab === 'manager' ? managerContainerRef : approverContainerRef;
        const sigCanvas = activeTab === 'manager' ? managerSigCanvas : approverSigCanvas;

        const size = setupCanvas(containerRef, sigCanvas, 150);
        if (size) {
          setCssSize(size);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  // Clear canvases when dialog opens
  useEffect(() => {
    if (isOpen) {
      setManagerSigned(false);
      setApproverSigned(false);
      setSavedManagerSignature('');
      setSavedApproverSignature('');
      setActiveTab('manager');
      setTimeout(() => {
        // 두 캔버스 모두 초기 설정
        const managerSize = setupCanvas(managerContainerRef, managerSigCanvas, 150);
        if (managerSize) {
          setCssSize(managerSize);
        }
      }, 150);
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
      alert('담당자 서명을 입력해주세요.');
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
      alert('승인자 서명을 입력해주세요.');
      return;
    }
    // 승인 서명 데이터를 미리 저장
    const sigData = approverSigCanvas.current?.toDataURL('image/png') || '';
    setSavedApproverSignature(sigData);
    setApproverSigned(true);
  };

  const save = () => {
    if (!managerSigned || !savedManagerSignature) {
      alert('담당자 서명을 먼저 입력해주세요.');
      setActiveTab('manager');
      return;
    }
    if (!approverSigned || !savedApproverSignature) {
      alert('승인자 서명을 입력해주세요.');
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
              <div ref={managerContainerRef} className="border rounded-md bg-white p-2">
                <SignatureCanvas
                  ref={managerSigCanvas}
                  penColor='black'
                  canvasProps={{
                    className: 'touch-none',
                    style: {
                      width: `${cssSize.width}px`,
                      height: `${cssSize.height}px`
                    }
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
              <div ref={approverContainerRef} className="border rounded-md bg-white p-2">
                <SignatureCanvas
                  ref={approverSigCanvas}
                  penColor='black'
                  canvasProps={{
                    className: 'touch-none',
                    style: {
                      width: `${cssSize.width}px`,
                      height: `${cssSize.height}px`
                    }
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
