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
import { AdminPageLayout, PageHeader } from '@/components/admin';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { GripVertical, Trash2, Plus, Save, X, Pencil, Package, ClipboardList, Copy, Loader2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  createdAt?: string;
  updatedAt?: string;
}

interface InspectionTemplateItem {
  id?: number;
  equipmentName: string;
  displayOrder: number;
  isRequired: boolean;
  fromTeamEquipment?: boolean;
  quantity?: number;
}

// 드래그 가능한 템플릿 행
interface SortableTemplateRowProps {
  item: InspectionTemplateItem;
  index: number;
  isEditing: boolean;
  onToggleInclude: () => void;
  onChangeName: (name: string) => void;
  onDelete: () => void;
}

function SortableTemplateRow({ item, index, isEditing, onToggleInclude, onChangeName, onDelete }: SortableTemplateRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: `template-${item.equipmentName}-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
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
      <TableCell className="w-12">
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

export default function TeamEquipmentManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 공통 선택 상태
  const [selectedFactory, setSelectedFactory] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  // 장비 섹션 상태
  const [equipmentEditMode, setEquipmentEditMode] = useState(false);
  const [editedEquipments, setEditedEquipments] = useState<TeamEquipment[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newEquipmentQuantity, setNewEquipmentQuantity] = useState(1);

  // 템플릿 섹션 상태
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [templateEditMode, setTemplateEditMode] = useState(false);
  const [templateItems, setTemplateItems] = useState<InspectionTemplateItem[]>([]);

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

  // 공장 변경 시 팀 선택 초기화 및 첫 팀 자동 선택
  useEffect(() => {
    setSelectedTeam(null);
    setEquipmentEditMode(false);
    setTemplateEditMode(false);
    setShowAddForm(false);
  }, [selectedFactory]);

  // 팀 목록 로드 후 첫 번째 팀 자동 선택
  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0].id);
    }
  }, [teams, selectedTeam]);

  // 팀 변경 시 편집 모드 종료
  useEffect(() => {
    setEquipmentEditMode(false);
    setTemplateEditMode(false);
    setShowAddForm(false);
  }, [selectedTeam]);

  // ============== 장비 섹션 ==============

  // 장비 목록 조회
  const { data: equipments = [], isLoading: equipmentsLoading } = useQuery<TeamEquipment[]>({
    queryKey: ['teamEquipments', selectedTeam],
    queryFn: async () => {
      const { data } = await axios.get(`/api/teams/${selectedTeam}/equipments`);
      return data;
    },
    enabled: !!selectedTeam,
  });

  // 장비 추가 Mutation
  const addEquipmentMutation = useMutation({
    mutationFn: async ({ teamId, equipmentName, quantity }: { teamId: number; equipmentName: string; quantity: number }) => {
      const { data } = await axios.post(`/api/teams/${teamId}/equipments`, { equipmentName, quantity });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamEquipments', selectedTeam] });
      queryClient.invalidateQueries({ queryKey: ['inspectionTemplate', selectedTeam] });
      toast({ title: '장비가 추가되었습니다.' });
      setNewEquipmentName('');
      setNewEquipmentQuantity(1);
      setShowAddForm(false);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || '장비 추가에 실패했습니다.';
      toast({ title: '장비 추가 실패', description: message, variant: 'destructive' });
    },
  });

  // 장비 일괄 업데이트 Mutation
  const updateEquipmentsMutation = useMutation({
    mutationFn: async ({ teamId, equipments }: { teamId: number; equipments: TeamEquipment[] }) => {
      const { data } = await axios.put(`/api/teams/${teamId}/equipments`, { equipments });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamEquipments', selectedTeam] });
      toast({ title: '장비 정보가 저장되었습니다.' });
      setEquipmentEditMode(false);
    },
    onError: (error: any) => {
      toast({ title: '장비 정보 저장 실패', description: error.message, variant: 'destructive' });
    },
  });

  // 장비 삭제 Mutation
  const deleteEquipmentMutation = useMutation({
    mutationFn: async ({ teamId, equipmentId }: { teamId: number; equipmentId: number }) => {
      await axios.delete(`/api/teams/${teamId}/equipments/${equipmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamEquipments', selectedTeam] });
      queryClient.invalidateQueries({ queryKey: ['inspectionTemplate', selectedTeam] });
      toast({ title: '장비가 삭제되었습니다.' });
    },
    onError: (error: any) => {
      toast({ title: '장비 삭제 실패', description: error.message, variant: 'destructive' });
    },
  });

  // 장비 편집 시작
  const handleStartEquipmentEdit = () => {
    setEditedEquipments([...equipments]);
    setEquipmentEditMode(true);
  };

  // 장비 편집 취소
  const handleCancelEquipmentEdit = () => {
    setEquipmentEditMode(false);
    setEditedEquipments([]);
  };

  // 장비 수량 변경
  const handleQuantityChange = (index: number, newQuantity: number) => {
    const updated = [...editedEquipments];
    updated[index] = { ...updated[index], quantity: Math.max(1, newQuantity) };
    setEditedEquipments(updated);
  };

  // 장비 변경 저장
  const handleSaveEquipments = () => {
    if (!selectedTeam) return;
    updateEquipmentsMutation.mutate({ teamId: selectedTeam, equipments: editedEquipments });
  };

  // 장비 추가
  const handleAddEquipment = () => {
    if (!selectedTeam || !newEquipmentName.trim()) {
      toast({ title: '장비명을 입력하세요.', variant: 'destructive' });
      return;
    }
    addEquipmentMutation.mutate({
      teamId: selectedTeam,
      equipmentName: newEquipmentName.trim(),
      quantity: newEquipmentQuantity,
    });
  };

  // 장비 삭제 (AlertDialog에서 호출됨)
  const handleConfirmDeleteEquipment = (equipmentId: number) => {
    if (!selectedTeam) return;
    deleteEquipmentMutation.mutate({ teamId: selectedTeam, equipmentId });
  };

  // ============== 템플릿 섹션 ==============

  // 점검 템플릿 조회
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['inspectionTemplate', selectedTeam, selectedMonth],
    queryFn: async () => {
      const { data } = await axios.get(`/api/teams/${selectedTeam}/inspection-template/${selectedMonth}`);
      return data;
    },
    enabled: !!selectedTeam && !!selectedMonth,
  });

  // 템플릿 + 팀 장비 통합
  useEffect(() => {
    if (!selectedTeam) {
      setTemplateItems([]);
      return;
    }

    // 템플릿에서 로드한 장비들
    const items: InspectionTemplateItem[] = Array.isArray(template)
      ? template.map((item: any, index: number) => ({
          id: item.id,
          equipmentName: item.equipmentName,
          displayOrder: item.displayOrder !== undefined ? item.displayOrder : index * 10,
          isRequired: item.isRequired !== undefined ? item.isRequired : true,
          fromTeamEquipment: false,
        }))
      : [];

    // 팀 보유 장비들 추가 (템플릿에 없는 것만)
    const existingNames = new Set(items.map(item => item.equipmentName));
    const maxOrder = items.length > 0
      ? Math.max(...items.map(item => item.displayOrder))
      : 0;

    equipments.forEach((equipment, index) => {
      if (!existingNames.has(equipment.equipmentName)) {
        items.push({
          equipmentName: equipment.equipmentName,
          displayOrder: maxOrder + (index + 1) * 10,
          isRequired: false,
          fromTeamEquipment: true,
          quantity: equipment.quantity,
        });
      } else {
        const existing = items.find(item => item.equipmentName === equipment.equipmentName);
        if (existing) {
          existing.fromTeamEquipment = true;
          existing.quantity = equipment.quantity;
        }
      }
    });

    setTemplateItems(items.sort((a, b) => a.displayOrder - b.displayOrder));
  }, [template, equipments, selectedTeam]);

  // 템플릿 저장 Mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async ({ teamId, month, equipmentList }: { teamId: number; month: number; equipmentList: InspectionTemplateItem[] }) => {
      const { data } = await axios.put(`/api/teams/${teamId}/inspection-template/${month}`, { equipmentList });
      return data;
    },
    onSuccess: () => {
      toast({ title: '저장 완료', description: '안전점검 템플릿이 저장되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['inspectionTemplate', selectedTeam, selectedMonth] });
      setTemplateEditMode(false);
    },
    onError: (error: any) => {
      toast({
        title: '저장 실패',
        description: error.message || '템플릿 저장에 실패했습니다.',
        variant: 'destructive',
      });
    },
  });

  // 템플릿 편집 시작
  const handleStartTemplateEdit = () => {
    setTemplateEditMode(true);
  };

  // 템플릿 편집 취소
  const handleCancelTemplateEdit = () => {
    setTemplateEditMode(false);
    queryClient.invalidateQueries({ queryKey: ['inspectionTemplate', selectedTeam, selectedMonth] });
  };

  // 템플릿 항목 추가
  const handleAddTemplateItem = () => {
    const maxOrder = templateItems.length > 0
      ? Math.max(...templateItems.map(item => item.displayOrder))
      : 0;

    setTemplateItems([
      ...templateItems,
      {
        equipmentName: '',
        displayOrder: maxOrder + 10,
        isRequired: true,
        fromTeamEquipment: false,
      },
    ]);
  };

  // 템플릿 항목 삭제
  const handleDeleteTemplateItem = (index: number) => {
    setTemplateItems(templateItems.filter((_, i) => i !== index));
  };

  // 장비명 변경
  const handleChangeTemplateName = (index: number, name: string) => {
    const updated = [...templateItems];
    updated[index] = { ...updated[index], equipmentName: name };
    setTemplateItems(updated);
  };

  // 포함 여부 토글
  const handleToggleInclude = (index: number) => {
    const updated = [...templateItems];
    updated[index] = { ...updated[index], isRequired: !updated[index].isRequired };
    setTemplateItems(updated);
  };

  // 전체 체크/해제
  const handleToggleAllInclude = (checked: boolean) => {
    const updated = templateItems.map(item => ({ ...item, isRequired: checked }));
    setTemplateItems(updated);
  };

  // 전체 선택 상태 계산
  const allChecked = templateItems.length > 0 && templateItems.every(item => item.isRequired);
  const someChecked = templateItems.some(item => item.isRequired) && !allChecked;

  // 이전 월에서 복사
  const handleCopyFromPreviousMonth = () => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;

    // 이전 월 템플릿을 가져와서 현재 템플릿에 복사
    axios.get(`/api/teams/${selectedTeam}/inspection-template/${prevMonth}`)
      .then(({ data }) => {
        if (Array.isArray(data) && data.length > 0) {
          const copiedItems: InspectionTemplateItem[] = data.map((item: any, index: number) => ({
            equipmentName: item.equipmentName,
            displayOrder: item.displayOrder !== undefined ? item.displayOrder : index * 10,
            isRequired: item.isRequired !== undefined ? item.isRequired : true,
            fromTeamEquipment: false,
          }));

          // 현재 보유 장비 정보 업데이트
          const existingNames = new Set(copiedItems.map(item => item.equipmentName));
          equipments.forEach((equipment) => {
            const existing = copiedItems.find(item => item.equipmentName === equipment.equipmentName);
            if (existing) {
              existing.fromTeamEquipment = true;
              existing.quantity = equipment.quantity;
            }
          });

          setTemplateItems(copiedItems);
          toast({ title: '복사 완료', description: `${prevMonth}월 템플릿이 복사되었습니다.` });
        } else {
          toast({
            title: '복사 실패',
            description: `${prevMonth}월에 등록된 템플릿이 없습니다.`,
            variant: 'destructive'
          });
        }
      })
      .catch(() => {
        toast({
          title: '복사 실패',
          description: `${prevMonth}월 템플릿을 가져오는 데 실패했습니다.`,
          variant: 'destructive'
        });
      });
  };

  // 드래그 앤 드롭
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = templateItems.findIndex((item, idx) => `template-${item.equipmentName}-${idx}` === active.id);
      const newIndex = templateItems.findIndex((item, idx) => `template-${item.equipmentName}-${idx}` === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(templateItems, oldIndex, newIndex);
        reordered.forEach((item, idx) => {
          item.displayOrder = idx * 10;
        });
        setTemplateItems(reordered);
      }
    }
  };

  // 템플릿 저장
  const handleSaveTemplate = () => {
    if (!selectedTeam || !selectedMonth) return;

    const hasEmpty = templateItems.some(item => !item.equipmentName.trim());
    if (hasEmpty) {
      toast({
        title: '오류',
        description: '장비명을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const equipmentList = templateItems.map((item, index) => ({
      equipmentName: item.equipmentName.trim(),
      displayOrder: index * 10,
      isRequired: item.isRequired,
    }));

    saveTemplateMutation.mutate({ teamId: selectedTeam, month: selectedMonth, equipmentList });
  };

  // 권한 체크
  if (user?.role !== 'ADMIN') {
    return (
      <AdminPageLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">관리자만 접근할 수 있는 페이지입니다.</p>
          </CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  const selectedFactoryData = factories.find(f => f.id === selectedFactory);
  const selectedTeamData = teams.find(t => t.id === selectedTeam);
  const displayEquipments = equipmentEditMode ? editedEquipments : equipments;

  // 편집 중일 때 다른 섹션 편집 비활성화
  const isAnyEditing = equipmentEditMode || templateEditMode || showAddForm;

  return (
    <AdminPageLayout maxWidth="wide">
      <PageHeader
        title="팀 장비/점검 관리"
        description="팀별 보유 장비 및 월별 점검 템플릿을 관리합니다."
        icon={<Package className="h-6 w-6" />}
        backUrl="/admin-dashboard"
        backText="대시보드"
      />

      {/* 공장/팀 선택 카드 */}
      <Card>
        <CardContent className="pt-6">
            {factoriesLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="factory">공장</Label>
                  <Select
                    value={selectedFactory?.toString()}
                    onValueChange={(v) => setSelectedFactory(parseInt(v))}
                    disabled={isAnyEditing}
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
                <div>
                  <Label htmlFor="team">팀</Label>
                  <Select
                    value={selectedTeam?.toString()}
                    onValueChange={(v) => setSelectedTeam(parseInt(v))}
                    disabled={isAnyEditing}
                  >
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
              </div>
            )}
          </CardContent>
        </Card>

        {selectedTeam && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 라인 보유 장비 섹션 */}
            <Card className={`flex flex-col h-[calc(100vh-280px)] ${equipmentEditMode || showAddForm ? "border-2 border-blue-500 shadow-md" : ""}`}>
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">라인 보유 장비</CardTitle>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  팀 보유 장비 관리. 추가 시 점검 템플릿에 자동 반영.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden flex flex-col">
                {equipmentsLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="space-y-3 flex flex-col flex-1 overflow-hidden">
                    {/* 액션 버튼 */}
                    <div className="flex gap-2">
                      {!equipmentEditMode && !showAddForm && (
                        <>
                          <Button
                            onClick={() => setShowAddForm(true)}
                            size="sm"
                            disabled={templateEditMode}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            장비 추가
                          </Button>
                          <Button
                            onClick={handleStartEquipmentEdit}
                            variant="outline"
                            size="sm"
                            disabled={templateEditMode || equipments.length === 0}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            수량 수정
                          </Button>
                        </>
                      )}
                      {equipmentEditMode && (
                        <>
                          <Button onClick={handleSaveEquipments} size="sm" disabled={updateEquipmentsMutation.isPending}>
                            {updateEquipmentsMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-1" />
                            )}
                            저장
                          </Button>
                          <Button onClick={handleCancelEquipmentEdit} variant="outline" size="sm">
                            <X className="h-4 w-4 mr-1" />
                            취소
                          </Button>
                        </>
                      )}
                    </div>

                    {/* 장비 추가 폼 */}
                    {showAddForm && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="newEquipmentName">장비명</Label>
                            <Input
                              id="newEquipmentName"
                              value={newEquipmentName}
                              onChange={(e) => setNewEquipmentName(e.target.value)}
                              placeholder="예: 지게차, 크레인 등"
                            />
                          </div>
                          <div>
                            <Label htmlFor="newEquipmentQuantity">개수</Label>
                            <Input
                              id="newEquipmentQuantity"
                              type="number"
                              min="1"
                              value={newEquipmentQuantity}
                              onChange={(e) => setNewEquipmentQuantity(parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button onClick={handleAddEquipment} size="sm" disabled={addEquipmentMutation.isPending}>
                            {addEquipmentMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Plus className="h-4 w-4 mr-1" />
                            )}
                            추가
                          </Button>
                          <Button onClick={() => setShowAddForm(false)} variant="outline" size="sm">
                            <X className="h-4 w-4 mr-1" />
                            취소
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* 장비 목록 테이블 */}
                    {displayEquipments.length === 0 ? (
                      <EmptyState
                        title="등록된 장비가 없습니다"
                        description="장비 추가 버튼을 눌러 장비를 등록하세요."
                      />
                    ) : (
                      <div className="border rounded-md flex-1 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>장비명</TableHead>
                              <TableHead className="w-24">개수</TableHead>
                              {!equipmentEditMode && <TableHead className="w-16 text-right">삭제</TableHead>}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayEquipments.map((equipment, index) => (
                              <TableRow key={equipment.id}>
                                <TableCell className="font-medium">{equipment.equipmentName}</TableCell>
                                <TableCell>
                                  {equipmentEditMode ? (
                                    <Input
                                      type="number"
                                      min="1"
                                      value={equipment.quantity}
                                      onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                      className="w-20 h-8"
                                    />
                                  ) : (
                                    <span>{equipment.quantity}대</span>
                                  )}
                                </TableCell>
                                {!equipmentEditMode && (
                                  <TableCell className="text-right">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={deleteEquipmentMutation.isPending || templateEditMode}
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>장비 삭제</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            '{equipment.equipmentName}' 장비를 삭제하시겠습니까?
                                            <br />
                                            삭제된 장비는 복구할 수 없습니다.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>취소</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleConfirmDeleteEquipment(equipment.id)}
                                            className="bg-red-500 hover:bg-red-600"
                                          >
                                            삭제
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 월별 점검 템플릿 섹션 */}
            <Card className={`flex flex-col h-[calc(100vh-280px)] ${templateEditMode ? "border-2 border-green-500 shadow-md" : ""}`}>
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-green-600" />
                    <CardTitle className="text-lg">월별 점검 템플릿</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedMonth?.toString()}
                      onValueChange={(v) => setSelectedMonth(parseInt(v))}
                      disabled={templateEditMode}
                    >
                      <SelectTrigger id="month" className="w-20 h-8">
                        <SelectValue placeholder="월" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <SelectItem key={month} value={month.toString()}>
                            {month}월
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <CardDescription className="text-xs">
                  드래그로 순서 변경, 체크박스로 점검 장비 선택.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden flex flex-col">
                {templateLoading ? (
                  <LoadingSpinner />
                ) : (
                  <div className="space-y-3 flex flex-col flex-1 overflow-hidden">
                    {/* 액션 버튼 */}
                    <div className="flex gap-2">
                      {!templateEditMode ? (
                        <Button
                          onClick={handleStartTemplateEdit}
                          size="sm"
                          disabled={equipmentEditMode || showAddForm}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          편집
                        </Button>
                      ) : (
                        <>
                          <Button onClick={handleCopyFromPreviousMonth} variant="outline" size="sm">
                            <Copy className="h-4 w-4 mr-1" />
                            이전 월 복사
                          </Button>
                          <Button onClick={handleAddTemplateItem} variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            항목 추가
                          </Button>
                          <Button onClick={handleSaveTemplate} size="sm" disabled={saveTemplateMutation.isPending}>
                            {saveTemplateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4 mr-1" />
                            )}
                            저장
                          </Button>
                          <Button onClick={handleCancelTemplateEdit} variant="outline" size="sm">
                            <X className="h-4 w-4 mr-1" />
                            취소
                          </Button>
                        </>
                      )}
                    </div>

                    {/* 템플릿 테이블 */}
                    {templateItems.length === 0 ? (
                      <EmptyState
                        title="등록된 점검 항목이 없습니다"
                        description={templateEditMode ? "항목 추가 버튼을 눌러 점검 항목을 추가하세요." : "편집 버튼을 눌러 점검 항목을 추가하세요."}
                      />
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="border rounded-md flex-1 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-10"></TableHead>
                                <TableHead>장비명</TableHead>
                                <TableHead className="text-center w-24">보유 수량</TableHead>
                                <TableHead className="text-center w-24">
                                  <div className="flex items-center justify-center gap-1">
                                    {templateEditMode && (
                                      <Checkbox
                                        checked={allChecked}
                                        ref={(el) => {
                                          if (el) {
                                            (el as any).indeterminate = someChecked;
                                          }
                                        }}
                                        onCheckedChange={(checked) => handleToggleAllInclude(!!checked)}
                                        className="mr-1"
                                      />
                                    )}
                                    <span>점검 포함</span>
                                  </div>
                                </TableHead>
                                <TableHead className="w-12"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <SortableContext
                                items={templateItems.map((item, idx) => `template-${item.equipmentName}-${idx}`)}
                                strategy={verticalListSortingStrategy}
                              >
                                {templateItems.map((item, index) => (
                                  <SortableTemplateRow
                                    key={`template-${item.equipmentName}-${index}`}
                                    item={item}
                                    index={index}
                                    isEditing={templateEditMode}
                                    onToggleInclude={() => handleToggleInclude(index)}
                                    onChangeName={(name) => handleChangeTemplateName(index, name)}
                                    onDelete={() => handleDeleteTemplateItem(index)}
                                  />
                                ))}
                              </SortableContext>
                            </TableBody>
                          </Table>
                        </div>
                      </DndContext>
                    )}

                    {/* 안내 메시지 */}
                    {!templateEditMode && templateItems.length > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-2 flex-shrink-0">
                        <p className="text-xs text-blue-800">
                          좌측 장비 추가 시 자동 반영됩니다. 편집으로 순서/포함 설정 가능.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      {!selectedTeam && !factoriesLoading && (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="팀을 선택하세요"
              description="공장과 팀을 선택하면 해당 팀의 장비 및 점검 템플릿을 관리할 수 있습니다."
            />
          </CardContent>
        </Card>
      )}
    </AdminPageLayout>
  );
}
