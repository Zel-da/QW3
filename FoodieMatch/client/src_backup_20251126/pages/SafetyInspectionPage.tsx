import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { Camera, Upload, X, Save, CheckCircle2, Circle, FileText, Image } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { SafetyInspectionSkeleton } from '@/components/skeletons/SafetyInspectionSkeleton';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';
import { getInspectionYearRange, cn } from '@/lib/utils';
import { FileDropzone } from '@/components/FileDropzone';

interface Team {
  id: number;
  name: string;
  site: string;
  factoryId: number | null;
}

interface RequiredItem {
  equipmentName: string;
  requiredPhotoCount: number;
  inspectionDay: number;
  factoryName?: string;
}

interface RequiredItemsResponse {
  teamId: number;
  year: number;
  month: number;
  inspectionDate: string;
  items: RequiredItem[];
}

interface Factory {
  id: number;
  name: string;
  code: string;
}

interface SafetyInspection {
  id: string;
  teamId: number;
  year: number;
  month: number;
  inspectionDate: Date;
  isCompleted: boolean;
  completedAt?: Date;
  inspectionItems: InspectionItem[];
}

interface InspectionItem {
  id: string;
  equipmentName: string;
  requiredPhotoCount: number;
  photos: string | UploadedPhoto[]; // JSON string or array
  remarks?: string;
  isCompleted: boolean;
  uploadedAt: Date;
}

interface UploadedPhoto {
  url: string;
  uploadedAt: string;
}

interface ItemState {
  photos: UploadedPhoto[];
  remarks: string;
}

interface InspectionOverview {
  factoryId: number;
  year: number;
  month: number;
  equipmentTypes: string[];
  teams: TeamOverview[];
}

interface TeamOverview {
  teamId: number;
  teamName: string;
  equipmentStatus: Record<string, {
    quantity: number;
    completed: boolean;
    hasEquipment: boolean;
    uploadedPhotoCount: number;
    requiredPhotoCount: number;
  }>;
}

