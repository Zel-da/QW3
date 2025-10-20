import React, { useState, useEffect } from 'react';
import apiClient from './apiConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, ArrowLeft } from "lucide-react";

const ReportDetailView = ({ reportId, onBackToList, onModify }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (reportId) {
            setLoading(true);
            apiClient.get(`/api/reports/${reportId}`)
                .then(response => setReport(response.data))
                .catch(err => setError('상세 정보를 불러오는 데 실패했습니다.'))
                .finally(() => setLoading(false));
        }
    }, [reportId]);

    const handleDelete = async () => {
        if (window.confirm('정말로 이 점검표를 삭제하시겠습니까?')) {
            try {
                await apiClient.delete(`/api/reports/${reportId}`);
                alert('삭제되었습니다.');
                onBackToList(); // Go back to the list view
            } catch (err) {
                setError('삭제 중 오류가 발생했습니다.');
            }
        }
    };

    if (loading) return <p>상세 정보를 불러오는 중...</p>;
    if (error) return <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>오류</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (!report) return <p>표시할 정보가 없습니다.</p>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={onBackToList}><ArrowLeft className="mr-2 h-4 w-4" /> 목록으로 돌아가기</Button>
                <div className="flex gap-2">
                    <Button onClick={() => onModify(report.id)}>이 점검표 수정하기</Button>
                    <Button variant="destructive" onClick={handleDelete}>삭제</Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>TBM 점검표 상세</CardTitle>
                    <CardDescription>
                        {new Date(report.reportDate).toLocaleDateString()} / {report.team.name}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <h3 className="font-semibold text-lg mb-4">점검 항목</h3>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>구분</TableHead>
                                <TableHead>점검항목</TableHead>
                                <TableHead>결과</TableHead>
                                <TableHead>첨부사진</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.reportDetails.map(detail => (
                                <TableRow key={detail.id}>
                                    <TableCell>{detail.item.category}</TableCell>
                                    <TableCell>{detail.item.description}</TableCell>
                                    <TableCell>{detail.checkState}</TableCell>
                                    <TableCell>
                                        {detail.actionDescription && <p className="text-sm text-muted-foreground mb-1">내용: {detail.actionDescription}</p>}
                                        {detail.author?.name && <p className="text-xs text-muted-foreground">작성자: {detail.author.name}</p>}
                                        {detail.photoUrl ? (
                                            <a href={detail.photoUrl} target="_blank" rel="noopener noreferrer">
                                                <img src={detail.photoUrl} alt="Attachment" className="w-24 h-24 object-cover rounded-md" />
                                            </a>
                                        ) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <h3 className="font-semibold text-lg mt-8 mb-4">서명</h3>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {report.reportSignatures.map(sig => (
                            <div key={sig.id} className="p-4 border rounded-lg text-center bg-gray-100">
                                <p className="font-semibold">{sig.user.name}</p>
                                <p className="text-sm text-gray-500">{new Date(sig.signedAt).toLocaleTimeString()}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportDetailView;