import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import type { AudioRecordingData } from '@/components/InlineAudioPanel';
import { toast } from '@/hooks/use-toast';

// 임시 저장용 키 (TBM이 없을 때)
const PENDING_RECORDING_KEY = 'pending_tbm_recording';

// IndexedDB 설정
const DB_NAME = 'TBMRecordingDB';
const DB_VERSION = 1;
const STORE_NAME = 'pausedRecordings';
const PAUSED_STATE_KEY = 'paused_recording_state';

// ============ IndexedDB Helper Functions ============

interface PausedRecordingData {
  id: string;
  blob: Blob;
  duration: number;
  teamId: number;
  teamName: string;
  date: string;
  pausedAt: string;
  mimeType: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function savePausedRecordingToDB(data: PausedRecordingData): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // localStorage에 상태 정보 저장 (메타데이터만)
      const stateInfo = {
        id: data.id,
        duration: data.duration,
        teamId: data.teamId,
        teamName: data.teamName,
        date: data.date,
        pausedAt: data.pausedAt,
        mimeType: data.mimeType,
      };
      localStorage.setItem(PAUSED_STATE_KEY, JSON.stringify(stateInfo));
      resolve();
    };

    transaction.oncomplete = () => db.close();
  });
}

async function loadPausedRecordingFromDB(id: string): Promise<PausedRecordingData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Failed to load paused recording from DB:', error);
    return null;
  }
}

async function deletePausedRecordingFromDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        localStorage.removeItem(PAUSED_STATE_KEY);
        resolve();
      };

      transaction.oncomplete = () => db.close();
    });
  } catch (error) {
    console.error('Failed to delete paused recording from DB:', error);
  }
}

