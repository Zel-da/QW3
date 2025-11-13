import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useSite, Site } from '@/hooks/use-site';
import { SITES } from '@/lib/constants';
import { Camera, Upload, X, Save, FileText } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';

interface Team {
  id: number;
  name: string;
  site: string;
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
  photoUrl: string;
  remarks?: string;
  uploadedAt: Date;
}

interface InspectionTemplate {
  id: number;
  equipmentName: string;
  displayOrder: number;
}

export default function SafetyInspectionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { site, setSite } = useSite();

  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [uploadedItems, setUploadedItems] = useState<Record<string, { photoUrl: string; remarks: string }>>({});
  const [uploadingEquipment, setUploadingEquipment] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.role !== 'ADMIN' && user.site) {
        setSite(user.site as Site);
      }
      if (user.role === 'TEAM_LEADER' && user.teamId) {
        setSelectedTeam(user.teamId);
      }
    }
  }, [user, setSite]);

  const { data: teams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ['teams', site],
    queryFn: async () => {
      const { data } = await axios.get(`/api/teams?site=${site}`);
      return data;
    },
    enabled: !!site,
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<InspectionTemplate[]>({
    queryKey: ['inspection-templates', selectedTeam],
    queryFn: async () => {
      const { data } = await axios.get(`/api/inspection/templates/${selectedTeam}`);
      return data;
    },
    enabled: !!selectedTeam,
  });

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

  const handlePhotoUpload = async (equipmentName: string, file: File) => {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "오류", description: "파일 크기는 10MB 이하여야 합니다.", variant: "destructive" });
      return;
    }

    try {
      setUploadingEquipment(equipmentName);
      const formData = new FormData();
      formData.append('files', file);

      const res = await axios.post('/api/upload-multiple', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedFile = res.data.files[0];
      setUploadedItems(prev => ({
        ...prev,
        [equipmentName]: {
          photoUrl: uploadedFile.url,
          remarks: prev[equipmentName]?.remarks || ''
        }
      }));

      toast({ title: "성공", description: "사진이 업로드되었습니다." });
    } catch (err) {
      toast({ title: "오류", description: "사진 업로드에 실패했습니다.", variant: "destructive" });
    } finally {
      setUploadingEquipment(null);
    }
  };

  const handleRemarksChange = (equipmentName: string, remarks: string) => {
    setUploadedItems(prev => ({
      ...prev,
      [equipmentName]: {
        photoUrl: prev[equipmentName]?.photoUrl || '',
        remarks
      }
    }));
  };

  const removePhoto = (equipmentName: string) => {
    setUploadedItems(prev => {
      const newItems = { ...prev };
      delete newItems[equipmentName];
      return newItems;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTeam) throw new Error('팀을 선택해주세요');

      const items = Object.entries(uploadedItems).map(([equipmentName, data]) => ({
        equipmentName,
        photoUrl: data.photoUrl,
        remarks: data.remarks || null
      }));

      if (items.length === 0) {
        throw new Error('최소 1개 이상의 사진을 업로드해주세요');
      }

      const payload = {
        teamId: selectedTeam,
        year: selectedYear,
        month: selectedMonth,
        inspectionDate: new Date(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-04`),
        items
      };

      const { data } = await axios.post('/api/inspection', payload);
      return data;
    },
    onSuccess: () => {
      toast({ title: "성공", description: "안전점검 기록이 저장되었습니다." });
      queryClient.invalidateQueries({ queryKey: ['safety-inspection', selectedTeam, selectedYear, selectedMonth] });
      setUploadedItems({});
    },
    onError: (err: any) => {
      toast({
        title: "오류",
        description: err.response?.data?.message || err.message || "저장에 실패했습니다.",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (teamsLoading || templatesLoading) {
    return (
      <div>
        <Header />
        <main className="container mx-auto p-4 lg:p-8">
          <LoadingSpinner size="lg" text="데이터를 불러오는 중..." className="py-16" />
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">안전점검 (매월 4일)</h1>
          <p className="text-muted-foreground">월별 기기별 안전점검 사진을 업로드합니다. (최대 15개)</p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>점검 대상 선택</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {user?.role === 'ADMIN' && (
                <div>
                  <Label htmlFor="site">현장</Label>
                  <Select value={site} onValueChange={(value: Site) => setSite(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="현장 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {SITES.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="team">팀</Label>
                <Select
                  value={selectedTeam?.toString() || ''}
                  onValueChange={(value) => setSelectedTeam(parseInt(value))}
                  disabled={user?.role === 'TEAM_LEADER'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id.toString()}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="year">년도</Label>
                <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="년도 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}년</SelectItem>
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
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <SelectItem key={month} value={month.toString()}>{month}월</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!selectedTeam ? (
          <EmptyState
            icon={FileText}
            title="팀을 선택해주세요"
            description="점검 기록을 작성하려면 팀을 선택해주세요."
          />
        ) : inspection?.isCompleted ? (
          <Card>
            <CardHeader>
              <CardTitle>점검 완료</CardTitle>
              <CardDescription>
                {selectedYear}년 {selectedMonth}월 안전점검이 완료되었습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>기기명</TableHead>
                    <TableHead>사진</TableHead>
                    <TableHead>비고</TableHead>
                    <TableHead>업로드 시간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inspection.inspectionItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.equipmentName}</TableCell>
                      <TableCell>
                        <img src={item.photoUrl} alt={item.equipmentName} className="w-20 h-20 object-cover rounded" />
                      </TableCell>
                      <TableCell>{item.remarks || '-'}</TableCell>
                      <TableCell>{new Date(item.uploadedAt).toLocaleString('ko-KR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>안전점검 기록</CardTitle>
              <CardDescription>
                기기별 사진을 업로드하고 비고를 입력하세요. (최대 15개)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!Array.isArray(templates) || templates.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="점검 템플릿이 없습니다"
                  description="관리자에게 점검 템플릿 추가를 요청하세요."
                />
              ) : (
                <div className="space-y-4">
                  {Array.isArray(templates) && templates.slice(0, 15).map((template) => (
                    <Card key={template.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{template.equipmentName}</h3>
                          {uploadedItems[template.equipmentName]?.photoUrl ? (
                            <div className="space-y-3">
                              <div className="relative inline-block">
                                <img
                                  src={uploadedItems[template.equipmentName].photoUrl}
                                  alt={template.equipmentName}
                                  className="w-40 h-40 object-cover rounded border"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 h-6 w-6 p-0"
                                  onClick={() => removePhoto(template.equipmentName)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div>
                                <Label htmlFor={`remarks-${template.id}`}>비고 (선택사항)</Label>
                                <Textarea
                                  id={`remarks-${template.id}`}
                                  placeholder="특이사항을 입력하세요..."
                                  value={uploadedItems[template.equipmentName]?.remarks || ''}
                                  onChange={(e) => handleRemarksChange(template.equipmentName, e.target.value)}
                                  className="mt-1"
                                  rows={2}
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <Label
                                htmlFor={`photo-${template.id}`}
                                className={uploadingEquipment === template.equipmentName ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
                              >
                                <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-md hover:bg-muted">
                                  {uploadingEquipment === template.equipmentName ? (
                                    <>
                                      <Upload className="h-5 w-5 animate-pulse" />
                                      <span>업로드 중...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Camera className="h-5 w-5" />
                                      <span>사진 업로드</span>
                                    </>
                                  )}
                                </div>
                              </Label>
                              <Input
                                id={`photo-${template.id}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingEquipment === template.equipmentName}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handlePhotoUpload(template.equipmentName, file);
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}

                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      onClick={handleSave}
                      disabled={Object.keys(uploadedItems).length === 0 || saveMutation.isPending}
                      size="lg"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveMutation.isPending ? '저장 중...' : '저장하기'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
