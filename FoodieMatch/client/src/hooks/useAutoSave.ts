import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SavedData<T> {
  data: T;
  timestamp: string;
}

interface UseAutoSaveOptions<T> {
  key: string;
  data: T;
  interval?: number; // ms, 기본값 3000
  enabled?: boolean; // 자동저장 활성화 여부
  onRestore?: (data: T) => void;
}

interface UseAutoSaveReturn {
  clearSaved: () => void;
  hasSavedData: boolean;
  savedTimestamp: string | null;
  restoreSaved: () => void;
  discardSaved: () => void;
  showRestoreDialog: boolean;
}

/**
 * 자동 임시저장 훅
 *
 * 폼 데이터를 localStorage에 자동으로 저장하고, 페이지 로드 시 복원 여부를 묻습니다.
 *
 * @example
 * ```tsx
 * const { clearSaved, hasSavedData, savedTimestamp, restoreSaved, discardSaved, showRestoreDialog } = useAutoSave({
 *   key: 'notice_draft_new',
 *   data: formData,
 *   onRestore: (restored) => setFormData(restored)
 * });
 *
 * // 복원 다이얼로그 표시
 * {showRestoreDialog && (
 *   <Dialog>
 *     <p>임시저장 데이터가 있습니다. 복원하시겠습니까?</p>
 *     <Button onClick={restoreSaved}>복원</Button>
 *     <Button onClick={discardSaved}>삭제</Button>
 *   </Dialog>
 * )}
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
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const onRestoreRef = useRef(onRestore);

  // 저장된 데이터 상태
  const [hasSavedData, setHasSavedData] = useState(false);
  const [savedTimestamp, setSavedTimestamp] = useState<string | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingData, setPendingData] = useState<T | null>(null);

  // onRestore 참조 업데이트
  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  // 초기 로드 시 저장된 데이터 확인 (복원은 사용자 선택 후)
  useEffect(() => {
    if (!enabled) return;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed: SavedData<T> = JSON.parse(saved);
        setHasSavedData(true);
        setSavedTimestamp(parsed.timestamp);
        setPendingData(parsed.data);
        setShowRestoreDialog(true);
      }
    } catch (err) {
      console.error('Failed to check auto-save:', err);
      localStorage.removeItem(key);
    }
  }, [key, enabled]);

  // 복원 실행
  const restoreSaved = useCallback(() => {
    if (pendingData && onRestoreRef.current) {
      onRestoreRef.current(pendingData);
      toast({
        title: '임시저장 복원 완료',
        description: `${savedTimestamp ? new Date(savedTimestamp).toLocaleString('ko-KR') : ''} 에 저장된 내용을 불러왔습니다.`,
        duration: 3000,
      });
    }
    setShowRestoreDialog(false);
  }, [pendingData, savedTimestamp, toast]);

  // 저장된 데이터 삭제 (복원 안 함)
  const discardSaved = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setHasSavedData(false);
      setSavedTimestamp(null);
      setPendingData(null);
      setShowRestoreDialog(false);
      toast({
        title: '임시저장 삭제',
        description: '이전 임시저장 데이터가 삭제되었습니다.',
        duration: 3000,
      });
    } catch (err) {
      console.error('Failed to discard auto-save:', err);
    }
  }, [key, toast]);

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
  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(key);
      lastSavedRef.current = '';
      setHasSavedData(false);
      setSavedTimestamp(null);
      setPendingData(null);
      setShowRestoreDialog(false);
      console.log(`[Auto-Save] Cleared: ${key}`);
    } catch (err) {
      console.error('Failed to clear auto-save:', err);
    }
  }, [key]);

  return {
    clearSaved,
    hasSavedData,
    savedTimestamp,
    restoreSaved,
    discardSaved,
    showRestoreDialog
  };
}
