import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Save, X, Plus, Trash2, Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';

interface Factory {
  id: number;
  name: string;
  code: string;
}

interface InspectionScheduleItem {
  id?: number;
  factoryId: number;
  month: number;
  equipmentName: string;
  displayOrder: number;
}

interface MonthlyInspectionDay {
  id: number;
  factoryId: number;
  month: number;
  inspectionDay: number;
}

interface TeamEquipment {
  id: number;
  teamId: number;
  equipmentName: string;
  quantity: number;
}

const fetchFactories = async (): Promise<Factory[]> => {
  const res = await fetch('/api/factories');
  if (!res.ok) throw new Error('Failed to fetch factories');
  return res.json();
};

const fetchSchedule = async (factoryCode: string, month: number): Promise<InspectionScheduleItem[]> => {
  const res = await fetch(`/api/inspection-schedules/${factoryCode}/${month}`);
  if (!res.ok) throw new Error('Failed to fetch schedule');
  return res.json();
};

const fetchMonthlyInspectionDay = async (factoryCode: string, month: number): Promise<MonthlyInspectionDay | null> => {
  const res = await fetch(`/api/monthly-inspection-days/${factoryCode}/${month}`);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to fetch monthly inspection day');
  }
  return res.json();
};

const fetchAvailableEquipments = async (factoryCode: string): Promise<string[]> => {
  // Get all teams for this factory
  const factoryRes = await fetch('/api/factories');
  if (!factoryRes.ok) throw new Error('Failed to fetch factories');
  const factories: Factory[] = await factoryRes.json();
  const factory = factories.find(f => f.code === factoryCode);
  if (!factory) return [];

  const teamsRes = await fetch(`/api/factories/${factory.id}/teams`);
  if (!teamsRes.ok) throw new Error('Failed to fetch teams');
  const teams: any[] = await teamsRes.json();

  // Get all equipments from all teams
  const equipmentNames = new Set<string>();
  for (const team of teams) {
    const equipRes = await fetch(`/api/teams/${team.id}/equipments`);
    if (equipRes.ok) {
      const equipments: TeamEquipment[] = await equipRes.json();
      equipments.forEach(eq => equipmentNames.add(eq.equipmentName));
    }
  }

  return Array.from(equipmentNames).sort();
};

const updateSchedule = async ({ factoryCode, month, schedules }: { factoryCode: string; month: number; schedules: InspectionScheduleItem[] }) => {
  const res = await fetch(`/api/inspection-schedules/${factoryCode}/${month}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ schedules }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update schedule');
  }
  return res.json();
};

const updateMonthlyInspectionDay = async ({ factoryCode, month, inspectionDay }: { factoryCode: string; month: number; inspectionDay: number }) => {
  const res = await fetch(`/api/monthly-inspection-days/${factoryCode}/${month}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionDay }),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update monthly inspection day');
  }
  return res.json();
};

const MONTHS = [
  { value: 1, label: '1월' },
  { value: 2, label: '2월' },
  { value: 3, label: '3월' },
  { value: 4, label: '4월' },
  { value: 5, label: '5월' },
  { value: 6, label: '6월' },
  { value: 7, label: '7월' },
  { value: 8, label: '8월' },
  { value: 9, label: '9월' },
  { value: 10, label: '10월' },
  { value: 11, label: '11월' },
  { value: 12, label: '12월' },
];

