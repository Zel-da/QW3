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
 *
 * @example
 * ```tsx
 * const { showUndoToast } = useUndoToast();
 *
 * const handleDelete = () => {
 *   showUndoToast({
 *     message: '공지사항을 삭제했습니다.',
 *     onUndo: () => {
 *       // 롤백 로직
 *       restoreNotice();
 *     },
 *     duration: 5000,
 *   });
 * };
 * ```
 */
export function useUndoToast() {
  const { toast } = useToast();

  /**
   * Undo 버튼이 포함된 토스트 표시
   *
   * @param options.message - 표시할 메시지
   * @param options.onUndo - Undo 버튼 클릭 시 실행할 콜백
   * @param options.duration - 토스트 표시 시간 (ms)
   * @returns 토스트 인스턴스
   */
  const showUndoToast = ({ message, onUndo, duration = 5000 }: UseUndoToastOptions) => {
    const toastInstance = toast({
      title: message,
      action: (
        <ToastAction
          altText="실행 취소"
          onClick={() => {
            onUndo();
            // 토스트 즉시 닫기
            if (toastInstance && toastInstance.dismiss) {
              toastInstance.dismiss();
            }
          }}
        >
          실행 취소
        </ToastAction>
      ),
      duration,
    });

    return toastInstance;
  };

  return { showUndoToast };
}
