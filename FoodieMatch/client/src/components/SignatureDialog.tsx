import { useRef, useEffect } from 'react';
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

  // 다이얼로그 열릴 때 캔버스 초기화만 수행 (DPR 처리는 react-signature-canvas가 자동 처리)
  useEffect(() => {
    if (isOpen && sigCanvas.current) {
      const timer = setTimeout(() => {
        sigCanvas.current?.clear();
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
        <div className="border rounded-md bg-white p-2">
          <SignatureCanvas
            ref={sigCanvas}
            penColor='black'
            canvasProps={{
              className: 'touch-none w-full',
              style: { height: '200px' }
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