export default function InspectionSchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFactory, setSelectedFactory] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [editMode, setEditMode] = useState(false);
  const [editedSchedules, setEditedSchedules] = useState<InspectionScheduleItem[]>([]);
  const [editedInspectionDay, setEditedInspectionDay] = useState<number>(1);

  // 공장 목록 조회
  const { data: factories, isLoading: factoriesLoading } = useQuery({
    queryKey: ['factories'],
    queryFn: fetchFactories,
  });

  // 기본 공장 설정 (첫 번째 공장)
  React.useEffect(() => {
    if (factories && factories.length > 0 && !selectedFactory) {
      setSelectedFactory(factories[0].code);
    }
  }, [factories, selectedFactory]);

  // 점검 일정 조회
  const { data: schedules, isLoading: schedulesLoading } = useQuery({
    queryKey: ['inspectionSchedules', selectedFactory, selectedMonth],
    queryFn: () => fetchSchedule(selectedFactory, selectedMonth),
    enabled: !!selectedFactory && !!selectedMonth,
  });

  // 월별 점검일 조회
  const { data: monthlyInspectionDay, isLoading: monthlyDayLoading } = useQuery({
    queryKey: ['monthlyInspectionDay', selectedFactory, selectedMonth],
    queryFn: () => fetchMonthlyInspectionDay(selectedFactory, selectedMonth),
    enabled: !!selectedFactory && !!selectedMonth,
  });

  // 사용 가능한 장비 목록 조회
  const { data: availableEquipments } = useQuery({
    queryKey: ['availableEquipments', selectedFactory],
    queryFn: () => fetchAvailableEquipments(selectedFactory),
    enabled: !!selectedFactory && editMode,
  });

  // 일정 업데이트 Mutation
  const updateScheduleMutation = useMutation({
    mutationFn: updateSchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inspectionSchedules', selectedFactory, selectedMonth] });
    },
  });

  // 월별 점검일 업데이트 Mutation
  const updateMonthlyDayMutation = useMutation({
    mutationFn: updateMonthlyInspectionDay,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthlyInspectionDay', selectedFactory, selectedMonth] });
    },
  });

  // 편집 모드 시작
  const handleStartEdit = () => {
    setEditedSchedules(schedules ? [...schedules] : []);
    setEditedInspectionDay(monthlyInspectionDay?.inspectionDay || 1);
    setEditMode(true);
  };

  // 편집 취소
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedSchedules([]);
    setEditedInspectionDay(1);
  };

  // 항목 추가
  const handleAddItem = () => {
    const newItem: InspectionScheduleItem = {
      factoryId: factories?.find(f => f.code === selectedFactory)?.id || 0,
      month: selectedMonth,
      equipmentName: '',
      displayOrder: editedSchedules.length + 1,
    };
    setEditedSchedules([...editedSchedules, newItem]);
  };

  // 항목 삭제
  const handleDeleteItem = (index: number) => {
    const updated = editedSchedules.filter((_, i) => i !== index);
    // 순서 재조정
    const reordered = updated.map((item, i) => ({ ...item, displayOrder: i + 1 }));
    setEditedSchedules(reordered);
  };

  // 장비명 변경
  const handleEquipmentNameChange = (index: number, value: string) => {
    const updated = [...editedSchedules];
    // Add "점검" suffix if not present
    const finalValue = value.includes('점검') ? value : `${value} 점검`;
    updated[index] = { ...updated[index], equipmentName: finalValue };
    setEditedSchedules(updated);
  };

  // 변경사항 저장
  const handleSaveChanges = async () => {
    if (!selectedFactory) {
      toast({ title: '공장을 선택하세요.', variant: 'destructive' });
      return;
    }

    // 유효성 검사: 장비명이 비어있으면 안됨
    const hasEmptyNames = editedSchedules.some(item => !item.equipmentName.trim());
    if (hasEmptyNames) {
      toast({ title: '장비명을 모두 입력하세요.', variant: 'destructive' });
      return;
    }

    try {
      // 월별 점검일과 일정을 모두 저장
      await Promise.all([
        updateMonthlyDayMutation.mutateAsync({
          factoryCode: selectedFactory,
          month: selectedMonth,
          inspectionDay: editedInspectionDay,
        }),
        updateScheduleMutation.mutateAsync({
          factoryCode: selectedFactory,
          month: selectedMonth,
          schedules: editedSchedules,
        }),
      ]);

      toast({ title: '점검 일정이 저장되었습니다.' });
      setEditMode(false);
    } catch (error: any) {
      toast({ title: '점검 일정 저장 실패', description: error.message, variant: 'destructive' });
    }
  };

  // 권한 체크: 관리자만 접근 가능
  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">관리자만 접근할 수 있는 페이지입니다.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const displaySchedules = editMode ? editedSchedules : schedules || [];
  const currentFactory = factories?.find(f => f.code === selectedFactory);
  const displayInspectionDay = editMode ? editedInspectionDay : (monthlyInspectionDay?.inspectionDay || 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle>월별 점검 일정 관리</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin-dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  관리자 대시보드로
                </Link>
              </Button>
            </div>
            <CardDescription>
              공장별, 월별 안전점검 일정을 관리합니다. 여기서 설정한 일정은 모든 미래 연도에 적용됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {factoriesLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-6">
                {/* 필터 영역 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="factory">공장</Label>
                    <Select value={selectedFactory} onValueChange={setSelectedFactory} disabled={editMode}>
                      <SelectTrigger id="factory">
                        <SelectValue placeholder="공장 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {factories?.map((factory) => (
                          <SelectItem key={factory.id} value={factory.code}>
                            {factory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="month">월</Label>
                    <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))} disabled={editMode}>
                      <SelectTrigger id="month">
                        <SelectValue placeholder="월 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month.value} value={String(month.value)}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 월별 점검일 설정 */}
                {!monthlyDayLoading && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <Label htmlFor="inspectionDay" className="text-sm font-medium">
                        {MONTHS.find(m => m.value === selectedMonth)?.label} 점검일
                      </Label>
                      {editMode ? (
                        <div className="flex items-center gap-2">
                          <Input
                            id="inspectionDay"
                            type="number"
                            min="1"
                            max="31"
                            value={editedInspectionDay}
                            onChange={(e) => setEditedInspectionDay(Math.max(1, Math.min(31, parseInt(e.target.value) || 1)))}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">일 (이 달의 모든 장비를 이 날에 점검)</span>
                        </div>
                      ) : (
                        <span className="text-lg font-semibold text-blue-700">{displayInspectionDay}일</span>
                      )}
                    </div>
                  </div>
                )}

                {/* 액션 버튼 */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {!editMode ? (
                      <Button onClick={handleStartEdit} size="sm">
                        <Pencil className="h-4 w-4 mr-1" />
                        일정 편집
                      </Button>
                    ) : (
                      <>
                        <Button onClick={handleAddItem} variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          항목 추가
                        </Button>
                        <Button onClick={handleSaveChanges} size="sm" disabled={updateScheduleMutation.isPending || updateMonthlyDayMutation.isPending}>
                          <Save className="h-4 w-4 mr-1" />
                          저장
                        </Button>
                        <Button onClick={handleCancelEdit} variant="outline" size="sm">
                          <X className="h-4 w-4 mr-1" />
                          취소
                        </Button>
                      </>
                    )}
                  </div>
                  {currentFactory && (
                    <span className="text-sm text-muted-foreground">
                      {currentFactory.name} - {MONTHS.find(m => m.value === selectedMonth)?.label}
                    </span>
                  )}
                </div>

                {/* 일정 테이블 */}
                {schedulesLoading ? (
                  <LoadingSpinner />
                ) : displaySchedules.length === 0 ? (
                  <EmptyState
                    title="등록된 점검 일정이 없습니다"
                    description={editMode ? "항목 추가 버튼을 눌러 일정을 등록하세요." : "일정 편집 버튼을 눌러 일정을 추가하세요."}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">순서</TableHead>
                        <TableHead>장비명</TableHead>
                        {editMode && <TableHead className="w-20 text-right">작업</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displaySchedules.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell>{item.displayOrder}</TableCell>
                          <TableCell>
                            {editMode ? (
                              availableEquipments ? (
                                (() => {
                                  // 현재 값에서 " 점검" 제거
                                  const currentValue = item.equipmentName.replace(' 점검', '');
                                  // 빈 값 필터링 후 선택지에 현재 값이 없으면 추가 (중복 방지)
                                  const filteredEquipments = availableEquipments.filter(eq => eq && eq.trim() !== '');
                                  const allOptions = filteredEquipments.includes(currentValue)
                                    ? filteredEquipments
                                    : currentValue && currentValue.trim() !== ''
                                      ? [currentValue, ...filteredEquipments]
                                      : filteredEquipments;
                                  const isNotInList = !filteredEquipments.includes(currentValue);

                                  return (
                                    <div className="space-y-1">
                                      <Select
                                        value={currentValue}
                                        onValueChange={(value) => handleEquipmentNameChange(index, value)}
                                      >
                                        <SelectTrigger className={isNotInList ? "border-yellow-500" : ""}>
                                          <SelectValue placeholder="장비 선택" />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                                          {allOptions.map((equipment) => (
                                            <SelectItem key={equipment} value={equipment}>
                                              {equipment}
                                              {equipment === currentValue && isNotInList && " ⚠️"}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {isNotInList && (
                                        <p className="text-xs text-yellow-600">
                                          ⚠️ 이 장비는 현재 공장 장비 목록에 없습니다
                                        </p>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : (
                                <div className="text-sm text-muted-foreground animate-pulse">
                                  장비 목록 로딩 중...
                                </div>
                              )
                            ) : (
                              <span>{item.equipmentName}</span>
                            )}
                          </TableCell>
                          {editMode && (
                            <TableCell className="text-right">
                              <Button
                                onClick={() => handleDeleteItem(index)}
                                variant="ghost"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* 안내 메시지 */}
                {!editMode && schedules && schedules.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded p-4 mt-4">
                    <p className="text-sm text-green-800">
                      <strong>안내:</strong> 이 일정은 템플릿으로 저장되어 모든 미래 연도에 자동 적용됩니다.
                      {currentFactory?.name} {MONTHS.find(m => m.value === selectedMonth)?.label}에는 {displayInspectionDay}일에
                      총 {schedules.length}개 장비를 점검합니다.
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
