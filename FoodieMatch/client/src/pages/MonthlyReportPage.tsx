import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useSite, Site } from '@/hooks/use-site';
import { stripSiteSuffix } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { DailyReport } from '@shared/schema';

const fetchMonthlyReport = async (teamId: number | null, year: number, month: number) => {
  if (!teamId) return null;
  const { data } = await axios.get(`/api/reports/monthly?teamId=${teamId}&year=${year}&month=${month}`);
  return data;
};

const fetchTeams = async (site: Site) => {
  if (!site) return [];
  const { data } = await axios.get(`/api/teams?site=${site}`);
  return data;
};

export default function MonthlyReportPage() {
  const { user } = useAuth();
  const { site, setSite } = useSite();
  const { toast } = useToast();

  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [date, setDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  useEffect(() => {
    if (user) {
      if (user.role !== 'ADMIN' && user.site) {
        setSite(user.site as Site);
      }
    }
  }, [user, setSite]);

  const { data: teams, isLoading: teamsLoading } = useQuery<any[]>({
    queryKey: ['teams', site],
    queryFn: () => fetchTeams(site),
    enabled: !!site,
  });

  useEffect(() => {
    setSelectedTeam(null);
  }, [site]);

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['monthlyReport', selectedTeam, date.year, date.month],
    queryFn: () => fetchMonthlyReport(selectedTeam, date.year, date.month),
    enabled: !!selectedTeam,
  });

  const handlePrint = () => {
      window.print();
  }

  const handleExcelDownload = async () => {
    if (!selectedTeam) {
      toast({ title: "오류", description: "먼저 팀을 선택해주세요.", variant: "destructive" });
      return;
    }

    toast({ title: "엑셀 파일 다운로드 중...", description: "서버에서 파일을 생성하고 있습니다." });

    try {
      const response = await axios.get(`/api/reports/monthly-excel`, {
        params: {
          teamId: selectedTeam,
          year: date.year,
          month: date.month,
          site: site,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = `TBM_Report_${date.year}_${date.month}.xlsx`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();

      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      window.URL.revokeObjectURL(url);

      toast({ title: "성공", description: "엑셀 파일이 다운로드되었습니다." });

    } catch (error) {
      console.error("Failed to download Excel report:", error);
      toast({ title: "오류", description: "엑셀 파일을 다운로드하는 중 오류가 발생했습니다.", variant: "destructive" });
    }
  };


  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg-p-8 print-container">
        <Card className="no-print">
          <CardHeader>
            <CardTitle>월별 TBM 보고서</CardTitle>
            <div className="flex items-center gap-4 mt-4">
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
              <Select onValueChange={(value) => setSelectedTeam(Number(value))} value={selectedTeam?.toString() || ''}>
                  <SelectTrigger className="w-[200px]" disabled={teamsLoading || !teams?.length}>
                    <SelectValue placeholder="팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamsLoading ? (
                      <SelectItem value="loading" disabled>불러오는 중...</SelectItem>
                    ) : (
                      teams?.map(team => <SelectItem key={team.id} value={team.id.toString()}>{stripSiteSuffix(team.name)}</SelectItem>)
                    )}
                  </SelectContent>
              </Select>
              <Input type="month" value={`${date.year}-${String(date.month).padStart(2, '0')}`}
                onChange={e => {
                  const [year, month] = e.target.value.split('-');
                  setDate({ year: parseInt(year), month: parseInt(month) });
                }}
                className="w-[200px]" />
              <Button onClick={handlePrint} disabled={!report}>인쇄</Button>
              <Button onClick={handleExcelDownload} disabled={!report}>엑셀 다운로드</Button>
            </div>
          </CardHeader>
        </Card>

        {isLoading && <p className="mt-8">보고서 데이터를 불러오는 중...</p>}
        {isError && <p className="mt-8 text-red-500">데이터를 불러오지 못했습니다.</p>}
        {report && (
          <div className="mt-8 space-y-4" id="report-content">
            <h1 className="text-3xl font-bold text-center">TBM 월별 점검 보고서</h1>
            <div className="flex justify-between items-center">
              <p className="text-xl">팀: {stripSiteSuffix(report.teamName)}</p>
              <p className="text-xl">기간: {report.year}년 {report.month}월</p>
            </div>

            <Card>
              <CardContent className="p-2">
                <Table className="border-collapse border border-slate-400">
                  <TableHeader>
                    <TableRow>
                                                                                                                                    <TableHead className="border border-slate-300">구분</TableHead>
                                                                                                                                    <TableHead className="border border-slate-300">점검내용</TableHead>
                                                                                                                                    {Array.from({ length: new Date(report.year, report.month, 0).getDate() }, (_, i) => i + 1).map(day => (
                                                                                                                                        <TableHead key={day} className="border border-slate-300 text-center w-5">{day}</TableHead>
                                                                                                                                    ))}
                                                                                                                                </TableRow>
                                                                                                                            </TableHeader>
                                                                                                                            <TableBody>
                                                                                                                                {report.checklistTemplate?.templateItems.map(item => (
                                                                                                                                    <TableRow key={item.id}>
                                                                                                                                        <TableCell className="border border-slate-300 whitespace-nowrap">{item.category}</TableCell>
                                                                                                                                        <TableCell className="border border-slate-300 whitespace-nowrap">{item.description}</TableCell>                          {Array.from({ length: new Date(report.year, report.month, 0).getDate() }, (_, i) => i + 1).map(day => {
                            const reportForDay = report.dailyReports.find(r => new Date(r.reportDate).getDate() === day);
                            const detail = reportForDay && reportForDay.reportDetails ? reportForDay.reportDetails.find(d => d.itemId === item.id) : undefined;
                            return (
                              <TableCell key={day} className="border border-slate-300 text-center">{detail?.checkState || ''}</TableCell>
                            );
                          })}
                        </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}