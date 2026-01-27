import { useState, useEffect, useCallback } from 'react';
import { format } from "date-fns";
import apiClient from '../features/tbm/apiConfig';
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/BottomNavigation";
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
import { useRecording } from "@/context/RecordingContext";
import { stripSiteSuffix } from '@/lib/utils';
import { SITES } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface DailyStats {
  전체: { submitted: number; required: number };
  아산: { submitted: number; required: number };
  화성: { submitted: number; required: number };
}

export default function TbmPage() {
  const [view, setView] = useState('checklist');
  const [reportForEdit, setReportForEdit] = useState<any | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { site, setSite, initSiteFromUser } = useSite();
  const { user } = useAuth();
  const { setCurrentTbmInfo } = useRecording();
  const [location] = useLocation();
  const { toast } = useToast();
  const [isLoadingModify, setIsLoadingModify] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);

  // TBM 페이지를 벗어날 때 녹음 컨텍스트 초기화
  useEffect(() => {
    return () => {
      setCurrentTbmInfo(null);
    };
  }, [setCurrentTbmInfo]);

  // 일일 작성 현황 조회
  useEffect(() => {
    if (date) {
      const dateStr = format(date, 'yyyy-MM-dd');
      apiClient.get(`/api/tbm/daily-stats?date=${dateStr}`)
        .then(res => setDailyStats(res.data))
        .catch(err => console.error('Failed to fetch daily stats:', err));
    }
  }, [date]);

  // 사용자 소속 사이트로 자동 초기화
  useEffect(() => {
    if (user) {
      initSiteFromUser(user.site, user.sites, user.role === 'ADMIN');
    }
  }, [user, initSiteFromUser]);

  // URL 파라미터에서 reportId를 읽어서 자동으로 해당 리포트 로드
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get('reportId');

    if (reportId) {
      apiClient.get(`/api/tbm/${reportId}`).then(res => {
        const report = res.data;
        setReportForEdit(report);
        setDate(new Date(report.reportDate));
        setView('checklist');
        // URL에서 reportId 파라미터 제거
        window.history.replaceState({}, '', '/tbm');
      }).catch(err => {
        console.error("Failed to load report from URL:", err);
        toast({
          title: "리포트 로드 실패",
          description: err.response?.data?.message || "리포트를 불러오는 중 오류가 발생했습니다.",
          variant: "destructive"
        });
      });
    }
  }, [toast]);

  const handleSelectReport = useCallback((reportId: number) => {
    setReportForEdit({ id: reportId }); 
    setView('detail');
  }, []);

  const handleModifyReport = useCallback((reportId: number) => {
    setIsLoadingModify(true);
    apiClient.get(`/api/tbm/${reportId}`).then(res => {
      const report = res.data;
      setReportForEdit(report);
      setDate(new Date(report.reportDate));
      setView('checklist');
    }).catch(err => {
      console.error("Failed to fetch report for editing:", err);
      toast({
        title: "수정 불러오기 실패",
        description: err.response?.data?.message || "리포트를 불러오는 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }).finally(() => {
      setIsLoadingModify(false);
    });
  }, [toast]);

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
        return <ReportDetailView reportId={reportForEdit?.id} onBackToList={handleBackToList} onModify={handleModifyReport} isLoadingModify={isLoadingModify} currentUser={user} />;
      case 'checklist':
      default:
        return <TBMChecklist reportForEdit={reportForEdit} onFinishEditing={handleFinishEditing} date={date} site={site} />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container mx-auto px-4 py-4 md:p-6">
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-2xl">TBM 일지</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 mt-3 md:mt-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[240px] h-10 md:h-11 justify-start text-left font-normal text-sm md:text-base",
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
                  <SelectTrigger className="w-full sm:w-[180px] h-10 md:h-11">
                    <SelectValue placeholder="현장 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {SITES.map(site => (
                      <SelectItem key={site} value={site}>{site}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {dailyStats && (
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Badge variant="outline" className="h-8 px-3 text-sm font-medium">
                    전체: {dailyStats.전체.submitted}/{dailyStats.전체.required}
                  </Badge>
                  <Badge variant="outline" className="h-8 px-3 text-sm font-medium">
                    아산: {dailyStats.아산.submitted}/{dailyStats.아산.required}
                  </Badge>
                  <Badge variant="outline" className="h-8 px-3 text-sm font-medium">
                    화성: {dailyStats.화성.submitted}/{dailyStats.화성.required}
                  </Badge>
                </div>
              )}
              {view === 'checklist' && (
                <Button variant="outline" className="h-10 md:h-11 w-full sm:w-auto sm:ml-auto text-sm md:text-base" onClick={() => { setReportForEdit(null); setView('list'); }}>
                  내역 보기
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {renderView()}
          </CardContent>
        </Card>
      </main>
      <BottomNavigation />
    </div>
  );
}
