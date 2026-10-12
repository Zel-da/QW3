/**
 * 사진 다중 업로드 + 클립보드 붙여넣기(Ctrl+V) 지원 컴포넌트.
 * - R2 업로드 후 URL 배열 콜백
 * - 미리보기 썸네일 + 개별 삭제
 */
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, ClipboardPaste, Loader2 } from 'lucide-react';

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  disabled?: boolean;
  acceptPaste?: boolean;
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: fd });
  if (!res.ok) throw new Error('업로드 실패');
  const data = await res.json();
  return data.url;
}

export function PhotoDropzone({ value, onChange, label = '사진', disabled, acceptPaste = true }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const { toast } = useToast();

  const handleFiles = async (files: FileList | null | File[]) => {
    if (!files) return;
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (arr.length === 0) return;
    setUploading(n => n + arr.length);
    const uploaded: string[] = [];
    for (const f of arr) {
      try {
        const url = await uploadFile(f);
        uploaded.push(url);
      } catch (e: any) {
        toast({ title: '업로드 실패', description: e.message, variant: 'destructive' });
      } finally {
        setUploading(n => n - 1);
      }
    }
    if (uploaded.length) onChange([...value, ...uploaded]);
  };

  const onPaste = async (e: ClipboardEvent) => {
    if (!acceptPaste || disabled) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      await handleFiles(files);
      toast({ title: `${files.length}장 붙여넣기 완료` });
    }
  };

  useEffect(() => {
    if (!acceptPaste) return;
    window.addEventListener('paste', onPaste as any);
    return () => window.removeEventListener('paste', onPaste as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, acceptPaste, disabled]);

  const removeAt = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-medium">{label} ({value.length}장)</span>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={disabled}>
            <Upload className="w-4 h-4 mr-1.5" />파일 선택
          </Button>
          {acceptPaste && (
            <span className="inline-flex items-center text-xs text-muted-foreground gap-1 bg-muted px-2 py-1 rounded">
              <ClipboardPaste className="w-3.5 h-3.5" />
              Ctrl+V 로 캡쳐 붙여넣기
            </span>
          )}
          {uploading > 0 && (
            <span className="inline-flex items-center text-xs text-muted-foreground gap-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {uploading}장 업로드 중...
            </span>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => { handleFiles(e.target.files); if (inputRef.current) inputRef.current.value = ''; }}
      />
      {value.length === 0 ? (
        <div className="border border-dashed rounded-md p-6 text-center text-sm text-muted-foreground">
          사진이 없습니다. 파일 선택 또는 Ctrl+V로 캡쳐를 붙여넣으세요.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {value.map((url, i) => (
            <div key={i} className="relative group aspect-square border rounded-md overflow-hidden bg-muted">
              <img src={url} alt="" className="w-full h-full object-cover" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="삭제"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
