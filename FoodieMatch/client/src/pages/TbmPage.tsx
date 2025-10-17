import { useState } from 'react';
import { format } from "date-fns"
import { Header } from "@/components/header";
import TBMChecklist from "../features/tbm/TBMChecklist.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../components/ui/button";
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import ReportListView from '../features/tbm/ReportListView.jsx';
import ReportDetailView from '../features/tbm/ReportDetailView.jsx';

export default function TbmPage() {
  const [view, setView] = useState('checklist'); // 'checklist', 'list', 'detail'
  const [reportIdForEdit, setReportIdForEdit] = useState<number | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());

  const handleSelectReport = (reportId: number) => {
    setReportIdForEdit(reportId);
    setView('detail');
  };

  const handleModifyReport = (reportId: number) => {
    setReportIdForEdit(reportId);
    setView('checklist');
  };

  const handleBackToList = () => {
    setReportIdForEdit(null);
    setView('list');
  };

  const handleFinishEditing = () => {
    setReportIdForEdit(null);
    setView('list');
  }

  const renderView = () => {
    switch (view) {
      case 'list':
        return <ReportListView onSelectReport={handleSelectReport} />;
      case 'detail':
        return <ReportDetailView reportId={reportIdForEdit} onBackToList={handleBackToList} onModify={handleModifyReport} />;
      case 'checklist':
      default:
        return <TBMChecklist reportIdForEdit={reportIdForEdit} onFinishEditing={handleFinishEditing} date={date} />;
    }
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>TBM 일지</CardTitle>
            <div className="grid gap-2 mt-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[300px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>날짜 선택</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    locale={ko}
                    initialFocus
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            {renderView()}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
