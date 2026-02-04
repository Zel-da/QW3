import React, { useState, useEffect } from 'react';
import apiClient from './apiConfig';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Terminal, ArrowLeft, X, FileAudio, Play, Pause, FileText, Clock, Copy, Loader2 } from "lucide-react";

// 시간 포맷팅 함수
const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// 파일 크기 포맷팅
const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ReportDetailView = ({ reportId, onBackToList, onModify, isLoadingModify, currentUser }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [enlargedImage, setEnlargedImage] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioPlaybackTime, setAudioPlaybackTime] = useState(0);
    const audioRef = React.useRef(null);

    // Parse remarks JSON
    const parsedRemarks = React.useMemo(() => {
        if (!report?.remarks) return null;
        try {
            return JSON.parse(report.remarks);
        } catch {
            return { text: report.remarks };
        }
    }, [report?.remarks]);

    useEffect(() => {
        if (reportId) {
            setLoading(true);
            apiClient.get(`/api/tbm/${reportId}`)
                .then(response => setReport(response.data))
                .catch(err => setError('상세 정보를 불러오는 데 실패했습니다.'))
                .finally(() => setLoading(false));
        }
    }, [reportId]);

    const handleDelete = async () => {
        if (window.confirm('정말로 이 점검표를 삭제하시겠습니까?')) {
            setIsDeleting(true);
            try {
                await apiClient.delete(`/api/tbm/${reportId}`);
                alert('삭제되었습니다.');
                onBackToList();
            } catch (err) {
                setError('삭제 중 오류가 발생했습니다.');
            } finally {
                setIsDeleting(false);
            }
        }
    };

    if (loading) return <p>상세 정보를 불러오는 중...</p>;
    if (error) return <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>오류</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
    if (!report) return <p>표시할 정보가 없습니다.</p>;

    // 작성자 본인 또는 ADMIN만 수정/삭제 가능
    const originalAuthorId = report.reportDetails?.[0]?.authorId;
    const canEdit = currentUser?.role === 'ADMIN' || !originalAuthorId || originalAuthorId === currentUser?.id;

    const handleModifyWithCheck = () => {
        if (!canEdit) {
            alert('권한이 없습니다. 본인이 작성한 TBM만 수정할 수 있습니다.');
            return;
        }
        onModify(report.id);
    };

    const handleDeleteWithCheck = () => {
        if (!canEdit) {
            alert('권한이 없습니다. 본인이 작성한 TBM만 삭제할 수 있습니다.');
            return;
        }
        handleDelete();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={onBackToList}><ArrowLeft className="mr-2 h-4 w-4" /> 목록으로 돌아가기</Button>
                <div className="flex gap-2">
                    <Button
                        onClick={handleModifyWithCheck}
                        disabled={isLoadingModify}
                    >
                        {isLoadingModify ? '불러오는 중...' : '이 점검표 수정하기'}
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteWithCheck} disabled={isDeleting}>
                        {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />삭제 중...</> : '삭제'}
                    </Button>
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

                    {/* 음성 녹음 섹션 */}
                    {parsedRemarks?.audioRecording && (
                        <div className="mt-8">
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <FileAudio className="h-5 w-5 text-primary" />
                                TBM 음성 녹음
                            </h3>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                                {/* 오디오 플레이어 */}
                                <div className="flex items-center gap-4 bg-background rounded-lg p-3 border">
                                    <audio
                                        ref={audioRef}
                                        src={parsedRemarks.audioRecording.url}
                                        onTimeUpdate={() => setAudioPlaybackTime(audioRef.current?.currentTime || 0)}
                                        onEnded={() => {
                                            setIsAudioPlaying(false);
                                            setAudioPlaybackTime(0);
                                            if (audioRef.current) audioRef.current.currentTime = 0;
                                        }}
                                    />
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => {
                                            if (!audioRef.current) return;
                                            if (isAudioPlaying) {
                                                audioRef.current.pause();
                                            } else {
                                                audioRef.current.play();
                                            }
                                            setIsAudioPlaying(!isAudioPlaying);
                                        }}
                                    >
                                        {isAudioPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                                    </Button>
                                    <div className="flex-1">
                                        <input
                                            type="range"
                                            min={0}
                                            max={parsedRemarks.audioRecording.duration || 100}
                                            value={audioPlaybackTime}
                                            onChange={(e) => {
                                                const time = Number(e.target.value);
                                                if (audioRef.current) {
                                                    audioRef.current.currentTime = time;
                                                    setAudioPlaybackTime(time);
                                                }
                                            }}
                                            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                    <span className="text-sm font-mono min-w-[100px] text-right">
                                        {formatTime(audioPlaybackTime)} / {formatTime(parsedRemarks.audioRecording.duration)}
                                    </span>
                                </div>

                                {/* 파일 정보 */}
                                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                                    <span className="flex items-center gap-1">
                                        <FileAudio className="h-3 w-3" />
                                        {parsedRemarks.audioRecording.name}
                                    </span>
                                    <span>{formatFileSize(parsedRemarks.audioRecording.size)}</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(parsedRemarks.audioRecording.recordedAt).toLocaleString('ko-KR')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STT 변환 결과 섹션 */}
                    {parsedRemarks?.transcription && parsedRemarks.transcription.status === 'completed' && (
                        <div className="mt-6">
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                음성 → 텍스트 변환 결과
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">완료</span>
                            </h3>
                            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                                <div className="bg-background border rounded p-4 text-sm max-h-60 overflow-y-auto whitespace-pre-wrap">
                                    {parsedRemarks.transcription.text}
                                </div>
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>변환 시간: {new Date(parsedRemarks.transcription.processedAt).toLocaleString('ko-KR')}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1"
                                        onClick={() => {
                                            navigator.clipboard.writeText(parsedRemarks.transcription.text);
                                            alert('텍스트가 클립보드에 복사되었습니다.');
                                        }}
                                    >
                                        <Copy className="h-3 w-3" />
                                        복사
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
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