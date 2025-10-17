import { useRef } from 'react';
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
        <div className="border rounded-md bg-white">
          <SignatureCanvas
            ref={sigCanvas}
            penColor='black'
            canvasProps={{ className: 'w-full h-48' }}
          />
        </div>
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