import { useRef, useEffect, useState, useCallback, ReactNode } from 'react';
import { X, MessageCircle, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

// 기본 크기 및 최소/최대 크기
const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 520;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;
const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;

export function ChatWindow({ isOpen, onClose, children }: ChatWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // 리사이즈 핸들러
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
  }, [size]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const { startX, startY, startWidth, startHeight } = resizeRef.current;
      // 좌상단으로 드래그하면 크기 증가
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + (startX - e.clientX)));
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + (startY - e.clientY)));

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // 최대화/복원 토글
  const toggleMaximize = useCallback(() => {
    setIsMaximized(prev => !prev);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* 모바일 오버레이 */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* 채팅 창 */}
      <div
        ref={windowRef}
        className={cn(
          "fixed z-50 bg-background border shadow-xl flex flex-col overflow-hidden",
          // 모바일: 전체 화면 (하단 네비 제외)
          "inset-0 top-16 bottom-16 rounded-none",
          // 데스크톱: 우측 하단 팝업 (리사이즈 가능)
          "md:inset-auto md:right-6 md:bottom-24 md:rounded-2xl",
          isResizing && "select-none"
        )}
        style={{
          // 데스크톱에서만 커스텀 크기 적용
          ...(typeof window !== 'undefined' && window.innerWidth >= 768 && !isMaximized
            ? { width: size.width, height: size.height }
            : {}),
          // 최대화 시
          ...(typeof window !== 'undefined' && window.innerWidth >= 768 && isMaximized
            ? { width: '90vw', height: '80vh', maxWidth: '1200px', right: '5vw', bottom: '10vh' }
            : {}),
        }}
      >
        {/* 리사이즈 핸들 (좌상단) - 데스크톱만 */}
        <div
          className="hidden md:block absolute top-0 left-0 w-4 h-4 cursor-nw-resize z-10 group"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-muted-foreground/30 group-hover:border-primary transition-colors" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <h3 className="font-semibold">AI 도우미</h3>
          </div>
          <div className="flex items-center gap-1">
            {/* 최대화/복원 버튼 - 데스크톱만 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMaximize}
              className="hidden md:flex text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
            >
              {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              <span className="sr-only">{isMaximized ? '복원' : '최대화'}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">닫기</span>
            </Button>
          </div>
        </div>

        {/* 콘텐츠 영역 */}
        {children}
      </div>
    </>
  );
}
