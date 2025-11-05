import React, { useState, useEffect } from 'react';
import apiClient from './apiConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Terminal, ArrowLeft, X } from "lucide-react";

const ReportDetailView = ({ reportId, onBackToList, onModify }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [enlargedImage, setEnlargedImage] = useState(null);

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
                                        {detail.author?.name && <p className="text-xs text-muted-foreground mb-2">작성자: {detail.author.name}</p>}
                                        {detail.attachments && detail.attachments.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {detail.attachments.map((att, idx) => (
                                                    <img
                                                        key={idx}
                                                        src={att.url}
                                                        alt={att.name || 'Attachment'}
                                                        className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                                        onClick={() => setEnlargedImage(att.url)}
                                                    />
                                                ))}
                                            </div>
                                        ) : detail.photoUrl ? (
                                            <img
                                                src={detail.photoUrl}
                                                alt="Attachment"
                                                className="w-24 h-24 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => setEnlargedImage(detail.photoUrl)}
                                            />
                                        ) : '-'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <h3 className="font-semibold text-lg mt-8 mb-4">서명</h3>
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {report.reportSignatures.map(sig => {
                            // sig.user 또는 sig.teamMember 중 하나를 사용
                            const signerName = sig.user?.name || sig.teamMember?.name || '알 수 없음';
                            return (
                                <div key={sig.id} className="p-4 border rounded-lg text-center bg-gray-50">
                                    <p className="font-semibold mb-2">{signerName}</p>
                                    {sig.signatureImage && (
                                        <img
                                            src={sig.signatureImage}
                                            alt={`${signerName} 서명`}
                                            className="w-full h-20 object-contain border rounded cursor-pointer hover:opacity-80 transition-opacity mb-2"
                                            onClick={() => setEnlargedImage(sig.signatureImage)}
                                        />
                                    )}
                                    <p className="text-xs text-gray-500">{new Date(sig.signedAt).toLocaleTimeString()}</p>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Image Viewer Dialog */}
            <Dialog open={!!enlargedImage} onOpenChange={(open) => !open && setEnlargedImage(null)}>
                <DialogContent className="max-w-4xl w-full p-0">
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
                            onClick={() => setEnlargedImage(null)}
                        >
                            <X className="h-6 w-6" />
                        </Button>
                        <img
                            src={enlargedImage}
                            alt="확대된 이미지"
                            className="w-full h-auto max-h-[80vh] object-contain"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ReportDetailView;