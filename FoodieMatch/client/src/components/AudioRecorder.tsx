import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Trash2, Upload, FileAudio, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AudioRecordingData {
  url: string;
  name: string;
  duration: number;
  size: number;
  recordedAt: string;
}

interface AudioRecorderProps {
  onRecordingComplete: (data: AudioRecordingData) => void;
  onDelete?: () => void;
  existingAudio?: AudioRecordingData | null;
  maxDurationSeconds?: number;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading';

// 시간 포맷팅 (MM:SS 또는 HH:MM:SS)
function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 파일 크기 포맷팅
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AudioRecorder({
  onRecordingComplete,
  onDelete,
  existingAudio,
  maxDurationSeconds = 1800, // 30분
  disabled = false,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>(existingAudio ? 'recorded' : 'idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudio?.url || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(existingAudio?.duration || 0);
  const [uploadProgress, setUploadProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 기존 오디오가 있으면 로드
  useEffect(() => {
    if (existingAudio) {
      setAudioUrl(existingAudio.url);
      setDuration(existingAudio.duration);
      setState('recorded');
    }
  }, [existingAudio]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl && !existingAudio) URL.revokeObjectURL(audioUrl);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl, existingAudio]);

  // 녹음 시작
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 지원되는 MIME 타입 확인 (Safari 호환성)
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

        // 기존 URL 해제
        if (audioUrl && !existingAudio) URL.revokeObjectURL(audioUrl);

        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setDuration(recordingTime);
        setState('recorded');

        // 스트림 정지
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // 1초마다 데이터 수집
      setState('recording');
      setRecordingTime(0);

      // 타이머 시작
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          // 최대 시간 도달 시 자동 정지
          if (newTime >= maxDurationSeconds) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      alert('마이크 접근 권한이 필요합니다. 브라우저 설정을 확인해주세요.');
    }
  }, [maxDurationSeconds, audioUrl, existingAudio, recordingTime]);

  // 녹음 정지
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 재녹음
  const resetRecording = useCallback(() => {
    if (audioUrl && !existingAudio) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setDuration(0);
    setPlaybackTime(0);
    setIsPlaying(false);
    setState('idle');
  }, [audioUrl, existingAudio]);

  // 삭제
  const handleDelete = useCallback(() => {
    resetRecording();
    onDelete?.();
  }, [resetRecording, onDelete]);

  // 파일 업로드
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('audio/')) {
        alert('오디오 파일만 업로드 가능합니다.');
        return;
      }

      // 100MB 제한 (서버 제한)
      if (file.size > 100 * 1024 * 1024) {
        alert('파일 크기는 100MB 이하여야 합니다.');
        return;
      }

      setState('uploading');
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('업로드 실패');

        const result = await response.json();

        // 오디오 duration 가져오기
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
    },
    [onRecordingComplete]
  );

  // 녹음 완료 후 업로드
  const uploadRecording = useCallback(async () => {
    if (!audioBlob) return;

    setState('uploading');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      const fileName = `TBM_녹음_${new Date().toISOString().slice(0, 10)}.webm`;
      formData.append('file', audioBlob, fileName);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('업로드 실패');

      const result = await response.json();

      const recordingData: AudioRecordingData = {
        url: result.url,
        name: fileName,
        duration: duration,
        size: audioBlob.size,
        recordedAt: new Date().toISOString(),
      };

      onRecordingComplete(recordingData);
    } catch (error) {
      console.error('녹음 업로드 실패:', error);
      alert('녹음 업로드에 실패했습니다.');
      setState('recorded');
    }
  }, [audioBlob, duration, onRecordingComplete]);

  // 재생/일시정지
  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // 오디오 이벤트 핸들러
  const handleAudioTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  }, []);

  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    setPlaybackTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);

  const handleAudioLoadedMetadata = useCallback(() => {
    if (audioRef.current && !duration) {
      setDuration(audioRef.current.duration);
    }
  }, [duration]);

  return (
    <Card className={cn('w-full', disabled && 'opacity-50 pointer-events-none')}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileAudio className="h-5 w-5 text-primary" />
          <h4 className="font-medium">TBM 음성 녹음</h4>
          <span className="text-xs text-muted-foreground">(선택)</span>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          중대재해처벌법 대응을 위한 TBM 실시 증빙자료입니다. 최대 {formatTime(maxDurationSeconds)}까지 녹음 가능합니다.
        </p>

        {/* 대기 상태 */}
        {state === 'idle' && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={startRecording} variant="default" className="flex-1">
              <Mic className="h-4 w-4 mr-2" />
              녹음 시작
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
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
          </div>
        )}

        {/* 녹음 중 */}
        {state === 'recording' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-sm font-medium">녹음 중...</span>
              </div>
              <div className="text-lg font-mono">
                {formatTime(recordingTime)} / {formatTime(maxDurationSeconds)}
              </div>
            </div>

            {/* 진행 바 */}
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${(recordingTime / maxDurationSeconds) * 100}%` }}
              />
            </div>

            <Button onClick={stopRecording} variant="destructive" className="w-full">
              <Square className="h-4 w-4 mr-2" />
              녹음 정지
            </Button>
          </div>
        )}

        {/* 녹음 완료 */}
        {state === 'recorded' && audioUrl && (
          <div className="space-y-4">
            {/* 오디오 플레이어 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={handleAudioTimeUpdate}
                onEnded={handleAudioEnded}
                onLoadedMetadata={handleAudioLoadedMetadata}
              />

              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost" onClick={togglePlayback}>
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                {/* 진행 바 */}
                <div className="flex-1">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={playbackTime}
                    onChange={(e) => {
                      const time = Number(e.target.value);
                      if (audioRef.current) {
                        audioRef.current.currentTime = time;
                        setPlaybackTime(time);
                      }
                    }}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <span className="text-sm font-mono min-w-[80px] text-right">
                  {formatTime(playbackTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* 파일 정보 */}
            {existingAudio && (
              <div className="text-xs text-muted-foreground">
                <span>{existingAudio.name}</span>
                <span className="mx-2">•</span>
                <span>{formatFileSize(existingAudio.size)}</span>
                <span className="mx-2">•</span>
                <span>{new Date(existingAudio.recordedAt).toLocaleString()}</span>
              </div>
            )}

            {/* 버튼들 */}
            <div className="flex flex-wrap gap-2">
              {!existingAudio && (
                <Button onClick={uploadRecording} variant="default" size="sm">
                  <Upload className="h-4 w-4 mr-1" />
                  저장
                </Button>
              )}
              <Button onClick={resetRecording} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-1" />
                재녹음
              </Button>
              <Button onClick={handleDelete} variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1" />
                삭제
              </Button>
            </div>
          </div>
        )}

        {/* 업로드 중 */}
        {state === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">업로드 중...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
