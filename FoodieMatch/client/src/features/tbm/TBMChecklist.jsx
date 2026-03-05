import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from './apiConfig';
import { useAuth } from '@/context/AuthContext';
import { useRecording, getPendingRecording, clearPendingRecording } from '@/context/RecordingContext';
import { useTbmNavigation } from '@/context/TbmNavigationContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Terminal, Camera, X, Mic, FileText, Loader2, Edit3, ImageIcon, CalendarOff, Save } from "lucide-react";
import { SignatureDialog } from '@/components/SignatureDialog';
import { stripSiteSuffix, sortTeams } from '@/lib/utils';
import { getDepartments, getDepartmentForTeam } from '@/lib/teamDepartments';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLocation } from 'wouter';
import { CheckCircle2 } from 'lucide-react';
import { FileDropzone } from '@/components/FileDropzone';
import { TBMChecklistSkeleton } from '@/components/skeletons/TBMChecklistSkeleton';
import { InlineAudioPanel } from '@/components/InlineAudioPanel';
import { IssueDetailModal } from '@/components/IssueDetailModal';
import { format } from 'date-fns';

const TBMChecklist = ({ reportForEdit, onFinishEditing, date, site }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { setCurrentTbmInfo, lastSavedRecording, clearLastSavedRecording, state: recordingState } = useRecording();
  const { registerSafeNavigate, unregisterSafeNavigate } = useTbmNavigation();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [teams, setTeams] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [formState, setFormState] = useState({});
  const [signatures, setSignatures] = useState({});
  const [absentUsers, setAbsentUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSigDialogOpen, setIsSigDialogOpen] = useState(false);
  const [signingUser, setSigningUser] = useState(null);
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [remarksImages, setRemarksImages] = useState([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [existingReport, setExistingReport] = useState(null);

  // TBM 모드 상태 머신 (loading → view/edit/draft/new/other-team)
  // 'loading': API 체크 중
  // 'view': 기존 TBM 조회 모드
  // 'edit': 기존 TBM 수정 모드
  // 'draft': 임시저장 복원 모드
  // 'new': 새 작성 모드
  // 'other-team': 다른 팀 조회 (읽기 전용)
  const [mode, setMode] = useState('loading');

  // 기존 boolean들을 mode에서 파생 (하위 호환성)
  const isViewMode = mode === 'view' || mode === 'other-team';
  const isDraftViewMode = mode === 'draft';
  const apiCheckComplete = mode !== 'loading';

  // 음성 녹음 관련 state
  const [audioRecording, setAudioRecording] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  // 이슈 상세 입력 모달 state
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedIssueItem, setSelectedIssueItem] = useState(null);
  // 공휴일/휴무일 관련 state
  const [holidayInfo, setHolidayInfo] = useState(null);
  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false);
  // 사진 업로드 중 상태
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  // 다른 사이트 복사 관련 state (김동현 차장 전용)
  const [otherSiteTeam, setOtherSiteTeam] = useState(null);
  const [isCopyingToOtherSite, setIsCopyingToOtherSite] = useState(false);
  const [lastSubmittedReportId, setLastSubmittedReportId] = useState(null);
  // 팀별 draft 캐시 (메모리) - 팀 전환 시 작성 중인 내용 유지
  const [teamDrafts, setTeamDrafts] = useState({});
  // 페이지 이탈 시 자동 임시저장 중 상태
  const [isAutoSavingOnLeave, setIsAutoSavingOnLeave] = useState(false);
  // (mode에서 파생됨 - apiCheckComplete, isDraftViewMode)
  // 작성자 선택 (기본: 로그인 사용자)
  const [selectedAuthorId, setSelectedAuthorId] = useState(null);
  // 직접입력 모드
  const [isManualAuthor, setIsManualAuthor] = useState(false);
  const [manualAuthorName, setManualAuthorName] = useState('');
  // 열처리팀 교대근무 (주간/야간)
  const [shift, setShift] = useState(null); // 'day' | 'night'

  // 녹음 삭제 상태 추적 - pending 복원 방지용
  const audioDeletedRef = useRef(false);
  // audioRecording 현재값 참조 (useEffect 의존성 제거용)
  const audioRecordingRef = useRef(audioRecording);
  useEffect(() => { audioRecordingRef.current = audioRecording; }, [audioRecording]);

  // DB 웜업 (Neon 콜드스타트 방지 — 페이지 진입 시 DB 깨우기)
  useEffect(() => {
    apiClient.get('/api/db/warmup').catch(() => {});
  }, []);

  // 관리자 여부 (ADMIN / SAFETY_TEAM은 모든 팀 수정 가능)
  const isPrivilegedUser = user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM';

  // 자기 팀인지 확인 (수정 권한 체크용)
  const isOwnTeam = useMemo(() => {
    if (!selectedTeam || !user) return false;
    // ADMIN / SAFETY_TEAM은 모든 팀에 대해 수정 가능
    if (isPrivilegedUser) return true;
    // 자신이 리더인 팀
    const selectedTeamData = teams.find(t => t.id === selectedTeam);
    if (selectedTeamData?.leaderId === user.id) return true;
    // 자신이 소속된 팀
    if (user.teamId === selectedTeam) return true;
    return false;
  }, [selectedTeam, user, teams, isPrivilegedUser]);

  // 다른 팀 조회 모드 (읽기 전용)
  const isOtherTeamView = selectedTeam && !isOwnTeam;

  // 열처리팀 여부 확인 (교대근무 주간/야간 선택 표시용)
  const isHeatTreatmentTeam = useMemo(() => {
    if (!selectedTeam) return false;
    const selectedTeamData = teams.find(t => t.id === selectedTeam);
    if (!selectedTeamData) return false;
    const teamName = stripSiteSuffix(selectedTeamData.name);
    return teamName.includes('열처리');
  }, [selectedTeam, teams]);

  // 열처리 조별 멤버 매핑 (기타 기본값 설정용)
  // 1조: 이상현, 이덕표 / 2조: 유자현, 안태영 / 3조: 심윤근, 원정환
  const heatTreatmentActiveMembers = useMemo(() => {
    if (!isHeatTreatmentTeam || !selectedTeam) return null;
    const selectedTeamData = teams.find(t => t.id === selectedTeam);
    if (!selectedTeamData) return null;
    const teamName = stripSiteSuffix(selectedTeamData.name);

    const teamMemberMap = {
      '1조': ['이상현', '이덕표'],
      '2조': ['유자현', '안태영'],
      '3조': ['심윤근', '원정환'],
    };

    for (const [jo, members] of Object.entries(teamMemberMap)) {
      if (teamName.includes(jo)) return members;
    }
    return null;
  }, [isHeatTreatmentTeam, selectedTeam, teams]);

  // 녹음 중/일시정지 상태 확인 (팀 변경 잠금용)
  const isRecordingActive = recordingState.status === 'recording' || recordingState.status === 'paused' || recordingState.status === 'saving';

  // 실제 의미 있는 데이터가 있는지 확인 (임시저장 조건)
  const hasActualData = React.useMemo(() => {
    // 체크리스트 항목에 실제 입력이 있는지 확인 (빈 객체가 아닌 실제 값)
    const hasFormData = Object.values(formState).some(item =>
      item.checkState ||
      (item.description && item.description.trim()) ||
      (item.actionTaken && item.actionTaken.trim()) ||
      (item.attachments && item.attachments.length > 0)
    );
    // 서명이 있는지 확인
    const hasSignatures = Object.keys(signatures).length > 0;
    // 비고란에 내용이 있는지 확인
    const hasRemarks = remarks.trim().length > 0;
    // 비고란 이미지가 있는지 확인
    const hasImages = remarksImages.length > 0;
    // 녹음이 있는지 확인
    const hasAudio = !!audioRecording;

    return hasFormData || hasSignatures || hasRemarks || hasImages || hasAudio;
  }, [formState, signatures, remarks, remarksImages, audioRecording]);

  // 변경사항 감지 - 폼에 입력된 내용이 있는지 확인 (페이지 이탈 경고용)
  const hasUnsavedChanges = React.useMemo(() => {
    // 뷰 모드, 임시저장 조회 모드, 다른 팀 조회 모드면 변경사항 없음으로 처리
    // loading 중에도 변경사항 감지 (데이터 손실 방지)
    if (isViewMode || isDraftViewMode || isOtherTeamView) return false;

    return hasActualData;
  }, [hasActualData, isViewMode, isDraftViewMode, isOtherTeamView]);

  // 작성자 본인 또는 ADMIN만 수정 가능 여부 판별
  const canEditReport = React.useMemo(() => {
    if (user?.role === 'ADMIN') return true;
    const report = reportForEdit || existingReport;
    if (!report?.reportDetails?.length) return true; // 작성자 정보 없으면 허용
    const originalAuthorId = report.reportDetails[0]?.authorId;
    if (!originalAuthorId) return true;
    return originalAuthorId === user?.id;
  }, [user, reportForEdit, existingReport]);

  // 작성자 선택 가능한 사용자 목록 (시스템 사용자 + 계정 없는 팀원)
  const authorOptions = useMemo(() => {
    const all = user ? [...teamUsers, user] : [...teamUsers];
    return all.filter((u, i, self) => i === self.findIndex(t => t.id === u.id));
  }, [teamUsers, user]);

  // 선택된 작성자 정보
  const selectedAuthor = useMemo(() => {
    if (isManualAuthor) {
      return { id: null, name: manualAuthorName || '' };
    }
    if (selectedAuthorId) {
      return authorOptions.find(u => u.id === selectedAuthorId) || user;
    }
    return user;
  }, [selectedAuthorId, isManualAuthor, manualAuthorName, authorOptions, user]);

  // 폼 상태 초기화 함수 (중복 코드 통합)
  const clearFormState = useCallback(() => {
    setFormState({});
    setSignatures({});
    setAbsentUsers({});
    setRemarks('');
    setRemarksImages([]);
    setAudioRecording(null);
    setTranscription(null);
    setExistingReport(null);
    audioDeletedRef.current = false;
  }, []);

  // 저장하지 않은 변경사항 경고 훅
  const {
    showDialog: showUnsavedDialog,
    confirmNavigation,
    cancelNavigation,
    resetChanges,
    safeNavigate,
  } = useUnsavedChanges({
    hasChanges: hasUnsavedChanges,
    disabled: isViewMode || isDraftViewMode || isOtherTeamView,
  });

  // TBM 네비게이션 가드: safeNavigate를 전역 Context에 등록
  useEffect(() => {
    registerSafeNavigate(safeNavigate);
    return () => unregisterSafeNavigate();
  }, [safeNavigate, registerSafeNavigate, unregisterSafeNavigate]);

  useEffect(() => {
    if (!site) return;

    // 사이트 변경 시 초기화 (reportForEdit가 아닌 경우)
    if (!reportForEdit) {
      setSelectedDepartment(null);
      setSelectedTeam(null);
    }

    apiClient.get(`/api/teams?site=${site}`).then(res => {
      setTeams(res.data);

      // 수정 모드: reportForEdit 팀 선택
      if (reportForEdit) {
        const editTeam = res.data.find(t => t.id === reportForEdit.teamId);
        if (editTeam) {
          const dept = getDepartmentForTeam(site, stripSiteSuffix(editTeam.name));
          if (dept) setSelectedDepartment(dept);
        }
        setSelectedTeam(reportForEdit.teamId);
        return;
      }

      // 사용자 팀 자동 선택 (user 로드 확인) + 부서도 자동 선택
      // 사이트 변경 시에도 사용자 팀 기반으로 부서/팀 자동 설정
      let autoSelected = false;
      if (user?.teamId) {
        const userTeam = res.data.find(t => t.id === user.teamId);
        if (userTeam) {
          const dept = getDepartmentForTeam(site, stripSiteSuffix(userTeam.name));
          if (dept) {
            setSelectedDepartment(dept);
            setSelectedTeam(user.teamId);
            autoSelected = true;
            console.log(`[TBM] 자동 선택: 부서=${dept}, 팀=${stripSiteSuffix(userTeam.name)}`);
          } else {
            console.warn(`[TBM] 부서 매핑 실패: site=${site}, team=${userTeam.name}`);
          }
        }
      }
      // teamId로 못 찾으면 leaderId로 해당 사이트의 팀 자동 선택
      if (!autoSelected && user?.id) {
        const leaderTeam = res.data.find(t => t.leaderId === user.id);
        if (leaderTeam) {
          const dept = getDepartmentForTeam(site, stripSiteSuffix(leaderTeam.name));
          if (dept) {
            setSelectedDepartment(dept);
            setSelectedTeam(leaderTeam.id);
            console.log(`[TBM] 리더 팀 자동 선택: 부서=${dept}, 팀=${stripSiteSuffix(leaderTeam.name)}`);
          }
        }
      }
    });
  }, [user, site, reportForEdit]);

  // 날짜가 변경되면 공휴일 여부 체크
  useEffect(() => {
    if (date) {
      const d = new Date(date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      apiClient.get(`/api/holidays/check?date=${dateStr}${site ? `&site=${site}` : ''}`)
        .then(res => {
          setHolidayInfo(res.data);
        })
        .catch(err => {
          console.error('Failed to check holiday:', err);
          setHolidayInfo(null);
        });
    } else {
      setHolidayInfo(null);
    }
  }, [date, site]);

  // 선택된 팀 정보를 RecordingContext에 업데이트
  // 'new' 또는 'edit' 모드에서만 녹음 가능
  useEffect(() => {
    const canRecord = (mode === 'new' || mode === 'edit') && selectedTeam && date;

    if (canRecord) {
      const selectedTeamData = teams.find(t => t.id === selectedTeam);
      if (selectedTeamData) {
        const d = new Date(date);
        const dateStr = format(d, 'yyyy-MM-dd');
        setCurrentTbmInfo({
          teamId: selectedTeam,
          teamName: stripSiteSuffix(selectedTeamData.name),
          date: dateStr,
        });
      }
    } else {
      setCurrentTbmInfo(null);
    }
  }, [mode, selectedTeam, date, teams, setCurrentTbmInfo]);

  // (팀/날짜 변경 시 삭제 플래그 리셋은 통합 초기화에서 처리)

  // 열처리팀 선택 시 시간 기반으로 주간/야간 자동 설정
  useEffect(() => {
    // 새 작성 또는 수정 모드에서만 자동 설정
    if (isHeatTreatmentTeam && (mode === 'new' || mode === 'edit')) {
      const currentHour = new Date().getHours();
      // 00:00~12:00 → 주간, 12:00~24:00 → 야간
      const autoShift = currentHour < 12 ? 'day' : 'night';
      setShift(autoShift);
    } else if (!isHeatTreatmentTeam) {
      setShift(null);
    }
  }, [isHeatTreatmentTeam, mode]);

  // 열처리팀: 해당 조 멤버 외 나머지는 기본 "기타" 설정
  // 최영삼은 주간+평일에만 출근, 야간/주말/공휴일에는 기타
  useEffect(() => {
    if (!isHeatTreatmentTeam || !heatTreatmentActiveMembers) return;
    if (mode !== 'new') return; // 새 작성 시에만 기본값 적용
    if (!teamUsers.length) return;

    const isNightOrNonWorkday = shift === 'night' || holidayInfo?.isNonWorkday;

    // 이 조의 활성 멤버 목록 (최영삼은 주간+평일만)
    const activeNames = new Set(heatTreatmentActiveMembers);
    if (!isNightOrNonWorkday) {
      activeNames.add('최영삼'); // 주간 + 평일: 최영삼 출근
    }

    // 활성 멤버가 아닌 사람은 기타로 기본 설정
    const defaultAbsent = {};
    const allWorkers = [...teamUsers, user].filter(Boolean);
    allWorkers.forEach(worker => {
      if (worker?.name && !activeNames.has(worker.name)) {
        defaultAbsent[worker.id] = '기타';
      }
    });

    setAbsentUsers(prev => {
      // 활성 멤버: 이전에 자동 설정된 기타 해제
      const updated = { ...prev };
      allWorkers.forEach(worker => {
        if (worker?.name && activeNames.has(worker.name) && updated[worker.id] === '기타') {
          delete updated[worker.id];
        }
      });
      // 비활성 멤버: 기타 기본값 설정 (사용자가 이미 다른 값으로 변경한 경우 유지)
      Object.entries(defaultAbsent).forEach(([id, val]) => {
        if (!updated[id]) {
          updated[id] = val;
        }
      });
      return updated;
    });
  }, [isHeatTreatmentTeam, heatTreatmentActiveMembers, shift, holidayInfo?.isNonWorkday, teamUsers, mode]);

  // 새 작성 모드에서만 임시 저장된 녹음 복원 (mode가 'new'일 때만)
  useEffect(() => {
    // mode가 'new'가 아니면 복원하지 않음 (API 체크 완료 후에만 실행)
    if (mode !== 'new' || !selectedTeam || !date) return;
    // 사용자가 명시적으로 삭제한 경우 복원 안 함
    if (audioDeletedRef.current) return;

    const d = new Date(date);
    const dateStr = format(d, 'yyyy-MM-dd');
    const pending = getPendingRecording(selectedTeam, dateStr);
    // audioRecordingRef 사용하여 의존성 배열에서 제거 (무한 루프 방지)
    if (pending && !audioRecordingRef.current) {
      setAudioRecording(pending);
      toast({
        title: "녹음 불러옴",
        description: "이전에 녹음한 내용이 적용되었습니다.",
      });
    }
  }, [mode, selectedTeam, date, toast]); // audioRecording 의존성 제거

  // RecordingContext에서 새 녹음이 저장되면 자동으로 audioRecording 업데이트
  useEffect(() => {
    if (lastSavedRecording && selectedTeam && date) {
      const d = new Date(date);
      const dateStr = format(d, 'yyyy-MM-dd');

      // 현재 선택된 팀/날짜와 일치하는 경우에만 업데이트
      if (lastSavedRecording.teamId === selectedTeam && lastSavedRecording.date === dateStr) {
        setAudioRecording(lastSavedRecording.recording);
        clearLastSavedRecording();
        toast({
          title: "녹음 저장됨",
          description: "새 녹음이 TBM에 저장되었습니다.",
        });
      }
    }
  }, [lastSavedRecording, selectedTeam, date, clearLastSavedRecording, toast]);

  // 팀/날짜 변경 시 모드 및 폼 초기화 (통합 초기화)
  // reportForEdit가 있으면 수정 모드 초기화를 reportForEdit useEffect에서 처리하므로 건너뜀
  useEffect(() => {
    if (reportForEdit) return;
    // 상태 머신을 loading으로 전환
    setMode('loading');
    // 이전 날짜/팀의 데이터가 넘어오지 않도록 즉시 초기화
    clearFormState();
  }, [selectedTeam, date, clearFormState, reportForEdit]);

  // 날짜 변경 시 팀별 메모리 캐시 초기화 (다른 날짜로 녹음 데이터가 넘어가는 것 방지)
  useEffect(() => {
    setTeamDrafts({});
  }, [date]);

  // 팀과 날짜가 선택되면 기존 TBM이 있는지 확인 → 모드 결정
  useEffect(() => {
    if (!selectedTeam || !date) {
      // 팀/날짜 미선택 시 loading 상태 유지
      return;
    }

    // reportForEdit가 있으면 별도 처리 (아래 useEffect에서)
    if (reportForEdit) {
      return;
    }

    // draft/edit 모드가 이미 설정되었으면 API로 덮어쓰기 방지
    if (mode === 'draft' || mode === 'edit') {
      return;
    }

    // 로컬 시간대 기준 날짜 문자열 생성
    const d = new Date(date);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    // AbortController로 이전 API 요청 취소 (race condition 방지)
    const abortController = new AbortController();

    apiClient.get(`/api/tbm/check-existing?teamId=${selectedTeam}&date=${dateStr}`, {
      signal: abortController.signal
    })
      .then(res => {
        if (res.data.exists && res.data.report) {
          // 기존 TBM 있음 → 조회 모드 (또는 다른 팀이면 other-team)
          setExistingReport(res.data.report);
          setMode(isOwnTeam ? 'view' : 'other-team');
          initializeFormFromReport(res.data.report);

          // 서버에 저장된 TBM이 있으면 localStorage 임시저장 삭제
          const draftKey = `tbm_draft_${selectedTeam}_${dateStr}`;
          localStorage.removeItem(draftKey);
          console.log('[TBM] 기존 TBM 발견, localStorage draft 삭제:', draftKey);

          // pending 녹음도 삭제 (서버에 저장된 녹음이 우선)
          clearPendingRecording(selectedTeam, dateStr);

          toast({
            title: "기존 TBM 발견",
            description: "해당 날짜에 이미 작성된 TBM이 있어 조회 모드로 표시합니다.",
          });
        } else {
          // 기존 TBM 없음 → 새 작성 모드 (또는 다른 팀이면 other-team)
          setExistingReport(null);
          setMode(isOwnTeam ? 'new' : 'other-team');
          // 폼은 이미 초기화 useEffect에서 처리됨
        }
      })
      .catch(err => {
        // AbortError는 정상적인 취소이므로 무시
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          console.log('[TBM] API 요청 취소됨 (팀/날짜 변경)');
          return;
        }
        console.error('Failed to check existing TBM:', err);
        // 에러 시에도 새 작성 모드로 전환
        setMode(isOwnTeam ? 'new' : 'other-team');
      });

    // cleanup: 팀/날짜 변경 시 이전 API 요청 취소
    return () => abortController.abort();
  }, [selectedTeam, date, reportForEdit, isOwnTeam, mode, toast]);

  // 리포트 데이터로 폼 초기화하는 함수
  const initializeFormFromReport = (report) => {
    const initialFormState = {};
    report.reportDetails.forEach(detail => {
      initialFormState[detail.itemId] = {
        checkState: detail.checkState,
        description: detail.actionDescription,
        actionTaken: detail.actionTaken,
        attachments: detail.attachments ? detail.attachments.map(att => ({
          url: att.url,
          name: att.name,
          size: att.size || 0,
          type: att.type || 'image'
        })) : []
      };
    });
    setFormState(initialFormState);

    const initialSignatures = {};
    report.reportSignatures.forEach(sig => {
      if (sig.signatureImage) {
        const key = sig.userId || `member-${sig.memberId}`;
        initialSignatures[key] = sig.signatureImage;
      }
    });
    setSignatures(initialSignatures);

    if (report.remarks) {
      try {
        const remarksData = JSON.parse(report.remarks);
        setRemarks(remarksData.text || '');
        setRemarksImages(remarksData.images || []);
        // 음성 녹음 데이터 로드
        if (remarksData.audioRecording) {
          setAudioRecording(remarksData.audioRecording);
        }
        if (remarksData.transcription) {
          setTranscription(remarksData.transcription);
        }
        // 참석자 상태 복원 (연차, 출장 등)
        if (remarksData.absentUsersData) {
          setAbsentUsers(remarksData.absentUsersData);
        } else if (remarksData.absenceInfo && remarksData.absenceInfo !== '결근자 없음') {
          // Legacy: absenceInfo 문자열에서 복원 시도 (이전 저장 데이터 호환)
          const restored = {};
          remarksData.absenceInfo.split(' / ').forEach(part => {
            const colonIdx = part.indexOf(': ');
            if (colonIdx > 0) {
              const type = part.substring(0, colonIdx);
              const names = part.substring(colonIdx + 2).split(', ');
              names.forEach(name => {
                const matchedUser = teamUsers.find(u => u.name === name);
                if (matchedUser) {
                  restored[matchedUser.id] = type;
                }
              });
            }
          });
          if (Object.keys(restored).length > 0) {
            setAbsentUsers(restored);
          }
        }
      } catch {
        setRemarks(report.remarks);
        setRemarksImages([]);
      }
    }
  };

  // reportForEdit가 전달되면 수정 모드로 진입
  useEffect(() => {
    if (reportForEdit) {
      initializeFormFromReport(reportForEdit);
      setExistingReport(reportForEdit);
      setMode('edit');
    }
  }, [reportForEdit]);

  useEffect(() => {
    if (selectedTeam) {
      setLoading(true);
      setError(null);
      const templatePromise = apiClient.get(`/api/teams/${selectedTeam}/template`);
      const usersPromise = apiClient.get(`/api/teams/${selectedTeam}/users`);
      const teamMembersPromise = apiClient.get(`/api/teams/${selectedTeam}/team-members`);

      Promise.all([templatePromise, usersPromise, teamMembersPromise])
        .then(([templateResponse, usersResponse, teamMembersResponse]) => {
          setChecklist(templateResponse.data);

          // User 계정과 TeamMember를 합침
          const users = usersResponse.data || [];
          const teamMembers = teamMembersResponse.data || [];

          // TeamMember를 User 형식으로 변환하여 합침
          const combinedTeamUsers = [
            ...users,
            ...teamMembers.map(member => ({
              id: `member-${member.id}`, // memberId와 userId 구분
              name: member.name,
              role: 'TEAM_LEADER', // 기본 역할
              isTeamMember: true, // TeamMember 표시
              memberId: member.id // 원본 memberId 보관
            }))
          ];

          setTeamUsers(combinedTeamUsers);
        })
        .catch(err => {
          console.error(`Error fetching data for team ${selectedTeam}:`, err);
          setError(`데이터를 불러오는 중 오류가 발생했습니다.`);
        })
        .finally(() => setLoading(false));
    } else {
      setChecklist(null);
      setTeamUsers([]);
    }
  }, [selectedTeam]);

  // 자동 임시저장 기능 - 로컬 시간대 기준 날짜 키 생성
  const getLocalDateStr = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };
  const autoSaveKey = `tbm_draft_${selectedTeam}_${date ? getLocalDateStr(date) : 'new'}`;
  const {
    clearSaved,
    discardSaved,
    savedTimestamp,
    saveNow,
    hasSavedData,
    wasAutoRestored,
  } = useAutoSave({
    key: autoSaveKey,
    data: {
      formState,
      signatures,
      remarks,
      remarksImages,
      absentUsers,
      audioRecording,
      transcription,
      // 작성자 정보
      selectedAuthorId,
      isManualAuthor,
      manualAuthorName,
    },
    // 새 작성 또는 수정 모드일 때만 자동저장 (mode 기반) + 실제 데이터가 있을 때만
    enabled: !!selectedTeam && !reportForEdit && (mode === 'new' || mode === 'edit') && hasActualData,
    // 자동 복원 모드 사용 (다이얼로그 없이)
    autoRestore: true,
    // 새 작성 모드일 때만 draft 복원
    readyToRestore: mode === 'new' && !existingReport,
    onRestore: (restored) => {
      if (restored.formState) setFormState(restored.formState);
      if (restored.signatures) setSignatures(restored.signatures);
      if (restored.remarks) setRemarks(restored.remarks);
      if (restored.remarksImages) setRemarksImages(restored.remarksImages);
      if (restored.absentUsers) setAbsentUsers(restored.absentUsers);
      // 이미 새 녹음이 있으면 draft 녹음 무시 (race condition 방지)
      if (restored.audioRecording && !audioRecording) setAudioRecording(restored.audioRecording);
      if (restored.transcription && !transcription) setTranscription(restored.transcription);
      // 작성자 정보 복원
      if (restored.selectedAuthorId) setSelectedAuthorId(restored.selectedAuthorId);
      if (restored.isManualAuthor !== undefined) setIsManualAuthor(restored.isManualAuthor);
      if (restored.manualAuthorName) setManualAuthorName(restored.manualAuthorName);
      // 임시저장 데이터 복원 시 draft 조회 모드로 전환
      setMode('draft');
    },
  });

  // 페이지 이탈 시 자동 임시저장 ref (중복 실행 방지)
  const autoSaveInProgressRef = useRef(false);

  // 페이지 이탈 시 자동 임시저장 후 이동
  useEffect(() => {
    if (showUnsavedDialog && !autoSaveInProgressRef.current) {
      autoSaveInProgressRef.current = true;
      setIsAutoSavingOnLeave(true);

      // 저장 실행 후 완료 대기
      const doSaveAndNavigate = async () => {
        const saved = await saveNow();
        if (saved) {
          console.log('[TBM] 임시저장 완료, 페이지 이동');
        } else {
          console.log('[TBM] 임시저장 실패, 그래도 페이지 이동');
        }
        setIsAutoSavingOnLeave(false);
        autoSaveInProgressRef.current = false;
        confirmNavigation();
      };

      // 약간의 딜레이로 UI 표시 후 저장 (cleanup 함수로 메모리 누수 방지)
      const timerId = setTimeout(doSaveAndNavigate, 100);

      return () => {
        clearTimeout(timerId);
        autoSaveInProgressRef.current = false;
      };
    }
  }, [showUnsavedDialog, saveNow, confirmNavigation]);

  const updateFormState = (itemId, field, value) => {
    setFormState(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handlePhotoUpload = async (itemId, files) => {
    if (!files || files.length === 0) return;

    const currentAttachments = formState[itemId]?.attachments || [];
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));

    try {
      const res = await apiClient.post('/api/upload-multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newAttachments = res.data.files.map(f => ({
        url: f.url,
        name: f.name,
        size: f.size,
        type: 'image'
      }));

      updateFormState(itemId, 'attachments', [...currentAttachments, ...newAttachments]);
      toast({ title: `${files.length}개의 사진이 업로드되었습니다.` });
    } catch (err) {
      toast({ title: "사진 업로드 실패", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  };

  const removeAttachment = (itemId, attachmentIndex) => {
    const currentAttachments = formState[itemId]?.attachments || [];
    const updatedAttachments = currentAttachments.filter((_, idx) => idx !== attachmentIndex);
    updateFormState(itemId, 'attachments', updatedAttachments);
  };

  const handleRemarksImageUpload = async (files) => {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));

    setIsUploadingImages(true);
    try {
      const res = await apiClient.post('/api/upload-multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newImages = res.data.files.map(f => f.url);
      setRemarksImages(prev => [...prev, ...newImages]);
      toast({ title: `${files.length}개의 사진이 업로드되었습니다.` });
    } catch (err) {
      toast({ title: "사진 업로드 실패", description: err.response?.data?.message || err.message, variant: "destructive" });
    } finally {
      setIsUploadingImages(false);
    }
  };

  const removeRemarksImage = (imageIndex) => {
    setRemarksImages(prev => prev.filter((_, idx) => idx !== imageIndex));
  };

  // 음성 녹음 완료 핸들러
  const handleAudioRecordingComplete = (data) => {
    setAudioRecording(data);
    toast({ title: "음성이 저장되었습니다.", description: `녹음 시간: ${Math.floor(data.duration / 60)}분 ${Math.floor(data.duration % 60)}초` });
  };

  // 음성 녹음 삭제 핸들러
  const handleAudioDelete = () => {
    setAudioRecording(null);
    setTranscription(null);
    audioDeletedRef.current = true;  // 삭제됨 표시 - pending 복원 방지

    // localStorage pending 녹음도 함께 삭제
    if (selectedTeam && date) {
      const d = new Date(date);
      const dateStr = format(d, 'yyyy-MM-dd');
      clearPendingRecording(selectedTeam, dateStr);
      console.log('[TBM] 녹음 삭제: pending recording 정리 완료');
    }
  };

  // STT 변환 함수
  const handleTranscribe = async () => {
    if (!audioRecording?.url) {
      toast({ title: "음성 파일이 없습니다.", variant: "destructive" });
      return;
    }

    setIsTranscribing(true);
    try {
      // 음성 파일을 Blob으로 가져오기
      const response = await fetch(audioRecording.url);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('audio', blob, audioRecording.name || 'recording.webm');

      const sttResponse = await apiClient.post('/api/stt/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5분 타임아웃
      });

      const transcriptionResult = {
        text: sttResponse.data.text,
        processedAt: new Date().toISOString(),
        status: 'completed'
      };

      setTranscription(transcriptionResult);
      toast({ title: "음성 변환 완료", description: "텍스트로 변환되었습니다." });
    } catch (err) {
      console.error('STT 변환 오류:', err);
      const errorMessage = err.response?.data?.message || err.message || '변환 중 오류가 발생했습니다.';
      setTranscription({
        text: '',
        processedAt: new Date().toISOString(),
        status: 'failed',
        error: errorMessage
      });
      toast({
        title: "음성 변환 실패",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAbsentChange = (userId, absenceType) => {
    setAbsentUsers(prev => {
      if (absenceType === '') {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      }
      return { ...prev, [userId]: absenceType };
    });
    // 전일 결근인 경우에만 서명 삭제 (반차는 서명 가능)
    if (absenceType === '결근') {
      const newSignatures = { ...signatures };
      delete newSignatures[userId];
      setSignatures(newSignatures);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({ title: "로그인이 필요합니다.", variant: "destructive" });
      return;
    }

    // 기존 TBM 수정 시 권한 체크 (새 작성은 통과)
    const reportIdToCheck = reportForEdit?.id || existingReport?.id;
    if (reportIdToCheck && !canEditReport) {
      toast({ title: "권한이 없습니다", description: "본인이 작성한 TBM만 수정할 수 있습니다.", variant: "destructive" });
      return;
    }

    // Validate that all items have been checked
    const validationErrors = [];
    checklist?.templateItems.forEach(item => {
      const itemState = formState[item.id];

      // 모든 항목에 대해 checkState 필수 확인
      if (!itemState || !itemState.checkState || itemState.checkState.trim() === '') {
        validationErrors.push(`"${item.description}" 항목: 점검 결과 선택 필수`);
        return;
      }

      // △ or X items require description
      if (itemState.checkState === '△' || itemState.checkState === 'X') {
        const hasDescription = itemState.description && itemState.description.trim().length > 0;

        if (!hasDescription) {
          validationErrors.push(`"${item.description}" 항목: 비고 입력 필수`);
        }

        // 사진 첨부는 선택사항으로 변경
      }
    });

    // 서명은 선택사항으로 변경 (1인 팀이 전원 연차인 경우 등)
    // const signatureCount = Object.keys(signatures).length;
    // if (signatureCount === 0) {
    //   validationErrors.push('최소 1명 이상의 서명이 필요합니다.');
    // }

    if (validationErrors.length > 0) {
      toast({
        title: "필수 항목 미입력",
        description: validationErrors.join('\n'),
        variant: "destructive"
      });
      return;
    }

    const absentSummary = Object.entries(absentUsers).reduce((acc, [userId, absenceType]) => {
      const userName = teamUsers.find(u => u.id === userId)?.name || '알 수 없음';
      if (!acc[absenceType]) acc[absenceType] = [];
      acc[absenceType].push(userName);
      return acc;
    }, {});

    const remarksText = Object.entries(absentSummary)
      .map(([type, names]) => `${type}: ${names.join(', ')}`)
      .join(' / ');

    // remarks를 JSON 형식으로 저장 (텍스트, 이미지, 결근자 정보, 음성 녹음, STT 변환)
    const remarksData = {
      text: remarks || '',
      images: remarksImages || [],
      absenceInfo: remarksText || '결근자 없음',
      absentUsersData: Object.keys(absentUsers).length > 0 ? absentUsers : null,
      audioRecording: audioRecording || null,
      transcription: transcription || null
    };

    // 로컬 시간대 기준으로 날짜만 추출 (시간대 문제 방지)
    const localDateStr = getLocalDateStr(date || new Date());

    const reportData = {
      teamId: selectedTeam,
      reportDate: localDateStr,
      managerName: selectedAuthor?.name || user?.name || 'N/A',
      remarks: JSON.stringify(remarksData),
      site: site,
      shift: isHeatTreatmentTeam ? shift : undefined,  // 열처리팀만 주간/야간 저장
      results: Object.entries(formState).map(([itemId, data]) => ({
        itemId: parseInt(itemId),
        checkState: data.checkState,
        actionDescription: data.description || null,
        actionTaken: data.actionTaken || null,
        authorId: selectedAuthor?.id || user.id,
        attachments: data.attachments || []
      })),
      signatures: Object.entries(signatures).map(([userId, signatureImage]) => {
        // userId가 'member-'로 시작하면 TeamMember
        const isTeamMember = userId.startsWith('member-');
        if (isTeamMember) {
          const memberId = parseInt(userId.replace('member-', ''));
          return {
            memberId,
            signatureImage
          };
        } else {
          return {
            userId,
            signatureImage
          };
        }
      }),
    };

    setIsSaving(true);
    try {
      console.log('TBM 제출 시작:', {
        reportForEdit: !!reportForEdit,
        teamId: selectedTeam,
        reportDate: date,
        resultsCount: reportData.results.length,
        signaturesCount: reportData.signatures.length
      });

      // 수정 모드인지 확인 (reportForEdit 또는 existingReport가 있는 경우)
      const reportIdToUpdate = reportForEdit?.id || existingReport?.id;

      let newReportId = null;
      if (reportIdToUpdate) {
        await apiClient.put(`/api/tbm/${reportIdToUpdate}`, reportData);
        toast({ title: "TBM 일지가 성공적으로 수정되었습니다." });
        newReportId = reportIdToUpdate;
      } else {
        const response = await apiClient.post('/api/reports', reportData);
        toast({ title: "TBM 일지가 성공적으로 제출되었습니다." });
        // 제출 성공 시 임시저장 데이터 삭제
        clearSaved();
        newReportId = response.data?.id;
      }
      setLastSubmittedReportId(newReportId);

      // seeyou.kim 사용자인 경우 같은 이름의 다른 사이트 팀 확인
      if (user?.username === 'seeyou.kim' && selectedTeam) {
        try {
          const otherSiteRes = await apiClient.get(`/api/teams/${selectedTeam}/same-name-other-site`);
          if (otherSiteRes.data.exists && otherSiteRes.data.team) {
            setOtherSiteTeam(otherSiteRes.data.team);
          } else {
            setOtherSiteTeam(null);
          }
        } catch (err) {
          console.log('다른 사이트 팀 조회 실패 (무시):', err);
          setOtherSiteTeam(null);
        }
      }

      // 제출 성공 후 pending 녹음 삭제 (새 작성/수정 모두 해당)
      if (selectedTeam && date) {
        clearPendingRecording(selectedTeam, getLocalDateStr(date));
      }

      // 제출 성공 시 해당 팀의 draft 캐시도 삭제
      if (selectedTeam) {
        setTeamDrafts(prev => {
          const newDrafts = { ...prev };
          delete newDrafts[selectedTeam];
          return newDrafts;
        });
      }
      queryClient.invalidateQueries({ queryKey: ['monthlyReport'] });
      setShowSuccessDialog(true);
      resetChanges(); // 저장 후 변경사항 리셋 (페이지 이탈 경고 비활성화)
    } catch (err) {
      console.error('TBM 제출 오류:', err);
      console.error('오류 상세:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });

      const errorMessage = err.response?.data?.message || err.message || '제출 중 오류가 발생했습니다.';
      const responseUserTeamId = err.response?.data?.userTeamId;

      // 팀 권한 오류 시 소속 팀으로 자동 전환
      if (responseUserTeamId) {
        const userTeam = teams.find(t => t.id === responseUserTeamId);
        if (userTeam) {
          const dept = getDepartmentForTeam(site, stripSiteSuffix(userTeam.name));
          if (dept) setSelectedDepartment(dept);
          setSelectedTeam(responseUserTeamId);
        }
        toast({
          title: "권한 없음",
          description: "해당 팀의 TBM 작성 권한이 없습니다. 소속 팀으로 이동합니다.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "제출 실패",
          description: errorMessage,
          variant: "destructive"
        });
      }

      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // 다른 사이트로 TBM 복사 (김동현 차장 전용)
  const handleCopyToOtherSite = async () => {
    if (!lastSubmittedReportId || !otherSiteTeam) return;

    setIsCopyingToOtherSite(true);
    try {
      const res = await apiClient.post(`/api/tbm/${lastSubmittedReportId}/copy-to-site`, {
        targetTeamId: otherSiteTeam.id
      });

      toast({
        title: "복사 완료",
        description: `${otherSiteTeam.site}에도 TBM이 제출되었습니다.`,
      });

      // 복사 완료 후 상태 초기화
      setOtherSiteTeam(null);
    } catch (err) {
      console.error('TBM 복사 실패:', err);

      // 이미 존재하는 경우
      if (err.response?.status === 409) {
        toast({
          title: "복사 실패",
          description: `${otherSiteTeam.site}에 해당 날짜의 TBM이 이미 존재합니다.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "복사 실패",
          description: err.response?.data?.message || "TBM 복사 중 오류가 발생했습니다.",
          variant: "destructive"
        });
      }
    } finally {
      setIsCopyingToOtherSite(false);
    }
  };

  // 부서별 팀 필터링 (모든 팀 표시, 자기 팀 상단에)
  const filteredTeams = useMemo(() => {
    if (!selectedDepartment || !teams.length) return [];
    const deptConfig = getDepartments(site).find(d => d.name === selectedDepartment);
    if (!deptConfig) return [];

    const deptTeams = teams.filter(team => {
      const teamName = stripSiteSuffix(team.name);
      return deptConfig.teams.some(t => teamName.includes(t));
    });

    // 모든 팀을 표시하되, 자기 팀을 상단에 정렬
    return deptTeams.sort((a, b) => {
      const aIsOwn = a.id === user?.teamId || a.leaderId === user?.id;
      const bIsOwn = b.id === user?.teamId || b.leaderId === user?.id;
      if (aIsOwn && !bIsOwn) return -1;
      if (!aIsOwn && bIsOwn) return 1;
      return 0;
    });
  }, [selectedDepartment, teams, site, user]);

  // 부서 변경 시 팀 선택 초기화
  const handleDepartmentChange = (dept) => {
    setSelectedDepartment(dept);
    setSelectedTeam(null);
  };

  // 팀 변경 시 현재 팀 데이터 캐싱 (복원은 useEffect에서 처리)
  const handleTeamChange = (newTeamId) => {
    // 다른 팀으로 변경될 때만 캐싱
    if (newTeamId !== selectedTeam && selectedTeam) {
      // 현재 팀 데이터를 캐시에 저장 (작성 중인 내용이 있을 때만)
      if (hasActualData && mode !== 'view' && mode !== 'other-team') {
        setTeamDrafts(prev => ({
          ...prev,
          [selectedTeam]: {
            formState,
            signatures,
            absentUsers,
            remarks,
            remarksImages,
            audioRecording,
            transcription,
          }
        }));
      }
    }

    setSelectedTeam(newTeamId);
    setSelectedAuthorId(null);
    // 복원은 useEffect에서 처리 (초기화 useEffect 이후에 실행되어야 함)
  };

  // 팀 캐시 복원 (mode가 'new'로 전환된 후 실행)
  useEffect(() => {
    // 새 작성 모드일 때만 캐시 복원
    if (mode !== 'new') return;
    if (!selectedTeam || !teamDrafts[selectedTeam]) return;

    const cached = teamDrafts[selectedTeam];
    setFormState(cached.formState || {});
    setSignatures(cached.signatures || {});
    setAbsentUsers(cached.absentUsers || {});
    setRemarks(cached.remarks || '');
    setRemarksImages(cached.remarksImages || []);
    if (cached.audioRecording) setAudioRecording(cached.audioRecording);
    if (cached.transcription) setTranscription(cached.transcription);

    // 캐시에서 복원했으므로 draft 모드로 전환
    setMode('draft');

    // localStorage draft 삭제하여 중복 복원 방지
    if (date) {
      const draftKey = `tbm_draft_${selectedTeam}_${getLocalDateStr(date)}`;
      localStorage.removeItem(draftKey);
      console.log('[TBM] 메모리 캐시에서 복원, localStorage draft 삭제:', draftKey);
    }
  }, [mode, selectedTeam, teamDrafts, date]);

  // 사이트별 부서 목록
  const departments = getDepartments(site);

  return (
    <div className="space-y-6">
      {/* 녹음 중 잠금 알림 */}
      {isRecordingActive && (
        <Alert className="border-red-200 bg-red-50">
          <Mic className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">녹음 진행 중</AlertTitle>
          <AlertDescription className="text-red-700">
            녹음 중에는 팀을 변경할 수 없습니다. 헤더에서 녹음을 저장하거나 삭제한 후 변경하세요.
          </AlertDescription>
        </Alert>
      )}

      {/* 다른 팀 조회 모드 알림 */}
      {isOtherTeamView && (
        <Alert className="border-blue-200 bg-blue-50">
          <Terminal className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">다른 팀 TBM 조회 중</AlertTitle>
          <AlertDescription className="text-blue-700">
            다른 팀의 TBM은 조회만 가능합니다. 수정하려면 본인 팀을 선택하세요.
          </AlertDescription>
        </Alert>
      )}

      {/* 부서/팀 선택 - 모든 사용자에게 표시 */}
      <div className="flex gap-3 items-center flex-wrap">
        {/* 부서 선택 */}
        <Select onValueChange={handleDepartmentChange} value={selectedDepartment || ''} disabled={isRecordingActive}>
          <SelectTrigger className={`w-[150px] ${isRecordingActive ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <SelectValue placeholder="부서 선택" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] overflow-y-auto">
            {departments.map(dept => (
              <SelectItem key={dept.name} value={dept.name}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 팀 선택 */}
        <Select
          onValueChange={handleTeamChange}
          value={selectedTeam || ''}
          disabled={!selectedDepartment || isRecordingActive}
        >
          <SelectTrigger className={`w-[200px] ${isRecordingActive ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <SelectValue placeholder={selectedDepartment ? "팀 선택" : "부서를 먼저 선택하세요"} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] overflow-y-auto">
            {filteredTeams.map(team => (
              <SelectItem key={team.id} value={team.id}>
                {stripSiteSuffix(team.name)}
                {/* 자기 팀 표시 */}
                {(team.leaderId === user?.id || team.id === user?.teamId) && (
                  <span className="ml-2 text-xs text-primary">(내 팀)</span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 현재 선택된 팀이 자기 팀인지 표시 */}
        {selectedTeam && (
          <Badge variant={isOwnTeam ? "default" : "secondary"} className="text-sm">
            {isOwnTeam ? "수정 가능" : "조회 전용"}
          </Badge>
        )}
      </div>

      {error && <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>오류</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

      {/* 공휴일/휴무일 알림 */}
      {holidayInfo?.isNonWorkday && (
        <Alert className="border-amber-200 bg-amber-50">
          <CalendarOff className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">
            {holidayInfo.isHoliday
              ? `🗓️ 오늘은 공휴일입니다: ${holidayInfo.holidayInfo?.name || '휴무일'}`
              : '📅 오늘은 주말입니다'}
          </AlertTitle>
          <AlertDescription className="text-amber-700">
            {holidayInfo.isHoliday
              ? 'TBM 작성이 필요 없는 날입니다. 필요한 경우에만 작성해주세요.'
              : '주말에는 TBM 작성이 필요 없습니다. 필요한 경우에만 작성해주세요.'}
          </AlertDescription>
        </Alert>
      )}

      {/* 기존 TBM 발견 시 알림 */}
      {isViewMode && (existingReport || reportForEdit) && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">기존 TBM 발견</AlertTitle>
          <AlertDescription className="text-blue-700">
            {(() => {
              const report = existingReport || reportForEdit;
              return report?.reportDate
                ? `해당 날짜(${new Date(report.reportDate).toLocaleDateString('ko-KR')})에 이미 작성된 TBM이 있습니다.`
                : '이미 작성된 TBM이 있습니다.';
            })()}
            <span className="font-medium ml-1">조회 모드</span>로 표시 중입니다.
          </AlertDescription>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!canEditReport) {
                  toast({ title: "권한이 없습니다", description: "본인이 작성한 TBM만 수정할 수 있습니다.", variant: "destructive" });
                  return;
                }
                setMode('edit');
              }}
            >
              수정하기
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => safeNavigate('/monthly-report')}
            >
              월별 보고서 보기
            </Button>
          </div>
        </Alert>
      )}

      {/* 임시저장 데이터 발견 시 알림 */}
      {isDraftViewMode && hasSavedData && (
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <Save className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">임시저장 데이터 발견</AlertTitle>
          <AlertDescription className="text-amber-700">
            {savedTimestamp && (
              <span>{new Date(savedTimestamp).toLocaleString('ko-KR')}에 저장된 작성 중인 TBM 데이터가 있습니다. </span>
            )}
            <span className="font-medium">조회 모드</span>로 표시 중입니다.
          </AlertDescription>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={() => {
                setMode('edit');
                toast({
                  title: "수정 모드로 전환",
                  description: "임시저장된 내용을 수정할 수 있습니다.",
                });
              }}
            >
              <Edit3 className="h-4 w-4 mr-1" />
              수정하기
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => {
                if (confirm('임시저장 데이터를 삭제하시겠습니까?')) {
                  discardSaved();
                  setMode('new');
                  clearFormState();
                }
              }}
            >
              삭제하고 새로 작성
            </Button>
          </div>
        </Alert>
      )}

      {loading && <TBMChecklistSkeleton />}

      {!loading && checklist && (
        <>
          <div className="mb-4 flex items-center gap-3">
            <span className="font-semibold text-lg">작성자:</span>
            {isManualAuthor ? (
              <>
                <Input
                  className="w-[180px]"
                  placeholder="이름 입력"
                  value={manualAuthorName}
                  onChange={(e) => setManualAuthorName(e.target.value)}
                  disabled={isViewMode || isDraftViewMode || isOtherTeamView}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsManualAuthor(false); setManualAuthorName(''); }}
                  disabled={isViewMode || isDraftViewMode || isOtherTeamView}
                >
                  목록
                </Button>
              </>
            ) : (
              <Select
                value={selectedAuthorId || user?.id || ''}
                onValueChange={(val) => {
                  if (val === '__manual__') {
                    setIsManualAuthor(true);
                    setSelectedAuthorId(null);
                  } else {
                    setSelectedAuthorId(val);
                  }
                }}
                disabled={isViewMode || isDraftViewMode || isOtherTeamView}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {authorOptions.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}{u.isTeamMember ? ' (팀원)' : ''}
                    </SelectItem>
                  ))}
                  <SelectItem value="__manual__">직접입력</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* 열처리팀 주간/야간 선택 */}
            {isHeatTreatmentTeam && (
              <div className="flex items-center gap-3 ml-6 border-l pl-6">
                <span className="font-semibold">근무:</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={shift === 'day' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShift('day')}
                    disabled={isViewMode || isDraftViewMode || isOtherTeamView}
                  >
                    주간
                  </Button>
                  <Button
                    type="button"
                    variant={shift === 'night' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setShift('night')}
                    disabled={isViewMode || isDraftViewMode || isOtherTeamView}
                  >
                    야간
                  </Button>
                </div>
              </div>
            )}
          </div>
          <h3 className="font-semibold text-xl mt-6">점검항목</h3>

          {/* 데스크톱: 기존 테이블 */}
          <div className="hidden md:block">
            <Table className="border-collapse">
              <TableHeader>
                <TableRow className="border-b-2 border-border">
                  <TableHead className="border-r border-gray-200">구분</TableHead>
                  <TableHead className="border-r border-gray-200">점검항목</TableHead>
                  <TableHead className="text-center border-r border-gray-200">점검결과</TableHead>
                  <TableHead className="text-center">사진/내용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checklist.templateItems
                  .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                  .map((item, index, items) => {
                  const currentItemState = formState[item.id] || {};

                  // 이전 항목과 같은 카테고리인지 확인
                  const prevItem = index > 0 ? items[index - 1] : null;
                  const showCategory = !prevItem || prevItem.category !== item.category;

                  // 다음 항목과 다른 카테고리인지 확인 (마지막 행인지)
                  const nextItem = index < items.length - 1 ? items[index + 1] : null;
                  const isLastInCategory = !nextItem || nextItem.category !== item.category;

                  // 같은 카테고리의 항목 수 계산 (rowSpan용)
                  let rowSpan = 1;
                  if (showCategory) {
                    for (let i = index + 1; i < items.length; i++) {
                      if (items[i].category === item.category) {
                        rowSpan++;
                      } else {
                        break;
                      }
                    }
                  }

                  return (
                    <TableRow
                      key={item.id}
                      className={`
                        border-b border-gray-200
                        ${showCategory && index > 0 ? "border-t-2 border-t-gray-400" : ""}
                        ${isLastInCategory ? "border-b-2 border-b-gray-400" : ""}
                      `}
                    >
                      {showCategory && (
                        <TableCell
                          className="align-top font-medium bg-muted/30 border-r border-gray-200"
                          rowSpan={rowSpan}
                        >
                          {item.category}
                        </TableCell>
                      )}
                      <TableCell className="border-r border-gray-200">{item.description}</TableCell>
                      <TableCell className="border-r border-gray-200">
                        <RadioGroup value={currentItemState.checkState || null} onValueChange={(value) => updateFormState(item.id, 'checkState', value)} className="flex justify-center gap-4" disabled={isViewMode || isDraftViewMode || isOtherTeamView}>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="O" id={`r-${item.id}-o`} disabled={isViewMode || isDraftViewMode || isOtherTeamView} /><Label htmlFor={`r-${item.id}-o`}>O</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="△" id={`r-${item.id}-d`} disabled={isViewMode || isDraftViewMode || isOtherTeamView} /><Label htmlFor={`r-${item.id}-d`}>△</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="X" id={`r-${item.id}-x`} disabled={isViewMode || isDraftViewMode || isOtherTeamView} /><Label htmlFor={`r-${item.id}-x`}>X</Label></div>
                        </RadioGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        {(currentItemState.checkState === '△' || currentItemState.checkState === 'X') ? (
                          <div className="flex flex-col items-center gap-2">
                            {/* 입력 완료 상태 표시 - 설명만 필수, 사진은 선택 */}
                            {currentItemState.description ? (
                              <div className="flex items-center gap-2">
                                {currentItemState.attachments?.length > 0 && (
                                  <div className="flex -space-x-2">
                                    {currentItemState.attachments.slice(0, 3).map((file, idx) => (
                                      <img
                                        key={idx}
                                        src={file.url}
                                        alt=""
                                        className="w-8 h-8 object-cover rounded border-2 border-white cursor-pointer"
                                        onClick={() => setEnlargedImage(file.url)}
                                      />
                                    ))}
                                    {currentItemState.attachments.length > 3 && (
                                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs border-2 border-white">
                                        +{currentItemState.attachments.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  입력완료
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                입력필요
                              </Badge>
                            )}
                            {!isViewMode && !isDraftViewMode && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => {
                                  setSelectedIssueItem({
                                    id: item.id,
                                    category: item.category,
                                    description: item.description,
                                    checkState: currentItemState.checkState
                                  });
                                  setIssueModalOpen(true);
                                }}
                              >
                                <Edit3 className="h-3 w-3" />
                                {currentItemState.description ? '수정' : '입력'}
                              </Button>
                            )}
                          </div>
                        ) : currentItemState.checkState === 'O' ? (
                          <span className="text-green-600 text-sm">양호</span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )}
                )}
              </TableBody>
            </Table>
          </div>

          {/* 모바일: 2줄 카드 레이아웃 */}
          <div className="md:hidden space-y-3">
            {checklist.templateItems
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((item, index, items) => {
              const currentItemState = formState[item.id] || {};
              const prevItem = index > 0 ? items[index - 1] : null;
              const showCategoryHeader = !prevItem || prevItem.category !== item.category;

              return (
                <React.Fragment key={item.id}>
                  {/* 카테고리 헤더 */}
                  {showCategoryHeader && (
                    <div className="bg-primary/10 px-3 py-2 rounded-t-lg font-semibold text-sm text-primary mt-4 first:mt-0">
                      {item.category}
                    </div>
                  )}

                  {/* 점검 항목 카드 */}
                  <div className={`border rounded-lg overflow-hidden ${showCategoryHeader ? 'rounded-t-none border-t-0' : ''}`}>
                    {/* 1줄: 점검항목 */}
                    <div className="px-3 py-2 border-b bg-muted/30">
                      <span className="text-sm font-medium">{item.description}</span>
                    </div>

                    {/* 2줄: O △ X | 사진/내용 */}
                    <div className="flex">
                      {/* 점검결과 (O △ X) */}
                      <div className="w-28 flex-shrink-0 px-2 py-3 border-r flex items-start justify-center">
                        <RadioGroup
                          value={currentItemState.checkState || null}
                          onValueChange={(value) => updateFormState(item.id, 'checkState', value)}
                          className="flex gap-3"
                          disabled={isViewMode || isDraftViewMode || isOtherTeamView}
                        >
                          <div className="flex flex-col items-center">
                            <RadioGroupItem value="O" id={`m-${item.id}-o`} disabled={isViewMode || isDraftViewMode || isOtherTeamView} className="h-6 w-6" />
                            <Label htmlFor={`m-${item.id}-o`} className="text-xs mt-1 text-green-600 font-medium">O</Label>
                          </div>
                          <div className="flex flex-col items-center">
                            <RadioGroupItem value="△" id={`m-${item.id}-d`} disabled={isViewMode || isDraftViewMode || isOtherTeamView} className="h-6 w-6" />
                            <Label htmlFor={`m-${item.id}-d`} className="text-xs mt-1 text-yellow-600 font-medium">△</Label>
                          </div>
                          <div className="flex flex-col items-center">
                            <RadioGroupItem value="X" id={`m-${item.id}-x`} disabled={isViewMode || isDraftViewMode || isOtherTeamView} className="h-6 w-6" />
                            <Label htmlFor={`m-${item.id}-x`} className="text-xs mt-1 text-red-600 font-medium">X</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* 사진/내용 */}
                      <div className="flex-1 px-3 py-2">
                        {(currentItemState.checkState === '△' || currentItemState.checkState === 'X') ? (
                          <div className="flex items-center gap-2">
                            {/* 입력 완료 상태 - 설명만 필수, 사진은 선택 */}
                            {currentItemState.description ? (
                              <div className="flex items-center gap-2 flex-1">
                                {currentItemState.attachments?.length > 0 && (
                                  <div className="flex -space-x-1">
                                    {currentItemState.attachments.slice(0, 2).map((file, idx) => (
                                      <img
                                        key={idx}
                                        src={file.url}
                                        alt=""
                                        className="w-6 h-6 object-cover rounded border border-white"
                                        onClick={() => setEnlargedImage(file.url)}
                                      />
                                    ))}
                                    {currentItemState.attachments.length > 2 && (
                                      <span className="text-xs text-muted-foreground ml-1">+{currentItemState.attachments.length - 2}</span>
                                    )}
                                  </div>
                                )}
                                <span className="text-xs text-green-600">완료</span>
                              </div>
                            ) : (
                              <span className="text-xs text-red-600 flex-1">입력필요</span>
                            )}
                            {!isViewMode && !isDraftViewMode && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setSelectedIssueItem({
                                    id: item.id,
                                    category: item.category,
                                    description: item.description,
                                    checkState: currentItemState.checkState
                                  });
                                  setIssueModalOpen(true);
                                }}
                              >
                                {currentItemState.description ? '수정' : '입력'}
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground py-2">
                            {currentItemState.checkState === 'O' ? (
                              <span className="text-green-600 font-medium">양호</span>
                            ) : (
                              <span>점검결과를 선택하세요</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {/* 특이사항/녹음/사진 섹션 */}
          <div className="border-t-2 border-border pt-6 mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* 왼쪽: 특이사항 텍스트 */}
            <div className="space-y-2">
              <Label htmlFor="remarks">특이사항</Label>
              <Textarea
                id="remarks"
                placeholder="특이사항을 입력하세요..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={6}
                className="w-full min-h-[180px]"
                disabled={isViewMode || isDraftViewMode || isOtherTeamView}
              />
            </div>

            {/* 중앙: TBM 녹음 (재생 전용 - 헤더에서 녹음) */}
            <div className="space-y-2">
              <Label>TBM 녹음</Label>
              <InlineAudioPanel
                onRecordingComplete={(data) => setAudioRecording(data)}
                onTranscriptionComplete={(data) => setTranscription(data)}
                onDelete={handleAudioDelete}
                existingAudio={audioRecording}
                existingTranscription={transcription}
                maxDurationSeconds={1800}
                disabled={false}
                playbackOnly={isViewMode || isDraftViewMode || isOtherTeamView || !apiCheckComplete}
              />
            </div>

            {/* 오른쪽: 사진 업로드 */}
            <div className="space-y-2">
              <Label>TBM 사진</Label>
              {!isViewMode && !isDraftViewMode && (
                <FileDropzone
                  onFilesSelected={(files) => handleRemarksImageUpload(files)}
                  accept={{
                    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                    'video/*': ['.mp4', '.avi', '.mov', '.wmv']
                  }}
                  maxFiles={50}
                  maxSize={50 * 1024 * 1024}
                  disabled={isUploadingImages}
                />
              )}
              {isUploadingImages && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700 font-medium">업로드 중...</span>
                </div>
              )}
              {remarksImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {remarksImages.map((imageUrl, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={imageUrl}
                        alt={`특이사항 ${idx + 1}`}
                        className="w-full h-24 object-cover rounded-md border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setEnlargedImage(imageUrl)}
                      />
                      {!isViewMode && !isDraftViewMode && (
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeRemarksImage(idx)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 참고사항 섹션 */}
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
            <h4 className="font-semibold mb-3 text-base">참고사항</h4>
            <div className="text-sm space-y-2 text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">1. TBM 절차</p>
                <p className="pl-4">• 도입-점검-지시-위험성예지훈련-지적확인</p>
                <p className="pl-4">• 음주 상태 확인 후 고소작업 및 위험작업 배치 제한</p>
                <p className="pl-6 text-xs">(라인,직별 일직선 걷기 후 추가 검사가 필요한 경우 안전팀 음주측정기 활용)</p>
              </div>
              <p><span className="font-medium text-foreground">2.</span> 아침 조회를 시작으로 TBM 진행</p>
              <p><span className="font-medium text-foreground">3.</span> 점검은 점검항목 순서에 따라 작업전에 할 것</p>
              <p><span className="font-medium text-foreground">4.</span> X, △의 경우는 해당 팀장에게 필히 연락하고 조치 내용을 기록할 것.</p>
              <p><span className="font-medium text-foreground">5.</span> 점검자는 매일 점검항목에 따라 점검을 하여 기입하고, 점검실시 상황을 확인하여 확인란에 서명할 것.</p>
              <p><span className="font-medium text-foreground">6.</span> TBM 위험성 평가 실시중 기간이 필요한 사항은 잠재위험발굴대장에 추가하여 관리 할 것.</p>
            </div>
          </div>
{/* 참석자 서명 섹션 */}
          <div className="border-t-2 border-border pt-6 mt-8">
            <h3 className="font-semibold text-xl mb-4">참석자 서명</h3>
          </div>
          <Table className="border-collapse">
            <TableHeader>
              <TableRow className="border-b-2 border-border">
                <TableHead className="border-r border-gray-200">이름</TableHead>
                <TableHead className="border-r border-gray-200">출근 상태</TableHead>
                <TableHead>서명</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const HEAT_TREATMENT_ORDER = ['최영삼', '이상현', '이덕표', '유자현', '안태영', '심윤근', '원정환'];
                const workers = [...teamUsers, ...(mode === 'edit' ? [] : [user])].filter((u, i, self) => i === self.findIndex(t => t.id === u.id)).filter(u => u.role !== 'APPROVER');
                if (isHeatTreatmentTeam) {
                  workers.sort((a, b) => {
                    const idxA = HEAT_TREATMENT_ORDER.indexOf(a.name);
                    const idxB = HEAT_TREATMENT_ORDER.indexOf(b.name);
                    const orderA = idxA >= 0 ? idxA : 999;
                    const orderB = idxB >= 0 ? idxB : 999;
                    return orderA - orderB;
                  });
                }
                return workers;
              })().map(worker => (
                <TableRow key={worker.id} className={`border-b border-gray-200 ${absentUsers[worker.id] ? 'bg-gray-100' : ''}`}>
                  <TableCell className="font-semibold border-r border-gray-200">{worker.name}</TableCell>
                  <TableCell className="border-r border-gray-200">
                    <Select
                      value={absentUsers[worker.id] || 'PRESENT'}
                      onValueChange={(value) => handleAbsentChange(worker.id, value === 'PRESENT' ? '' : value)}
                      disabled={isViewMode || isDraftViewMode || isOtherTeamView}
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="출근" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRESENT">출근</SelectItem>
                        <SelectItem value="연차">연차</SelectItem>
                        <SelectItem value="오전 반차">오전 반차</SelectItem>
                        <SelectItem value="오후 반차">오후 반차</SelectItem>
                        <SelectItem value="출장">출장</SelectItem>
                        <SelectItem value="교육">교육</SelectItem>
                        <SelectItem value="기타">기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {signatures[worker.id] ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-600">✓ 서명 완료</span>
                        <img
                          src={signatures[worker.id]}
                          alt={`${worker.name} signature`}
                          className="h-12 w-24 object-contain border rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setEnlargedImage(signatures[worker.id])}
                        />
                        {!isViewMode && !isDraftViewMode && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSigningUser(worker); setIsSigDialogOpen(true); }}
                          >
                            다시 서명
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={() => { setSigningUser(worker); setIsSigDialogOpen(true); }}
                        disabled={isViewMode || isDraftViewMode || isOtherTeamView || (absentUsers[worker.id] && !['오전 반차', '오후 반차'].includes(absentUsers[worker.id]))}
                        size="sm"
                      >
                        서명
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <SignatureDialog
        isOpen={isSigDialogOpen}
        onClose={() => setIsSigDialogOpen(false)}
        onSave={(signatureData) => { if(signingUser) { setSignatures(prev => ({ ...prev, [signingUser.id]: signatureData })); } setSigningUser(null); }}
        userName={signingUser?.name || ''}
      />

      {/* Image Viewer Dialog */}
      <Dialog open={!!enlargedImage} onOpenChange={(open) => !open && setEnlargedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setEnlargedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img
              src={enlargedImage}
              alt="확대된 이미지"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 이슈 상세 입력 모달 (△/X 항목) */}
      <IssueDetailModal
        isOpen={issueModalOpen}
        onClose={() => {
          setIssueModalOpen(false);
          setSelectedIssueItem(null);
        }}
        onSave={(data) => {
          if (selectedIssueItem) {
            updateFormState(selectedIssueItem.id, 'description', data.description);
            updateFormState(selectedIssueItem.id, 'actionTaken', data.actionTaken);
            updateFormState(selectedIssueItem.id, 'attachments', data.attachments);
          }
        }}
        item={selectedIssueItem}
        initialData={selectedIssueItem ? {
          description: formState[selectedIssueItem.id]?.description || '',
          actionTaken: formState[selectedIssueItem.id]?.actionTaken || '',
          attachments: formState[selectedIssueItem.id]?.attachments || []
        } : undefined}
      />

      <div className="flex justify-end mt-6 gap-3">
        {isOtherTeamView ? (
          /* 다른 팀 조회 모드 - 조회 전용 안내 */
          <div className="text-sm text-muted-foreground px-4 py-2 bg-muted rounded-md">
            다른 팀의 TBM은 조회만 가능합니다
          </div>
        ) : isViewMode ? (
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() => safeNavigate('/monthly-report')}
            >
              월별 보고서 보기
            </Button>
            <Button
              size="lg"
              onClick={() => {
                if (!canEditReport) {
                  toast({ title: "권한이 없습니다", description: "본인이 작성한 TBM만 수정할 수 있습니다.", variant: "destructive" });
                  return;
                }
                setMode('edit');
              }}
            >
              수정하기
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="lg"
              disabled={isSaving || !hasActualData}
              onClick={async () => {
                const saved = await saveNow();
                if (saved) {
                  toast({ title: "임시저장 완료", description: "작성 중인 내용이 저장되었습니다." });
                } else {
                  toast({ title: "임시저장 실패", description: "저장할 내용이 없습니다.", variant: "destructive" });
                }
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              임시저장
            </Button>
            <Button
              onClick={handleSubmit}
              size="lg"
              disabled={isSaving || !checklist || Object.keys(formState).length === 0}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  제출 중...
                </>
              ) : '제출하기'}
            </Button>
          </>
        )}
      </div>

      {/* 제출 성공 다이얼로그 */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              제출 완료
            </DialogTitle>
            <DialogDescription>
              TBM 일지가 성공적으로 제출되었습니다.
            </DialogDescription>
          </DialogHeader>

          {/* 김동현 차장 전용: 다른 사이트에도 제출 버튼 */}
          {user?.username === 'seeyou.kim' && otherSiteTeam && (
            <div className="my-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 mb-3">
                <strong>{otherSiteTeam.site}</strong>에도 동일한 TBM을 제출하시겠습니까?
              </p>
              <Button
                onClick={handleCopyToOtherSite}
                disabled={isCopyingToOtherSite}
                className="w-full"
                variant="secondary"
              >
                {isCopyingToOtherSite ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    복사 중...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    {otherSiteTeam.site}에도 동일하게 제출
                  </>
                )}
              </Button>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false);
                setOtherSiteTeam(null);
                onFinishEditing();
              }}
            >
              확인
            </Button>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
                setOtherSiteTeam(null);
                navigate('/monthly-report');
              }}
            >
              월별 보고서 보기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 페이지 이탈 시 자동 임시저장 다이얼로그 */}
      <Dialog open={isAutoSavingOnLeave} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-xs">
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">임시저장 중...</p>
              <p className="text-sm text-muted-foreground mt-1">잠시만 기다려주세요</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TBMChecklist;