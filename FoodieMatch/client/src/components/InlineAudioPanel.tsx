import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, X, Upload, Trash2, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading';

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
}: InlineAudioPanelProps) {
  const [state, setState] = useState<RecordingState>(existingAudio ? 'recorded' : 'idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudio?.url || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(existingAudio?.duration || 0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionData | null>(existingTranscription || null);

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

  if (disabled) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">녹음 기능 비활성화됨</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white h-full flex flex-col">
      {/* 헤더 */}
      <div className={cn(
        "px-3 py-2 rounded-t-lg flex items-center gap-2",
        state === 'recording' ? "bg-red-500 text-white" : "bg-primary/10"
      )}>
        <Mic className="h-4 w-4" />
        <span className="text-sm font-medium">TBM 녹음</span>
        {state === 'recording' && (
          <span className="ml-auto text-sm font-mono">{formatTime(recordingTime)}</span>
        )}
        {state === 'recorded' && (
          <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">녹음완료</span>
        )}
      </div>

      {/* 컨텐츠 */}
      <div className="flex-1 p-3 space-y-3">
        {/* 숨겨진 오디오 요소 */}
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

        {/* 숨겨진 파일 인풋 */}
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

        {/* IDLE 상태 */}
        {state === 'idle' && (
          <div className="flex flex-col gap-2">
            <Button
              onClick={startRecording}
              variant="default"
              size="sm"
              className="w-full bg-red-500 hover:bg-red-600"
            >
              <Mic className="h-4 w-4 mr-2" />
              녹음 시작
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              파일 업로드
            </Button>
          </div>
        )}

        {/* 녹음 중 상태 */}
        {state === 'recording' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-lg font-mono">{formatTime(recordingTime)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-red-500 h-1.5 rounded-full transition-all"
                style={{ width: `${(recordingTime / maxDurationSeconds) * 100}%` }}
              />
            </div>
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              <Square className="h-4 w-4 mr-2" />
              녹음 중지
            </Button>
          </div>
        )}

        {/* 녹음 완료 상태 */}
        {state === 'recorded' && (
          <div className="space-y-2">
            {/* 재생 컨트롤 */}
            <div className="flex items-center gap-2">
              <Button onClick={togglePlayback} variant="outline" size="icon" className="h-8 w-8">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex-1">
                <div className="text-xs text-gray-500">
                  {formatTime(playbackTime)} / {formatTime(duration)}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-primary h-1 rounded-full transition-all"
                    style={{ width: duration > 0 ? `${(playbackTime / duration) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>

            {/* 액션 버튼들 */}
            <div className="flex gap-1">
              {audioBlob && (
                <Button onClick={uploadRecording} variant="default" size="sm" className="flex-1 text-xs">
                  <Upload className="h-3 w-3 mr-1" />
                  저장
                </Button>
              )}
              <Button
                onClick={handleTranscribe}
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                disabled={isTranscribing}
              >
                {isTranscribing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <FileText className="h-3 w-3 mr-1" />
                    STT
                  </>
                )}
              </Button>
              <Button onClick={resetRecording} variant="ghost" size="sm" className="text-xs text-red-500">
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* STT 결과 */}
            {transcription && transcription.status === 'completed' && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs max-h-20 overflow-y-auto">
                {transcription.text}
              </div>
            )}
          </div>
        )}

        {/* 업로딩 상태 */}
        {state === 'uploading' && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
