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
  const [zoom, setZoom] = useState(1);        // 1 = 뷰포트 꽉, 2·3배로 더 확대 가능
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const { toast } = useToast();

  // Lightbox 열릴 때마다 줌·팬 초기화
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [lightboxIndex]);

  // 확대 보기 키보드 지원
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowRight') setLightboxIndex(i => i === null ? null : (i + 1) % value.length);
      else if (e.key === 'ArrowLeft') setLightboxIndex(i => i === null ? null : (i - 1 + value.length) % value.length);
      else if (e.key === '+' || e.key === '=') setZoom(z => Math.min(z + 0.5, 5));
      else if (e.key === '-' || e.key === '_') setZoom(z => Math.max(z - 0.5, 0.5));
      else if (e.key === '0') { setZoom(1); setPan({ x: 0, y: 0 }); }
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
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center overflow-hidden"
          onClick={() => setLightboxIndex(null)}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.2 : -0.2;
            setZoom(z => Math.max(0.5, Math.min(5, z + delta)));
          }}
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
              className="absolute left-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center z-10"
              title="이전 (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* 이미지 — 뷰포트에 꽉 차게 + 줌/팬 */}
          <img
            src={value[lightboxIndex]}
            alt=""
            draggable={false}
            style={{
              maxWidth: '95vw',
              maxHeight: '90vh',
              width: 'auto',
              height: 'auto',
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transition: zoom === 1 ? 'transform 0.2s' : 'none',
              cursor: zoom > 1 ? 'grab' : 'zoom-in',
            }}
            className="select-none"
            onClick={e => { e.stopPropagation(); if (zoom === 1) setZoom(2); else setZoom(1); }}
            onMouseDown={(e) => {
              if (zoom <= 1) return;
              e.preventDefault();
              e.stopPropagation();
              const startX = e.clientX - pan.x;
              const startY = e.clientY - pan.y;
              const onMove = (ev: MouseEvent) => setPan({ x: ev.clientX - startX, y: ev.clientY - startY });
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          />

          {/* 다음 */}
          {value.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % value.length); }}
              className="absolute right-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center z-10"
              title="다음 (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* 하단 줌 컨트롤 */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 text-white text-sm" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}
              className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center font-bold"
              title="축소 (-)"
            >
              −
            </button>
            <span className="min-w-[48px] text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(5, z + 0.5))}
              className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center font-bold"
              title="확대 (+)"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="px-2 h-8 hover:bg-white/20 rounded-full flex items-center text-xs"
              title="원래 크기 (0)"
            >
              리셋
            </button>
          </div>

          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/50 text-[11px]">
            이미지 클릭·휠 스크롤로 확대 · 확대 상태에서 드래그로 이동 · ESC 닫기
          </div>
        </div>
      )}
    </div>
  );
}
