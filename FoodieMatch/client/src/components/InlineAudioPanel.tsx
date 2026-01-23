import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Mic, Square, Play, Pause, Upload, Trash2, Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRecording, formatTime as formatRecordingTime } from '@/context/RecordingContext';

export interface AudioRecordingData {
  url: string;
  name: string;
  duration: number;
  size: number;
  recordedAt: string;
}

export interface TranscriptionData {
  text: string;
  processedAt: string;
  status: 'completed' | 'failed';
  error?: string;
}

interface InlineAudioPanelProps {
  onRecordingComplete: (data: AudioRecordingData) => void;
  onTranscriptionComplete?: (data: TranscriptionData) => void;
  onDelete?: () => void;
  existingAudio?: AudioRecordingData | null;
  existingTranscription?: TranscriptionData | null;
  maxDurationSeconds?: number;
  disabled?: boolean;
  /** 재생 전용 모드 - 녹음/업로드 버튼을 숨기고 재생만 가능 */
  playbackOnly?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading';

// 외부 URL에서 파일 다운로드 (CORS 우회)
async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('다운로드 실패');
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('다운로드 실패:', error);
    // fallback: 새 탭에서 열기
    window.open(url, '_blank');
  }
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function InlineAudioPanel({
  onRecordingComplete,
  onTranscriptionComplete,
  onDelete,
  existingAudio,
  existingTranscription,
  maxDurationSeconds = 1800,
  disabled = false,
  playbackOnly = false,
}: InlineAudioPanelProps) {
  const [state, setState] = useState<RecordingState>(existingAudio ? 'recorded' : 'idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudio?.url || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(existingAudio?.duration || 0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  // STT 기능 제거 - 비용 절감을 위해 외부 도구(Notebook LM) 활용
  // 녹음 파일 다운로드 후 필요시 외부에서 변환

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 기존 오디오가 변경되면 (새 녹음 저장됨) UI 업데이트
  const prevAudioUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (existingAudio) {
      const isNewRecording = prevAudioUrlRef.current !== null &&
                              prevAudioUrlRef.current !== existingAudio.url;

      setAudioUrl(existingAudio.url);
      setDuration(existingAudio.duration);
      setState('recorded');

      // 새 녹음이 저장된 경우 "방금 저장됨" 표시
      if (isNewRecording) {
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 5000);
      }

      prevAudioUrlRef.current = existingAudio.url;
    }
  }, [existingAudio]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl && !existingAudio) URL.revokeObjectURL(audioUrl);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl, existingAudio]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        if (audioUrl && !existingAudio) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setDuration(recordingTime);
        setState('recorded');
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000);
      setState('recording');
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDurationSeconds) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      alert('마이크 접근 권한이 필요합니다.');
    }
  }, [maxDurationSeconds, audioUrl, existingAudio, recordingTime]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (audioUrl && !existingAudio) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setDuration(0);
    setPlaybackTime(0);
    setIsPlaying(false);
    setState('idle');
    onDelete?.();
  }, [audioUrl, existingAudio, onDelete]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) {
      alert('오디오 파일만 업로드 가능합니다.');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      alert('파일 크기는 100MB 이하여야 합니다.');
      return;
    }

    setState('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: formData, credentials: 'include' });
      if (!response.ok) throw new Error('업로드 실패');
      const result = await response.json();

      const audio = new Audio(result.url);
      await new Promise<void>((resolve) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => resolve();
      });

      const recordingData: AudioRecordingData = {
        url: result.url,
        name: file.name,
        duration: audio.duration || 0,
        size: file.size,
        recordedAt: new Date().toISOString(),
      };

      setAudioUrl(result.url);
      setDuration(audio.duration || 0);
      setState('recorded');
      onRecordingComplete(recordingData);
    } catch (error) {
      console.error('파일 업로드 실패:', error);
      alert('파일 업로드에 실패했습니다.');
      setState('idle');
    }
  }, [onRecordingComplete]);

  const uploadRecording = useCallback(async () => {
    if (!audioBlob) return;
    setState('uploading');
    try {
      const formData = new FormData();
      const fileName = `TBM_녹음_${new Date().toISOString().slice(0, 10)}.webm`;
      formData.append('file', audioBlob, fileName);
      const response = await fetch('/api/upload', { method: 'POST', body: formData, credentials: 'include' });
      if (!response.ok) throw new Error('업로드 실패');
      const result = await response.json();

      const recordingData: AudioRecordingData = {
        url: result.url,
        name: fileName,
        duration: duration,
        size: audioBlob.size,
        recordedAt: new Date().toISOString(),
      };
      setAudioUrl(result.url);
      onRecordingComplete(recordingData);
      setState('recorded');
    } catch (error) {
      console.error('녹음 업로드 실패:', error);
      alert('녹음 업로드에 실패했습니다.');
      setState('recorded');
    }
  }, [audioBlob, duration, onRecordingComplete]);

  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // RecordingContext에서 녹음 상태 가져오기 (hook은 항상 최상단에서 호출)
  const { state: recordingState } = useRecording();

  // 비활성화 상태
  if (disabled) {
    return (
      <Card className="border-2 border-dashed border-muted-foreground/25 p-6 flex items-center justify-center min-h-[120px]">
        <p className="text-sm text-muted-foreground">녹음 기능 비활성화됨</p>
      </Card>
    );
  }

  // 재생 전용 모드 - 녹음이 없는 경우 (RecordingContext 상태 표시)
  if (playbackOnly && state === 'idle') {
    // 녹음 중
    if (recordingState.status === 'recording') {
      return (
        <Card className="border-2 border-red-200 bg-red-50/50 p-6 flex flex-col items-center justify-center min-h-[120px] gap-2">
          <div className="flex items-center gap-2 text-red-500 animate-pulse">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="font-mono text-lg font-bold">{formatRecordingTime(recordingState.duration)}</span>
          </div>
          <p className="text-sm text-red-600 font-medium">녹음 중...</p>
          <p className="text-xs text-muted-foreground">헤더의 일시정지 버튼을 누르세요</p>
        </Card>
      );
    }

    // 일시정지 상태
    if (recordingState.status === 'paused') {
      return (
        <Card className="border-2 border-amber-200 bg-amber-50/50 p-6 flex flex-col items-center justify-center min-h-[120px] gap-2">
          <div className="flex items-center gap-2 text-amber-600">
            <div className="w-3 h-3 bg-amber-500 rounded-full" />
            <span className="font-mono text-lg font-bold">{formatRecordingTime(recordingState.duration)}</span>
          </div>
          <p className="text-sm text-amber-700 font-medium">녹음 일시정지</p>
          <p className="text-xs text-muted-foreground">헤더에서 재개/저장/삭제할 수 있습니다</p>
        </Card>
      );
    }

    // 저장 중
    if (recordingState.status === 'saving') {
      return (
        <Card className="border-2 border-primary/30 bg-primary/5 p-6 flex flex-col items-center justify-center min-h-[120px] gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-primary font-medium">녹음 저장 중...</p>
        </Card>
      );
    }

    // 저장 완료 - 잠시 후 자동으로 녹음이 표시됨
    if (recordingState.status === 'success') {
      return (
        <Card className="border-2 border-green-300 bg-green-50 p-6 flex flex-col items-center justify-center min-h-[120px] gap-2 animate-pulse">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
          <p className="text-base text-green-700 font-bold">녹음 저장 완료!</p>
          <p className="text-sm text-green-600">잠시 후 녹음이 표시됩니다...</p>
        </Card>
      );
    }

    // 저장 실패
    if (recordingState.status === 'error') {
      return (
        <Card className="border-2 border-red-200 bg-red-50/50 p-6 flex flex-col items-center justify-center min-h-[120px] gap-2">
          <div className="h-6 w-6 text-red-600 flex items-center justify-center font-bold">!</div>
          <p className="text-sm text-red-600 font-medium">녹음 저장 실패</p>
          <p className="text-xs text-muted-foreground">{recordingState.saveError || '다시 시도해주세요'}</p>
        </Card>
      );
    }

    // 기본 상태 (녹음 없음)
    return (
      <Card className="border-2 border-dashed border-muted-foreground/30 p-6 flex flex-col items-center justify-center min-h-[120px] gap-3">
        <div className="p-3 rounded-full bg-muted">
          <Mic className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">녹음 없음</p>
          <p className="text-xs text-muted-foreground mt-1">
            상단 헤더의 <span className="font-semibold text-primary">🎙️ 녹음</span> 버튼을 눌러주세요
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* 숨겨진 오디오/파일 인풋 */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={() => setPlaybackTime(audioRef.current?.currentTime || 0)}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            if (audioRef.current && isFinite(audioRef.current.duration)) {
              setDuration(audioRef.current.duration);
            }
          }}
        />
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
      />

      {/* IDLE 상태 - FileDropzone 스타일 */}
      {state === 'idle' && (
        <Card className="border-2 border-dashed border-border hover:border-primary/50 transition-colors p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-muted">
              <Mic className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">음성 녹음</p>
              <p className="text-xs text-muted-foreground mt-1">버튼을 눌러 녹음하거나 파일을 업로드하세요</p>
            </div>
            <div className="flex gap-2 w-full">
              <Button
                onClick={startRecording}
                variant="destructive"
                size="sm"
                className="flex-1"
              >
                <Mic className="h-4 w-4 mr-1" />
                녹음
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-1" />
                업로드
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 녹음 중 상태 */}
      {state === 'recording' && (
        <Card className="border-2 border-destructive bg-destructive/5 p-6">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
              <span className="text-2xl font-mono font-bold text-destructive">{formatTime(recordingTime)}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-destructive h-2 rounded-full transition-all"
                style={{ width: `${Math.min((recordingTime / maxDurationSeconds) * 100, 100)}%` }}
              />
            </div>
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <Square className="h-4 w-4 mr-1" />
              녹음 중지
            </Button>
          </div>
        </Card>
      )}

      {/* 녹음 완료 상태 */}
      {state === 'recorded' && (
        <Card className={cn(
          "p-4 space-y-3",
          justSaved ? "border-2 border-blue-400 bg-blue-50/50 animate-pulse" :
          playbackOnly && existingAudio ? "border-2 border-green-200 bg-green-50/50" : "border"
        )}>
          {/* 방금 저장됨 표시 */}
          {justSaved && (
            <div className="flex items-center justify-between gap-2 text-blue-700 mb-2 p-2 bg-blue-100 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <span className="font-bold text-sm">✨ 방금 저장됨!</span>
              </div>
              <Badge variant="secondary" className="bg-blue-200 text-blue-800">
                {formatTime(duration)}
              </Badge>
            </div>
          )}

          {/* playbackOnly 모드에서 저장됨 표시 (방금 저장이 아닐 때) */}
          {!justSaved && playbackOnly && existingAudio && (
            <div className="flex items-center justify-between gap-2 text-green-700 mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium text-sm">녹음 저장됨</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-green-600 border-green-600">
                  {formatTime(duration)}
                </Badge>
                {existingAudio.recordedAt && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(existingAudio.recordedAt).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 재생 컨트롤 */}
          <div className="flex items-center gap-3">
            <Button onClick={togglePlayback} variant="outline" size="icon" className="h-10 w-10 shrink-0">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-mono text-muted-foreground mb-1">
                {formatTime(playbackTime)} / {formatTime(duration)}
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={cn(
                    "h-2 rounded-full transition-all",
                    playbackOnly && existingAudio ? "bg-green-600" : "bg-primary"
                  )}
                  style={{ width: duration > 0 ? `${(playbackTime / duration) * 100}%` : '0%' }}
                />
              </div>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex gap-2">
            {!playbackOnly && audioBlob && (
              <Button onClick={uploadRecording} variant="default" size="sm" className="flex-1">
                <Upload className="h-4 w-4 mr-1" />
                저장
              </Button>
            )}
            {audioUrl && (
              <Button
                onClick={async () => {
                  const filename = existingAudio?.name || `TBM_녹음_${new Date().toISOString().slice(0, 10)}.webm`;
                  setIsDownloading(true);
                  try {
                    await downloadFile(audioUrl, filename);
                  } finally {
                    setIsDownloading(false);
                  }
                }}
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                {isDownloading ? '다운로드 중...' : '다운로드'}
              </Button>
            )}
            {/* 삭제 버튼 - playbackOnly에서도 onDelete가 있으면 표시 */}
            {(!playbackOnly || onDelete) && (
              <Button onClick={resetRecording} variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* 업로딩 상태 */}
      {state === 'uploading' && (
        <Card className="border-2 border-dashed p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </Card>
      )}
    </div>
  );
}
