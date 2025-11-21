import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseAutoSaveOptions<T> {
  key: string;
  data: T;
  interval?: number; // ms, 기본값 3000
  enabled?: boolean; // 자동저장 활성화 여부
  onRestore?: (data: T) => void;
}

/**
 * 자동 임시저장 훅
 *
 * 폼 데이터를 localStorage에 자동으로 저장하고, 페이지 로드 시 복원합니다.
 *
 * @example
 * ```tsx
 * const { clearSaved } = useAutoSave({
 *   key: 'notice_draft_new',
 *   data: formData,
 *   onRestore: (restored) => setFormData(restored)
 * });
 *
 * // 제출 완료 시
 * clearSaved();
 * ```
 */
export function useAutoSave<T>({
  key,
  data,
  interval = 3000,
  enabled = true,
  onRestore,
}: UseAutoSaveOptions<T>) {
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const isRestoredRef = useRef(false);

  // 초기 로드 시 복원 (한 번만 실행)
  useEffect(() => {
    if (!enabled || isRestoredRef.current) return;

    try {
      const saved = localStorage.getItem(key);
      if (saved && onRestore) {
        const parsed = JSON.parse(saved);
        onRestore(parsed.data);
        isRestoredRef.current = true;

        toast({
          title: '임시저장 복원',
          description: `마지막 저장: ${new Date(parsed.timestamp).toLocaleString('ko-KR')}`,
          duration: 3000,
        });
      }
    } catch (err) {
      console.error('Failed to restore auto-save:', err);
      // 손상된 데이터 삭제
      localStorage.removeItem(key);
    }
  }, [key, enabled]); // onRestore는 의존성에서 제외 (무한 루프 방지)

  // 자동 저장
  useEffect(() => {
    if (!enabled) return;

    try {
      const dataString = JSON.stringify(data);

      // 변경 없으면 스킵
      if (dataString === lastSavedRef.current) return;

      // 기존 타이머 취소
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // interval 후 저장
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(
            key,
            JSON.stringify({
              data,
              timestamp: new Date().toISOString(),
            })
          );
          lastSavedRef.current = dataString;

          // 조용한 자동 저장 (콘솔 로그만)
          console.log(`[Auto-Save] Saved to localStorage: ${key}`);
        } catch (err) {
          console.error('Failed to auto-save:', err);
          // localStorage 용량 초과 등의 에러
          if (err instanceof Error && err.name === 'QuotaExceededError') {
            toast({
              title: '저장 실패',
              description: '저장 공간이 부족합니다. 이전 임시저장 데이터를 삭제해주세요.',
              variant: 'destructive',
              duration: 5000,
            });
          }
        }
      }, interval);
    } catch (err) {
      console.error('Failed to prepare auto-save:', err);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, key, interval, enabled, toast]);

  /**
   * 저장된 임시 데이터 삭제
   * 제출 완료 시 호출하여 localStorage 정리
   */
  const clearSaved = () => {
    try {
      localStorage.removeItem(key);
      lastSavedRef.current = '';
      console.log(`[Auto-Save] Cleared: ${key}`);
    } catch (err) {
      console.error('Failed to clear auto-save:', err);
    }
  };

  return { clearSaved };
}
