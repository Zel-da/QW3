import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle } from 'lucide-react';

const fetchTeams = async () => {
  const res = await fetch('/api/teams');
  if (!res.ok) throw new Error('Failed to fetch teams');
  return res.json();
};

const fetchTemplate = async (teamId: number) => {
  const res = await fetch(`/api/teams/${teamId}/template`);
  if (!res.ok) throw new Error('Failed to fetch template');
  return res.json();
};

const updateTemplate = async ({ templateId, items }: { templateId: number; items: any[] }) => {
  const res = await fetch(`/api/checklist-templates/${templateId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error('Failed to update template');
  return res.json();
};

export default function ChecklistEditorPage() {
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<any[]>([]);

  const { data: teams = [] } = useQuery({ queryKey: ['teams'], queryFn: fetchTeams });

  const { data: template, isLoading } = useQuery({
    queryKey: ['checklistTemplate', selectedTeam],
    queryFn: () => fetchTemplate(parseInt(selectedTeam!)),
    enabled: !!selectedTeam,
    onSuccess: (data) => {
      setEditingItems(data.templateItems || []);
    },
  });

  useEffect(() => {
    if (template) {
      setEditingItems(template.templateItems || []);
    }
  }, [template]);

  const mutation = useMutation({
    mutationFn: updateTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklistTemplate', selectedTeam] });
    }
  });

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...editingItems];
    newItems[index][field] = value;
    setEditingItems(newItems);
  };

  const addNewItem = () => {
    setEditingItems([...editingItems, { category: '', description: '', displayOrder: editingItems.length }]);
  };

  const removeItem = (index: number) => {
    setEditingItems(editingItems.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (template) {
      mutation.mutate({ templateId: template.id, items: editingItems });
    }
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">체크리스트 편집기</CardTitle>
            <div className="flex items-center gap-4 mt-4">
              <Select onValueChange={setSelectedTeam} value={selectedTeam || ''}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="수정할 팀을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team: any) => <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {template && <Button onClick={handleSave} disabled={mutation.isPending}>{mutation.isPending ? '저장 중...' : '저장'}</Button>}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <p>로딩 중...</p>}
            {!selectedTeam && <p className="text-center text-muted-foreground py-10">수정할 팀을 선택하여 체크리스트를 불러오세요.</p>}
            {selectedTeam && !template && !isLoading && <p className="text-center text-muted-foreground py-10">선택된 팀에 대한 체크리스트 템플릿이 없습니다. 새 항목을 추가하여 시작하세요.</p>}
            {template && (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>구분 (Category)</TableHead>
                      <TableHead>점검항목 (Description)</TableHead>
                      <TableHead>삭제</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editingItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input value={item.category} onChange={(e) => handleItemChange(index, 'category', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="h-5 w-5 text-red-500" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button variant="outline" className="mt-4" onClick={addNewItem}><PlusCircle className="mr-2 h-4 w-4"/> 새 항목 추가</Button>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}