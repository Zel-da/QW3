import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Calendar } from '../../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

const fetchReports = async (startDate, endDate) => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate.toISOString());
  if (endDate) params.append('endDate', endDate.toISOString());

  const response = await fetch(`/api/daily-reports?${params.toString()}`);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

export default function ReportListView({ onSelectReport }) {
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
  const [endDate, setEndDate] = useState(new Date());

  const { data: reports, isLoading, error, refetch } = useQuery({
    queryKey: ['dailyReports', startDate, endDate],
    queryFn: () => fetchReports(startDate, endDate),
  });

  const handleSearch = () => {
    refetch();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 items-center p-4 border rounded-lg">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "PPP") : <span>시작일 선택</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <span className='mx-2'>~</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate ? format(endDate, "PPP") : <span>종료일 선택</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button onClick={handleSearch} className="w-full sm:w-auto">조회</Button>
      </div>

      {isLoading && <p>로딩 중...</p>}
      {error && <p>오류: {error.message}</p>}
      <ul className="space-y-2">
        {reports && reports.map(report => (
          <li key={report.id} onClick={() => onSelectReport(report.id)} className="p-3 border rounded-md hover:bg-secondary cursor-pointer">
            <p className="font-semibold">{report.team.name} - {new Date(report.reportDate).toLocaleDateString()}</p>
            <p className="text-sm text-muted-foreground">작성자: {report.writerName}</p>
          </li>
        ))}
        {reports && reports.length === 0 && <p>해당 기간에 작성된 보고서가 없습니다.</p>}
      </ul>
    </div>
  );
}
