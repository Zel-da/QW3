import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { AudioRecordingData } from '@/components/InlineAudioPanel';

interface RecordingStartInfo {
  teamId: number;
  teamName: string;
  date: string;
}

interface RecordingState {
  isRecording: boolean;
  startedFrom: RecordingStartInfo | null;
  duration: number;
}

interface RecordingContextValue {
  state: RecordingState;
  startRecording: (teamId: number, teamName: string, date: string) => Promise<boolean>;
  stopRecording: () => Promise<AudioRecordingData | null>;
  cancelRecording: () => void;
  setCurrentTbmInfo: (info: { teamId: number; teamName: string; date: string } | null) => void;
  currentTbmInfo: { teamId: number; teamName: string; date: string } | null;
  canStartRecording: boolean;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function RecordingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    startedFrom: null,
    duration: 0,
  });

  // TBM 페이지에서 현재 선택된 팀 정보
  const [currentTbmInfo, setCurrentTbmInfo] = useState<{ teamId: number; teamName: string; date: string } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<number>(0);

  // TBM 페이지에서 팀이 선택된 상태일 때만 녹음 시작 가능
  const canStartRecording = !state.isRecording && currentTbmInfo !== null;

  // 페이지 이동/새로고침 시 경고
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isRecording) {
        e.preventDefault();
        e.returnValue = '녹음이 진행 중입니다. 페이지를 나가시겠습니까?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isRecording]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async (teamId: number, teamName: string, date: string): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      durationRef.current = 0;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);

      setState({
        isRecording: true,
        startedFrom: { teamId, teamName, date },
        duration: 0,
      });

      // 타이머 시작
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setState(prev => ({
          ...prev,
          duration: durationRef.current,
        }));
      }, 1000);

      return true;
    } catch (error) {
      console.error('녹음 시작 실패:', error);
      alert('마이크 접근 권한이 필요합니다.');
      return false;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<AudioRecordingData | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        resolve(null);
        return;
      }

      const startInfo = state.startedFrom;
      const finalDuration = durationRef.current;

      // 타이머 정지
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      mediaRecorderRef.current.onstop = async () => {
        try {
          const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: mimeType });

          // 스트림 정리
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          // 파일 업로드
          const formData = new FormData();
          const dateStr = startInfo?.date || new Date().toISOString().slice(0, 10);
          const teamName = startInfo?.teamName || 'TBM';
          const fileName = `${teamName}_녹음_${dateStr}.webm`;
          formData.append('file', blob, fileName);

          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          });

          if (!response.ok) {
            throw new Error('업로드 실패');
          }

          const result = await response.json();

          const recordingData: AudioRecordingData = {
            url: result.url,
            name: fileName,
            duration: finalDuration,
            size: blob.size,
            recordedAt: new Date().toISOString(),
          };

          // 해당 팀의 TBM에 녹음 저장
          if (startInfo) {
            await saveRecordingToTbm(startInfo.teamId, startInfo.date, recordingData);
          }

          // 상태 초기화
          setState({
            isRecording: false,
            startedFrom: null,
            duration: 0,
          });

          resolve(recordingData);
        } catch (error) {
          console.error('녹음 저장 실패:', error);
          setState({
            isRecording: false,
            startedFrom: null,
            duration: 0,
          });
          resolve(null);
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [state.startedFrom]);

  const cancelRecording = useCallback(() => {
    // 타이머 정지
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 녹음 중지
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 청크 초기화
    audioChunksRef.current = [];

    // 상태 초기화
    setState({
      isRecording: false,
      startedFrom: null,
      duration: 0,
    });
  }, []);

  // TBM에 녹음 저장하는 함수
  const saveRecordingToTbm = async (
    teamId: number,
    date: string,
    recordingData: AudioRecordingData
  ) => {
    try {
      // 기존 TBM 조회
      const checkResponse = await fetch(
        `/api/tbm/check-existing?teamId=${teamId}&date=${date}`,
        { credentials: 'include' }
      );
      const checkData = await checkResponse.json();

      if (checkData.exists && checkData.report) {
        // 기존 TBM이 있으면 remarks 업데이트
        const existingReport = checkData.report;
        let remarksData: any = {};

        try {
          if (existingReport.remarks) {
            remarksData = JSON.parse(existingReport.remarks);
          }
        } catch (e) {
          remarksData = { text: existingReport.remarks || '' };
        }

        remarksData.audioRecording = recordingData;

        await fetch(`/api/tbm/${existingReport.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ...existingReport,
            remarks: JSON.stringify(remarksData),
          }),
        });
      }
      // 기존 TBM이 없으면 녹음만 저장 (TBM 생성 없이) - 사용자가 TBM 저장할 때 함께 저장됨
    } catch (error) {
      console.error('TBM 녹음 저장 실패:', error);
      throw error;
    }
  };

  return (
    <RecordingContext.Provider
      value={{
        state,
        startRecording,
        stopRecording,
        cancelRecording,
        setCurrentTbmInfo,
        currentTbmInfo,
        canStartRecording,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }
  return context;
}

export { formatTime };
