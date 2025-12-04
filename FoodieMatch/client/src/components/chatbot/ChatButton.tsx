import { MessageCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export function ChatButton({ isOpen, onClick }: ChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center",
        "bg-primary hover:bg-primary/90 text-primary-foreground",
        "right-4 md:right-6",
        "bottom-24 md:bottom-6", // 모바일에서 하단 네비 위에 위치
        isOpen && "rotate-90"
      )}
      aria-label={isOpen ? "채팅 닫기" : "채팅 열기"}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <>
          <MessageCircle className="h-6 w-6" />
          {/* 알림 뱃지 (선택적) */}
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
            ?
          </span>
        </>
      )}
    </button>
  );
}
