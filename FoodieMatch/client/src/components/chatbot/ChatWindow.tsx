import { useRef, useEffect, ReactNode } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function ChatWindow({ isOpen, onClose, children }: ChatWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);

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
          // 데스크톱: 우측 하단 팝업
          "md:inset-auto md:right-6 md:bottom-24 md:w-[400px] md:h-[500px] md:rounded-2xl"
        )}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            <h3 className="font-semibold">도우미</h3>
          </div>
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

        {/* 콘텐츠 영역 */}
        {children}
      </div>
    </>
  );
}
