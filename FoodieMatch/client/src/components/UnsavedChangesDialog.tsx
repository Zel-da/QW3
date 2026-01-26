import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Save, X, ArrowRight } from 'lucide-react';

/**
 * 저장하지 않은 변경사항 경고 다이얼로그
 * - 저장 후 이동
 * - 저장하지 않고 이동
 * - 취소 (계속 작성)
 */

interface UnsavedChangesDialogProps {
  /** 다이얼로그 표시 여부 */
  open: boolean;
  /** 저장 후 이동 핸들러 */
  onSaveAndLeave?: () => void | Promise<void>;
  /** 저장하지 않고 이동 핸들러 */
  onLeaveWithoutSaving: () => void;
  /** 취소 (계속 작성) 핸들러 */
  onCancel: () => void;
  /** 저장 버튼 표시 여부 (기본값: true) */
  showSaveOption?: boolean;
  /** 저장 중 로딩 상태 */
  isSaving?: boolean;
  /** 제목 (기본값: 저장하지 않은 변경사항) */
  title?: string;
  /** 설명 (기본값: 작성 중인 내용이 있습니다...) */
  description?: string;
}

export function UnsavedChangesDialog({
  open,
  onSaveAndLeave,
  onLeaveWithoutSaving,
  onCancel,
  showSaveOption = true,
  isSaving = false,
  title = '저장하지 않은 변경사항',
  description = '작성 중인 내용이 있습니다. 어떻게 하시겠습니까?',
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2">
          {/* 계속 작성 버튼 */}
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            계속 작성
          </Button>

          {/* 저장 후 이동 버튼 */}
          {showSaveOption && onSaveAndLeave && (
            <Button
              onClick={onSaveAndLeave}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  저장 후 이동
                </>
              )}
            </Button>
          )}

          {/* 저장하지 않고 이동 버튼 (파괴적 동작이므로 마지막에 배치) */}
          <Button
            variant="destructive"
            onClick={onLeaveWithoutSaving}
            className="flex items-center gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            저장 안 함
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 간단한 확인 다이얼로그 (저장 옵션 없음)
 */
export function LeaveConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = '페이지를 떠나시겠습니까?',
  description = '작성 중인 내용이 저장되지 않습니다.',
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            떠나기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
