import { useState, useEffect, useCallback } from 'react';
import { format } from "date-fns";
import axios from 'axios';
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
import { useSite, Site } from "@/hooks/use-site";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { stripSiteSuffix } from '@/lib/utils';

export default function TbmPage() {
  const [view, setView] = useState('checklist');
  const [reportForEdit, setReportForEdit] = useState<any | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { site, setSite } = useSite();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role !== 'ADMIN' && user.site) {
        setSite(user.site as Site);
      }
    }
  }, [user, setSite]);

  const handleSelectReport = useCallback((reportId: number) => {
    setReportForEdit({ id: reportId }); 
    setView('detail');
  }, []);

  const handleModifyReport = useCallback((reportId: number) => {
    axios.get(`/api/reports/${reportId}`).then(res => {
      const report = res.data;
      setReportForEdit(report);
      setDate(new Date(report.reportDate));
      setView('checklist');
    }).catch(err => {
      console.error("Failed to fetch report for editing:", err);
    });
  }, []);

  const handleBackToList = useCallback(() => {
    setReportForEdit(null);
    setView('list');
  }, []);

  const handleFinishEditing = useCallback(() => {
    setReportForEdit(null);
    setView('list');
  }, []);

  const renderView = () => {
    if (!site) return <p>현장 정보를 불러오는 중...</p>;

    switch (view) {
      case 'list':
        return <ReportListView onSelectReport={handleSelectReport} onBack={() => setView('checklist')} site={site} />;
      case 'detail':
        return <ReportDetailView reportId={reportForEdit?.id} onBackToList={handleBackToList} onModify={handleModifyReport} />;
      case 'checklist':
      default:
        return <TBMChecklist reportForEdit={reportForEdit} onFinishEditing={handleFinishEditing} date={date} site={site} />;
    }
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>TBM 일지</CardTitle>
                {view === 'checklist' && (
                    <Button variant="outline" onClick={() => { setReportForEdit(null); setView('list'); }}>목록 보기</Button>
                )}
            </div>
            <div className="flex items-center space-x-4 mt-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: ko }) : <span>날짜 선택</span>}
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
              {user?.role === 'ADMIN' && (
                <Select onValueChange={(value: Site) => setSite(value)} value={site}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="현장 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="아산">아산</SelectItem>
                    <SelectItem value="화성">화성</SelectItem>
                  </SelectContent>
                </Select>
              )}
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
