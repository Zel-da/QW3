import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from './apiConfig';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Terminal, Camera, X, Mic, FileText, Loader2, Edit3, ImageIcon, CalendarOff } from "lucide-react";
import { SignatureDialog } from '@/components/SignatureDialog';
import { stripSiteSuffix, sortTeams } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLocation } from 'wouter';
import { CheckCircle2 } from 'lucide-react';
import { FileDropzone } from '@/components/FileDropzone';
import { TBMChecklistSkeleton } from '@/components/skeletons/TBMChecklistSkeleton';
import { InlineAudioPanel } from '@/components/InlineAudioPanel';
import { IssueDetailModal } from '@/components/IssueDetailModal';

const TBMChecklist = ({ reportForEdit, onFinishEditing, date, site }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [teams, setTeams] = useState([]);
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

  // 변경사항 감지 - 폼에 입력된 내용이 있는지 확인
  const hasUnsavedChanges = React.useMemo(() => {
    // 뷰 모드이거나 로딩 중이면 변경사항 없음으로 처리
    if (isViewMode || loading) return false;

    // 체크리스트 항목에 입력이 있는지 확인
    const hasFormData = Object.keys(formState).length > 0;
    // 서명이 있는지 확인
    const hasSignatures = Object.keys(signatures).length > 0;
    // 비고란에 내용이 있는지 확인
    const hasRemarks = remarks.trim().length > 0;
    // 비고란 이미지가 있는지 확인
    const hasImages = remarksImages.length > 0;

    return hasFormData || hasSignatures || hasRemarks || hasImages;
  }, [formState, signatures, remarks, remarksImages, isViewMode, loading]);

  // 저장하지 않은 변경사항 경고 훅
  const {
    showDialog: showUnsavedDialog,
    confirmNavigation,
    cancelNavigation,
    resetChanges,
  } = useUnsavedChanges({
    hasChanges: hasUnsavedChanges,
    disabled: isViewMode,
  });

  useEffect(() => {
    if (site) {
      apiClient.get(`/api/teams?site=${site}`).then(res => {
        setTeams(res.data);
        const userTeamInList = res.data.some(team => team.id === user?.teamId);
        if (user?.teamId && userTeamInList && !reportForEdit) {
          setSelectedTeam(user.teamId);
        } else if (reportForEdit) {
          setSelectedTeam(reportForEdit.teamId);
        }
      });
    }
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
            // 기존 데이터로 폼 초기화
            initializeFormFromReport(res.data.report);
            toast({
              title: "기존 TBM 발견",
              description: "해당 날짜에 이미 작성된 TBM이 있어 조회 모드로 표시합니다.",
            });
          } else {
            setExistingReport(null);
            setIsViewMode(false);
            // 새 작성 모드로 초기화
            setFormState({});
            setSignatures({});
            setAbsentUsers({});
            setRemarks('');
            setRemarksImages([]);
          }
        })
        .catch(err => {
          console.error('Failed to check existing TBM:', err);
        });
    } else if (!selectedTeam) {
      // 팀이 선택 해제되면 초기화
      setExistingReport(null);
      setIsViewMode(false);
    }
  }, [selectedTeam, date, reportForEdit, toast]);

  // 리포트 데이터로 폼 초기화하는 함수
  const initializeFormFromReport = (report) => {
    const initialFormState = {};
    report.reportDetails.forEach(detail => {
      initialFormState[detail.itemId] = {
        checkState: detail.checkState,
        description: detail.actionDescription,
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
      } catch {
        setRemarks(report.remarks);
        setRemarksImages([]);
      }
    }
  };

  useEffect(() => {
    if (reportForEdit) {
      initializeFormFromReport(reportForEdit);
      setIsViewMode(false); // 수정 모드이므로 viewMode는 false
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
  const { clearSaved } = useAutoSave({
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
    enabled: !!selectedTeam && !reportForEdit, // 팀이 선택되고 수정 모드가 아닐 때만 자동저장
    onRestore: (restored) => {
      if (restored.formState) setFormState(restored.formState);
      if (restored.signatures) setSignatures(restored.signatures);
      if (restored.remarks) setRemarks(restored.remarks);
      if (restored.remarksImages) setRemarksImages(restored.remarksImages);
      if (restored.absentUsers) setAbsentUsers(restored.absentUsers);
      if (restored.audioRecording) setAudioRecording(restored.audioRecording);
      if (restored.transcription) setTranscription(restored.transcription);
    },
  });

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

    try {
      const res = await apiClient.post('/api/upload-multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newImages = res.data.files.map(f => f.url);
      setRemarksImages(prev => [...prev, ...newImages]);
      toast({ title: `${files.length}개의 사진이 업로드되었습니다.` });
    } catch (err) {
      toast({ title: "사진 업로드 실패", description: err.response?.data?.message || err.message, variant: "destructive" });
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

        // △ or X items require photo attachment
        const hasPhotos = itemState.attachments && itemState.attachments.length > 0;
        if (!hasPhotos) {
          validationErrors.push(`"${item.description}" 항목: 사진 업로드 필수 (이슈 항목)`);
        }
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
      audioRecording: audioRecording || null,
      transcription: transcription || null
    };

    // 로컬 시간대 기준으로 날짜만 추출 (시간대 문제 방지)
    const localDateStr = getLocalDateStr(date || new Date());

    const reportData = {
      teamId: selectedTeam,
      reportDate: localDateStr,
      managerName: user?.name || 'N/A',
      remarks: JSON.stringify(remarksData),
      site: site,
      results: Object.entries(formState).map(([itemId, data]) => ({
        itemId: parseInt(itemId),
        checkState: data.checkState,
        actionDescription: data.description || null,
        authorId: user.id,
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

      toast({
        title: "제출 실패",
        description: errorMessage,
        variant: "destructive"
      });

      setError(errorMessage);
    }
  };

  // 팀을 사이트별로 그룹화
  const teamsBySite = teams.reduce((acc, team) => {
    const teamSite = team.site || '기타';
    if (!acc[teamSite]) acc[teamSite] = [];
    acc[teamSite].push(team);
    return acc;
  }, {});

  // 현재 사이트를 먼저 표시하도록 그룹 정렬
  const sortedSiteEntries = Object.entries(teamsBySite).sort(([siteA], [siteB]) => {
    if (siteA === site) return -1;
    if (siteB === site) return 1;
    return siteA.localeCompare(siteB, 'ko');
  });

  return (
    <div className="space-y-6">
      <Select onValueChange={setSelectedTeam} value={selectedTeam || ''}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="팀을 선택하세요" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto">
          {sortedSiteEntries.map(([siteGroup, siteTeams]) => (
            <React.Fragment key={siteGroup}>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted/50">
                {siteGroup}
              </div>
              {sortTeams(siteTeams, site).map(team => (
                <SelectItem key={team.id} value={team.id} className="pl-6">
                  {stripSiteSuffix(team.name)}
                </SelectItem>
              ))}
            </React.Fragment>
          ))}
        </SelectContent>
      </Select>

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
      {isViewMode && existingReport && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">기존 TBM 발견</AlertTitle>
          <AlertDescription className="text-blue-700">
            해당 날짜({new Date(existingReport.reportDate).toLocaleDateString('ko-KR')})에 이미 작성된 TBM이 있습니다.
            <span className="font-medium ml-1">조회 모드</span>로 표시 중입니다.
          </AlertDescription>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsViewMode(false);
                // 수정 모드로 전환 - reportForEdit와 동일하게 처리
              }}
            >
              수정하기
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/monthly-report')}
            >
              월별 보고서 보기
            </Button>
          </div>
        </Alert>
      )}

      {loading && <TBMChecklistSkeleton />}

      {!loading && checklist && (
        <>
          <div className="mb-4">
            <h3 className="font-semibold text-lg">작성자: {user?.name}</h3>
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
                        <RadioGroup value={currentItemState.checkState || null} onValueChange={(value) => updateFormState(item.id, 'checkState', value)} className="flex justify-center gap-4" disabled={isViewMode}>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="O" id={`r-${item.id}-o`} disabled={isViewMode} /><Label htmlFor={`r-${item.id}-o`}>O</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="△" id={`r-${item.id}-d`} disabled={isViewMode} /><Label htmlFor={`r-${item.id}-d`}>△</Label></div>
                          <div className="flex items-center space-x-2"><RadioGroupItem value="X" id={`r-${item.id}-x`} disabled={isViewMode} /><Label htmlFor={`r-${item.id}-x`}>X</Label></div>
                        </RadioGroup>
                      </TableCell>
                      <TableCell className="text-center">
                        {(currentItemState.checkState === '△' || currentItemState.checkState === 'X') ? (
                          <div className="flex flex-col items-center gap-2">
                            {/* 입력 완료 상태 표시 */}
                            {currentItemState.attachments?.length > 0 && currentItemState.description ? (
                              <div className="flex items-center gap-2">
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
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  입력완료
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                입력필요
                              </Badge>
                            )}
                            {!isViewMode && (
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
                                {currentItemState.attachments?.length > 0 ? '수정' : '입력'}
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
                          disabled={isViewMode}
                        >
                          <div className="flex flex-col items-center">
                            <RadioGroupItem value="O" id={`m-${item.id}-o`} disabled={isViewMode} className="h-6 w-6" />
                            <Label htmlFor={`m-${item.id}-o`} className="text-xs mt-1 text-green-600 font-medium">O</Label>
                          </div>
                          <div className="flex flex-col items-center">
                            <RadioGroupItem value="△" id={`m-${item.id}-d`} disabled={isViewMode} className="h-6 w-6" />
                            <Label htmlFor={`m-${item.id}-d`} className="text-xs mt-1 text-yellow-600 font-medium">△</Label>
                          </div>
                          <div className="flex flex-col items-center">
                            <RadioGroupItem value="X" id={`m-${item.id}-x`} disabled={isViewMode} className="h-6 w-6" />
                            <Label htmlFor={`m-${item.id}-x`} className="text-xs mt-1 text-red-600 font-medium">X</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* 사진/내용 */}
                      <div className="flex-1 px-3 py-2">
                        {(currentItemState.checkState === '△' || currentItemState.checkState === 'X') ? (
                          <div className="flex items-center gap-2">
                            {/* 입력 완료 상태 */}
                            {currentItemState.attachments?.length > 0 && currentItemState.description ? (
                              <div className="flex items-center gap-2 flex-1">
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
                                <span className="text-xs text-green-600">완료</span>
                              </div>
                            ) : (
                              <span className="text-xs text-red-600 flex-1">입력필요</span>
                            )}
                            {!isViewMode && (
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
                                {currentItemState.attachments?.length > 0 ? '수정' : '입력'}
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
                disabled={isViewMode}
              />
            </div>

            {/* 중앙: TBM 녹음 */}
            <div className="space-y-2">
              <Label>TBM 녹음</Label>
              <InlineAudioPanel
                onRecordingComplete={(data) => setAudioRecording(data)}
                onTranscriptionComplete={(data) => setTranscription(data)}
                onDelete={() => {
                  setAudioRecording(null);
                  setTranscription(null);
                }}
                existingAudio={audioRecording}
                existingTranscription={transcription}
                maxDurationSeconds={1800}
                disabled={isViewMode}
              />
            </div>

            {/* 오른쪽: 사진 업로드 */}
            <div className="space-y-2">
              <Label>TBM 사진</Label>
              {!isViewMode && (
                <FileDropzone
                  onFilesSelected={(files) => handleRemarksImageUpload(files)}
                  accept={{
                    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                    'video/*': ['.mp4', '.avi', '.mov', '.wmv']
                  }}
                  maxFiles={50}
                  maxSize={50 * 1024 * 1024}
                />
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
                      {!isViewMode && (
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
                <p className="pl-6 text-xs">(라인,직별 일직선 걷기 및 안전팀 음주측정기 활용)</p>
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
                      disabled={isViewMode}
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
                      </div>
                    ) : (
                      <Button
                        onClick={() => { setSigningUser(worker); setIsSigDialogOpen(true); }}
                        disabled={isViewMode || (absentUsers[worker.id] && !['오전 반차', '오후 반차'].includes(absentUsers[worker.id]))}
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
            updateFormState(selectedIssueItem.id, 'attachments', data.attachments);
          }
        }}
        item={selectedIssueItem}
        initialData={selectedIssueItem ? {
          description: formState[selectedIssueItem.id]?.description || '',
          attachments: formState[selectedIssueItem.id]?.attachments || []
        } : undefined}
      />

      <div className="flex justify-end mt-6 gap-3">
        {isViewMode ? (
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/monthly-report')}
            >
              월별 보고서 보기
            </Button>
            <Button
              size="lg"
              onClick={() => setIsViewMode(false)}
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
            {existingReport ? '수정하기' : '제출하기'}
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

      {/* 저장하지 않은 변경사항 경고 다이얼로그 */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onSaveAndLeave={async () => {
          try {
            setIsSaving(true);
            await handleSubmit();
            confirmNavigation();
          } catch (error) {
            // 저장 실패 시 다이얼로그 유지
            console.error('저장 실패:', error);
          } finally {
            setIsSaving(false);
          }
        }}
        onLeaveWithoutSaving={confirmNavigation}
        onCancel={cancelNavigation}
        showSaveOption={!isViewMode && checklist && Object.keys(formState).length > 0}
        isSaving={isSaving}
      />
    </div>
  );
};

export default TBMChecklist;