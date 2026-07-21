/**
 * 녹음 중 상단 고정 배너.
 *
 * 목적:
 * - 사용자가 다른 페이지·다른 화면으로 이동해도 녹음이 진행 중임을 항상 인지
 * - "새로고침·다른 앱·마이크 사용 앱은 조심하세요" 명시적 안내
 * - 경과 시간 실시간 표시
 *
 * 배너는 recording·paused·saving 상태에서만 표시. idle/success/error는 숨김.
 */
import { useRecording, formatTime } from '@/context/RecordingContext';
import { Mic, Pause, Loader2, AlertCircle } from 'lucide-react';

export function RecordingStatusBanner() {
  const { state, uploadProgress } = useRecording();
  const status = state.status;

  if (status !== 'recording' && status !== 'paused' && status !== 'saving') {
    return null;
  }

  // 상태별 색상·아이콘·문구
  let bgColor = 'bg-red-50 border-red-300 text-red-900';
  let iconColor = 'text-red-600';
  let Icon = Mic;
  let statusLabel = '녹음 진행 중';
  let warning = '⚠️ 새로고침·다른 앱 실행·마이크 사용 앱을 조심하세요.';

  if (status === 'paused') {
    bgColor = 'bg-amber-50 border-amber-300 text-amber-900';
    iconColor = 'text-amber-600';
    Icon = Pause;
    statusLabel = '녹음 일시정지됨';
    warning = '저장 버튼을 눌러 서버에 저장하거나 재개하세요.';
  } else if (status === 'saving') {
    bgColor = 'bg-blue-50 border-blue-300 text-blue-900';
    iconColor = 'text-blue-600';
    Icon = Loader2;
    statusLabel = uploadProgress !== null
      ? (uploadProgress < 100 ? `저장 중 (${uploadProgress}%)` : '서버 처리 중...')
      : '저장 준비 중...';
    warning = '⚠️ 지금 페이지를 나가지 마세요.';
  }

  const teamName = state.startedFrom?.teamName || '';

  return (
    <div className={`w-full border-b px-4 py-2 ${bgColor}`}>
      <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap text-xs sm:text-sm">
        <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor} ${status === 'recording' ? 'animate-pulse' : ''} ${status === 'saving' ? 'animate-spin' : ''}`} />
        <span className="font-semibold whitespace-nowrap">{statusLabel}</span>
        {teamName && <span className="opacity-80 whitespace-nowrap">· {teamName}</span>}
        <span className="font-mono whitespace-nowrap">· {formatTime(state.duration)}</span>
        <span className="opacity-80 flex-1 min-w-[200px]">{warning}</span>
      </div>
      {/* saving 상태에서 프로그레스 바 */}
      {status === 'saving' && uploadProgress !== null && (
        <div className="max-w-7xl mx-auto mt-1">
          <div className="h-1 w-full bg-blue-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
