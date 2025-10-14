import React, { useState, useEffect } from 'react';
import apiClient from './apiConfig';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { ArrowLeft } from 'lucide-react';

const ReportDetailView = ({ reportId, onBackToList, onModify }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!reportId) return;

        setLoading(true);
        apiClient.get(`/api/reports/${reportId}`)
            .then(response => setReport(response.data))
            .catch(error => console.error(`Error fetching report ${reportId}:`, error))
            .finally(() => setLoading(false));
    }, [reportId]);

    const handleDelete = async () => {
        if (window.confirm(`정말로 이 점검표(ID: ${reportId})를 삭제하시겠습니까?`)) {
            try {
                await apiClient.delete(`/api/reports/${reportId}`);
                alert("점검표가 성공적으로 삭제되었습니다.");
                onBackToList();
            } catch (error) {
                console.error("Error deleting report:", error);
                alert("삭제 중 오류가 발생했습니다.");
            }
        }
    };

    if (loading) {
        return <p>점검표 상세 정보를 불러오는 중...</p>;
    }

    if (!report) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>오류</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>표시할 점검표를 선택해주세요.</p>
                    <Button onClick={onBackToList} variant="outline" className="mt-4">목록으로</Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <Button onClick={onBackToList} variant="outline" size="sm">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    목록으로
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>점검표 상세 보기 (ID: {report.reportID})</CardTitle>
                            <CardDescription>
                                {new Date(report.reportDate).toLocaleDateString()} / {report.team?.teamName} / {report.managerName}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => onModify(reportId)} variant="secondary">수정</Button>
                            <Button onClick={handleDelete} variant="destructive">삭제</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="text-lg font-semibold mb-2">점검 결과</h4>
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>구분</TableHead>
                                        <TableHead>중분류</TableHead>
                                        <TableHead>점검 내용</TableHead>
                                        <TableHead className="text-center">결과</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {report.reportDetails?.map(detail => (
                                        <TableRow key={detail.detailID}>
                                            <TableCell>{detail.item?.category}</TableCell>
                                            <TableCell>{detail.item?.subCategory}</TableCell>
                                            <TableCell>{detail.item?.description}</TableCell>
                                            <TableCell className="text-center font-bold">{detail.checkState}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-2">종합 특이사항</h4>
                        <div className="border rounded-md p-4 bg-muted/50 min-h-[100px]">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report.remarks || '특이사항 없음'}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-lg font-semibold mb-2">서명</h4>
                        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                            {report.reportSignatures?.map(sig => (
                                <Card key={sig.signatureID} className="text-center">
                                    <CardHeader className="p-4">
                                        <CardTitle className="text-base">{sig.user?.userName || '관리자'}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <img src={`data:image/png;base64,${sig.signatureImage}`} alt={`signature of ${sig.user?.userName}`} className="mx-auto border bg-white" />
                                    </CardContent>
                                    <CardFooter className="p-4 text-xs text-muted-foreground">
                                        {new Date(sig.signedAt).toLocaleString()}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportDetailView;
