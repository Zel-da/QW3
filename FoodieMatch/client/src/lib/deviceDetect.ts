/**
 * 디바이스·실행 환경 감지 유틸리티
 *
 * iOS 홈 화면 웹 앱(Web Clip/PWA)은 Safari와 다른 실행 컨텍스트를 가짐:
 *  - 세션 쿠키 분리
 *  - iOS 16.3 이하에서 navigator.mediaDevices.getUserMedia 원천 미지원
 *  - iOS 16.4+에서도 홈 화면 앱마다 마이크 권한 별도 관리
 *
 * 이 유틸은 사용자에게 원인을 명확히 안내하는 UI 로직에서 사용.
 */

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // PWA: display-mode: standalone
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
    // iOS Safari: navigator.standalone (비표준이지만 iOS가 유일하게 사용)
    if ((window.navigator as any).standalone === true) return true;
  } catch {
    // ignore
  }
  return false;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * navigator.mediaDevices.getUserMedia 지원 여부.
 * iOS 16.3 이하 홈 화면 앱에선 undefined일 수 있음.
 */
export function hasMediaDevicesSupport(): boolean {
  return !!(
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

/**
 * iOS 홈 화면 앱에서 실행 중인지 (마이크 제한 등 특별 처리 필요한 케이스).
 */
export function isIOSStandalone(): boolean {
  return isIOS() && isStandaloneMode();
}