function getPausedStateFromLocalStorage(): Omit<PausedRecordingData, 'blob'> | null {
  try {
    const data = localStorage.getItem(PAUSED_STATE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to parse paused state:', error);
  }
  return null;
}

// ============ Types ============

interface RecordingStartInfo {
  teamId: number;
  teamName: string;
  date: string;
}

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'saving' | 'success' | 'error';

interface RecordingState {
  status: RecordingStatus;
  startedFrom: RecordingStartInfo | null;
  duration: number;
  saveError: string | null;
  // 일시정지 상태 정보
  pausedInfo: {
    id: string;
    duration: number;
    teamId: number;
    teamName: string;
    date: string;
    pausedAt: string;
  } | null;
}

// 마지막으로 저장된 녹음 정보 (TBMChecklist에서 감지용)
interface LastSavedRecording {
  teamId: number;
  date: string;
  recording: AudioRecordingData;
  savedAt: number;
}

interface RecordingContextValue {
  state: RecordingState;
  startRecording: (teamId: number, teamName: string, date: string) => Promise<boolean>;
  pauseRecording: () => Promise<void>;
  resumeRecording: () => Promise<boolean>;
  saveRecording: () => Promise<AudioRecordingData | null>;
  discardRecording: () => Promise<void>;
  setCurrentTbmInfo: (info: { teamId: number; teamName: string; date: string } | null) => void;
  currentTbmInfo: { teamId: number; teamName: string; date: string } | null;
  canStartRecording: boolean;
  lastSavedRecording: LastSavedRecording | null;
  clearLastSavedRecording: () => void;
  // Legacy compatibility
  stopRecording: () => Promise<AudioRecordingData | null>;
  cancelRecording: () => void;
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
    status: 'idle',
    startedFrom: null,
    duration: 0,
    saveError: null,
    pausedInfo: null,
  });

  // TBM 페이지에서 현재 선택된 팀 정보
  const [currentTbmInfo, setCurrentTbmInfo] = useState<{ teamId: number; teamName: string; date: string } | null>(null);

  // 마지막으로 저장된 녹음 정보 (TBMChecklist에서 감지용)
  const [lastSavedRecording, setLastSavedRecording] = useState<LastSavedRecording | null>(null);

  const clearLastSavedRecording = useCallback(() => {
    setLastSavedRecording(null);
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<number>(0);
  const mimeTypeRef = useRef<string>('audio/webm');
  const saveStatusTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 녹음 시작 가능 여부 체크
  const canStartRecording = state.status === 'idle' && currentTbmInfo !== null;

  // 앱 시작 시 일시정지된 녹음 확인
  useEffect(() => {
    const checkPausedRecording = async () => {
      const pausedState = getPausedStateFromLocalStorage();
      if (pausedState) {
        // IndexedDB에서 실제 blob 존재 확인
        const data = await loadPausedRecordingFromDB(pausedState.id);
        if (data) {
          setState({
            status: 'paused',
            startedFrom: {
              teamId: pausedState.teamId,
              teamName: pausedState.teamName,
              date: pausedState.date,
            },
            duration: pausedState.duration,
            saveError: null,
            pausedInfo: {
              id: pausedState.id,
              duration: pausedState.duration,
              teamId: pausedState.teamId,
              teamName: pausedState.teamName,
              date: pausedState.date,
              pausedAt: pausedState.pausedAt,
            },
          });
          durationRef.current = pausedState.duration;
          console.log('[Recording] 일시정지된 녹음 복원:', pausedState);
        } else {
          // DB에 없으면 localStorage도 정리
          localStorage.removeItem(PAUSED_STATE_KEY);
        }
      }
    };

    checkPausedRecording();
  }, []);

  // 페이지 이동/새로고침 시 경고 (녹음 중일 때만)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.status === 'recording') {
        e.preventDefault();
        e.returnValue = '녹음이 진행 중입니다. 페이지를 나가면 현재 세션이 일시정지됩니다.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.status]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
      // 녹음 중이면 자동 일시정지 (blob 저장)
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 녹음 시작
  const startRecording = useCallback(async (teamId: number, teamName: string, date: string): Promise<boolean> => {
    try {
      // 이전 일시정지 녹음이 있으면 먼저 정리
      if (state.pausedInfo) {
        await deletePausedRecordingFromDB(state.pausedInfo.id);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      mimeTypeRef.current = mimeType;

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
        status: 'recording',
        startedFrom: { teamId, teamName, date },
        duration: 0,
        saveError: null,
        pausedInfo: null,
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
      toast({ title: '마이크 접근 권한이 필요합니다.', variant: 'destructive' });
      return false;
    }
  }, [state.pausedInfo]);

  // 일시정지 (저장하지 않고 멈춤)
  const pauseRecording = useCallback(async (): Promise<void> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
        resolve();
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
          const mimeType = mimeTypeRef.current;
          const blob = new Blob(audioChunksRef.current, { type: mimeType });

          // 스트림 정리
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          // IndexedDB에 저장
          const pausedId = `paused_${Date.now()}`;
          if (startInfo) {
            await savePausedRecordingToDB({
              id: pausedId,
              blob,
              duration: finalDuration,
              teamId: startInfo.teamId,
              teamName: startInfo.teamName,
              date: startInfo.date,
              pausedAt: new Date().toISOString(),
              mimeType,
            });

            setState({
              status: 'paused',
              startedFrom: startInfo,
              duration: finalDuration,
              saveError: null,
              pausedInfo: {
                id: pausedId,
                duration: finalDuration,
                teamId: startInfo.teamId,
                teamName: startInfo.teamName,
                date: startInfo.date,
                pausedAt: new Date().toISOString(),
              },
            });

            console.log('[Recording] 녹음 일시정지됨:', { pausedId, duration: finalDuration });
          }

          resolve();
        } catch (error) {
          console.error('녹음 일시정지 저장 실패:', error);
          resolve();
        }
      };

      mediaRecorderRef.current.stop();
    });
  }, [state.startedFrom]);

  // 재개 (새 녹음 세션 시작 후 기존 녹음과 병합)
  const resumeRecording = useCallback(async (): Promise<boolean> => {
    if (!state.pausedInfo || state.status !== 'paused') {
      return false;
    }

    try {
      // 기존 일시정지된 녹음 로드
      const pausedData = await loadPausedRecordingFromDB(state.pausedInfo.id);
      if (!pausedData) {
        console.error('일시정지된 녹음을 찾을 수 없습니다.');
        return false;
      }

      // 마이크 스트림 다시 얻기
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pausedData.mimeType || mimeTypeRef.current;
      mimeTypeRef.current = mimeType;

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      // 기존 chunks를 base로 시작
      audioChunksRef.current = [pausedData.blob];
      durationRef.current = pausedData.duration;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);

      setState(prev => ({
        ...prev,
        status: 'recording',
        duration: pausedData.duration,
      }));

      // 타이머 재시작 (이전 duration에서 계속)
      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setState(prev => ({
          ...prev,
          duration: durationRef.current,
        }));
      }, 1000);

      // IndexedDB에서 삭제 (이제 메모리에 있음)
      await deletePausedRecordingFromDB(state.pausedInfo.id);

      console.log('[Recording] 녹음 재개됨, 이전 duration:', pausedData.duration);
      return true;
    } catch (error) {
      console.error('녹음 재개 실패:', error);
      toast({ title: '마이크 접근 권한이 필요합니다.', variant: 'destructive' });
      return false;
    }
  }, [state.pausedInfo, state.status]);

  // 저장 (일시정지 상태에서)
  const saveRecording = useCallback(async (): Promise<AudioRecordingData | null> => {
    // 녹음 중이면 먼저 일시정지
    if (state.status === 'recording') {
      await pauseRecording();
    }

    if (!state.pausedInfo) {
      console.error('저장할 녹음이 없습니다.');
      return null;
    }

    setState(prev => ({
      ...prev,
      status: 'saving',
      saveError: null,
    }));

    try {
      // IndexedDB에서 로드
      const pausedData = await loadPausedRecordingFromDB(state.pausedInfo.id);
      if (!pausedData) {
        throw new Error('녹음 데이터를 찾을 수 없습니다.');
      }

      // 파일 업로드
      const formData = new FormData();
      const fileName = `${pausedData.teamName}_녹음_${pausedData.date}.webm`;
      formData.append('file', pausedData.blob, fileName);

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
        duration: pausedData.duration,
        size: pausedData.blob.size,
        recordedAt: new Date().toISOString(),
      };

      // TBM에 저장
      await saveRecordingToTbm(pausedData.teamId, pausedData.date, recordingData);

      // IndexedDB 정리
      await deletePausedRecordingFromDB(state.pausedInfo.id);

      // 성공 상태
      setState({
        status: 'success',
        startedFrom: null,
        duration: 0,
        saveError: null,
        pausedInfo: null,
      });

      // 5초 후 idle로 리셋
      if (saveStatusTimerRef.current) {
        clearTimeout(saveStatusTimerRef.current);
      }
      saveStatusTimerRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, status: 'idle' }));
      }, 5000);

      console.log('[Recording] 녹음 저장 완료');
      return recordingData;
    } catch (error) {
      console.error('녹음 저장 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.';

      setState(prev => ({
        ...prev,
        status: 'error',
        saveError: errorMessage,
      }));

      return null;
    }
  }, [state.status, state.pausedInfo]);

  // 삭제 (일시정지된 녹음 버리기)
  const discardRecording = useCallback(async (): Promise<void> => {
    // 타이머 정지
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 녹음 중이면 중지
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // IndexedDB 정리
    if (state.pausedInfo) {
      await deletePausedRecordingFromDB(state.pausedInfo.id);
    }

    // 청크 초기화
    audioChunksRef.current = [];
    durationRef.current = 0;

    // 상태 초기화
    setState({
      status: 'idle',
      startedFrom: null,
      duration: 0,
      saveError: null,
      pausedInfo: null,
    });

    console.log('[Recording] 녹음 삭제됨');
  }, [state.pausedInfo]);

  // TBM에 녹음 저장하는 함수
  const saveRecordingToTbm = async (
    teamId: number,
    date: string,
    recordingData: AudioRecordingData
  ) => {
    const pendingKey = `${PENDING_RECORDING_KEY}_${teamId}_${date}`;
    const draftKey = `tbm_draft_${teamId}_${date}`;

    const updateDraftAudioRecording = (recording: AudioRecordingData) => {
      try {
        const draftData = localStorage.getItem(draftKey);
        if (draftData) {
          const parsed = JSON.parse(draftData);
          parsed.data.audioRecording = recording;
          parsed.timestamp = new Date().toISOString();
          localStorage.setItem(draftKey, JSON.stringify(parsed));
          console.log('[RecordingContext] tbm_draft 녹음 업데이트:', draftKey);
        }
      } catch (e) {
        console.error('Failed to update draft with new recording:', e);
      }
    };

    try {
      const checkResponse = await fetch(
        `/api/tbm/check-existing?teamId=${teamId}&date=${date}`,
        { credentials: 'include' }
      );
      const checkData = await checkResponse.json();

      if (checkData.exists && checkData.report) {
        const response = await fetch(`/api/tbm/${checkData.report.id}/audio`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ audioRecording: recordingData }),
        });

        if (!response.ok) {
          throw new Error('녹음 저장 실패');
        }

        localStorage.removeItem(pendingKey);
        updateDraftAudioRecording(recordingData);

        setLastSavedRecording({
          teamId,
          date,
          recording: recordingData,
          savedAt: Date.now(),
        });
      } else {
        localStorage.setItem(pendingKey, JSON.stringify(recordingData));
        console.log('TBM이 없어 로컬에 임시 저장:', pendingKey);
        updateDraftAudioRecording(recordingData);

        setLastSavedRecording({
          teamId,
          date,
          recording: recordingData,
          savedAt: Date.now(),
        });
      }
    } catch (error) {
      console.error('TBM 녹음 저장 실패 (로컬 백업 시도):', error);
      try {
        localStorage.setItem(pendingKey, JSON.stringify(recordingData));
        updateDraftAudioRecording(recordingData);
        console.log('TBM 저장 실패했지만 로컬에 백업 완료:', pendingKey);
      } catch (localStorageError) {
        console.error('로컬 백업도 실패:', localStorageError);
        throw error;
      }
    }
  };

  // Legacy: stopRecording (pauseRecording + saveRecording)
  const stopRecording = useCallback(async (): Promise<AudioRecordingData | null> => {
    await pauseRecording();
    return saveRecording();
  }, [pauseRecording, saveRecording]);

  // Legacy: cancelRecording
  const cancelRecording = useCallback(() => {
    discardRecording();
  }, [discardRecording]);

  return (
    <RecordingContext.Provider
      value={{
        state,
        startRecording,
        pauseRecording,
        resumeRecording,
        saveRecording,
        discardRecording,
        setCurrentTbmInfo,
        currentTbmInfo,
        canStartRecording,
        lastSavedRecording,
        clearLastSavedRecording,
        // Legacy
        stopRecording,
        cancelRecording,
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
