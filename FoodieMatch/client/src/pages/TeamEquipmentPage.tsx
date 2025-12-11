import React, { useState, useEffect } from 'react';
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
import { Pencil, Trash2, Plus, Save, X, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { apiRequest } from '@/lib/queryClient';

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
  createdAt: string;
  updatedAt: string;
}

const fetchTeamEquipments = async (teamId: number): Promise<TeamEquipment[]> => {
  const res = await fetch(`/api/teams/${teamId}/equipments`);
  if (!res.ok) throw new Error('Failed to fetch team equipments');
  return res.json();
};

const addTeamEquipment = async ({ teamId, equipmentName, quantity }: { teamId: number; equipmentName: string; quantity: number }) => {
  const res = await apiRequest('POST', `/api/teams/${teamId}/equipments`, { equipmentName, quantity });
  return res.json();
};

const updateTeamEquipments = async ({ teamId, equipments }: { teamId: number; equipments: TeamEquipment[] }) => {
  const res = await apiRequest('PUT', `/api/teams/${teamId}/equipments`, { equipments });
  return res.json();
};

const deleteTeamEquipment = async ({ teamId, equipmentId }: { teamId: number; equipmentId: number }) => {
  await apiRequest('DELETE', `/api/teams/${teamId}/equipments/${equipmentId}`);
};

