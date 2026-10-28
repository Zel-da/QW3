/**
 * 사진 다중 업로드 + 클립보드 붙여넣기(Ctrl+V) 지원 컴포넌트.
 * - R2 업로드 후 URL 배열 콜백
 * - 미리보기 썸네일 + 개별 삭제
 */
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, ClipboardPaste, Loader2, ZoomIn, ChevronLeft, ChevronRight, Download } from 'lucide-react';

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
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { toast } = useToast();

  // 확대 보기 키보드 지원
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowRight') setLightboxIndex(i => i === null ? null : (i + 1) % value.length);
      else if (e.key === 'ArrowLeft') setLightboxIndex(i => i === null ? null : (i - 1 + value.length) % value.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, value.length]);

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
              <button
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="w-full h-full"
                title="클릭 시 확대"
              >
                <img src={url} alt="" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 pointer-events-none">
                  <ZoomIn className="w-5 h-5 text-white" />
                </div>
              </button>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="삭제"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 사진 확대 Lightbox */}
      {lightboxIndex !== null && value[lightboxIndex] && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* 상단 바 */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between text-white z-10">
            <span className="text-sm">
              {lightboxIndex + 1} / {value.length}
              {label && <span className="opacity-70 ml-2">· {label}</span>}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={value[lightboxIndex]}
                download
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center"
                title="다운로드"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center"
                title="닫기 (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 이전 */}
          {value.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + value.length) % value.length); }}
              className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center"
              title="이전 (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* 이미지 */}
          <img
            src={value[lightboxIndex]}
            alt=""
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={e => e.stopPropagation()}
          />

          {/* 다음 */}
          {value.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % value.length); }}
              className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center"
              title="다음 (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
            ESC·외부 클릭으로 닫기 · ←→ 로 이동
          </div>
        </div>
      )}
    </div>
  );
}
