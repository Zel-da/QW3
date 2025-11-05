import { useState, useEffect, useCallback } from 'react';
import { format } from "date-fns";
import axios from 'axios';
import { Header } from "@/components/header";
import TBMChecklist from "../features/tbm/TBMChecklist.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../components/ui/button";
import { Calendar as CalendarIcon, Settings } from "lucide-react"
import { Link, useLocation } from "wouter";
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
import { SITES } from '@/lib/constants';

export default function TbmPage() {
  const [view, setView] = useState('checklist');
  const [reportForEdit, setReportForEdit] = useState<any | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { site, setSite } = useSite();
  const { user } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    if (user) {
      if (user.role !== 'ADMIN' && user.site) {
        setSite(user.site as Site);
      }
    }
  }, [user, setSite]);

  // URL 파라미터에서 reportId를 읽어서 자동으로 해당 리포트 로드
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get('reportId');

    if (reportId) {
      axios.get(`/api/reports/${reportId}`).then(res => {
        const report = res.data;
        setReportForEdit(report);
        setDate(new Date(report.reportDate));
        setView('checklist');
        // URL에서 reportId 파라미터 제거
        window.history.replaceState({}, '', '/tbm');
      }).catch(err => {
        console.error("Failed to load report from URL:", err);
      });
    }
  }, []);

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
                <div className="flex gap-2">
                  {view === 'checklist' && (
                      <Button variant="outline" onClick={() => { setReportForEdit(null); setView('list'); }}>목록 보기</Button>
                  )}
                  {(user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM') && (
                    <Button variant="secondary" asChild>
                      <Link href="/checklist-editor">
                        <Settings className="w-4 h-4 mr-2" />
                        TBM 편집
                      </Link>
                    </Button>
                  )}
                </div>
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
                    {SITES.map(site => (
                      <SelectItem key={site} value={site}>{site}</SelectItem>
                    ))}
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
