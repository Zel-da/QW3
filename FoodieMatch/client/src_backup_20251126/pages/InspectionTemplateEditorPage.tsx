import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { GripVertical, Trash2, Plus, Save, X, Pencil, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';

interface Factory {
  id: number;
  name: string;
  code: string;
}

interface Team {
  id: number;
  name: string;
  site: string;
  factoryId: number | null;
}

interface TeamEquipment {
  id: number;
  teamId: number;
  equipmentName: string;
  quantity: number;
}

interface InspectionTemplateItem {
  id?: number;
  equipmentName: string;
  displayOrder: number;
  isRequired: boolean;
  fromTeamEquipment?: boolean;  // 실제 보유 장비인지 표시
  quantity?: number;  // 보유 수량
}

interface SortableRowProps {
  item: InspectionTemplateItem;
  index: number;
  isEditing: boolean;
  onToggleInclude: () => void;
  onChangeName: (name: string) => void;
  onDelete: () => void;
}

function SortableRow({ item, index, isEditing, onToggleInclude, onChangeName, onDelete }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.equipmentName + index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-12">
        {isEditing && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Input
            value={item.equipmentName}
            onChange={(e) => onChangeName(e.target.value)}
            className="h-8"
          />
        ) : (
          <span>{item.equipmentName}</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {item.fromTeamEquipment ? (
          <span className="text-sm text-muted-foreground">{item.quantity}대</span>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {isEditing ? (
          <Checkbox
            checked={item.isRequired}
            onCheckedChange={onToggleInclude}
          />
        ) : (
          <span>{item.isRequired ? '✓' : ''}</span>
        )}
      </TableCell>
      <TableCell className="w-16">
        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function InspectionTemplateEditorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedFactory, setSelectedFactory] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [isEditing, setIsEditing] = useState(false);
  const [equipmentItems, setEquipmentItems] = useState<InspectionTemplateItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 공장 목록 조회
  const { data: factories = [], isLoading: factoriesLoading } = useQuery<Factory[]>({
    queryKey: ['factories'],
    queryFn: async () => {
      const { data } = await axios.get('/api/factories');
      return data;
    },
  });

  // 팀 목록 조회
  const { data: allTeams = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await axios.get('/api/teams');
      return data;
    },
  });

  // 선택된 공장의 팀만 필터링
  const teams = selectedFactory
    ? allTeams.filter(team => team.factoryId === selectedFactory)
    : [];

  // 첫 공장 자동 선택
  useEffect(() => {
    if (factories.length > 0 && !selectedFactory) {
      setSelectedFactory(factories[0].id);
    }
  }, [factories, selectedFactory]);

  // 공장 변경 시 팀 선택 초기화
  useEffect(() => {
    setSelectedTeam(null);
    setIsEditing(false);
  }, [selectedFactory]);

  // 팀 변경 시 편집 모드 종료
  useEffect(() => {
    setIsEditing(false);
  }, [selectedTeam]);

  // 점검 템플릿 조회 (월별)
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['inspectionTemplate', selectedTeam, selectedMonth],
    queryFn: async () => {
      const { data } = await axios.get(`/api/teams/${selectedTeam}/inspection-template/${selectedMonth}`);
      return data;
    },
    enabled: !!selectedTeam && !!selectedMonth,
  });

  // 팀 보유 장비 조회
  const { data: teamEquipments = [] } = useQuery<TeamEquipment[]>({
    queryKey: ['teamEquipments', selectedTeam],
    queryFn: async () => {
      const { data } = await axios.get(`/api/teams/${selectedTeam}/equipments`);
      return data;
    },
    enabled: !!selectedTeam,
  });

  // 템플릿 + 팀 장비 통합
  useEffect(() => {
    if (!selectedTeam) {
      setEquipmentItems([]);
      return;
    }

    // 템플릿에서 로드한 장비들
    const templateItems: InspectionTemplateItem[] = Array.isArray(template)
      ? template.map((item: any, index: number) => ({
          id: item.id,
          equipmentName: item.equipmentName,
          displayOrder: item.displayOrder !== undefined ? item.displayOrder : index * 10,
          isRequired: item.isRequired !== undefined ? item.isRequired : true,
          fromTeamEquipment: false,
        }))
      : [];

    // 팀 보유 장비들 추가 (템플릿에 없는 것만)
    const existingNames = new Set(templateItems.map(item => item.equipmentName));
    const maxOrder = templateItems.length > 0
      ? Math.max(...templateItems.map(item => item.displayOrder))
      : 0;

    teamEquipments.forEach((equipment, index) => {
      if (!existingNames.has(equipment.equipmentName)) {
        templateItems.push({
          equipmentName: equipment.equipmentName,
          displayOrder: maxOrder + (index + 1) * 10,
          isRequired: false,  // 기본적으로 포함하지 않음
          fromTeamEquipment: true,
          quantity: equipment.quantity,
        });
      } else {
        // 이미 템플릿에 있으면 quantity만 업데이트
        const existing = templateItems.find(item => item.equipmentName === equipment.equipmentName);
        if (existing) {
          existing.fromTeamEquipment = true;
          existing.quantity = equipment.quantity;
        }
      }
    });

    setEquipmentItems(templateItems.sort((a, b) => a.displayOrder - b.displayOrder));
  }, [template, teamEquipments, selectedTeam]);

  // 저장 Mutation
  const saveMutation = useMutation({
    mutationFn: async ({ teamId, month, equipmentList }: { teamId: number; month: number; equipmentList: InspectionTemplateItem[] }) => {
      const { data } = await axios.put(`/api/teams/${teamId}/inspection-template/${month}`, { equipmentList });
      return data;
    },
    onSuccess: () => {
      toast({ title: '저장 완료', description: '안전점검 템플릿이 저장되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['inspectionTemplate', selectedTeam, selectedMonth] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: '저장 실패',
        description: error.message || '템플릿 저장에 실패했습니다.',
        variant: 'destructive',
      });
    },
  });

  // 편집 모드 시작
  const handleStartEdit = () => {
    setIsEditing(true);
  };

  // 편집 취소
  const handleCancelEdit = () => {
    setIsEditing(false);
    // 다시 로드
    queryClient.invalidateQueries({ queryKey: ['inspectionTemplate', selectedTeam, selectedMonth] });
  };

  // 항목 추가
  const handleAddItem = () => {
    const maxOrder = equipmentItems.length > 0
      ? Math.max(...equipmentItems.map(item => item.displayOrder))
      : 0;

    setEquipmentItems([
      ...equipmentItems,
      {
        equipmentName: '',
        displayOrder: maxOrder + 10,
        isRequired: true,
        fromTeamEquipment: false,
      },
    ]);
  };

  // 항목 삭제
  const handleDeleteItem = (index: number) => {
    setEquipmentItems(equipmentItems.filter((_, i) => i !== index));
  };

  // 장비명 변경
  const handleChangeName = (index: number, name: string) => {
    const updated = [...equipmentItems];
    updated[index] = { ...updated[index], equipmentName: name };
    setEquipmentItems(updated);
  };

  // 포함 여부 토글
  const handleToggleInclude = (index: number) => {
    const updated = [...equipmentItems];
    updated[index] = { ...updated[index], isRequired: !updated[index].isRequired };
    setEquipmentItems(updated);
  };

  // 드래그 앤 드롭
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = equipmentItems.findIndex((_, idx) => (item.equipmentName + idx) === active.id);
      const newIndex = equipmentItems.findIndex((_, idx) => (item.equipmentName + idx) === over.id);

      const reordered = arrayMove(equipmentItems, oldIndex, newIndex);
      // 순서 재정렬
      reordered.forEach((item, idx) => {
        item.displayOrder = idx * 10;
      });
      setEquipmentItems(reordered);
    }
  };

  // 저장
  const handleSave = () => {
    if (!selectedTeam || !selectedMonth) return;

    // 빈 이름 체크
    const hasEmpty = equipmentItems.some(item => !item.equipmentName.trim());
    if (hasEmpty) {
      toast({
        title: '오류',
        description: '장비명을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const equipmentList = equipmentItems.map((item, index) => ({
      equipmentName: item.equipmentName.trim(),
      displayOrder: index * 10,
      isRequired: item.isRequired,
    }));

    saveMutation.mutate({ teamId: selectedTeam, month: selectedMonth, equipmentList });
  };

  const selectedFactoryData = factories.find(f => f.id === selectedFactory);
  const selectedTeamData = teams.find(t => t.id === selectedTeam);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle>안전점검 템플릿 편집기</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin-dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  관리자 대시보드로
                </Link>
              </Button>
            </div>
            <CardDescription>
              팀별 안전점검 설비 목록을 관리합니다. 라인 장비 관리에서 등록한 장비가 자동으로 표시됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {factoriesLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-6">
                {/* 필터 영역 */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="factory">공장</Label>
                    <Select value={selectedFactory?.toString()} onValueChange={(v) => setSelectedFactory(parseInt(v))} disabled={isEditing}>
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
                  <div>
                    <Label htmlFor="team">팀</Label>
                    <Select value={selectedTeam?.toString()} onValueChange={(v) => setSelectedTeam(parseInt(v))} disabled={isEditing}>
                      <SelectTrigger id="team">
                        <SelectValue placeholder="팀 선택" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto scrollbar-visible">
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="month">월</Label>
                    <Select value={selectedMonth?.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))} disabled={isEditing}>
                      <SelectTrigger id="month">
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
                </div>

                {selectedTeam && (
                  <>
                    {/* 액션 버튼 */}
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        {!isEditing ? (
                          <Button onClick={handleStartEdit} size="sm">
                            <Pencil className="h-4 w-4 mr-1" />
                            편집
                          </Button>
                        ) : (
                          <>
                            <Button onClick={handleAddItem} variant="outline" size="sm">
                              <Plus className="h-4 w-4 mr-1" />
                              항목 추가
                            </Button>
                            <Button onClick={handleSave} size="sm" disabled={saveMutation.isPending}>
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
                      <span className="text-sm text-muted-foreground">
                        {selectedFactoryData?.name} - {selectedTeamData?.name}
                      </span>
                    </div>

                    {/* 테이블 */}
                    {templateLoading ? (
                      <LoadingSpinner />
                    ) : equipmentItems.length === 0 ? (
                      <EmptyState
                        title="등록된 설비가 없습니다"
                        description={isEditing ? "항목 추가 버튼을 눌러 설비를 등록하세요." : "편집 버튼을 눌러 설비를 추가하세요."}
                      />
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="border rounded-md">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>장비명</TableHead>
                                <TableHead className="text-center w-24">보유 수량</TableHead>
                                <TableHead className="text-center w-24">점검 포함</TableHead>
                                <TableHead className="w-16"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <SortableContext
                                items={equipmentItems.map((item, idx) => item.equipmentName + idx)}
                                strategy={verticalListSortingStrategy}
                              >
                                {equipmentItems.map((item, index) => (
                                  <SortableRow
                                    key={item.equipmentName + index}
                                    item={item}
                                    index={index}
                                    isEditing={isEditing}
                                    onToggleInclude={() => handleToggleInclude(index)}
                                    onChangeName={(name) => handleChangeName(index, name)}
                                    onDelete={() => handleDeleteItem(index)}
                                  />
                                ))}
                              </SortableContext>
                            </TableBody>
                          </Table>
                        </div>
                      </DndContext>
                    )}

                    {/* 안내 메시지 */}
                    {!isEditing && equipmentItems.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-4">
                        <p className="text-sm text-blue-800">
                          <strong>안내:</strong> '라인 장비 관리' 페이지에서 등록한 장비가 자동으로 표시됩니다.
                          '점검 포함' 체크박스로 실제 점검할 장비를 선택하세요.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
