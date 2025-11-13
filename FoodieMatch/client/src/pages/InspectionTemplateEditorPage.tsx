import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Trash2, GripVertical, Plus } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import type { Team } from '@shared/schema';

interface InspectionTemplateItem {
  id?: number;
  equipmentName: string;
  displayOrder: number;
  isRequired: boolean;
}

const fetchTeams = async (site: string): Promise<Team[]> => {
  const res = await fetch(`/api/teams?site=${site}`);
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
};

const fetchInspectionTemplate = async (teamId: number) => {
  const res = await fetch(`/api/teams/${teamId}/inspection-template`);
  if (!res.ok) throw new Error('Failed to fetch inspection template');
  return res.json();
};

const updateInspectionTemplate = async ({ teamId, equipmentList }: {
  teamId: number;
  equipmentList: InspectionTemplateItem[];
}) => {
  const res = await fetch(`/api/teams/${teamId}/inspection-template`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ equipmentList })
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to update template');
  }
  return res.json();
};

export default function InspectionTemplateEditorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [equipmentItems, setEquipmentItems] = useState<InspectionTemplateItem[]>([]);
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [bulkText, setBulkText] = useState('');

  // Queries
  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['teams', user?.role === 'ADMIN' ? 'all' : user?.site],
    queryFn: () => {
      if (user?.role === 'ADMIN') {
        return fetch('/api/teams').then(res => res.json());
      }
      return fetchTeams(user!.site!);
    },
    enabled: !!user
  });

  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['inspectionTemplate', selectedTeamId],
    queryFn: () => fetchInspectionTemplate(selectedTeamId!),
    enabled: !!selectedTeamId,
    onSuccess: (data) => {
      if (data && Array.isArray(data)) {
        setEquipmentItems(data.map((item: any, index: number) => ({
          id: item.id,
          equipmentName: item.equipmentName,
          displayOrder: item.displayOrder !== undefined ? item.displayOrder : index * 10,
          isRequired: item.isRequired !== undefined ? item.isRequired : true
        })));
      } else {
        setEquipmentItems([]);
      }
    }
  });

  // Mutation
  const mutation = useMutation({
    mutationFn: updateInspectionTemplate,
    onSuccess: () => {
      toast({ title: '성공', description: '안전점검 템플릿이 저장되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['inspectionTemplate', selectedTeamId] });
    },
    onError: (error: any) => {
      toast({
        title: '오류',
        description: error.message || '템플릿 저장에 실패했습니다.',
        variant: 'destructive'
      });
    }
  });

  // Handlers
  const handleAddEquipment = () => {
    if (newEquipmentName.trim()) {
      const maxOrder = equipmentItems.length > 0
        ? Math.max(...equipmentItems.map(item => item.displayOrder))
        : 0;

      setEquipmentItems([
        ...equipmentItems,
        {
          equipmentName: newEquipmentName.trim(),
          displayOrder: maxOrder + 10,
          isRequired: true
        }
      ]);
      setNewEquipmentName('');
    }
  };

  const handleBulkAdd = () => {
    const lines = bulkText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) return;

    const maxOrder = equipmentItems.length > 0
      ? Math.max(...equipmentItems.map(item => item.displayOrder))
      : 0;

    const newItems = lines.map((line, index) => ({
      equipmentName: line,
      displayOrder: maxOrder + (index + 1) * 10,
      isRequired: true
    }));

    setEquipmentItems([...equipmentItems, ...newItems]);
    setBulkText('');
    toast({ title: '성공', description: `${lines.length}개 설비가 추가되었습니다.` });
  };

  const handleRemoveEquipment = (index: number) => {
    setEquipmentItems(equipmentItems.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...equipmentItems];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    // Re-assign displayOrder
    newItems.forEach((item, i) => {
      item.displayOrder = i * 10;
    });
    setEquipmentItems(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === equipmentItems.length - 1) return;
    const newItems = [...equipmentItems];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    // Re-assign displayOrder
    newItems.forEach((item, i) => {
      item.displayOrder = i * 10;
    });
    setEquipmentItems(newItems);
  };

  const handleSave = () => {
    if (!selectedTeamId) return;

    const equipmentList = equipmentItems.map((item, index) => ({
      equipmentName: item.equipmentName,
      displayOrder: index * 10,
      isRequired: item.isRequired
    }));

    mutation.mutate({ teamId: selectedTeamId, equipmentList });
  };

  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>안전점검 템플릿 편집기</CardTitle>
            <CardDescription>팀별 안전점검 설비 목록을 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>팀 선택</Label>
                <Select
                  onValueChange={(val) => setSelectedTeamId(Number(val))}
                  value={selectedTeamId ? String(selectedTeamId) : undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="팀을 선택하세요..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={String(team.id)}>
                        {team.name} ({team.site})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTeamId && selectedTeam && (
                <div className="text-sm text-muted-foreground">
                  선택된 팀: <span className="font-semibold">{selectedTeam.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedTeamId && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* 설비 목록 */}
            <Card>
              <CardHeader>
                <CardTitle>점검 설비 목록</CardTitle>
                <CardDescription>
                  {equipmentItems.length}개 설비 등록됨
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templateLoading ? (
                  <LoadingSpinner size="md" text="템플릿 불러오는 중..." />
                ) : equipmentItems.length === 0 ? (
                  <EmptyState
                    title="등록된 설비가 없습니다"
                    description="오른쪽에서 설비를 추가하세요."
                  />
                ) : (
                  <div className="space-y-2">
                    {equipmentItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 border rounded-md hover:bg-accent/50"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <span className="text-sm font-medium">{item.equipmentName}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === equipmentItems.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveEquipment(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6">
                  <Button
                    onClick={handleSave}
                    disabled={mutation.isPending || equipmentItems.length === 0}
                    className="w-full"
                  >
                    {mutation.isPending ? '저장 중...' : '템플릿 저장'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 설비 추가 */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>설비 개별 추가</CardTitle>
                  <CardDescription>한 개씩 추가합니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="newEquipment">설비명</Label>
                    <Input
                      id="newEquipment"
                      placeholder="예: 지게차, 크레인 등"
                      value={newEquipmentName}
                      onChange={(e) => setNewEquipmentName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddEquipment()}
                    />
                  </div>
                  <Button
                    onClick={handleAddEquipment}
                    disabled={!newEquipmentName.trim()}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    설비 추가
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>설비 대량 추가</CardTitle>
                  <CardDescription>한 줄에 하나씩 입력하세요.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="bulkText">설비 목록</Label>
                    <Textarea
                      id="bulkText"
                      className="min-h-[200px] font-mono text-sm"
                      placeholder="지게차&#10;크레인&#10;전동공구&#10;작업대&#10;..."
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {bulkText.split('\n').filter(l => l.trim()).length}개 설비
                    </p>
                  </div>
                  <Button
                    onClick={handleBulkAdd}
                    disabled={!bulkText.trim()}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    대량 추가
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
