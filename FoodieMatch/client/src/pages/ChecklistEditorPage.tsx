import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, PlusCircle, GripVertical } from 'lucide-react';
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

interface SortableItemProps {
  item: any;
  index: number;
  onItemChange: (index: number, field: string, value: string) => void;
  onRemove: (index: number) => void;
}

function SortableItem({ item, index, onItemChange, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id || `item-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-10">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </div>
      </TableCell>
      <TableCell>
        <Input value={item.category} onChange={(e) => onItemChange(index, 'category', e.target.value)} />
      </TableCell>
      <TableCell>
        <Input value={item.description} onChange={(e) => onItemChange(index, 'description', e.target.value)} />
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" onClick={() => onRemove(index)}>
          <Trash2 className="h-5 w-5 text-red-500" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function ChecklistEditorPage() {
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [editingItems, setEditingItems] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: teams = [] } = useQuery({ queryKey: ['teams'], queryFn: fetchTeams });

  const { data: template, isLoading } = useQuery({
    queryKey: ['checklistTemplate', selectedTeam],
    queryFn: () => fetchTemplate(parseInt(selectedTeam!)),
    enabled: !!selectedTeam,

  });

  useEffect(() => {
    if (template) {
      // Ensure each item has an id for drag-and-drop
      const itemsWithIds = (template.templateItems || []).map((item: any, idx: number) => ({
        ...item,
        id: item.id || `temp-${idx}`,
      }));
      setEditingItems(itemsWithIds);
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
    setEditingItems([...editingItems, {
      id: `temp-${Date.now()}`,
      category: '',
      description: '',
      displayOrder: editingItems.length
    }]);
  };

  const removeItem = (index: number) => {
    setEditingItems(editingItems.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEditingItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update displayOrder
        return newItems.map((item, index) => ({
          ...item,
          displayOrder: index,
        }));
      });
    }
  };

  const handleSave = () => {
    if (template) {
      // Update displayOrder before saving
      const itemsToSave = editingItems.map((item, index) => ({
        ...item,
        displayOrder: index,
      }));
      mutation.mutate({ templateId: template.id, items: itemsToSave });
    }
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">TBM 편집</CardTitle>
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
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>구분 (Category)</TableHead>
                        <TableHead>점검항목 (Description)</TableHead>
                        <TableHead>삭제</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={editingItems.map((item) => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {editingItems.map((item, index) => (
                          <SortableItem
                            key={item.id}
                            item={item}
                            index={index}
                            onItemChange={handleItemChange}
                            onRemove={removeItem}
                          />
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </DndContext>
                <div className="mt-4 flex items-center gap-4">
                  <Button variant="outline" onClick={addNewItem}>
                    <PlusCircle className="mr-2 h-4 w-4" /> 새 항목 추가
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    💡 왼쪽 <GripVertical className="inline h-4 w-4" /> 아이콘을 드래그하여 항목 순서를 변경할 수 있습니다.
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}