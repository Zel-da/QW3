import { useEffect, useCallback, useState } from 'react';
import { useLocation } from 'wouter';

/**
 * 저장하지 않은 변경사항 경고 Hook
 * - 브라우저 새로고침/닫기 시 경고
 * - 다른 페이지로 이동 시 다이얼로그 표시
 */

interface UseUnsavedChangesOptions {
  /** 변경사항이 있는지 여부 */
  hasChanges: boolean;
  /** 경고 메시지 (기본값: 한국어) */
  message?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
}

interface UseUnsavedChangesReturn {
  /** 경고 다이얼로그 표시 여부 */
  showDialog: boolean;
  /** 대기 중인 네비게이션 URL */
  pendingNavigation: string | null;
  /** 안전하게 페이지 이동 (변경사항 있으면 다이얼로그 표시) */
  safeNavigate: (to: string) => void;
  /** 네비게이션 확인 (다이얼로그에서 이동 선택 시) */
  confirmNavigation: () => void;
  /** 네비게이션 취소 (다이얼로그에서 취소 선택 시) */
  cancelNavigation: () => void;
  /** 변경사항 리셋 (저장 완료 후 호출) */
  resetChanges: () => void;
}

export function useUnsavedChanges({
  hasChanges,
  message = '저장하지 않은 변경사항이 있습니다. 페이지를 떠나시겠습니까?',
  disabled = false,
}: UseUnsavedChangesOptions): UseUnsavedChangesReturn {
  const [, setLocation] = useLocation();
  const [showDialog, setShowDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [changesReset, setChangesReset] = useState(false);

  // 실제 변경사항 상태 (리셋 고려)
  const effectiveHasChanges = hasChanges && !changesReset && !disabled;

  // 브라우저 새로고침/닫기 방지
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (effectiveHasChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [effectiveHasChanges, message]);

  // 뒤로가기 버튼 처리 (History API)
  useEffect(() => {
    if (!effectiveHasChanges) return;

    const handlePopState = (e: PopStateEvent) => {
      if (effectiveHasChanges) {
        // 뒤로가기 취소하고 다이얼로그 표시
        window.history.pushState(null, '', window.location.href);
        setPendingNavigation('back');
        setShowDialog(true);
      }
    };

    // 현재 상태를 history에 추가 (뒤로가기 감지용)
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [effectiveHasChanges]);

  // 안전한 네비게이션 함수
  const safeNavigate = useCallback((to: string) => {
    if (effectiveHasChanges) {
      setPendingNavigation(to);
      setShowDialog(true);
    } else {
      setLocation(to);
    }
  }, [effectiveHasChanges, setLocation]);

  // 네비게이션 확인 (이동 진행)
  const confirmNavigation = useCallback(() => {
    setShowDialog(false);
    if (pendingNavigation) {
      if (pendingNavigation === 'back') {
        // 뒤로가기인 경우
        window.history.go(-2); // pushState로 추가한 것 포함해서 2단계 뒤로
      } else {
        setLocation(pendingNavigation);
      }
      setPendingNavigation(null);
    }
  }, [pendingNavigation, setLocation]);

  // 네비게이션 취소
  const cancelNavigation = useCallback(() => {
    setShowDialog(false);
    setPendingNavigation(null);
  }, []);

  // 변경사항 리셋 (저장 완료 후 호출)
  const resetChanges = useCallback(() => {
    setChangesReset(true);
    setShowDialog(false);
    setPendingNavigation(null);

    // 다음 hasChanges 변경 시 리셋 해제
    setTimeout(() => setChangesReset(false), 100);
  }, []);

  return {
    showDialog,
    pendingNavigation,
    safeNavigate,
    confirmNavigation,
    cancelNavigation,
    resetChanges,
  };
}

/**
 * 간단한 변경사항 감지 훅
 * 폼 데이터의 변경을 감지하여 hasChanges 상태 관리
 */
export function useFormChanges<T>(initialValue: T, currentValue: T): boolean {
  return JSON.stringify(initialValue) !== JSON.stringify(currentValue);
}
