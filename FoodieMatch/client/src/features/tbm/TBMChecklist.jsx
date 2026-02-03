import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const { setCurrentTbmInfo, lastSavedRecording, clearLastSavedRecording } = useRecording();
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
  const [isViewMode, setIsViewMode] = useState(false);
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
  // 팀별 draft 캐시 (메모리) - 팀 전환 시 작성 중인 내용 유지
  const [teamDrafts, setTeamDrafts] = useState({});
  // 페이지 이탈 시 자동 임시저장 중 상태
  const [isAutoSavingOnLeave, setIsAutoSavingOnLeave] = useState(false);
  // API 체크 완료 여부 (draft 복원 타이밍 제어용)
  const [apiCheckComplete, setApiCheckComplete] = useState(false);
  // 임시저장 조회 모드 (draft를 보여주는 상태)
  const [isDraftViewMode, setIsDraftViewMode] = useState(false);
  // 작성자 선택 (기본: 로그인 사용자)
  const [selectedAuthorId, setSelectedAuthorId] = useState(null);
  // 직접입력 모드
  const [isManualAuthor, setIsManualAuthor] = useState(false);
  const [manualAuthorName, setManualAuthorName] = useState('');

  // 녹음 삭제 상태 추적 - pending 복원 방지용
  const audioDeletedRef = useRef(false);

  // 변경사항 감지 - 폼에 입력된 내용이 있는지 확인
  const hasUnsavedChanges = React.useMemo(() => {
    // 뷰 모드, 임시저장 조회 모드, 로딩 중이면 변경사항 없음으로 처리
    // isDraftViewMode: 데이터가 이미 localStorage에 있으므로 guard 불필요
    if (isViewMode || isDraftViewMode || loading) return false;

    // 체크리스트 항목에 입력이 있는지 확인
    const hasFormData = Object.keys(formState).length > 0;
    // 서명이 있는지 확인
    const hasSignatures = Object.keys(signatures).length > 0;
    // 비고란에 내용이 있는지 확인
    const hasRemarks = remarks.trim().length > 0;
    // 비고란 이미지가 있는지 확인
    const hasImages = remarksImages.length > 0;

    return hasFormData || hasSignatures || hasRemarks || hasImages;
  }, [formState, signatures, remarks, remarksImages, isViewMode, isDraftViewMode, loading]);

  // 작성자 본인 또는 ADMIN만 수정 가능 여부 판별
  const canEditReport = React.useMemo(() => {
    if (user?.role === 'ADMIN') return true;
    const report = reportForEdit || existingReport;
    if (!report?.reportDetails?.length) return true; // 작성자 정보 없으면 허용
    const originalAuthorId = report.reportDetails[0]?.authorId;
    if (!originalAuthorId) return true;
    return originalAuthorId === user?.id;
  }, [user, reportForEdit, existingReport]);

  // 관리자 여부 (ADMIN / SAFETY_TEAM만 팀 선택 드롭다운 표시)
  const isPrivilegedUser = user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM';

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

  // 저장하지 않은 변경사항 경고 훅
  const {
    showDialog: showUnsavedDialog,
    confirmNavigation,
    cancelNavigation,
    resetChanges,
    safeNavigate,
  } = useUnsavedChanges({
    hasChanges: hasUnsavedChanges,
    disabled: isViewMode || isDraftViewMode,
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
  // 조회 모드나 임시저장 조회 모드에서는 녹음 비활성화
  useEffect(() => {
    if (selectedTeam && date && !isViewMode && !isDraftViewMode) {
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
  }, [selectedTeam, date, teams, isViewMode, isDraftViewMode, setCurrentTbmInfo]);

  // 팀/날짜 변경 시 삭제 플래그 리셋
  useEffect(() => {
    audioDeletedRef.current = false;
  }, [selectedTeam, date]);

  // 팀/날짜 선택 시 임시 저장된 녹음 확인
  useEffect(() => {
    if (selectedTeam && date && !isViewMode && !isDraftViewMode) {
      // 사용자가 명시적으로 삭제한 경우 복원 안 함
      if (audioDeletedRef.current) return;

      const d = new Date(date);
      const dateStr = format(d, 'yyyy-MM-dd');
      const pending = getPendingRecording(selectedTeam, dateStr);
      if (pending && !audioRecording) {
        setAudioRecording(pending);
        // 임시 저장 데이터는 제출 성공 시에만 삭제 (복원 후 바로 삭제하지 않음)
        toast({
          title: "녹음 불러옴",
          description: "이전에 녹음한 내용이 적용되었습니다.",
        });
      }
    }
  }, [selectedTeam, date, isViewMode, audioRecording, toast]);

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

  // 팀/날짜 변경 시 API 체크 상태 초기화
  useEffect(() => {
    setApiCheckComplete(false);
    setIsDraftViewMode(false);
  }, [selectedTeam, date]);

  // 날짜 변경 시 팀별 메모리 캐시 초기화 (다른 날짜로 녹음 데이터가 넘어가는 것 방지)
  useEffect(() => {
    setTeamDrafts({});
  }, [date]);

  // 팀과 날짜가 선택되면 기존 TBM이 있는지 확인
  useEffect(() => {
    if (selectedTeam && date && !reportForEdit) {
      // 로컬 시간대 기준 날짜 문자열 생성 (UTC 변환 시 날짜가 바뀌는 문제 방지)
      const d = new Date(date);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      apiClient.get(`/api/tbm/check-existing?teamId=${selectedTeam}&date=${dateStr}`)
        .then(res => {
          if (res.data.exists && res.data.report) {
            setExistingReport(res.data.report);
            setIsViewMode(true);
            setIsDraftViewMode(false);
            // 기존 데이터로 폼 초기화
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
            setExistingReport(null);
            setIsViewMode(false);
            setIsDraftViewMode(false);
            // 이전 날짜 데이터가 남지 않도록 폼 초기화
            setFormState({});
            setSignatures({});
            setAbsentUsers({});
            setRemarks('');
            setRemarksImages([]);
            setAudioRecording(null);
            setTranscription(null);
          }
          // API 체크 완료 표시 (draft 복원 트리거)
          setApiCheckComplete(true);
        })
        .catch(err => {
          console.error('Failed to check existing TBM:', err);
          setApiCheckComplete(true); // 에러가 나도 체크는 완료로 표시
        });
    } else if (!selectedTeam) {
      // 팀이 선택 해제되면 초기화 (녹음/STT 포함)
      setExistingReport(null);
      setIsViewMode(false);
      setIsDraftViewMode(false);
      setApiCheckComplete(false);
      setAudioRecording(null);
      setTranscription(null);
    }
  }, [selectedTeam, date, reportForEdit, toast]);

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

  useEffect(() => {
    if (reportForEdit) {
      initializeFormFromReport(reportForEdit);
      setIsViewMode(true); // 항상 조회 모드로 먼저 표시, 수정하기 버튼 클릭 시 수정 모드 전환
    } else if (!existingReport) {
      // 새 작성 모드일 때만 초기화
      setFormState({});
      setSignatures({});
      setAbsentUsers({});
      setRemarks('');
      setRemarksImages([]);
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
    },
    // 팀이 선택되고 수정/조회/draft조회 모드가 아닐 때만 자동저장
    enabled: !!selectedTeam && !reportForEdit && !isViewMode && !isDraftViewMode,
    // 자동 복원 모드 사용 (다이얼로그 없이)
    autoRestore: true,
    // API 체크 완료되고 기존 TBM이 없을 때만 복원
    readyToRestore: apiCheckComplete && !existingReport,
    onRestore: (restored) => {
      if (restored.formState) setFormState(restored.formState);
      if (restored.signatures) setSignatures(restored.signatures);
      if (restored.remarks) setRemarks(restored.remarks);
      if (restored.remarksImages) setRemarksImages(restored.remarksImages);
      if (restored.absentUsers) setAbsentUsers(restored.absentUsers);
      if (restored.audioRecording) setAudioRecording(restored.audioRecording);
      if (restored.transcription) setTranscription(restored.transcription);
      // 임시저장 데이터 복원 시 draft 조회 모드로 전환
      setIsDraftViewMode(true);
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

      // 약간의 딜레이로 UI 표시 후 저장
      setTimeout(doSaveAndNavigate, 100);
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
    if (absenceType && absenceType !== '') {
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

    // Validate that at least one person has signed
    const signatureCount = Object.keys(signatures).length;
    if (signatureCount === 0) {
      validationErrors.push('최소 1명 이상의 서명이 필요합니다.');
    }

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

      if (reportIdToUpdate) {
        await apiClient.put(`/api/tbm/${reportIdToUpdate}`, reportData);
        toast({ title: "TBM 일지가 성공적으로 수정되었습니다." });
      } else {
        await apiClient.post('/api/reports', reportData);
        toast({ title: "TBM 일지가 성공적으로 제출되었습니다." });
        // 제출 성공 시 임시저장 데이터 삭제
        clearSaved();
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
    }
  };

  // 부서별 팀 필터링 + 권한 기반 필터링
  const filteredTeams = useMemo(() => {
    if (!selectedDepartment || !teams.length) return [];
    const deptConfig = getDepartments(site).find(d => d.name === selectedDepartment);
    if (!deptConfig) return [];

    const deptTeams = teams.filter(team => {
      const teamName = stripSiteSuffix(team.name);
      return deptConfig.teams.some(t => teamName.includes(t));
    });

    // ADMIN / SAFETY_TEAM: 모든 팀 선택 가능
    if (user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM') {
      return deptTeams;
    }

    // TEAM_LEADER / EXECUTIVE_LEADER: 자신이 리더인 팀 + 소속 팀
    // 일반 사용자: 자신의 소속 팀만
    return deptTeams.filter(team => {
      if (team.id === user?.teamId) return true;
      if ((user?.role === 'TEAM_LEADER' || user?.role === 'EXECUTIVE_LEADER') && team.leaderId === user?.id) return true;
      return false;
    });
  }, [selectedDepartment, teams, site, user]);

  // 부서 변경 시 팀 선택 초기화
  const handleDepartmentChange = (dept) => {
    setSelectedDepartment(dept);
    setSelectedTeam(null);
  };

  // 팀 변경 시 현재 팀 데이터 캐싱 후 새 팀 데이터 복원
  const handleTeamChange = (newTeamId) => {
    // 다른 팀으로 변경될 때만 처리
    if (newTeamId !== selectedTeam && selectedTeam) {
      // 현재 팀 데이터를 캐시에 저장 (작성 중인 내용이 있을 때만)
      const hasData = Object.keys(formState).length > 0 ||
                      Object.keys(signatures).length > 0 ||
                      remarks.trim().length > 0 ||
                      remarksImages.length > 0 ||
                      audioRecording;

      if (hasData && !isViewMode) {
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

    // 새 팀의 캐시된 데이터가 있으면 복원
    if (newTeamId && teamDrafts[newTeamId]) {
      const cached = teamDrafts[newTeamId];
      setFormState(cached.formState || {});
      setSignatures(cached.signatures || {});
      setAbsentUsers(cached.absentUsers || {});
      setRemarks(cached.remarks || '');
      setRemarksImages(cached.remarksImages || []);
      setAudioRecording(cached.audioRecording || null);
      setTranscription(cached.transcription || null);

      // 중요: 메모리 캐시 복원 시 localStorage draft 삭제하여 중복 복원 방지
      if (date) {
        const draftKey = `tbm_draft_${newTeamId}_${getLocalDateStr(date)}`;
        localStorage.removeItem(draftKey);
        console.log('[TBM] 메모리 캐시에서 복원, localStorage draft 삭제:', draftKey);
      }
    } else {
      // 캐시 없으면 초기화 (useAutoSave가 localStorage에서 복원)
      setFormState({});
      setSignatures({});
      setAbsentUsers({});
      setRemarks('');
      setRemarksImages([]);
      setAudioRecording(null);
      setTranscription(null);
    }
  };

  // 사이트별 부서 목록
  const departments = getDepartments(site);

  return (
    <div className="space-y-6">
      {isPrivilegedUser ? (
        <div className="flex gap-3 items-center flex-wrap">
          {/* 부서 선택 (관리자용) */}
          <Select onValueChange={handleDepartmentChange} value={selectedDepartment || ''}>
            <SelectTrigger className="w-[150px]">
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

          {/* 팀 선택 (관리자용) */}
          <Select
            onValueChange={handleTeamChange}
            value={selectedTeam || ''}
            disabled={!selectedDepartment}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={selectedDepartment ? "팀 선택" : "부서를 먼저 선택하세요"} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              {filteredTeams.map(team => (
                <SelectItem key={team.id} value={team.id}>
                  {stripSiteSuffix(team.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-base px-3 py-1.5">
            {(() => {
              const teamData = teams.find(t => t.id === selectedTeam);
              return teamData ? stripSiteSuffix(teamData.name) : '팀 정보 로딩 중...';
            })()}
          </Badge>
        </div>
      )}

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
                setIsViewMode(false);
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
                setIsDraftViewMode(false);
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
                  setIsDraftViewMode(false);
                  // 폼 초기화
                  setFormState({});
                  setSignatures({});
                  setAbsentUsers({});
                  setRemarks('');
                  setRemarksImages([]);
                  setAudioRecording(null);
                  setTranscription(null);
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
                  disabled={isViewMode || isDraftViewMode}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setIsManualAuthor(false); setManualAuthorName(''); }}
                  disabled={isViewMode || isDraftViewMode}
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
                disabled={isViewMode || isDraftViewMode}
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
                        <RadioGroup value={currentItemState.checkState || null} onValueChange={(value) => updateFormState(item.id, 'checkState', value)} className="flex justify-center gap-4" disabled={isViewMode || isDraftViewMode}>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="O" id={`r-${item.id}-o`} disabled={isViewMode || isDraftViewMode} /><Label htmlFor={`r-${item.id}-o`}>O</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="△" id={`r-${item.id}-d`} disabled={isViewMode || isDraftViewMode} /><Label htmlFor={`r-${item.id}-d`}>△</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="X" id={`r-${item.id}-x`} disabled={isViewMode || isDraftViewMode} /><Label htmlFor={`r-${item.id}-x`}>X</Label></div>
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
                          disabled={isViewMode || isDraftViewMode}
                        >
                          <div className="flex flex-col items-center">
                            <RadioGroupItem value="O" id={`m-${item.id}-o`} disabled={isViewMode || isDraftViewMode} className="h-6 w-6" />
                            <Label htmlFor={`m-${item.id}-o`} className="text-xs mt-1 text-green-600 font-medium">O</Label>
                          </div>
                          <div className="flex flex-col items-center">
                            <RadioGroupItem value="△" id={`m-${item.id}-d`} disabled={isViewMode || isDraftViewMode} className="h-6 w-6" />
                            <Label htmlFor={`m-${item.id}-d`} className="text-xs mt-1 text-yellow-600 font-medium">△</Label>
                          </div>
                          <div className="flex flex-col items-center">
                            <RadioGroupItem value="X" id={`m-${item.id}-x`} disabled={isViewMode || isDraftViewMode} className="h-6 w-6" />
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
                disabled={isViewMode || isDraftViewMode}
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
                playbackOnly={isViewMode || isDraftViewMode}
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
              {[...teamUsers, user].filter((u, i, self) => i === self.findIndex(t => t.id === u.id)).filter(u => u.role !== 'APPROVER').map(worker => (
                <TableRow key={worker.id} className={`border-b border-gray-200 ${absentUsers[worker.id] ? 'bg-gray-100' : ''}`}>
                  <TableCell className="font-semibold border-r border-gray-200">{worker.name}</TableCell>
                  <TableCell className="border-r border-gray-200">
                    <Select
                      value={absentUsers[worker.id] || 'PRESENT'}
                      onValueChange={(value) => handleAbsentChange(worker.id, value === 'PRESENT' ? '' : value)}
                      disabled={isViewMode || isDraftViewMode}
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
                        disabled={isViewMode || isDraftViewMode || (absentUsers[worker.id] && !['오전 반차', '오후 반차'].includes(absentUsers[worker.id]))}
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
        {isViewMode ? (
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
                setIsViewMode(false);
              }}
            >
              수정하기
            </Button>
          </>
        ) : (
          <Button
            onClick={handleSubmit}
            size="lg"
            disabled={!checklist || Object.keys(formState).length === 0 || Object.keys(signatures).length === 0}
          >
            제출하기
          </Button>
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
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false);
                onFinishEditing();
              }}
            >
              확인
            </Button>
            <Button
              onClick={() => {
                setShowSuccessDialog(false);
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