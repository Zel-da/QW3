import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import axios from 'axios';
import { Header } from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { CheckCircle, XCircle, Clock, FileText, ArrowLeft } from 'lucide-react';
import type { ApprovalRequest } from '@shared/schema';

const fetchSentApprovals = async (status?: string): Promise<ApprovalRequest[]> => {
  const url = status ? `/api/approvals/sent/list?status=${status}` : '/api/approvals/sent/list';
  const res = await axios.get(url);
  return res.data;
};

const fetchReceivedApprovals = async (status?: string): Promise<ApprovalRequest[]> => {
  const url = status ? `/api/approvals/received/list?status=${status}` : '/api/approvals/received/list';
  const res = await axios.get(url);
  return res.data;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'PENDING':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="w-3 h-3 mr-1" />대기 중</Badge>;
    case 'APPROVED':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="w-3 h-3 mr-1" />승인</Badge>;
    case 'REJECTED':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="w-3 h-3 mr-1" />반려</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function ApprovalHistoryPage() {
  const [, setLocation] = useLocation();
  const [sentStatus, setSentStatus] = useState<string>('ALL');
  const [receivedStatus, setReceivedStatus] = useState<string>('ALL');

  const { data: sentApprovals = [], isLoading: sentLoading } = useQuery({
    queryKey: ['sentApprovals', sentStatus],
    queryFn: () => fetchSentApprovals(sentStatus === 'ALL' ? undefined : sentStatus),
  });

  const { data: receivedApprovals = [], isLoading: receivedLoading } = useQuery({
    queryKey: ['receivedApprovals', receivedStatus],
    queryFn: () => fetchReceivedApprovals(receivedStatus === 'ALL' ? undefined : receivedStatus),
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/monthly-report')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              월별보고서
            </Button>
          </div>
          <h1 className="text-3xl font-bold">결재 이력</h1>
          <p className="text-muted-foreground mt-2">
            월별 보고서 결재 요청 및 승인 이력을 확인할 수 있습니다.
          </p>
        </div>

        <Tabs defaultValue="sent" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="sent">요청한 결재</TabsTrigger>
            <TabsTrigger value="received">받은 결재</TabsTrigger>
          </TabsList>

          {/* 요청한 결재 탭 */}
          <TabsContent value="sent">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>내가 요청한 결재 목록</CardTitle>
                  <Select value={sentStatus} onValueChange={setSentStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">전체</SelectItem>
                      <SelectItem value="PENDING">대기 중</SelectItem>
                      <SelectItem value="APPROVED">승인됨</SelectItem>
                      <SelectItem value="REJECTED">반려됨</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {sentLoading ? (
                  <LoadingSpinner size="lg" text="결재 목록을 불러오는 중..." className="py-12" />
                ) : sentApprovals.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="결재 요청 내역이 없습니다"
                    description={sentStatus === 'ALL' ? "아직 결재를 요청하지 않았습니다." : `${sentStatus === 'PENDING' ? '대기 중인' : sentStatus === 'APPROVED' ? '승인된' : '반려된'} 결재가 없습니다.`}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>팀</TableHead>
                          <TableHead>기간</TableHead>
                          <TableHead>결재자</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>요청 일시</TableHead>
                          <TableHead>처리 일시</TableHead>
                          <TableHead>반려 사유</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sentApprovals.map((approval) => (
                          <TableRow key={approval.id}>
                            <TableCell className="font-medium">
                              {approval.monthlyReport?.team?.name || '-'}
                            </TableCell>
                            <TableCell>
                              {approval.monthlyReport ? `${approval.monthlyReport.year}년 ${approval.monthlyReport.month}월` : '-'}
                            </TableCell>
                            <TableCell>
                              {approval.approver ? `${approval.approver.name} (${approval.approver.username})` : '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(approval.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(approval.requestedAt).toLocaleString('ko-KR')}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {approval.approvedAt ? new Date(approval.approvedAt).toLocaleString('ko-KR') : '-'}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              {approval.status === 'REJECTED' && approval.rejectionReason ? (
                                <span className="text-sm text-red-600">{approval.rejectionReason}</span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 받은 결재 탭 */}
          <TabsContent value="received">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>내가 받은 결재 목록</CardTitle>
                  <Select value={receivedStatus} onValueChange={setReceivedStatus}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">전체</SelectItem>
                      <SelectItem value="PENDING">대기 중</SelectItem>
                      <SelectItem value="APPROVED">승인됨</SelectItem>
                      <SelectItem value="REJECTED">반려됨</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {receivedLoading ? (
                  <LoadingSpinner size="lg" text="결재 목록을 불러오는 중..." className="py-12" />
                ) : receivedApprovals.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="받은 결재가 없습니다"
                    description={receivedStatus === 'ALL' ? "아직 결재 요청을 받지 않았습니다." : `${receivedStatus === 'PENDING' ? '대기 중인' : receivedStatus === 'APPROVED' ? '승인한' : '반려한'} 결재가 없습니다.`}
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>팀</TableHead>
                          <TableHead>기간</TableHead>
                          <TableHead>요청자</TableHead>
                          <TableHead>상태</TableHead>
                          <TableHead>요청 일시</TableHead>
                          <TableHead>처리 일시</TableHead>
                          <TableHead>반려 사유</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receivedApprovals.map((approval) => (
                          <TableRow
                            key={approval.id}
                            className={approval.status === 'PENDING' ? 'cursor-pointer hover:bg-muted/50' : ''}
                            onClick={() => {
                              if (approval.status === 'PENDING') {
                                setLocation(`/approval/${approval.id}`);
                              }
                            }}
                          >
                            <TableCell className="font-medium">
                              <span className={approval.status === 'PENDING' ? 'text-blue-600 hover:underline' : ''}>
                                {approval.monthlyReport?.team?.name || '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {approval.monthlyReport ? `${approval.monthlyReport.year}년 ${approval.monthlyReport.month}월` : '-'}
                            </TableCell>
                            <TableCell>
                              {approval.requester ? `${approval.requester.name} (${approval.requester.username})` : '-'}
                            </TableCell>
                            <TableCell>{getStatusBadge(approval.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(approval.requestedAt).toLocaleString('ko-KR')}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {approval.approvedAt ? new Date(approval.approvedAt).toLocaleString('ko-KR') : '-'}
                            </TableCell>
                            <TableCell className="max-w-xs">
                              {approval.status === 'REJECTED' && approval.rejectionReason ? (
                                <span className="text-sm text-red-600">{approval.rejectionReason}</span>
                              ) : (
                                '-'
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
