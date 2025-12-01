import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

interface UseUndoToastOptions {
  message: string;
  onUndo: () => void;
  duration?: number; // 기본값 5000ms
}

/**
 * Undo 기능이 있는 토스트 훅
 *
 * 삭제 등 중요한 액션 후 사용자에게 실행 취소 기회를 제공합니다.
 */
export function useUndoToast() {
  const { toast } = useToast();

  /**
   * Undo 버튼이 포함된 토스트 표시
   */
  const showUndoToast = ({ message, onUndo, duration = 5000 }: UseUndoToastOptions) => {
    const toastInstance = toast({
      title: message,
      action: (
        <ToastAction altText="실행 취소" onClick={onUndo}>
          실행 취소
        </ToastAction>
      ),
      duration,
    });

    return toastInstance;
  };

  return { showUndoToast };
}
