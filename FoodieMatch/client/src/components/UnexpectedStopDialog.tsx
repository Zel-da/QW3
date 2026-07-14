/**
 * 녹음이 예기치 않게 중단됐을 때 사용자에게 원인·대응 옵션을 명확히 보여주는 다이얼로그.
 *
 * 원인: 다른 앱이 마이크 잡음, OS 리소스 회수, 브라우저 백그라운드 정지 등.
 * 이 다이얼로그가 뜰 시점엔 이미 지금까지의 chunks가 IndexedDB에 안전 저장된 상태.
 * 사용자 선택:
 *  - "이어서 녹음": 새 stream 획득 후 저장된 chunks에 이어 녹음 (resumeRecording)
 *  - "나중에 저장": 다이얼로그 닫음. 상태는 paused 유지 → 정지 버튼으로 저장 가능
 */
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRecording, formatTime } from '@/context/RecordingContext';
import { AlertTriangle, Play } from 'lucide-react';

export function UnexpectedStopDialog() {
  const { unexpectedStopDialog, dismissUnexpectedStopDialog, resumeAfterUnexpectedStop } = useRecording();

  return (
    <AlertDialog open={unexpectedStopDialog.open} onOpenChange={(open) => { if (!open) dismissUnexpectedStopDialog(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5" />
            녹음이 예기치 않게 중단되었습니다
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div className="text-sm">
                다른 앱·탭이 마이크를 사용하거나 시스템이 리소스를 회수하여 녹음 stream이 종료되었습니다.
              </div>
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-900">
                <div className="font-medium mb-1">✓ 지금까지 녹음된 <strong>{formatTime(unexpectedStopDialog.savedDuration)}</strong> 분량이 안전하게 저장되었습니다.</div>
                <div className="text-xs text-green-700">
                  아래 옵션 중 선택하세요.
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 space-y-1">
                <div className="font-medium">권장 방지 사항</div>
                <div>• 녹음 중엔 다른 앱(카메라·통화 등) 실행 금지</div>
                <div>• 같은 계정으로 다른 브라우저·탭에서 접속 중이면 한 곳만 사용</div>
                <div>• 태블릿 자동 잠금·화면 어두워짐 방지</div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={dismissUnexpectedStopDialog}>
            나중에 저장 (일시정지 유지)
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => resumeAfterUnexpectedStop()}
            className="gap-2"
          >
            <Play className="w-4 h-4" />
            이어서 녹음
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
