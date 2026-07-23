/**
 * 앱 캐시 안전 삭제 유틸.
 *
 * 삭제 대상 (앱 코드 최신 반영을 위해 필요):
 *  - Service Worker 캐시 (caches API)
 *  - Service Worker 등록 자체
 *
 * 보존 대상 (사용자 데이터라 보존):
 *  - localStorage (auto-save draft, 로그인 세션 등)
 *  - sessionStorage
 *  - IndexedDB (일시정지된 녹음, heavy draft)
 *  - HTTP 쿠키 (로그인 세션)
 *
 * 캐시 삭제 후에는 강제 새로고침으로 최신 코드 로드 필요.
 */

const APP_ERROR_KEY = '__app_cache_error';

export async function resetAppCache(): Promise<{
  cachesDeleted: number;
  swUnregistered: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let cachesDeleted = 0;
  let swUnregistered = false;

  // 1) Service Worker 캐시 전부 삭제
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      const results = await Promise.all(keys.map(k => caches.delete(k).catch(() => false)));
      cachesDeleted = results.filter(Boolean).length;
      console.log(`[CacheReset] caches deleted: ${cachesDeleted}/${keys.length}`);
    }
  } catch (e: any) {
    errors.push(`caches: ${e?.message ?? String(e)}`);
    console.error('[CacheReset] caches 삭제 실패:', e);
  }

  // 2) Service Worker 등록 해제
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      const results = await Promise.all(regs.map(r => r.unregister().catch(() => false)));
      swUnregistered = results.some(Boolean);
      console.log(`[CacheReset] SW unregistered: ${swUnregistered}, count: ${results.filter(Boolean).length}/${regs.length}`);
    }
  } catch (e: any) {
    errors.push(`SW: ${e?.message ?? String(e)}`);
    console.error('[CacheReset] SW 해제 실패:', e);
  }

  // 3) 앱 오류 플래그 제거 (배너 초기화)
  try {
    sessionStorage.removeItem(APP_ERROR_KEY);
  } catch { /* ignore */ }

  return { cachesDeleted, swUnregistered, errors };
}

/**
 * 캐시 삭제 후 강제 새로고침. 사용자에게 잠깐 로딩 화면 표시.
 */
export function reloadWithNoCache(): void {
  // reload(true)는 deprecated이지만 대부분 브라우저 지원. 실패해도 일반 reload로 fallback
  try {
    // location.reload()로 시작 → 브라우저가 SW 없이 새 요청
    window.location.reload();
  } catch {
    window.location.href = window.location.href;
  }
}

/**
 * 앱 오류 플래그 관련 헬퍼.
 * SW 등록 실패·chunk load 실패 등 앱 이상 감지 시 sessionStorage에 저장 →
 * 배너에서 사용자에게 "캐시 삭제 권장" 유도.
 */
export function markAppError(reason: string): void {
  try {
    sessionStorage.setItem(APP_ERROR_KEY, JSON.stringify({
      reason,
      at: new Date().toISOString(),
    }));
    console.warn(`[CacheReset] 앱 오류 감지: ${reason}`);
  } catch { /* ignore */ }
}

export function getAppError(): { reason: string; at: string } | null {
  try {
    const raw = sessionStorage.getItem(APP_ERROR_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearAppError(): void {
  try {
    sessionStorage.removeItem(APP_ERROR_KEY);
  } catch { /* ignore */ }
}
