import { useState, useEffect, useCallback } from 'react';
import { syncPendingData } from '@/lib/offlineStorage';

/**
 * 네트워크 상태 추적 Hook
 * - 온라인/오프라인 상태 감지
 * - 상태 변경 시 자동 동기화
 */

interface UseOnlineStatusReturn {
  /** 현재 온라인 여부 */
  isOnline: boolean;
  /** 마지막으로 온라인이었던 시간 */
  lastOnline: Date | null;
  /** 오프라인 데이터 동기화 시도 */
  syncData: () => Promise<{ success: number; failed: number }>;
  /** 동기화 중 여부 */
  isSyncing: boolean;
}

export function useOnlineStatus(): UseOnlineStatusReturn {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastOnline, setLastOnline] = useState<Date | null>(() =>
    typeof navigator !== 'undefined' && navigator.onLine ? new Date() : null
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // 동기화 함수
  const syncData = useCallback(async () => {
    if (isSyncing || !isOnline) {
      return { success: 0, failed: 0 };
    }

    setIsSyncing(true);
    try {
      const results = await syncPendingData();
      console.log('[Online] Sync completed:', results);
      return results;
    } catch (error) {
      console.error('[Online] Sync failed:', error);
      return { success: 0, failed: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[Online] Network status: online');
      setIsOnline(true);
      setLastOnline(new Date());

      // 온라인 복귀 시 자동 동기화
      syncData();
    };

    const handleOffline = () => {
      console.log('[Online] Network status: offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncData]);

  return {
    isOnline,
    lastOnline,
    syncData,
    isSyncing,
  };
}

/**
 * 네트워크 상태 배너 표시용 Hook
 */
export function useOfflineBanner(): {
  showBanner: boolean;
  dismiss: () => void;
} {
  const { isOnline } = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  // 온라인 복귀 시 배너 리셋
  useEffect(() => {
    if (isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  return {
    showBanner: !isOnline && !dismissed,
    dismiss: () => setDismissed(true),
  };
}
