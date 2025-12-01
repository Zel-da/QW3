import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminPageLayout, PageHeader } from '@/components/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { CalendarDays, Plus, Trash2, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';

interface Holiday {
  id: number;
  date: string;
  name: string;
  isRecurring: boolean;
  site: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function HolidayManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 현재 연도/월
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // 다이얼로그 상태
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showFetchDialog, setShowFetchDialog] = useState(false);
  const [selectedHolidays, setSelectedHolidays] = useState<number[]>([]);

  // 새 공휴일 입력
  const [newHoliday, setNewHoliday] = useState({
    date: '',
    endDate: '',  // 기간 선택용 종료일
    name: '',
    isRecurring: false,
    site: ''
  });

  // 기간 선택 모드
  const [isRangeMode, setIsRangeMode] = useState(false);

  // 연도 범위 (현재 연도 -1 ~ +2)
  const yearRange = Array.from({ length: 4 }, (_, i) => currentDate.getFullYear() - 1 + i);

  // 공휴일 목록 조회
  const { data: holidays, isLoading } = useQuery<Holiday[]>({
    queryKey: ['holidays', selectedYear, selectedMonth],
    queryFn: async () => {
      const params: any = { year: selectedYear };
      if (selectedMonth) {
        params.month = selectedMonth;
      }
      const response = await axios.get('/api/holidays', { params });
      // API 응답이 배열인지 확인
      return Array.isArray(response.data) ? response.data : [];
    }
  });

  // holidays가 배열임을 보장
  const holidayList = Array.isArray(holidays) ? holidays : [];

  // 공휴일 추가
  const addMutation = useMutation({
    mutationFn: async (data: { date: string; name: string; isRecurring: boolean; site: string | null }) => {
      const response = await axios.post('/api/holidays', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setShowAddDialog(false);
      setNewHoliday({ date: '', endDate: '', name: '', isRecurring: false, site: '' });
      setIsRangeMode(false);
      toast({ title: '성공', description: '공휴일이 추가되었습니다.' });
    },
    onError: (error: any) => {
      toast({
        title: '오류',
        description: error.response?.data?.message || '공휴일 추가에 실패했습니다.',
        variant: 'destructive'
      });
    }
  });

  // 공휴일 기간 추가 (range)
  const addRangeMutation = useMutation({
    mutationFn: async (data: { startDate: string; endDate: string; name: string; isRecurring: boolean; site: string | null }) => {
      const response = await axios.post('/api/holidays/range', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setShowAddDialog(false);
      setNewHoliday({ date: '', endDate: '', name: '', isRecurring: false, site: '' });
      setIsRangeMode(false);
      toast({ title: '성공', description: `${data.created}개의 공휴일이 추가되었습니다.` });
    },
    onError: (error: any) => {
      toast({
        title: '오류',
        description: error.response?.data?.message || '공휴일 추가에 실패했습니다.',
        variant: 'destructive'
      });
    }
  });

  // 공휴일 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axios.delete(`/api/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      toast({ title: '성공', description: '공휴일이 삭제되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '공휴일 삭제에 실패했습니다.', variant: 'destructive' });
    }
  });

  // 일괄 삭제
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await axios.delete('/api/holidays', { data: { ids } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setSelectedHolidays([]);
      toast({ title: '성공', description: '선택한 공휴일이 삭제되었습니다.' });
    },
    onError: () => {
      toast({ title: '오류', description: '공휴일 삭제에 실패했습니다.', variant: 'destructive' });
    }
  });

  // 한국 공휴일 가져오기
  const fetchKoreanMutation = useMutation({
    mutationFn: async (year: number) => {
      const response = await axios.post('/api/holidays/fetch-korean', { year });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
      setShowFetchDialog(false);
      toast({
        title: '성공',
        description: `${data.created}개의 공휴일이 추가되었습니다. (중복 ${data.skipped}개)`
      });
    },
    onError: () => {
      toast({ title: '오류', description: '공휴일 가져오기에 실패했습니다.', variant: 'destructive' });
    }
  });

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
  };

  // 체크박스 토글
  const toggleSelect = (id: number) => {
    setSelectedHolidays(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedHolidays.length === holidayList.length) {
      setSelectedHolidays([]);
    } else {
      setSelectedHolidays(holidayList.map(h => h.id));
    }
  };

  // 공휴일 추가 핸들러
  const handleAdd = () => {
    if (!newHoliday.date || !newHoliday.name) {
      toast({ title: '입력 오류', description: '날짜와 이름을 입력해주세요.', variant: 'destructive' });
      return;
    }

    // 기간 선택 모드
    if (isRangeMode) {
      if (!newHoliday.endDate) {
        toast({ title: '입력 오류', description: '종료일을 입력해주세요.', variant: 'destructive' });
        return;
      }
      if (new Date(newHoliday.endDate) < new Date(newHoliday.date)) {
        toast({ title: '입력 오류', description: '종료일은 시작일보다 이후여야 합니다.', variant: 'destructive' });
        return;
      }
      addRangeMutation.mutate({
        startDate: newHoliday.date,
        endDate: newHoliday.endDate,
        name: newHoliday.name,
        isRecurring: newHoliday.isRecurring,
        site: newHoliday.site || null
      });
    } else {
      // 단일 날짜 모드
      addMutation.mutate({
        date: newHoliday.date,
        name: newHoliday.name,
        isRecurring: newHoliday.isRecurring,
        site: newHoliday.site || null
      });
    }
  };

  // 권한 체크
  if (user?.role !== 'ADMIN') {
    return (
      <AdminPageLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">관리자 권한이 필요합니다.</p>
          </CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <PageHeader
        title="공휴일 관리"
        description="TBM 작성 제외일(공휴일)을 관리합니다. 등록된 공휴일은 TBM 통계에서 영업일 계산 시 제외됩니다."
        icon={<CalendarDays className="h-6 w-6" />}
        backUrl="/admin-dashboard"
        backText="대시보드"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFetchDialog(true)}>
              <Download className="h-4 w-4 mr-2" />
              한국 공휴일 가져오기
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              공휴일 추가
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="pt-6">
          {/* 필터 */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedYear(y => y - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select
                  value={selectedYear.toString()}
                  onValueChange={(v) => setSelectedYear(parseInt(v))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearRange.map(year => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}년
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedYear(y => y + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Select
                value={selectedMonth?.toString() || 'all'}
                onValueChange={(v) => setSelectedMonth(v === 'all' ? null : parseInt(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <SelectItem key={month} value={month.toString()}>
                      {month}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedHolidays.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => bulkDeleteMutation.mutate(selectedHolidays)}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  선택 삭제 ({selectedHolidays.length})
                </Button>
              )}

              <span className="text-sm text-muted-foreground ml-auto">
                총 {holidayList.length}개
              </span>
            </div>

            {/* 공휴일 목록 테이블 */}
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={holidayList.length > 0 && selectedHolidays.length === holidayList.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>날짜</TableHead>
                    <TableHead>공휴일명</TableHead>
                    <TableHead className="w-[100px]">반복</TableHead>
                    <TableHead className="w-[100px]">적용 사이트</TableHead>
                    <TableHead className="w-[80px] text-center">삭제</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        로딩 중...
                      </TableCell>
                    </TableRow>
                  ) : holidayList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        등록된 공휴일이 없습니다.
                        <br />
                        <span className="text-sm">
                          "한국 공휴일 가져오기" 버튼을 클릭하여 공휴일을 등록하세요.
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    holidayList.map((holiday) => (
                      <TableRow key={holiday.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedHolidays.includes(holiday.id)}
                            onCheckedChange={() => toggleSelect(holiday.id)}
                          />
                        </TableCell>
                        <TableCell>{formatDate(holiday.date)}</TableCell>
                        <TableCell className="font-medium">{holiday.name}</TableCell>
                        <TableCell>
                          {holiday.isRecurring ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                              매년 반복
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {holiday.site ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                              {holiday.site}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                              전체
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteMutation.mutate(holiday.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 공휴일 추가 다이얼로그 */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>공휴일 추가</DialogTitle>
              <DialogDescription>
                새로운 공휴일을 등록합니다.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* 기간 선택 모드 토글 */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="range-mode"
                  checked={isRangeMode}
                  onCheckedChange={(checked) => setIsRangeMode(!!checked)}
                />
                <Label htmlFor="range-mode" className="text-sm cursor-pointer">
                  기간으로 선택 (여러 날짜 한번에 등록)
                </Label>
              </div>

              {isRangeMode ? (
                <div className="space-y-4 p-3 bg-gray-50 rounded-md border">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="holiday-start-date">시작일</Label>
                      <Input
                        id="holiday-start-date"
                        type="date"
                        value={newHoliday.date}
                        onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="holiday-end-date">종료일</Label>
                      <Input
                        id="holiday-end-date"
                        type="date"
                        value={newHoliday.endDate}
                        onChange={(e) => setNewHoliday(prev => ({ ...prev, endDate: e.target.value }))}
                        min={newHoliday.date}
                      />
                    </div>
                  </div>
                  {newHoliday.date && newHoliday.endDate && (
                    <p className="text-sm text-muted-foreground">
                      총 {Math.ceil((new Date(newHoliday.endDate).getTime() - new Date(newHoliday.date).getTime()) / (1000 * 60 * 60 * 24)) + 1}일이 등록됩니다.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="holiday-date">날짜</Label>
                  <Input
                    id="holiday-date"
                    type="date"
                    value={newHoliday.date}
                    onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="holiday-name">공휴일명</Label>
                <Input
                  id="holiday-name"
                  placeholder="예: 설날, 추석, 회사 창립기념일"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>적용 사이트</Label>
                <Select
                  value={newHoliday.site || 'all'}
                  onValueChange={(v) => setNewHoliday(prev => ({ ...prev, site: v === 'all' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 (모든 사이트)</SelectItem>
                    <SelectItem value="아산">아산</SelectItem>
                    <SelectItem value="화성">화성</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="holiday-recurring"
                  checked={newHoliday.isRecurring}
                  onCheckedChange={(checked) =>
                    setNewHoliday(prev => ({ ...prev, isRecurring: !!checked }))
                  }
                />
                <Label htmlFor="holiday-recurring" className="text-sm cursor-pointer">
                  매년 반복 (양력 기준)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                취소
              </Button>
              <Button onClick={handleAdd} disabled={addMutation.isPending || addRangeMutation.isPending}>
                {(addMutation.isPending || addRangeMutation.isPending) ? '추가 중...' : '추가'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 한국 공휴일 가져오기 다이얼로그 */}
        <Dialog open={showFetchDialog} onOpenChange={setShowFetchDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>한국 공휴일 가져오기</DialogTitle>
              <DialogDescription>
                선택한 연도의 한국 법정공휴일을 자동으로 등록합니다.
                <br />
                (신정, 설날, 삼일절, 어린이날, 부처님오신날, 현충일, 광복절, 추석, 개천절, 한글날, 크리스마스 등)
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>연도 선택</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearRange.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                * 이미 등록된 공휴일은 중복으로 추가되지 않습니다.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFetchDialog(false)}>
                취소
              </Button>
              <Button
                onClick={() => fetchKoreanMutation.mutate(selectedYear)}
                disabled={fetchKoreanMutation.isPending}
              >
                {fetchKoreanMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    가져오는 중...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    가져오기
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </AdminPageLayout>
  );
}
