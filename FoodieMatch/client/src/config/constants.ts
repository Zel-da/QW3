/**
 * 애플리케이션 전역 상수 정의
 *
 * 이 파일은 애플리케이션 전체에서 사용되는 상수 값들을 중앙 관리합니다.
 * 상수를 수정할 때는 이 파일만 수정하면 모든 곳에 반영됩니다.
 */

// ========== 교육 관련 상수 ==========

/**
 * 교육 진행률 자동 저장 간격 (밀리초)
 * 기본값: 30초 (30000ms) - Compute 사용량 절감
 */
export const PROGRESS_SAVE_INTERVAL = 30000;

/**
 * 분을 초로 변환하는 상수
 */
export const SECONDS_PER_MINUTE = 60;

/**
 * 진행률 타이머 간격 (밀리초)
 * 기본값: 1초 (1000ms)
 */
export const PROGRESS_TIMER_INTERVAL = 1000;

/**
 * 최대 진행률 (퍼센트)
 */
export const MAX_PROGRESS_PERCENT = 100;

// ========== 파일 업로드 상수 ==========

/**
 * 최대 파일 크기 (바이트)
 * 기본값: 100MB
 */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * 안전점검 사진 최대 개수
 */
export const MAX_SAFETY_INSPECTION_PHOTOS = 15;

// ========== API 관련 상수 ==========

/**
 * API 요청 타임아웃 (밀리초)
 * 기본값: 30초
 */
export const API_TIMEOUT = 30000;

/**
 * 재시도 횟수
 */
export const API_RETRY_COUNT = 3;

// ========== 세션 관련 상수 ==========

/**
 * 세션 만료 시간 (일)
 * 기본값: 7일
 */
export const SESSION_EXPIRY_DAYS = 7;

// ========== UI 관련 상수 ==========

/**
 * Toast 알림 표시 시간 (밀리초)
 * 기본값: 3초
 */
export const TOAST_DURATION = 3000;

/**
 * 디바운스 지연 시간 (밀리초)
 * 기본값: 300ms
 */
export const DEBOUNCE_DELAY = 300;

// ========== 페이지네이션 상수 ==========

/**
 * 기본 페이지 크기
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * 최대 페이지 크기
 */
export const MAX_PAGE_SIZE = 100;
