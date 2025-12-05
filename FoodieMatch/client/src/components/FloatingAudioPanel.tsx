import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, ChevronDown, ChevronUp, X, Upload, Trash2, FileText, Loader2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Position {
  x: number;
  y: number;
}

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

interface FloatingAudioPanelProps {
  onRecordingComplete: (data: AudioRecordingData) => void;
  onTranscriptionComplete?: (data: TranscriptionData) => void;
  onDelete?: () => void;
  existingAudio?: AudioRecordingData | null;
  existingTranscription?: TranscriptionData | null;
  maxDurationSeconds?: number;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function FloatingAudioPanel({
  onRecordingComplete,
  onTranscriptionComplete,
  onDelete,
  existingAudio,
  existingTranscription,
  maxDurationSeconds = 1800,
  disabled = false,
}: FloatingAudioPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [state, setState] = useState<RecordingState>(existingAudio ? 'recorded' : 'idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudio?.url || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(existingAudio?.duration || 0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionData | null>(existingTranscription || null);

  // 드래그 관련 state
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingAudio) {
      setAudioUrl(existingAudio.url);
      setDuration(existingAudio.duration);
      setState('recorded');
    }
    if (existingTranscription) {
      setTranscription(existingTranscription);
    }
  }, [existingAudio, existingTranscription]);

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
      setIsExpanded(true);

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
    setTranscription(null);
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
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
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
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
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

  const handleTranscribe = useCallback(async () => {
    if (!audioUrl) return;
    setIsTranscribing(true);
    try {
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const sttResponse = await fetch('/api/stt/transcribe', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!sttResponse.ok) throw new Error('STT 변환 실패');
      const result = await sttResponse.json();

      const transcriptionData: TranscriptionData = {
        text: result.text,
        processedAt: new Date().toISOString(),
        status: 'completed',
      };
      setTranscription(transcriptionData);
      onTranscriptionComplete?.(transcriptionData);
    } catch (error) {
      console.error('STT 변환 오류:', error);
      setTranscription({
        text: '',
        processedAt: new Date().toISOString(),
        status: 'failed',
        error: '변환 실패',
      });
    } finally {
      setIsTranscribing(false);
    }
  }, [audioUrl, onTranscriptionComplete]);

  // 드래그 이벤트 핸들러
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // 가장 가까운 fixed 부모 요소를 찾아서 offset 계산
    const target = e.currentTarget as HTMLElement;
    const panel = target.closest('.fixed') as HTMLElement;
    if (panel) {
      const rect = panel.getBoundingClientRect();
      setDragOffset({
        x: clientX - rect.left,
        y: clientY - rect.top
      });
    }
  }, []);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // 화면 경계 내에서만 이동
    const maxX = window.innerWidth - 280; // 패널 너비 고려
    const maxY = window.innerHeight - 100;

    const newX = Math.max(0, Math.min(clientX - dragOffset.x, maxX));
    const newY = Math.max(0, Math.min(clientY - dragOffset.y, maxY));

    setPosition({ x: newX, y: newY });
  }, [isDragging, dragOffset]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 드래그 이벤트 리스너 등록
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  if (disabled) return null;

  // position이 0,0이면 기본 위치 사용 (right-4, top-1/3)
  const hasCustomPosition = position.x !== 0 || position.y !== 0;

  return (
    <>
      {/* Desktop: 오른쪽 플로팅 */}
      <div
        className={cn(
          "hidden md:block fixed z-50 w-64",
          isDragging && "select-none"
        )}
        style={hasCustomPosition ? {
          left: `${position.x}px`,
          top: `${position.y}px`,
        } : {
          right: '16px',
          top: '33%',
        }}
      >
        <div className={cn(
          "bg-background border-2 rounded-lg shadow-lg transition-all",
          state === 'recording' && "border-red-500",
          isDragging && "shadow-2xl"
        )}>
          {/* 헤더 - 드래그 핸들 포함 */}
          <div
            className={cn(
              "flex items-center justify-between px-2 py-2 rounded-t-lg",
              state === 'recording' ? "bg-red-500 text-white" : "bg-primary/10"
            )}
          >
            {/* 드래그 핸들 */}
            <div
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-black/10 rounded touch-none"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              onDoubleClick={() => setPosition({ x: 0, y: 0 })}
              title="드래그하여 이동 (더블클릭: 원위치)"
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer px-1"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Mic className="h-4 w-4" />
              <span className="font-medium text-sm">TBM 녹음</span>
              {state === 'recording' && (
                <span className="text-xs font-mono">{formatTime(recordingTime)}</span>
              )}
            </div>
            <div
              className="cursor-pointer p-1 hover:bg-black/10 rounded"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </div>
          </div>

          {/* 컨텐츠 */}
          {isExpanded && (
            <div className="p-3 space-y-3">
              {/* 대기 상태 */}
              {state === 'idle' && (
                <div className="space-y-2">
                  <Button onClick={startRecording} size="sm" className="w-full gap-2">
                    <Mic className="h-4 w-4" />
                    녹음 시작
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    파일 업로드
                  </Button>
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
                  <p className="text-xs text-muted-foreground text-center">
                    최대 {formatTime(maxDurationSeconds)}
                  </p>
                </div>
              )}

              {/* 녹음 중 */}
              {state === 'recording' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${(recordingTime / maxDurationSeconds) * 100}%` }}
                    />
                  </div>
                  <Button onClick={stopRecording} variant="destructive" size="sm" className="w-full gap-2">
                    <Square className="h-4 w-4" />
                    녹음 정지
                  </Button>
                </div>
              )}

              {/* 녹음 완료 */}
              {state === 'recorded' && audioUrl && (
                <div className="space-y-2">
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onTimeUpdate={() => setPlaybackTime(audioRef.current?.currentTime || 0)}
                    onEnded={() => {
                      setIsPlaying(false);
                      setPlaybackTime(0);
                      if (audioRef.current) audioRef.current.currentTime = 0;
                    }}
                    onLoadedMetadata={() => {
                      if (audioRef.current && !duration) {
                        setDuration(audioRef.current.duration);
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" onClick={togglePlayback} className="h-8 w-8">
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <div className="flex-1 text-xs font-mono">
                      {formatTime(playbackTime)} / {formatTime(duration)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!existingAudio && audioBlob && (
                      <Button onClick={uploadRecording} size="sm" className="flex-1 gap-1">
                        <Upload className="h-3 w-3" />
                        저장
                      </Button>
                    )}
                    <Button onClick={resetRecording} variant="outline" size="sm" className="flex-1 gap-1">
                      <Trash2 className="h-3 w-3" />
                      삭제
                    </Button>
                  </div>

                  {/* STT 버튼 */}
                  {existingAudio && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full gap-1"
                      onClick={handleTranscribe}
                      disabled={isTranscribing}
                    >
                      {isTranscribing ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          변환 중...
                        </>
                      ) : (
                        <>
                          <FileText className="h-3 w-3" />
                          텍스트 변환 (선택)
                        </>
                      )}
                    </Button>
                  )}

                  {/* 변환 결과 */}
                  {transcription?.status === 'completed' && transcription.text && (
                    <div className="bg-muted/50 rounded p-2 text-xs max-h-24 overflow-y-auto">
                      {transcription.text.slice(0, 200)}
                      {transcription.text.length > 200 && '...'}
                    </div>
                  )}
                </div>
              )}

              {/* 업로드 중 */}
              {state === 'uploading' && (
                <div className="flex flex-col items-center py-4 gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">업로드 중...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: 하단 플로팅 (드래그 가능) */}
      <div
        className={cn(
          "md:hidden fixed z-50",
          isDragging && "select-none"
        )}
        style={hasCustomPosition ? {
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: 'calc(100% - 32px)',
          maxWidth: '400px',
        } : {
          bottom: '16px',
          left: '16px',
          right: '16px',
        }}
      >
        <div className={cn(
          "bg-background border-2 rounded-lg shadow-lg",
          state === 'recording' && "border-red-500",
          isDragging && "shadow-2xl"
        )}>
          <div
            className={cn(
              "flex items-center justify-between px-2 py-2",
              state === 'recording' ? "bg-red-500 text-white" : "bg-primary/10"
            )}
          >
            {/* 드래그 핸들 */}
            <div
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-black/10 rounded touch-none"
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
              onDoubleClick={() => setPosition({ x: 0, y: 0 })}
            >
              <GripVertical className="h-4 w-4" />
            </div>
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer px-1"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Mic className="h-4 w-4" />
              <span className="font-medium text-sm">TBM 녹음</span>
              {state === 'recording' && (
                <span className="text-xs font-mono">{formatTime(recordingTime)}</span>
              )}
              {state === 'recorded' && (
                <span className="text-xs text-green-600">녹음완료</span>
              )}
            </div>
            <div
              className="cursor-pointer p-1 hover:bg-black/10 rounded"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </div>
          </div>

          {isExpanded && (
            <div className="p-3">
              {state === 'idle' && (
                <div className="flex gap-2">
                  <Button onClick={startRecording} size="sm" className="flex-1 gap-2">
                    <Mic className="h-4 w-4" />
                    녹음
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    업로드
                  </Button>
                </div>
              )}

              {state === 'recording' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      </span>
                      <span className="font-mono">{formatTime(recordingTime)}</span>
                    </div>
                    <Button onClick={stopRecording} variant="destructive" size="sm">
                      <Square className="h-4 w-4 mr-1" />
                      정지
                    </Button>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${(recordingTime / maxDurationSeconds) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {state === 'recorded' && audioUrl && (
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" onClick={togglePlayback} className="h-8 w-8">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <span className="text-xs font-mono flex-1">
                    {formatTime(playbackTime)} / {formatTime(duration)}
                  </span>
                  {!existingAudio && audioBlob && (
                    <Button onClick={uploadRecording} size="sm">저장</Button>
                  )}
                  <Button onClick={resetRecording} variant="outline" size="sm">삭제</Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
