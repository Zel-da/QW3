import { useRef, useEffect, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
  userName: string;
}

export function SignatureDialog({ isOpen, onClose, onSave, userName }: SignatureDialogProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cssSize, setCssSize] = useState({ width: 300, height: 200 });

  // 캔버스 크기 설정 (DPR 스케일링 제거 - react-signature-canvas가 내부 처리)
  useEffect(() => {
    if (isOpen && containerRef.current && sigCanvas.current) {
      const timer = setTimeout(() => {
        const rect = containerRef.current!.getBoundingClientRect();

        // CSS 크기 계산 (패딩 p-2=16px + 여유분)
        const width = Math.max(rect.width - 20, 280);
        const height = 200;
        setCssSize({ width, height });

        // 캔버스 직접 조작 - CSS 크기와 동일하게 설정
        const canvas = sigCanvas.current!.getCanvas();
        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // 서명 패드 클리어
        sigCanvas.current!.clear();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const clear = () => {
    sigCanvas.current?.clear();
  };

  const save = () => {
    if (sigCanvas.current?.isEmpty()) {
      alert('서명을 입력해주세요.');
      return;
    }
    const signatureData = sigCanvas.current?.toDataURL('image/png') || '';
    onSave(signatureData);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{userName}님, 서명해주세요.</DialogTitle>
          <DialogDescription>아래 영역에 서명을 입력하고 저장 버튼을 누르세요.</DialogDescription>
        </DialogHeader>
        <div ref={containerRef} className="border rounded-md bg-white p-2">
          <SignatureCanvas
            ref={sigCanvas}
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
        <DialogFooter className="justify-between">
          <Button onClick={clear} variant="outline">초기화</Button>
          <div>
            <Button onClick={onClose} variant="ghost" className="mr-2">취소</Button>
            <Button onClick={save}>저장</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}