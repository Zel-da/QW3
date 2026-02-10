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
  /** 자동 복원 모드 - 다이얼로그 없이 자동으로 복원 */
  autoRestore?: boolean;
  /** 외부에서 복원 준비 완료 여부 제어 (API 호출 대기 등) */
  readyToRestore?: boolean;
}

interface UseAutoSaveReturn<T> {
  clearSaved: () => void;
  hasSavedData: boolean;
  savedTimestamp: string | null;
  restoreSaved: () => void;
  discardSaved: () => void;
  showRestoreDialog: boolean;
  /** 즉시 저장 (딜레이 없이) - Promise 반환 */
  saveNow: () => Promise<boolean>;
  /** 저장된 데이터 (draft view mode용) */
  pendingData: T | null;
  /** 복원이 자동으로 완료되었는지 여부 */
  wasAutoRestored: boolean;
}

/**
 * 자동 임시저장 훅
 *
 * 폼 데이터를 localStorage에 자동으로 저장하고, 페이지 로드 시 복원 여부를 묻습니다.
 * autoRestore 옵션 사용 시 다이얼로그 없이 자동으로 복원합니다.
 */
export function useAutoSave<T>({
  key,
  data,
  interval = 3000,
  enabled = true,
  onRestore,
  autoRestore = false,
  readyToRestore = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const { toast } = useToast();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');
  const onRestoreRef = useRef(onRestore);

  // 같은 key에 대해 초기화가 이미 수행되었는지 추적
  const hasInitializedForKey = useRef<string | null>(null);
  // 자동 복원이 완료되었는지 추적
  const hasAutoRestoredForKey = useRef<string | null>(null);

  // 저장된 데이터 상태
  const [hasSavedData, setHasSavedData] = useState(false);
  const [savedTimestamp, setSavedTimestamp] = useState<string | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [pendingData, setPendingData] = useState<T | null>(null);
  const [wasAutoRestored, setWasAutoRestored] = useState(false);

  // onRestore 참조 업데이트
  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  // key 변경 시 초기화 플래그 리셋 (팀/날짜 변경 시)
  useEffect(() => {
    if (hasInitializedForKey.current !== key) {
      hasInitializedForKey.current = null;
      hasAutoRestoredForKey.current = null;
      setWasAutoRestored(false);
      setShowRestoreDialog(false);
      setPendingData(null);
      setHasSavedData(false);
    }
  }, [key]);

  // 초기 로드 시 저장된 데이터 확인 (enabled와 무관하게 항상 확인)
  // 저장은 enabled가 true일 때만, 복원 체크는 항상 수행
  useEffect(() => {
    // 같은 key에 대해 이미 초기화됐으면 스킵
    if (hasInitializedForKey.current === key) return;
    hasInitializedForKey.current = key;

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed: SavedData<T> = JSON.parse(saved);
        setHasSavedData(true);
        setSavedTimestamp(parsed.timestamp);
        setPendingData(parsed.data);

        // autoRestore가 아닌 경우에만 다이얼로그 표시
        if (!autoRestore) {
          setShowRestoreDialog(true);
        }
        console.log(`[Auto-Save] Found saved data for: ${key}`);
      }
    } catch (err) {
      console.error('Failed to check auto-save:', err);
      localStorage.removeItem(key);
    }
  }, [key, autoRestore]);

  // 자동 복원 처리 (readyToRestore가 true일 때만)
  useEffect(() => {
    if (!autoRestore || !readyToRestore || !pendingData) return;
    if (hasAutoRestoredForKey.current === key) return;

    // 자동 복원 실행
    if (onRestoreRef.current) {
      hasAutoRestoredForKey.current = key;
      onRestoreRef.current(pendingData);
      setWasAutoRestored(true);
      console.log(`[Auto-Save] Auto-restored for: ${key}`);
    }
  }, [autoRestore, readyToRestore, pendingData, key]);

  // 복원 실행 (수동)
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
    setWasAutoRestored(false);
  }, [pendingData, savedTimestamp, toast]);

  // 저장된 데이터 삭제 (복원 안 함)
  const discardSaved = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setHasSavedData(false);
      setSavedTimestamp(null);
      setPendingData(null);
      setShowRestoreDialog(false);
      setWasAutoRestored(false);
      hasAutoRestoredForKey.current = null;
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
          console.log(`[Auto-Save] Saved to localStorage: ${key}`);
        } catch (err) {
          console.error('Failed to auto-save:', err);
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
        // 언마운트 시 pending 변경사항이 있으면 즉시 저장
        try {
          const currentDataString = JSON.stringify(data);
          if (currentDataString !== lastSavedRef.current && enabled) {
            localStorage.setItem(
              key,
              JSON.stringify({
                data,
                timestamp: new Date().toISOString(),
              })
            );
            lastSavedRef.current = currentDataString;
          }
        } catch (err) {
          console.error('Failed to save on unmount:', err);
        }
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
      setWasAutoRestored(false);
      hasAutoRestoredForKey.current = null;
      console.log(`[Auto-Save] Cleared: ${key}`);
    } catch (err) {
      console.error('Failed to clear auto-save:', err);
    }
  }, [key]);

  // 데이터 참조 (saveNow에서 사용)
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  /**
   * 즉시 저장 (딜레이 없이)
   */
  const saveNow = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!enabled) {
        resolve(false);
        return;
      }

      try {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        const currentData = dataRef.current;
        const dataString = JSON.stringify(currentData);

        if (dataString === lastSavedRef.current) {
          console.log(`[Auto-Save] No changes to save: ${key}`);
          resolve(true);
          return;
        }

        localStorage.setItem(
          key,
          JSON.stringify({
            data: currentData,
            timestamp: new Date().toISOString(),
          })
        );
        lastSavedRef.current = dataString;
        console.log(`[Auto-Save] Saved immediately: ${key}`);
        resolve(true);
      } catch (err) {
        console.error('Failed to save immediately:', err);
        resolve(false);
      }
    });
  }, [key, enabled]);

  return {
    clearSaved,
    hasSavedData,
    savedTimestamp,
    restoreSaved,
    discardSaved,
    showRestoreDialog,
    saveNow,
    pendingData,
    wasAutoRestored,
  };
}
