import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileDropzone } from '@/components/FileDropzone';
import { X, Camera, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import apiClient from '@/features/tbm/apiConfig';

interface Attachment {
  url: string;
  name: string;
  size: number;
  type: string;
}

interface IssueDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { description: string; actionTaken: string; attachments: Attachment[] }) => void;
  item: {
    id: number;
    category: string;
    description: string;
    checkState: string;
  } | null;
  initialData?: {
    description: string;
    actionTaken?: string;
    attachments: Attachment[];
  };
}

export function IssueDetailModal({
  isOpen,
  onClose,
  onSave,
  item,
  initialData,
}: IssueDetailModalProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState(initialData?.description || '');
  const [actionTaken, setActionTaken] = useState(initialData?.actionTaken || '');
  const [attachments, setAttachments] = useState<Attachment[]>(initialData?.attachments || []);
  const [uploading, setUploading] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const prevIsOpenRef = useRef(false);

  // 모달이 열릴 때만 초기화 (isOpen이 false→true로 변경될 때)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current && initialData) {
      setDescription(initialData.description || '');
      setActionTaken(initialData.actionTaken || '');
      setAttachments(initialData.attachments || []);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialData]);

  const handlePhotoUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));

    try {
      // Content-Type 헤더를 설정하지 않아야 브라우저가 자동으로 boundary를 추가함
      const res = await apiClient.post('/api/upload-multiple', formData);
      const newAttachments = res.data.files.map((f: any) => ({
        url: f.url,
        name: f.name,
        size: f.size,
        type: 'image'
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
      toast({ title: `${files.length}개의 사진이 업로드되었습니다.` });
    } catch (err: any) {
      toast({
        title: "사진 업로드 실패",
        description: err.response?.data?.message || err.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    if (!description.trim()) {
      toast({
        title: "위험예측 사항을 입력해주세요",
        description: "△ 또는 X 항목은 위험예측 사항 입력이 필수입니다.",
        variant: "destructive"
      });
      return;
    }
    if (attachments.length === 0) {
      toast({
        title: "사진을 업로드해주세요",
        description: "△ 또는 X 항목은 사진 첨부가 필수입니다.",
        variant: "destructive"
      });
      return;
    }
    onSave({ description, actionTaken, attachments });
    onClose();
  };

  if (!item) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={item.checkState === 'X' ? 'text-red-500' : 'text-yellow-500'} />
              이슈 상세 입력
            </DialogTitle>
            <DialogDescription>
              {item.checkState === 'X' ? '불량' : '개선필요'} 항목에 대한 조치 내용과 사진을 입력해주세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 항목 정보 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline">{item.category}</Badge>
                <Badge variant={item.checkState === 'X' ? 'destructive' : 'secondary'}>
                  {item.checkState}
                </Badge>
              </div>
              <p className="text-sm font-medium">{item.description}</p>
            </div>

            {/* 사진 업로드 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Camera className="h-4 w-4" />
                사진 첨부 <span className="text-red-500">*</span>
              </Label>
              <FileDropzone
                onFilesSelected={handlePhotoUpload}
                accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }}
                maxFiles={20}
                maxSize={10 * 1024 * 1024}
                disabled={uploading}
              />
              {attachments.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-full h-16 object-cover rounded border cursor-pointer hover:opacity-80"
                        onClick={() => setEnlargedImage(att.url)}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeAttachment(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 위험예측 사항 입력 */}
            <div className="space-y-2">
              <Label>
                위험예측 사항 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="위험예측 사항을 상세히 작성해주세요..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={!description.trim() ? 'border-red-300' : ''}
              />
            </div>

            {/* 조치사항 입력 */}
            <div className="space-y-2">
              <Label>
                조치사항
              </Label>
              <Textarea
                placeholder="조치사항을 작성해주세요..."
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button onClick={handleSave} disabled={uploading}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이미지 확대 다이얼로그 */}
      <Dialog open={!!enlargedImage} onOpenChange={(open) => !open && setEnlargedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setEnlargedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={enlargedImage || ''}
              alt="확대된 이미지"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
