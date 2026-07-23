/**
 * 앱 이상 감지 배너.
 *
 * main.tsx에서 window.error / unhandledrejection / SW register 실패를 감지해
 * markAppError로 sessionStorage에 플래그를 기록. 이 배너가 감지해 사용자에게
 * "캐시 삭제 권장" 유도.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { getAppError, clearAppError } from '@/lib/cacheReset';

export function AppErrorBanner() {
  const [error, setError] = useState<{ reason: string; at: string } | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // 초기 마운트 시 확인
    setError(getAppError());
    // 이후 storage 이벤트로도 반영 (같은 탭에선 event 안 오지만, 다른 페이지 라우팅 시 확인)
    const interval = setInterval(() => {
      const e = getAppError();
      if (e && !error) setError(e);
    }, 3000);
    return () => clearInterval(interval);
  }, [error]);

  if (!error) return null;

  return (
    <div className="w-full bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-3 text-xs sm:text-sm text-red-900">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1">
        <strong>앱 이상 감지</strong>
        <span className="ml-1 opacity-80">— 최신 버전이 안 보이거나 오류가 발생했습니다.</span>
      </div>
      <button
        onClick={() => setLocation('/profile')}
        className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 whitespace-nowrap"
      >
        캐시 삭제
      </button>
      <button
        onClick={() => {
          clearAppError();
          setError(null);
        }}
        className="p-1 hover:bg-red-100 rounded"
        aria-label="닫기"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
