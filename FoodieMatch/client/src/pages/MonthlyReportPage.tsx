import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import { useSite, Site } from '@/hooks/use-site';
import { stripSiteSuffix } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { DailyReport, User, Team, Course, UserProgress, UserAssessment } from '@shared/schema';
import { SITES } from '@/lib/constants';

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

interface EducationOverviewData {
  users: (User & { team?: Team })[];
  courses: Course[];
  allProgress: UserProgress[];
  allAssessments: UserAssessment[];
}

const fetchEducationOverview = async (): Promise<EducationOverviewData> => {
  const { data } = await axios.get('/api/admin/education-overview');
  return data;
};

interface AttendanceOverviewData {
  teams: Array<{
    teamId: number;
    teamName: string;
    dailyStatuses: { [day: number]: 'not-submitted' | 'completed' | 'has-issues' };
  }>;
  daysInMonth: number;
}

const fetchAttendanceOverview = async (year: number, month: number, site: Site): Promise<AttendanceOverviewData | null> => {
  if (!site) return null;
  const { data } = await axios.get(`/api/reports/attendance-overview?year=${year}&month=${month}&site=${site}`);
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

  const { data: educationData } = useQuery<EducationOverviewData>({
    queryKey: ['education-overview'],
    queryFn: fetchEducationOverview,
    enabled: !!(user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM'),
  });

  const { data: attendanceOverview } = useQuery<AttendanceOverviewData | null>({
    queryKey: ['attendance-overview', date.year, date.month, site],
    queryFn: () => fetchAttendanceOverview(date.year, date.month, site),
    enabled: !!site,
  });

  // Calculate team member education statistics
  const teamEducationStats = React.useMemo(() => {
    if (!educationData || !selectedTeam) return [];

    const teamMembers = educationData.users.filter(u => u.teamId === selectedTeam);
    const totalCourses = educationData.courses.length;

    return teamMembers.map(member => {
      const memberProgress = educationData.allProgress.filter(p => p.userId === member.id);
      const completedCourses = memberProgress.filter(p => p.completed).length;
      const inProgressCourses = memberProgress.filter(p => !p.completed && p.progress > 0).length;
      const avgProgress = memberProgress.length > 0
        ? Math.round(memberProgress.reduce((sum, p) => sum + p.progress, 0) / memberProgress.length)
        : 0;

      return {
        userId: member.id,
        userName: member.name || member.username,
        totalCourses,
        completedCourses,
        inProgressCourses,
        avgProgress,
        status: completedCourses === totalCourses && totalCourses > 0 ? 'completed' :
                inProgressCourses > 0 || completedCourses > 0 ? 'in-progress' : 'not-started'
      };
    });
  }, [educationData, selectedTeam]);

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
                    {SITES.map(site => (
                      <SelectItem key={site} value={site}>{site}</SelectItem>
                    ))}
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

        {/* 전체 팀 TBM 출석 현황 표 */}
        {attendanceOverview && attendanceOverview.teams.length > 0 && (
          <Card className="mt-8 no-print">
            <CardHeader>
              <CardTitle>전체 팀 TBM 출석 현황 ({date.year}년 {date.month}월)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="border-collapse border border-slate-400">
                <TableHeader>
                  <TableRow>
                    <TableHead className="border border-slate-300 bg-slate-100 sticky left-0 z-10 min-w-[150px]">팀명</TableHead>
                    {Array.from({ length: attendanceOverview.daysInMonth }, (_, i) => i + 1).map(day => (
                      <TableHead key={day} className="border border-slate-300 text-center w-8 p-1 bg-slate-100">
                        {day}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceOverview.teams.map(team => (
                    <TableRow key={team.teamId}>
                      <TableCell className="border border-slate-300 font-medium sticky left-0 bg-white z-10">
                        {stripSiteSuffix(team.teamName)}
                      </TableCell>
                      {Array.from({ length: attendanceOverview.daysInMonth }, (_, i) => i + 1).map(day => {
                        const status = team.dailyStatuses[day];
                        const bgColor =
                          status === 'not-submitted' ? 'bg-red-200' :
                          status === 'has-issues' ? 'bg-yellow-200' :
                          'bg-white';
                        const textColor =
                          status === 'not-submitted' ? 'text-red-900' :
                          status === 'has-issues' ? 'text-yellow-900' :
                          'text-green-900';
                        const symbol =
                          status === 'not-submitted' ? '✗' :
                          status === 'has-issues' ? '△' :
                          '✓';

                        return (
                          <TableCell
                            key={day}
                            className={`border border-slate-300 text-center p-1 ${bgColor} ${textColor}`}
                            title={
                              status === 'not-submitted' ? '미작성' :
                              status === 'has-issues' ? '세모/엑스 포함' :
                              '작성완료'
                            }
                          >
                            {symbol}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4 flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-white border border-slate-300 flex items-center justify-center text-green-900">✓</div>
                  <span>작성완료</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-200 border border-slate-300 flex items-center justify-center text-yellow-900">△</div>
                  <span>세모/엑스 포함</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-200 border border-slate-300 flex items-center justify-center text-red-900">✗</div>
                  <span>미작성</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && <p className="mt-8">보고서 데이터를 불러오는 중...</p>}
        {isError && <p className="mt-8 text-red-500">데이터를 불러오지 못했습니다.</p>}
        {report && (
          <div className="mt-8 space-y-4" id="report-content">
            <h1 className="text-3xl font-bold text-center">TBM 월별 점검 보고서</h1>
            <div className="flex justify-between items-center">
              <p className="text-xl">팀: {stripSiteSuffix(report.teamName)}</p>
              <p className="text-xl">기간: {report.year}년 {report.month}월</p>
            </div>

            {/* Education Completion Status Section */}
            {teamEducationStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>팀원 안전교육 이수 현황</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <Table className="border-collapse border border-slate-400">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="border border-slate-300">이름</TableHead>
                        <TableHead className="border border-slate-300 text-center">완료 과정</TableHead>
                        <TableHead className="border border-slate-300 text-center">진행중 과정</TableHead>
                        <TableHead className="border border-slate-300 text-center">평균 진행률</TableHead>
                        <TableHead className="border border-slate-300 text-center">상태</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamEducationStats.map((stat) => (
                        <TableRow key={stat.userId}>
                          <TableCell className="border border-slate-300 font-medium">{stat.userName}</TableCell>
                          <TableCell className="border border-slate-300 text-center">
                            {stat.completedCourses} / {stat.totalCourses}
                          </TableCell>
                          <TableCell className="border border-slate-300 text-center">
                            {stat.inProgressCourses}
                          </TableCell>
                          <TableCell className="border border-slate-300 text-center">
                            {stat.avgProgress}%
                          </TableCell>
                          <TableCell className="border border-slate-300 text-center">
                            <Badge
                              className={
                                stat.status === 'completed' ? 'bg-green-500' :
                                stat.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'
                              }
                            >
                              {stat.status === 'completed' ? '완료' :
                               stat.status === 'in-progress' ? '진행중' : '미시작'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

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
                                                                                                                                                            {report.checklistTemplate?.templateItems.map((item: any) => (
                                                                                                                                                                <TableRow key={item.id}>
                                                                                                                                                                    <TableCell className="border border-slate-300 whitespace-nowrap">{item.category}</TableCell><TableCell className="border border-slate-300 whitespace-nowrap">{item.description}</TableCell>{Array.from({ length: new Date(report.year, report.month, 0).getDate() }, (_, i) => i + 1).map(day => {
                                                                                                                                                                        const reportForDay = report.dailyReports.find((r: any) => new Date(r.reportDate).getDate() === day);
                                                                                                                                                                        const detail = reportForDay && reportForDay.reportDetails ? reportForDay.reportDetails.find((d: any) => d.itemId === item.id) : undefined;
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

            {/* 세모/엑스 상세 리스트 */}
            {report && report.dailyReports && report.dailyReports.length > 0 && (() => {
              const problematicItems: any[] = [];

              report.dailyReports.forEach((dailyReport: any) => {
                if (dailyReport.reportDetails) {
                  dailyReport.reportDetails.forEach((detail: any) => {
                    if (detail.checkState === '△' || detail.checkState === 'X') {
                      const templateItem = report.checklistTemplate?.templateItems.find((item: any) => item.id === detail.itemId);
                      problematicItems.push({
                        date: new Date(dailyReport.reportDate).toLocaleDateString('ko-KR'),
                        category: templateItem?.category || '알 수 없음',
                        description: templateItem?.description || '알 수 없음',
                        checkState: detail.checkState,
                        actionDescription: detail.actionDescription || '',
                        attachments: detail.attachments || []
                      });
                    }
                  });
                }
              });

              if (problematicItems.length === 0) return null;

              return (
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle className="text-xl text-red-600">⚠️ 세모/엑스 상세 내역 ({problematicItems.length}건)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">날짜</TableHead>
                          <TableHead className="w-[100px]">구분</TableHead>
                          <TableHead>점검항목</TableHead>
                          <TableHead className="w-[80px] text-center">결과</TableHead>
                          <TableHead>조치 내용</TableHead>
                          <TableHead className="w-[100px]">첨부</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {problematicItems.map((item, index) => (
                          <TableRow key={index} className={item.checkState === 'X' ? 'bg-red-50' : 'bg-yellow-50'}>
                            <TableCell>{item.date}</TableCell>
                            <TableCell>{item.category}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={item.checkState === 'X' ? 'destructive' : 'secondary'} className={item.checkState === '△' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}>
                                {item.checkState}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-pre-wrap">{item.actionDescription}</TableCell>
                            <TableCell>
                              {item.attachments.length > 0 ? (
                                <div className="flex gap-1">
                                  {item.attachments.map((att: any, idx: number) => (
                                    <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                                      📎{idx + 1}
                                    </a>
                                  ))}
                                </div>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}