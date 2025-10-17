import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import * as XLSX from 'xlsx'; // Import xlsx
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { useSite, Site } from '@/hooks/use-site';
import { stripSiteSuffix } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast'; // Import useToast

const fetchMonthlyReport = async (teamId, year, month) => {
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
  const { toast } = useToast(); // Get toast function
  
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [date, setDate] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  // Effect to set the site based on user role
  useEffect(() => {
    if (user) {
      if (user.role !== 'ADMIN' && user.site) {
        setSite(user.site as Site);
      }
    }
  }, [user, setSite]);

  // Fetch teams based on the selected site
  const { data: teams, isLoading: teamsLoading } = useQuery<any[]>({
    queryKey: ['teams', site],
    queryFn: () => fetchTeams(site),
    enabled: !!site,
  });

  // Reset team selection when site changes
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
    if (!report) {
      toast({ title: "오류", description: "보고서 데이터를 먼저 불러와주세요.", variant: "destructive" });
      return;
    }

    toast({ title: "엑셀 파일 생성 중...", description: "데이터를 재구성하고 있습니다." });

    try {
      // 1. Single Source of Truth: Use only the data we already have.
      // Dynamically build the master checklist from the report data itself.
      const allItemsMap = new Map();
      report.dailyReports.forEach(r => {
        r.reportDetails.forEach(d => {
          if (d.item && !allItemsMap.has(d.item.id)) {
            allItemsMap.set(d.item.id, d.item);
          }
        });
      });
      const sortedMasterChecklist = Array.from(allItemsMap.values()).sort((a, b) => a.displayOrder - b.displayOrder);

      if (sortedMasterChecklist.length === 0) {
        throw new Error("표시할 점검 항목 데이터가 없습니다.");
      }

      // 2. Process Data: Only use dates that have reports
      const sortedReports = report.dailyReports.sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());

      // 3. Build worksheet data and layout
      const wb = XLSX.utils.book_new();
      const sheetName = "TBM 활동일지";
      const ws_data = [];
      const remarks_data = [];

      // --- Header Rows ---
      ws_data.push([`2025년 ( ${date.month} )월【 관리감독자 일일 안전점검 / TBM 활동일지 】`]);
      ws_data.push(["부서명:", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "관리감독자", "", "승인/확인"]);
      ws_data.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]);
      ws_data.push(["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "※ 범례 : ○ 양호, △ 관찰, X 불량", "", "", "", "작성자:", "", user?.name || ""]);

      // --- Main Table Header (Dynamic) ---
      const dateHeader = sortedReports.map(r => new Date(r.reportDate).getDate());
      const mainHeader = ["구분", "", "점검 내용", ...dateHeader];
      ws_data.push(mainHeader);

      // --- Main Table Body (with Data) ---
      const categoryMerges = [];
      let lastCategory = null;
      let mergeStartRow = 5;

      sortedMasterChecklist.forEach((item, index) => {
        const row = [item.category, "", item.description];
        
        sortedReports.forEach(reportForDay => {
          let status = "";
          const detail = reportForDay.reportDetails.find(d => Number(d.itemId) === Number(item.id));
          if (detail) {
            switch (detail.checkState) {
              case 'O': status = 'O'; break;
              case '△': status = '△'; break;
              case 'X': status = 'X'; break;
              default: status = ''; break; // Handle unexpected values
            }
            if (detail.checkState === 'X' || detail.checkState === '△') {
              remarks_data.push([
                new Date(reportForDay.reportDate).toLocaleDateString(),
                detail.item.description, // Get description from the nested item
                detail.actionDescription || '',
                '', // 조치사항 Placeholder
                ''  // 확인 Placeholder
              ]);
            }
          }
          row.push(status);
        });
        ws_data.push(row);

        // Logic for vertical category merges
        if (item.category !== lastCategory) {
          if (lastCategory !== null) {
            categoryMerges.push({ s: { r: mergeStartRow, c: 0 }, e: { r: 4 + index, c: 1 } });
          }
          lastCategory = item.category;
          mergeStartRow = 5 + index;
        }
      });
      // Final category merge
      if (lastCategory !== null) {
         categoryMerges.push({ s: { r: mergeStartRow, c: 0 }, e: { r: 4 + sortedMasterChecklist.length, c: 1 } });
      }

      // --- Spacer and Remarks Section ---
      ws_data.push([]);
      const remarksStartRow = ws_data.length;
      ws_data.push(["■ 참고 사항"]);
      ws_data.push(["1. TBM 절차", "", "도입-점검-지시-위험성예지훈련-지적확인"]);
      ws_data.push(["2. 아침 조회를 시작으로 TBM 진행"]);
      ws_data.push(["3. 점검은 점검항목 순서에 따라 작업전에 할 것"]);
      ws_data.push(["4. X, △의 경우는 해당 팀장에게 필히 연락하고 조치 내용을 기록할 것."]);
      ws_data.push(["5. 점검자는 매일 점검항목에 따라 점검을 하여 기입하고, 점검실시 상황을 확인하여 확인란에 서명할 것."]);
      ws_data.push(["6. TBM 위험성 평가 실시중 기간이 필요한 사항은 잠재위험발굴대장에 추가하여 관리 할 것."]);
      ws_data.push(["7. 특기사항"]);
      ws_data.push(["날짜", "문제점 및 위험예측 사항", "", "", "", "", "조치사항", "", "확인"]);
      remarks_data.forEach(remark_row => {
        ws_data.push(remark_row);
      });

      // 4. Create Worksheet and apply merges
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 27 } },
        { s: { r: 1, c: 29 }, e: { r: 2, c: 30 } }, { s: { r: 1, c: 31 }, e: { r: 2, c: 32 } },
        { s: { r: 3, c: 28 }, e: { r: 3, c: 29 } },
        { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
        { s: { r: remarksStartRow, c: 0 }, e: { r: remarksStartRow, c: 33 } },
        { s: { r: remarksStartRow + 2, c: 2 }, e: { r: remarksStartRow + 2, c: 33 } },
        { s: { r: remarksStartRow + 8, c: 1 }, e: { r: remarksStartRow + 8, c: 5 } },
        { s: { r: remarksStartRow + 8, c: 6 }, e: { r: remarksStartRow + 8, c: 7 } },
        ...categoryMerges
      ];
      const colWidths = [{wch:10}, {wch:10}, {wch:40}, ...dateHeader.map(() => ({wch:4}))];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `TBM_Report_${date.year}_${date.month}.xlsx`);

      toast({ title: "성공", description: "엑셀 파일이 다운로드되었습니다." });

    } catch (error) {
      console.error("Failed to generate Excel report:", error);
      toast({ title: "오류", description: "엑셀 파일을 생성하는 중 오류가 발생했습니다.", variant: "destructive" });
    }
  };


  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8 print-container">
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
                    <SelectItem value="Asan">아산</SelectItem>
                    <SelectItem value="Hwaseong">화성</SelectItem>
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
            <div className="mt-8 space-y-8" id="report-content">
                <h1 className="text-3xl font-bold text-center">TBM 월별 점검 보고서</h1>
                <div className="flex justify-between items-center">
                    <p className="text-xl">팀: {stripSiteSuffix(report.teamName)}</p>
                    <p className="text-xl">기간: {report.year}년 {report.month}월</p>
                </div>

                <Card>
                    <CardHeader><CardTitle>월간 요약</CardTitle></CardHeader>
                    <CardContent>
                        <p>총 점검 횟수: {report.dailyReports.length}회</p>
                    </CardContent>
                </Card>

                {report.dailyReports.map(daily => (
                    <Card key={daily.id}>
                        <CardHeader>
                            <CardTitle>{new Date(daily.reportDate).toLocaleDateString()} 점검</CardTitle>
                        </CardHeader>
                        <CardContent>
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