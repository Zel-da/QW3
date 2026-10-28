/**
 * 잠재위험 발굴 및 개선 현황표
 * - 사업소별(아산/화성) · 부서별 발굴/개선 집계
 * - 연도 선택
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, BarChart3, Download } from 'lucide-react';

interface Row {
  teamId: number;
  teamName: string;
  departmentName: string | null;
  found: number;
  completed: number;
  inProgress: number;
  pending: number;
  rate: number;
}
interface SiteBlock {
  site: string;
  rows: Row[];
  total: { found: number; completed: number; inProgress: number; pending: number; rate: number };
}
interface ReportData {
  year: number;
  availableYears: number[];
  bySite: SiteBlock[];
}

function RateCell({ rate }: { rate: number }) {
  const color = rate >= 80 ? 'text-green-700 bg-green-50' : rate >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{rate.toFixed(1)}%</span>;
}

export default function PotentialRiskReportPage() {
  const nowYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(nowYear);

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ['potential-risk-report', year],
    queryFn: async () => {
      const res = await fetch(`/api/potential-risks/report-summary?year=${year}`, { credentials: 'include' });
      if (!res.ok) throw new Error('조회 실패');
      return res.json();
    },
  });

  const exportCsv = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`잠재위험 발굴 및 개선현황 ${data.year}년`);
    lines.push('');
    for (const block of data.bySite) {
      lines.push(`[${block.site}사업소]`);
      lines.push(['부서', '발굴', '진행중', '완료', '미회신', '개선율(%)'].join(','));
      for (const r of block.rows) {
        lines.push([r.teamName, r.found, r.inProgress, r.completed, r.pending, r.rate.toFixed(1)].join(','));
      }
      lines.push(['전체합계', block.total.found, block.total.inProgress, block.total.completed, block.total.pending, block.total.rate.toFixed(1)].join(','));
      lines.push('');
    }
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `잠재위험_개선현황_${data.year}년.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-6xl">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/potential-risks">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1.5" />목록</Button>
          </Link>
        </div>

        <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              잠재위험 발굴 및 개선현황
            </h1>
            <p className="text-sm text-muted-foreground mt-1">사업소·부서별 발굴 건수와 개선율 집계</p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">연도</label>
              <Select value={String(year)} onValueChange={v => setYear(parseInt(v))}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(data?.availableYears || [nowYear]).map(y => (
                    <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportCsv} disabled={!data}>
              <Download className="w-4 h-4 mr-1.5" />CSV 다운로드
            </Button>
          </div>
        </div>

        {isLoading && (
          <Card><CardContent className="p-10 text-center text-muted-foreground">로딩 중...</CardContent></Card>
        )}

        {data && data.bySite.map(block => (
          <Card key={block.site} className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${block.site === '아산' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                  {block.site}사업소
                </span>
                <span>{data.year}년 발굴·개선 현황</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>부서</TableHead>
                      <TableHead className="w-24 text-right">발굴</TableHead>
                      <TableHead className="w-24 text-right">진행중</TableHead>
                      <TableHead className="w-24 text-right">완료</TableHead>
                      <TableHead className="w-24 text-right">미회신</TableHead>
                      <TableHead className="w-28 text-right">개선율</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* 전체 합계 로우 (강조) */}
                    <TableRow className="bg-muted/40 font-semibold">
                      <TableCell>전체 합계</TableCell>
                      <TableCell className="text-right">{block.total.found}</TableCell>
                      <TableCell className="text-right">{block.total.inProgress}</TableCell>
                      <TableCell className="text-right">{block.total.completed}</TableCell>
                      <TableCell className="text-right">{block.total.pending}</TableCell>
                      <TableCell className="text-right"><RateCell rate={block.total.rate} /></TableCell>
                    </TableRow>
                    {block.rows.filter(r => r.found > 0).map(r => (
                      <TableRow key={r.teamId}>
                        <TableCell>
                          {r.teamName}
                          {r.departmentName && (
                            <span className="ml-2 text-xs text-muted-foreground">({r.departmentName})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{r.found}</TableCell>
                        <TableCell className="text-right">{r.inProgress}</TableCell>
                        <TableCell className="text-right">{r.completed}</TableCell>
                        <TableCell className="text-right">{r.pending}</TableCell>
                        <TableCell className="text-right"><RateCell rate={r.rate} /></TableCell>
                      </TableRow>
                    ))}
                    {block.rows.filter(r => r.found > 0).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                          해당 사이트에 {data.year}년 발굴 건이 없습니다
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
