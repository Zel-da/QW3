import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { AudioRecordingData } from '@/components/InlineAudioPanel';

// 임시 저장용 키 (TBM이 없을 때)
const PENDING_RECORDING_KEY = 'pending_tbm_recording';

interface RecordingStartInfo {
  teamId: number;
  teamName: string;
  date: string;
}

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface RecordingState {
  isRecording: boolean;
  startedFrom: RecordingStartInfo | null;
  duration: number;
  // 저장 상태
  isSaving: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
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
    isSaving: false,
    saveStatus: 'idle',
    saveError: null,
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

  // saveStatus를 idle로 리셋하기 위한 타이머 ref (stopRecording 앞에서 선언)
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
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
        isSaving: false,
        saveStatus: 'idle',
        saveError: null,
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

      // 저장 중 상태로 업데이트
      setState(prev => ({
        ...prev,
        isRecording: false,
        isSaving: true,
        saveStatus: 'saving',
        saveError: null,
      }));

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

          // 저장 성공 상태로 업데이트
          setState({
            isRecording: false,
            startedFrom: null,
            duration: 0,
            isSaving: false,
            saveStatus: 'success',
            saveError: null,
          });

          // 5초 후 idle로 리셋
          if (saveStatusTimerRef.current) {
            clearTimeout(saveStatusTimerRef.current);
          }
          saveStatusTimerRef.current = setTimeout(() => {
            setState(prev => ({ ...prev, saveStatus: 'idle' }));
          }, 5000);

          resolve(recordingData);
        } catch (error) {
          console.error('녹음 저장 실패:', error);
          const errorMessage = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';
          setState({
            isRecording: false,
            startedFrom: null,
            duration: 0,
            isSaving: false,
            saveStatus: 'error',
            saveError: errorMessage,
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
      isSaving: false,
      saveStatus: 'idle',
      saveError: null,
    });
  }, []);

  // TBM에 녹음 저장하는 함수
  const saveRecordingToTbm = async (
    teamId: number,
    date: string,
    recordingData: AudioRecordingData
  ) => {
    const pendingKey = `${PENDING_RECORDING_KEY}_${teamId}_${date}`;

    try {
      // 기존 TBM 조회
      const checkResponse = await fetch(
        `/api/tbm/check-existing?teamId=${teamId}&date=${date}`,
        { credentials: 'include' }
      );
      const checkData = await checkResponse.json();

      if (checkData.exists && checkData.report) {
        // 기존 TBM이 있으면 새 PATCH 엔드포인트 사용 (안전한 업데이트)
        const response = await fetch(`/api/tbm/${checkData.report.id}/audio`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ audioRecording: recordingData }),
        });

        if (!response.ok) {
          throw new Error('녹음 저장 실패');
        }

        // 성공 시 로컬스토리지에서 임시 저장 데이터 삭제
        localStorage.removeItem(pendingKey);
      } else {
        // TBM이 없으면 로컬스토리지에 임시 저장
        localStorage.setItem(pendingKey, JSON.stringify(recordingData));
        console.log('TBM이 없어 로컬에 임시 저장:', pendingKey);
      }
    } catch (error) {
      console.error('TBM 녹음 저장 실패 (로컬 백업 시도):', error);
      // 실패 시에도 로컬에 백업 저장 - 백업 성공하면 에러 throw 안 함
      try {
        localStorage.setItem(pendingKey, JSON.stringify(recordingData));
        console.log('TBM 저장 실패했지만 로컬에 백업 완료:', pendingKey);
        // 로컬 백업 성공 시 에러 throw 안 함 - UI에 성공으로 표시
      } catch (localStorageError) {
        console.error('로컬 백업도 실패:', localStorageError);
        throw error; // 로컬 백업도 실패하면 에러 throw
      }
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

// 임시 저장된 녹음 확인 함수
export function getPendingRecording(teamId: number, date: string): AudioRecordingData | null {
  const pendingKey = `${PENDING_RECORDING_KEY}_${teamId}_${date}`;
  const data = localStorage.getItem(pendingKey);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return null;
}

// 임시 저장된 녹음 삭제 함수
export function clearPendingRecording(teamId: number, date: string): void {
  const pendingKey = `${PENDING_RECORDING_KEY}_${teamId}_${date}`;
  localStorage.removeItem(pendingKey);
}

export { formatTime };
