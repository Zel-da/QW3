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
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 200 });

  // Calculate proper canvas size when dialog opens
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Set canvas size based on container (accounting for padding/border)
      const width = Math.max(rect.width - 16, 300); // Subtract padding, min 300px
      const height = 200; // Fixed height

      setCanvasSize({
        width: width,
        height: height
      });

      // Clear canvas when dialog opens
      setTimeout(() => {
        if (sigCanvas.current) {
          const canvas = sigCanvas.current.getCanvas();
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Fill white background
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, width, height);
          }
        }
      }, 100);
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
              width: canvasSize.width,
              height: canvasSize.height,
              className: 'w-full h-48 touch-none',
              style: { width: '100%', height: '12rem' }
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