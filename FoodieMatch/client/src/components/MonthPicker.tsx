import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
  minYear?: number;
  maxYear?: number;
  className?: string;
}

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export function MonthPicker({
  year,
  month,
  onChange,
  minYear = 2020,
  maxYear = new Date().getFullYear() + 1,
  className
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(year);

  // 팝오버 열릴 때 현재 년도로 초기화
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setPickerYear(year);
    }
    setIsOpen(open);
  };

  // 이전 월
  const goToPreviousMonth = () => {
    if (month === 1) {
      if (year > minYear) {
        onChange(year - 1, 12);
      }
    } else {
      onChange(year, month - 1);
    }
  };

  // 다음 월
  const goToNextMonth = () => {
    if (month === 12) {
      if (year < maxYear) {
        onChange(year + 1, 1);
      }
    } else {
      onChange(year, month + 1);
    }
  };

  // 월 선택
  const handleMonthSelect = (selectedMonth: number) => {
    onChange(pickerYear, selectedMonth);
    setIsOpen(false);
  };

  // 피커 년도 이전
  const goToPreviousYear = () => {
    if (pickerYear > minYear) {
      setPickerYear(pickerYear - 1);
    }
  };

  // 피커 년도 다음
  const goToNextYear = () => {
    if (pickerYear < maxYear) {
      setPickerYear(pickerYear + 1);
    }
  };

  const canGoPrevious = year > minYear || month > 1;
  const canGoNext = year < maxYear || month < 12;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {/* 이전 월 버튼 */}
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10"
        onClick={goToPreviousMonth}
        disabled={!canGoPrevious}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      {/* 달력 피커 버튼 */}
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-10 px-4 min-w-[140px] justify-between font-medium"
          >
            <Calendar className="h-4 w-4 mr-2 opacity-70" />
            <span>{year}년 {month}월</span>
            <ChevronRight className="h-4 w-4 ml-2 opacity-50 rotate-90" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-3" align="center">
          {/* 년도 선택 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToPreviousYear}
              disabled={pickerYear <= minYear}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-lg">{pickerYear}년</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={goToNextYear}
              disabled={pickerYear >= maxYear}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* 월 그리드 */}
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((monthName, index) => {
              const monthNum = index + 1;
              const isSelected = pickerYear === year && monthNum === month;
              const isCurrent = pickerYear === new Date().getFullYear() && monthNum === new Date().getMonth() + 1;

              return (
                <Button
                  key={monthNum}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-9",
                    isCurrent && !isSelected && "border border-primary text-primary",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleMonthSelect(monthNum)}
                >
                  {monthName}
                </Button>
              );
            })}
          </div>

          {/* 빠른 이동 버튼 */}
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                const now = new Date();
                onChange(now.getFullYear(), now.getMonth() + 1);
                setIsOpen(false);
              }}
            >
              이번 달
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                const now = new Date();
                const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
                const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
                onChange(prevYear, prevMonth);
                setIsOpen(false);
              }}
            >
              지난 달
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* 다음 월 버튼 */}
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10"
        onClick={goToNextMonth}
        disabled={!canGoNext}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}

export default MonthPicker;