export default function TeamEquipmentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [editedEquipments, setEditedEquipments] = useState<TeamEquipment[]>([]);
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newEquipmentQuantity, setNewEquipmentQuantity] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFactory, setSelectedFactory] = useState<number | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  // 공장 목록 조회
  const { data: factories = [] } = useQuery<Factory[]>({
    queryKey: ['factories'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/factories');
      return res.json();
    },
  });

  // 전체 팀 목록 조회
  const { data: allTeams = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/teams');
      return res.json();
    },
  });

  // 선택된 공장의 팀만 필터링
  const teams = selectedFactory
    ? allTeams.filter(team => team.factoryId === selectedFactory)
    : [];

  // 첫 로드 시 첫 번째 공장과 팀 자동 선택
  useEffect(() => {
    if (factories.length > 0 && !selectedFactory) {
      setSelectedFactory(factories[0].id);
    }
  }, [factories, selectedFactory]);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0].id);
    }
  }, [teams, selectedTeam]);

  // 공장 변경 시 팀 선택 초기화
  useEffect(() => {
    setSelectedTeam(null);
    setEditMode(false);
  }, [selectedFactory]);

  // 장비 목록 조회
  const { data: equipments, isLoading, error } = useQuery({
    queryKey: ['teamEquipments', selectedTeam],
    queryFn: () => fetchTeamEquipments(selectedTeam!),
    enabled: !!selectedTeam,
  });

  // 장비 추가 Mutation
  const addEquipmentMutation = useMutation({
    mutationFn: addTeamEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamEquipments', selectedTeam] });
      toast({ title: '장비가 추가되었습니다.' });
      setNewEquipmentName('');
      setNewEquipmentQuantity(1);
      setShowAddForm(false);
    },
    onError: (error: Error) => {
      toast({ title: '장비 추가 실패', description: error.message, variant: 'destructive' });
    },
  });

  // 장비 일괄 업데이트 Mutation
  const updateEquipmentsMutation = useMutation({
    mutationFn: updateTeamEquipments,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamEquipments', selectedTeam] });
      toast({ title: '장비 정보가 저장되었습니다.' });
      setEditMode(false);
    },
    onError: (error: Error) => {
      toast({ title: '장비 정보 저장 실패', description: error.message, variant: 'destructive' });
    },
  });

  // 장비 삭제 Mutation
  const deleteEquipmentMutation = useMutation({
    mutationFn: deleteTeamEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamEquipments', selectedTeam] });
      toast({ title: '장비가 삭제되었습니다.' });
    },
    onError: (error: Error) => {
      toast({ title: '장비 삭제 실패', description: error.message, variant: 'destructive' });
    },
  });

  // 편집 모드 시작
  const handleStartEdit = () => {
    setEditedEquipments(equipments ? [...equipments] : []);
    setEditMode(true);
  };

  // 편집 취소
  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedEquipments([]);
  };

  // 장비 수량 변경
  const handleQuantityChange = (index: number, newQuantity: number) => {
    const updated = [...editedEquipments];
    updated[index] = { ...updated[index], quantity: Math.max(1, newQuantity) };
    setEditedEquipments(updated);
  };

  // 변경사항 저장
  const handleSaveChanges = () => {
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

  // 장비 삭제
  const handleDeleteEquipment = (equipmentId: number) => {
    if (!selectedTeam) return;
    if (confirm('정말 이 장비를 삭제하시겠습니까?')) {
      deleteEquipmentMutation.mutate({ teamId: selectedTeam, equipmentId });
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

  const displayEquipments = editMode ? editedEquipments : equipments || [];
  const selectedTeamName = teams.find(t => t.id === selectedTeam)?.name || '';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle>라인 장비 관리</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin-dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  관리자 대시보드로
                </Link>
              </Button>
            </div>
            <CardDescription>
              팀별 보유 장비를 관리합니다. 장비 개수만큼 안전점검 시 사진이 필요합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 공장/팀 선택 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="factory-select">공장</Label>
                <Select
                  value={selectedFactory?.toString() || ''}
                  onValueChange={(value) => setSelectedFactory(parseInt(value))}
                  disabled={editMode}
                >
                  <SelectTrigger id="factory-select">
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
                <Label htmlFor="team-select">팀</Label>
                <Select
                  value={selectedTeam?.toString() || ''}
                  onValueChange={(value) => setSelectedTeam(parseInt(value))}
                  disabled={!selectedFactory || editMode}
                >
                  <SelectTrigger id="team-select">
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

            {!selectedTeam ? (
              <EmptyState
                title="팀을 선택하세요"
                description="공장과 팀을 선택하면 해당 팀의 장비 목록이 표시됩니다."
              />
            ) : isLoading ? (
              <LoadingSpinner />
            ) : error ? (
              <div className="text-center text-red-500">장비 목록을 불러오는데 실패했습니다.</div>
            ) : (
              <div className="space-y-4">
                {/* 액션 버튼 */}
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {!editMode && !showAddForm && (
                      <>
                        <Button onClick={() => setShowAddForm(true)} size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          장비 추가
                        </Button>
                        <Button onClick={handleStartEdit} variant="outline" size="sm">
                          <Pencil className="h-4 w-4 mr-1" />
                          수량 수정
                        </Button>
                      </>
                    )}
                    {editMode && (
                      <>
                        <Button onClick={handleSaveChanges} size="sm" disabled={updateEquipmentsMutation.isPending}>
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
                </div>

                {/* 장비 추가 폼 */}
                {showAddForm && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4">
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
                          <Plus className="h-4 w-4 mr-1" />
                          추가
                        </Button>
                        <Button onClick={() => setShowAddForm(false)} variant="outline" size="sm">
                          <X className="h-4 w-4 mr-1" />
                          취소
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* 장비 목록 테이블 */}
                {displayEquipments.length === 0 ? (
                  <EmptyState
                    title="등록된 장비가 없습니다"
                    description="장비 추가 버튼을 눌러 장비를 등록하세요."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>장비명</TableHead>
                        <TableHead>개수</TableHead>
                        <TableHead>등록일</TableHead>
                        <TableHead>수정일</TableHead>
                        {!editMode && <TableHead className="text-right">작업</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayEquipments.map((equipment, index) => (
                        <TableRow key={equipment.id}>
                          <TableCell className="font-medium">{equipment.equipmentName}</TableCell>
                          <TableCell>
                            {editMode ? (
                              <Input
                                type="number"
                                min="1"
                                value={equipment.quantity}
                                onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                                className="w-20"
                              />
                            ) : (
                              <span>{equipment.quantity}개</span>
                            )}
                          </TableCell>
                          <TableCell>{new Date(equipment.createdAt).toLocaleDateString('ko-KR')}</TableCell>
                          <TableCell>{new Date(equipment.updatedAt).toLocaleDateString('ko-KR')}</TableCell>
                          {!editMode && (
                            <TableCell className="text-right">
                              <Button
                                onClick={() => handleDeleteEquipment(equipment.id)}
                                variant="ghost"
                                size="sm"
                                disabled={deleteEquipmentMutation.isPending}
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
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