export default function SafetyInspectionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [selectedFactory, setSelectedFactory] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [uploadedItems, setUploadedItems] = useState<Record<string, ItemState>>({});
  const [uploadingEquipment, setUploadingEquipment] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // 공장 목록 조회
  const { data: factories = [], isLoading: factoriesLoading } = useQuery<Factory[]>({
    queryKey: ['factories'],
    queryFn: async () => {
      const { data } = await axios.get('/api/factories');
      return data;
    },
  });

  // 팀 목록 조회
  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await axios.get('/api/teams');
      return data;
    },
  });

  // 선택된 공장의 팀만 필터링
  const filteredTeams = selectedFactory
    ? teams.filter(team => team.factoryId === selectedFactory)
    : teams;

  // 팀장의 경우 해당 팀의 공장을 자동 설정
  useEffect(() => {
    if (user?.role === 'TEAM_LEADER' && user.teamId) {
      setSelectedTeam(user.teamId);
      const userTeam = teams.find(t => t.id === user.teamId);
      if (userTeam?.factoryId) {
        setSelectedFactory(userTeam.factoryId);
      }
    }
  }, [user, teams]);

  // 첫 공장 자동 선택 (관리자인 경우)
  useEffect(() => {
    if (user?.role === 'ADMIN' && factories.length > 0 && !selectedFactory) {
      setSelectedFactory(factories[0].id);
    }
  }, [user, factories, selectedFactory]);

  // 필수 점검 항목 조회 (월별 일정 ∩ 라인 장비)
  const { data: requiredItemsData, isLoading: itemsLoading } = useQuery<RequiredItemsResponse>({
    queryKey: ['required-inspection-items', selectedTeam, selectedYear, selectedMonth],
    queryFn: async () => {
      const { data } = await axios.get(`/api/inspections/${selectedTeam}/${selectedYear}/${selectedMonth}/required-items`);
      return data;
    },
    enabled: !!selectedTeam && !!selectedYear && !!selectedMonth,
  });

  const requiredItems = requiredItemsData?.items || [];

  // 종합 현황 조회 (공장 전체 팀의 점검 상태)
  const { data: overviewData, isLoading: overviewLoading } = useQuery<InspectionOverview>({
    queryKey: ['inspection-overview', selectedFactory, selectedYear, selectedMonth],
    queryFn: async () => {
      const { data } = await axios.get(`/api/inspections/overview/${selectedFactory}/${selectedYear}/${selectedMonth}`);
      return data;
    },
    enabled: !!selectedFactory && !!selectedYear && !!selectedMonth,
  });

  // 기존 점검 기록 조회
  const { data: inspection, isLoading: inspectionLoading } = useQuery<SafetyInspection | null>({
    queryKey: ['safety-inspection', selectedTeam, selectedYear, selectedMonth],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`/api/inspection/${selectedTeam}/${selectedYear}/${selectedMonth}`);
        return data;
      } catch (err: any) {
        if (err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!selectedTeam && !!selectedYear && !!selectedMonth,
  });

  // 기존 점검 데이터를 uploadedItems에 로드
  useEffect(() => {
    if (inspection && inspection.inspectionItems) {
      const loaded: Record<string, ItemState> = {};
      inspection.inspectionItems.forEach((item) => {
        const photos: UploadedPhoto[] = typeof item.photos === 'string'
          ? JSON.parse(item.photos || '[]')
          : (item.photos || []);
        loaded[item.equipmentName] = {
          photos,
          remarks: item.remarks || '',
        };
      });
      setUploadedItems(loaded);
    } else {
      // inspection이 null이거나 없으면 uploadedItems 초기화
      setUploadedItems({});
    }
  }, [inspection]);

  // 자동 임시저장 기능
  const autoSaveKey = `safety_draft_${selectedTeam}_${selectedYear}_${selectedMonth}`;
  const { clearSaved } = useAutoSave({
    key: autoSaveKey,
    data: uploadedItems,
    enabled: !!selectedTeam && !inspection?.isCompleted, // 팀 선택되고 미완료 상태일 때만
    onRestore: (restored) => {
      setUploadedItems(restored);
    },
  });

  // 진행률 계산
  const getProgress = () => {
    if (requiredItems.length === 0) return { completed: 0, total: 0, percentage: 0 };

    const completed = requiredItems.filter((item) => {
      const state = uploadedItems[item.equipmentName];
      return state && state.photos.length >= item.requiredPhotoCount;
    }).length;

    const total = requiredItems.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  };

  const handlePhotoUpload = async (equipmentName: string, requiredCount: number, file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: '오류', description: '파일 크기는 10MB 이하여야 합니다.', variant: 'destructive' });
      return;
    }

    const currentPhotos = uploadedItems[equipmentName]?.photos || [];
    if (currentPhotos.length >= requiredCount) {
      toast({
        title: '오류',
        description: `최대 ${requiredCount}장까지 업로드할 수 있습니다.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploadingEquipment(equipmentName);
      const formData = new FormData();
      formData.append('files', file);

      const res = await axios.post('/api/upload-multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedFile = res.data.files[0];
      const newPhoto: UploadedPhoto = {
        url: uploadedFile.url,
        uploadedAt: new Date().toISOString(),
      };

      setUploadedItems((prev) => ({
        ...prev,
        [equipmentName]: {
          photos: [...(prev[equipmentName]?.photos || []), newPhoto],
          remarks: prev[equipmentName]?.remarks || '',
        },
      }));

      toast({ title: '성공', description: '사진이 업로드되었습니다.' });
    } catch (err) {
      toast({ title: '오류', description: '사진 업로드에 실패했습니다.', variant: 'destructive' });
    } finally {
      setUploadingEquipment(null);
    }
  };

  const handleMultiplePhotoUpload = async (equipmentName: string, requiredCount: number, files: File[]) => {
    if (!files || files.length === 0) return;

    // 현재 업로드된 사진 수 확인
    const currentPhotos = uploadedItems[equipmentName]?.photos || [];
    const remainingSlots = requiredCount - currentPhotos.length;

    if (remainingSlots <= 0) {
      toast({
        title: '오류',
        description: `최대 ${requiredCount}장까지 업로드할 수 있습니다.`,
        variant: 'destructive',
      });
      return;
    }

    // 자동 트림: 필요한 만큼만 앞에서부터 선택
    const filesToUpload = files.slice(0, remainingSlots);

    // 초과 알림
    if (files.length > remainingSlots) {
      toast({
        title: '알림',
        description: `${files.length}개 중 처음 ${remainingSlots}개의 사진만 업로드됩니다.`,
      });
    }

    // 개별 파일 크기 검증
    for (const file of filesToUpload) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: '오류',
          description: `${file.name}의 크기가 10MB를 초과합니다.`,
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setUploadingEquipment(equipmentName);
      const formData = new FormData();
      filesToUpload.forEach(file => formData.append('files', file));

      const res = await axios.post('/api/upload-multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newPhotos: UploadedPhoto[] = res.data.files.map((file: any) => ({
        url: file.url,
        uploadedAt: new Date().toISOString(),
      }));

      setUploadedItems((prev) => ({
        ...prev,
        [equipmentName]: {
          photos: [...(prev[equipmentName]?.photos || []), ...newPhotos],
          remarks: prev[equipmentName]?.remarks || '',
        },
      }));

      toast({
        title: '성공',
        description: `${newPhotos.length}개의 사진이 업로드되었습니다.`,
      });
    } catch (err) {
      console.error('Upload error:', err);
      toast({
        title: '오류',
        description: '사진 업로드에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setUploadingEquipment(null);
    }
  };

  const handleRemarksChange = (equipmentName: string, remarks: string) => {
    setUploadedItems((prev) => ({
      ...prev,
      [equipmentName]: {
        photos: prev[equipmentName]?.photos || [],
        remarks,
      },
    }));
  };

  const removePhoto = (equipmentName: string, photoIndex: number) => {
    setUploadedItems((prev) => {
      const currentState = prev[equipmentName];
      if (!currentState) return prev;

      const updatedPhotos = currentState.photos.filter((_, index) => index !== photoIndex);

      if (updatedPhotos.length === 0) {
        const { [equipmentName]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [equipmentName]: {
          ...currentState,
          photos: updatedPhotos,
        },
      };
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeam) throw new Error('팀을 선택해주세요');

      const items = requiredItems.map((required) => {
        const state = uploadedItems[required.equipmentName] || { photos: [], remarks: '' };
        return {
          equipmentName: required.equipmentName,
          requiredPhotoCount: required.requiredPhotoCount,
          photos: JSON.stringify(state.photos),
          remarks: state.remarks || null,
          isCompleted: state.photos.length >= required.requiredPhotoCount,
        };
      });

      const allCompleted = items.every((item) => item.isCompleted);

      const payload = {
        teamId: selectedTeam,
        year: selectedYear,
        month: selectedMonth,
        inspectionDate: new Date(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-04`),
        isCompleted: allCompleted,
        items,
      };

      const { data } = await axios.post('/api/inspection', payload);
      return data;
    },
    onSuccess: () => {
      toast({ title: '성공', description: '안전점검 기록이 저장되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['safety-inspection', selectedTeam, selectedYear, selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ['inspection-overview', selectedFactory, selectedYear, selectedMonth] });
      // 제출 성공 시 임시저장 데이터 삭제
      clearSaved();
      setShowSuccessDialog(true);
    },
    onError: (err: any) => {
      toast({
        title: '오류',
        description: err.response?.data?.message || err.message || '저장에 실패했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    // 필수 사진 검증
    const progress = getProgress();

    if (progress.total === 0) {
      toast({
        title: '점검 항목 없음',
        description: '점검할 항목이 없습니다. 팀, 연도, 월을 확인해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (progress.completed < progress.total) {
      // 미완료 항목 찾기
      const incompleteItems = requiredItems
        .filter((item) => {
          const state = uploadedItems[item.equipmentName];
          return !state || state.photos.length < item.requiredPhotoCount;
        })
        .map((item) => {
          const uploaded = uploadedItems[item.equipmentName]?.photos.length || 0;
          return `${item.equipmentName} (${uploaded}/${item.requiredPhotoCount})`;
        });

      toast({
        title: '필수 사진 미업로드',
        description: `${incompleteItems.length}개 항목의 필수 사진이 부족합니다:\n${incompleteItems.slice(0, 3).join(', ')}${incompleteItems.length > 3 ? ` 외 ${incompleteItems.length - 3}개` : ''}`,
        variant: 'destructive',
      });
      return;
    }

    saveMutation.mutate();
  };

  if (teamsLoading || factoriesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto p-6">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  const progress = getProgress();
  const isFullyCompleted = progress.completed === progress.total && progress.total > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        {/* 필터 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">안전 점검 대상 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              {user?.role === 'ADMIN' && (
                <div>
                  <Label htmlFor="factory">공장</Label>
                  <Select
                    value={selectedFactory?.toString() || ''}
                    onValueChange={(value) => {
                      setSelectedFactory(parseInt(value));
                      setSelectedTeam(null); // 공장 변경 시 팀 선택 초기화
                    }}
                  >
                    <SelectTrigger id="factory">
                      <SelectValue placeholder="공장 선택" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                      {factories.map((factory) => (
                        <SelectItem key={factory.id} value={factory.id.toString()}>
                          {factory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="year">년도</Label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="년도 선택" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                    {getInspectionYearRange().map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="month">월</Label>
                <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="월 선택" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {month}월
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                className="h-10 ml-auto"
                onClick={() => setLocation('/inspection-gallery')}
              >
                <Image className="w-4 h-4 mr-2" />
                내역 보기
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 종합 현황표 */}
        {selectedFactory && selectedYear && selectedMonth ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>종합 점검 현황</CardTitle>
              <CardDescription>
                {factories.find(f => f.id === selectedFactory)?.name} 전체 팀의 {selectedMonth}월 점검 상태
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <LoadingSpinner />
              ) : overviewData ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32 sticky left-0 bg-white z-10 font-bold text-black">팀명</TableHead>
                          {overviewData.equipmentTypes.map((equipment) => (
                            <TableHead key={equipment} className="text-center min-w-24 font-bold text-black">
                              {equipment.replace(' 점검', '')}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overviewData.teams.map((team) => {
                          // 팀의 점검 완료 여부 확인
                          const hasAnyEquipment = Object.values(team.equipmentStatus).some(s => s.hasEquipment);
                          const allCompleted = hasAnyEquipment && Object.values(team.equipmentStatus).every(status => {
                            if (!status.hasEquipment) return true; // 장비 없으면 완료로 간주
                            return status.uploadedPhotoCount >= status.requiredPhotoCount;
                          });

                          return (
                          <TableRow
                            key={team.teamId}
                            onClick={() => setSelectedTeam(team.teamId)}
                            className={cn(
                              "cursor-pointer transition-colors",
                              selectedTeam === team.teamId
                                ? "bg-blue-50 border-l-4 border-l-blue-500"
                                : "hover:bg-gray-50"
                            )}
                          >
                            <TableCell className={cn(
                              "font-medium sticky left-0 z-10",
                              selectedTeam === team.teamId
                                ? "bg-blue-50"
                                : !allCompleted
                                  ? "bg-red-100"
                                  : "bg-white"
                            )}>
                              {team.teamName}
                            </TableCell>
                            {overviewData.equipmentTypes.map((equipment) => {
                              const status = team.equipmentStatus[equipment];
                              if (!status.hasEquipment) {
                                return (
                                  <TableCell key={equipment} className="text-center bg-gray-100 text-gray-400">
                                    -
                                  </TableCell>
                                );
                              }

                              // 세 가지 상태 결정
                              const isCompleted = status.uploadedPhotoCount >= status.requiredPhotoCount;
                              const isPartial = status.uploadedPhotoCount > 0 && status.uploadedPhotoCount < status.requiredPhotoCount;

                              return (
                                <TableCell
                                  key={equipment}
                                  className={cn(
                                    "text-center font-medium cursor-pointer transition-colors",
                                    isCompleted && "bg-green-100 text-green-700 hover:bg-green-200",
                                    isPartial && "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
                                    !isCompleted && !isPartial && "bg-red-100 text-red-700 hover:bg-red-200"
                                  )}
                                >
                                  {status.requiredPhotoCount ?? 0}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                      <span className="font-medium">💡 팁:</span>
                      <span>팀을 선택하려면 표에서 팀 행을 클릭하세요</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-green-100 border border-green-300 rounded" />
                        <span>점검 완료</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded" />
                        <span>부분 완료</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-100 border border-red-300 rounded" />
                        <span>점검 미완료</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded" />
                        <span>해당 장비 없음</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  종합 현황 데이터가 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        ) : null}

        {!selectedTeam ? (
          <EmptyState
            icon={FileText}
            title="팀을 선택해주세요"
            description="점검 기록을 작성하려면 팀을 선택해주세요."
          />
        ) : itemsLoading ? (
          <SafetyInspectionSkeleton />
        ) : requiredItems.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="점검 항목이 없습니다"
            description={`${selectedMonth}월에 점검할 항목이 없거나, 라인에 등록된 장비가 없습니다. 관리자에게 문의하세요.`}
          />
        ) : (
          <>
            {/* 진행률 표시 */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      전체 진행률: {progress.completed} / {progress.total} 항목 완료
                    </span>
                    <span className="text-sm font-medium text-primary">{progress.percentage}%</span>
                  </div>
                  <Progress value={progress.percentage} className="h-3" />
                  {isFullyCompleted && (
                    <p className="text-sm text-green-600 font-medium flex items-center gap-1 mt-2">
                      <CheckCircle2 className="h-4 w-4" />
                      모든 항목이 완료되었습니다!
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 점검 항목 목록 */}
            <div className="space-y-4">
              {requiredItems.map((item) => {
                const state = uploadedItems[item.equipmentName] || { photos: [], remarks: '' };
                const isItemCompleted = state.photos.length >= item.requiredPhotoCount;
                const isUploading = uploadingEquipment === item.equipmentName;

                return (
                  <Card key={item.equipmentName} className={isItemCompleted ? 'border-green-500 bg-green-50/50' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {isItemCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-400" />
                          )}
                          {item.equipmentName}
                        </CardTitle>
                        <span className="text-sm text-muted-foreground">
                          사진: {state.photos.length} / {item.requiredPhotoCount}장
                          {item.inspectionDay && ` · ${item.inspectionDay}일까지`}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* 업로드된 사진들 */}
                        {state.photos.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                            {state.photos.map((photo, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={photo.url}
                                  alt={`${item.equipmentName} ${index + 1}`}
                                  className="w-full h-28 sm:h-32 object-cover rounded border"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 h-7 w-7 p-0"
                                  onClick={() => removePhoto(item.equipmentName, index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                                  {index + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 사진 업로드 */}
                        {state.photos.length < item.requiredPhotoCount && (
                          <div>
                            <Label>
                              사진 추가 ({item.requiredPhotoCount - state.photos.length}장 더 필요)
                            </Label>
                            <FileDropzone
                              key={`${item.equipmentName}-${state.photos.length}`}
                              onFilesSelected={(files) => {
                                if (files.length > 0) {
                                  handleMultiplePhotoUpload(item.equipmentName, item.requiredPhotoCount, files);
                                }
                              }}
                              accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }}
                              maxFiles={item.requiredPhotoCount - state.photos.length}
                              maxSize={10 * 1024 * 1024}
                              multiple={true}
                              disabled={isUploading}
                            />
                          </div>
                        )}

                        {/* 비고 */}
                        <div>
                          <Label htmlFor={`remarks-${item.equipmentName}`}>비고 (선택사항)</Label>
                          <Textarea
                            id={`remarks-${item.equipmentName}`}
                            placeholder="특이사항을 입력하세요..."
                            value={state.remarks}
                            onChange={(e) => handleRemarksChange(item.equipmentName, e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 저장 버튼 */}
            <div className="flex justify-end gap-3 mt-6">
              <Button onClick={handleSave} disabled={saveMutation.isPending || !isFullyCompleted} className="h-12 w-full sm:w-auto min-w-[160px]">
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? '저장 중...' : isFullyCompleted ? '저장하기' : `저장하기 (${progress.completed}/${progress.total})`}
              </Button>
            </div>
          </>
        )}

        {/* 저장 성공 다이얼로그 */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                저장 완료
              </DialogTitle>
              <DialogDescription>
                안전점검 기록이 성공적으로 저장되었습니다.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setShowSuccessDialog(false)}
              >
                계속 작성
              </Button>
              <Button
                onClick={() => {
                  setShowSuccessDialog(false);
                  setLocation('/inspection-gallery');
                }}
              >
                사진 갤러리 보기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
