import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import apiClient from './apiConfig';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '../../components/ui/Dialog';
import { Label } from '../../components/ui/Label';

const TBMChecklist = ({ reportIdForEdit, onFinishEditing }) => {
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState('');
    const [checklistData, setChecklistData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [checkResults, setCheckResults] = useState({});
    const [signatures, setSignatures] = useState({});
    const [remarks, setRemarks] = useState("");
    const [currentUserForSigning, setCurrentUserForSigning] = useState(null);
    const managerSigPad = useRef(null);

    const isEditMode = reportIdForEdit != null;

    const resetState = () => {
        setCheckResults({});
        setSignatures({});
        setRemarks("특이사항 없음");
        if(managerSigPad.current) managerSigPad.current.clear();
    }

    useEffect(() => {
        apiClient.get('/api/teams')
            .then(response => {
                setTeams(response.data);
                if (!isEditMode && response.data.length > 0) {
                    setSelectedTeam(response.data[0].teamID.toString());
                }
            })
            .catch(error => console.error("Error fetching teams:", error));
    }, [isEditMode]);

    useEffect(() => {
        if (isEditMode) {
            setLoading(true);
            apiClient.get(`/api/reports/${reportIdForEdit}`)
                .then(response => {
                    const report = response.data;
                    setSelectedTeam(report.teamID.toString());
                    setRemarks(report.remarks);
                    const loadedResults = {};
                    report.reportDetails.forEach(detail => { loadedResults[detail.itemID] = detail.checkState; });
                    setCheckResults(loadedResults);
                    const loadedSignatures = {};
                    report.reportSignatures.forEach(sig => {
                        if(sig.user) { loadedSignatures[sig.userID] = `data:image/png;base64,${sig.signatureImage}`; }
                    });
                    setSignatures(loadedSignatures);
                })
                .catch(error => console.error("Error fetching report for edit:", error))
                .finally(() => setLoading(false));
        }
    }, [isEditMode, reportIdForEdit]);

    useEffect(() => {
        if (!selectedTeam) return;
        setLoading(true);
        if(!isEditMode) resetState();
        const fetchChecklist = apiClient.get(`/api/checklist/${selectedTeam}`);
        const fetchUsers = apiClient.get(`/api/teams/${selectedTeam}/users`);
        Promise.all([fetchChecklist, fetchUsers])
            .then(([checklistRes, usersRes]) => {
                setChecklistData(checklistRes.data);
                setUsers(usersRes.data);
            })
            .catch(error => console.error(`Error fetching data for team ${selectedTeam}:`, error))
            .finally(() => setLoading(false));
    }, [selectedTeam, isEditMode]);

    const handleCheck = (itemId, value) => setCheckResults(prev => ({ ...prev, [itemId]: value }));
    const handleSaveSignature = (userId, signatureImage) => setSignatures(prev => ({ ...prev, [userId]: signatureImage }));

    const handleSubmit = async () => {
        if (checklistData && Object.keys(checkResults).length !== checklistData.items.length) {
            alert("모든 항목을 점검해주세요.");
            return;
        }
        const signatureDtos = Object.entries(signatures).map(([userId, signatureImage]) => ({ userId: parseInt(userId), signatureImage }));
        if (!managerSigPad.current.isEmpty()) {
            const managerUserId = users.find(u => u.userName === "홍길동")?.userID || (users.length > 0 ? users[0].userID : 0);
            signatureDtos.push({ userId: managerUserId, signatureImage: managerSigPad.current.toDataURL('image/png') });
        } else if (!isEditMode) {
            alert("관리자 서명이 필요합니다.");
            return;
        }
        const submissionData = { reportDate: new Date().toISOString(), teamId: parseInt(selectedTeam), managerName: "홍길동", results: checkResults, remarks, signatures: signatureDtos };
        setIsSubmitting(true);
        try {
            if (isEditMode) {
                await apiClient.put(`/api/reports/${reportIdForEdit}`, submissionData);
                alert("점검표가 성공적으로 수정되었습니다.");
                onFinishEditing();
            } else {
                await apiClient.post('/api/reports', submissionData);
                alert(`${teams.find(t => t.teamID === parseInt(selectedTeam)).teamName} 점검표가 성공적으로 제출되었습니다.`);
                resetState();
            }
        } catch (error) {
            console.error("Error submitting report:", error);
            alert(`데이터 저장 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const SignatureDialog = ({ user, onSave }) => {
        const sigPad = useRef(null);
        return (
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{user.userName} 님, 서명해주세요.</DialogTitle>
                    <DialogDescription>아래 영역에 서명을 진행해주세요. 완료 후 저장 버튼을 누르세요.</DialogDescription>
                </DialogHeader>
                <div className="border rounded-md bg-white">
                    <SignatureCanvas ref={sigPad} penColor='black' canvasProps={{ className: 'w-full h-[200px]' }} />
                </div>
                <DialogFooter className="gap-2 sm:justify-between">
                    <Button variant="outline" onClick={() => sigPad.current.clear()}>다시 서명</Button>
                    <Button onClick={() => { onSave(user.userID, sigPad.current.toDataURL('image/png')); setCurrentUserForSigning(null); }}>저장</Button>
                </DialogFooter>
            </DialogContent>
        );
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>{isEditMode ? `점검표 수정 (ID: ${reportIdForEdit})` : `${new Date().getFullYear()}년 관리감독자 일일 안전점검 / TBM 활동지`}</CardTitle>
                    <div className="flex items-center gap-4 pt-2">
                        <Label htmlFor="team">팀 선택:</Label>
                        <Select value={selectedTeam} onValueChange={setSelectedTeam} disabled={isEditMode}>
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="팀을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.isArray(teams) && teams.map(team => <SelectItem key={team.teamID} value={team.teamID.toString()}>{team.teamName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
            </Card>

            {loading ? <p>데이터를 불러오는 중입니다...</p> : checklistData ? (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>점검 결과</CardTitle>
                            <CardDescription>
                                부서명: {teams.find(t => t.teamID === parseInt(selectedTeam))?.teamName} | 관리감독자: 홍길동 | 작성일: {new Date().toLocaleDateString()}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>구분</TableHead>
                                            <TableHead>중분류</TableHead>
                                            <TableHead>점검 내용</TableHead>
                                            <TableHead className="text-center">결과 (O: 양호, △: 관찰, X: 불량)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {checklistData.templateItems.map(item => (
                                            <TableRow key={item.itemID}>
                                                <TableCell>{item.category}</TableCell>
                                                <TableCell>{item.subCategory}</TableCell>
                                                <TableCell className="text-sm">{item.description}</TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex justify-center gap-2">
                                                        {['O', '△', 'X'].map(opt => (
                                                            <Button key={opt} variant={checkResults[item.itemID] === opt ? 'default' : 'outline'} size="sm" onClick={() => handleCheck(item.itemID, opt)}>{opt}</Button>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle>TBM 참여 작업자 확인</CardTitle></CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {users.map(user => (
                                        <li key={user.userID} className="flex justify-between items-center">
                                            <span>{user.userName}</span>
                                            {signatures[user.userID] ? 
                                                <span className="text-sm font-bold text-green-600">✔️ 서명 완료</span> : 
                                                <Dialog onOpenChange={(open) => !open && setCurrentUserForSigning(null)} open={currentUserForSigning?.userID === user.userID}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="secondary" onClick={() => setCurrentUserForSigning(user)}>서명하기</Button>
                                                    </DialogTrigger>
                                                    {currentUserForSigning?.userID === user.userID && <SignatureDialog user={user} onSave={handleSaveSignature} />} 
                                                </Dialog>
                                            }
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                        <div className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle>종합 특이사항</CardTitle></CardHeader>
                                <CardContent>
                                    <Textarea rows="4" value={remarks} onChange={e => setRemarks(e.target.value)} />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>관리감독자 확인 서명</CardTitle></CardHeader>
                                <CardContent className="flex flex-col items-center gap-2">
                                    <div className="border rounded-md bg-white w-full h-[150px]"><SignatureCanvas ref={managerSigPad} penColor='black' canvasProps={{ className: 'w-full h-full' }} /></div>
                                    <Button variant="outline" onClick={() => managerSigPad.current.clear()}>다시 서명</Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                        {isEditMode && <Button variant="outline" onClick={onFinishEditing}>수정 취소</Button>}
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? '저장 중...' : (isEditMode ? '수정 완료' : '최종 제출')}
                        </Button>
                    </div>
                </div>
            ) : <p>해당 팀의 점검표를 찾을 수 없습니다.</p>}
        </div>
    );
};

export default TBMChecklist;
