import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const fetchMonthlyReport = async (teamId, year, month) => {
  const { data } = await axios.get(`/api/reports/monthly?teamId=${teamId}&year=${year}&month=${month}`);
  return data;
};

export default function MonthlyReportPage() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [date, setDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  React.useEffect(() => {
    axios.get('/api/teams').then(res => setTeams(res.data));
  }, []);

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['monthlyReport', selectedTeam, date.year, date.month],
    queryFn: () => fetchMonthlyReport(selectedTeam, date.year, date.month),
    enabled: !!selectedTeam,
  });

  const handlePrint = () => {
      // This would ideally trigger a PDF generation on the backend
      // For now, we can use the browser's print functionality
      window.print();
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8 print-container">
        <Card className="no-print">
          <CardHeader>
            <CardTitle>월별 TBM 보고서</CardTitle>
            <div className="flex items-center gap-4 mt-4">
              <Select onValueChange={setSelectedTeam} value={selectedTeam || ''}>
                  <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                      {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                  </SelectContent>
              </Select>
              <Input type="month" value={`${date.year}-${String(date.month).padStart(2, '0')}`}
                  onChange={e => {
                      const [year, month] = e.target.value.split('-');
                      setDate({ year: parseInt(year), month: parseInt(month) });
                  }}
                  className="w-[200px]" />
              <Button onClick={handlePrint} disabled={!report}>인쇄</Button>
            </div>
          </CardHeader>
        </Card>

        {isLoading && <p className="mt-8">보고서 데이터를 불러오는 중...</p>}
        {isError && <p className="mt-8 text-red-500">데이터를 불러오지 못했습니다.</p>}
        {report && (
            <div className="mt-8 space-y-8" id="report-content">
                <h1 className="text-3xl font-bold text-center">TBM 월별 점검 보고서</h1>
                <div className="flex justify-between items-center">
                    <p className="text-xl">팀: {report.teamName}</p>
                    <p className="text-xl">기간: {report.year}년 {report.month}월</p>
                </div>

                {/* This is a simplified view. A real report would be more detailed */}
                <Card>
                    <CardHeader><CardTitle>월간 요약</CardTitle></CardHeader>
                    <CardContent>
                        <p>총 점검 횟수: {report.dailyReports.length}회</p>
                        {/* Further summary details would go here */}
                    </CardContent>
                </Card>

                {report.dailyReports.map(daily => (
                    <Card key={daily.id}>
                        <CardHeader>
                            <CardTitle>{new Date(daily.reportDate).toLocaleDateString()} 점검</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Details of each daily report */}
                        </CardContent>
                    </Card>
                ))}

                <div className="pt-16">
                    <h2 className="text-2xl font-bold mb-8">결재 라인</h2>
                    <div className="grid grid-cols-3 gap-8 text-center">
                        <div className="space-y-4"><p>작성자</p><div className="h-24 border-b"></div></div>
                        <div className="space-y-4"><p>검토자</p><div className="h-24 border-b"></div></div>
                        <div className="space-y-4"><p>승인자</p><div className="h-24 border-b"></div></div>
                    </div>
                </div>
            </div>
        )}
      </main>
    </div>
  );
}
