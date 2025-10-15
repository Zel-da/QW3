import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Calendar } from '../../components/ui/calendar';
import { Checkbox } from '../../components/ui/checkbox';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import imageCompression from 'browser-image-compression';

// API-Funktionen
const apiClient = {
    get: async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}`);
        return response.json();
    },
    post: async (url, data) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error(`Failed to post to ${url}`);
        return response.json();
    },
};

const TBMChecklist = ({ reportIdForEdit, onFinishEditing }) => {
    const [selectedTeam, setSelectedTeam] = useState('');
    const [reportDate, setReportDate] = useState(new Date());
    const [checklistData, setChecklistData] = useState(null);
    const [checkResults, setCheckResults] = useState({});
    const [signatures, setSignatures] = useState([]);
    const [remarks, setRemarks] = useState('특이사항 없음');
    const [managerName, setManagerName] = useState('');
    const [excludedUserIds, setExcludedUserIds] = useState([]);
    const sigPads = useRef({});

    const queryClient = useQueryClient();

    const { data: teams, isLoading: teamsLoading } = useQuery({ queryKey: ['teams'], queryFn: () => apiClient.get('/api/teams') });
    const { data: users, isLoading: usersLoading } = useQuery({ queryKey: ['users', selectedTeam], queryFn: () => apiClient.get(`/api/teams/${selectedTeam}/users`), enabled: !!selectedTeam });
    const { data: template, isLoading: templateLoading } = useQuery({ queryKey: ['template', selectedTeam], queryFn: () => apiClient.get(`/api/teams/${selectedTeam}/template`), enabled: !!selectedTeam });

    useEffect(() => {
        if (template) setChecklistData(template);
    }, [template]);

    const mutation = useMutation({
        mutationFn: (newReport) => apiClient.post('/api/reports', newReport),
        onSuccess: () => {
            alert('TBM 보고서가 성공적으로 제출되었습니다.');
            onFinishEditing();
            queryClient.invalidateQueries({ queryKey: ['dailyReports'] });
        },
        onError: (error) => alert(`오류: ${error.message}`),
    });

    const handleFileChange = async (e, itemId) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 });
            const formData = new FormData();
            formData.append('file', compressedFile, compressedFile.name);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('File upload failed');
            const data = await res.json();
            setCheckResults(prev => ({ ...prev, [itemId]: { ...prev[itemId], photoUrl: data.url } }));
        } catch (error) { alert('이미지 처리 중 오류: ' + error.message); }
    };

    const handleCheck = (itemId, value) => setCheckResults(prev => ({ ...prev, [itemId]: { ...prev[itemId], checkState: value } }));
    const handleCommentChange = (itemId, value) => setCheckResults(prev => ({ ...prev, [itemId]: { ...prev[itemId], comment: value } }));
    const handleExcludeUserToggle = (userId) => setExcludedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
    const handleSaveSignature = (userId) => {
        if (sigPads.current[userId] && !sigPads.current[userId].isEmpty()) {
            const signatureImage = sigPads.current[userId].toDataURL('image/png');
            setSignatures(prev => [...prev.filter(s => s.userId !== userId), { userId, signatureImage }]);
            alert('서명이 저장되었습니다.');
        } else { alert('서명을 먼저 해주세요.'); }
    };

    const handleSubmit = () => {
        const attendingUsers = users.filter(u => !excludedUserIds.includes(u.id));
        if (attendingUsers.length !== signatures.length) {
            alert('서명하지 않은 참석자가 있습니다.');
            return;
        }
        mutation.mutate({ teamId: selectedTeam, reportDate, managerName, remarks, results, signatures });
    };

    const isLoading = teamsLoading || usersLoading || templateLoading;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>TBM 안전점검표</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                            <SelectTrigger><SelectValue placeholder="팀을 선택하세요" /></SelectTrigger>
                            <SelectContent>{teams?.map(team => <SelectItem key={team.id} value={team.id.toString()}>{team.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !reportDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{reportDate ? format(reportDate, "PPP") : <span>날짜 선택</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={reportDate} onSelect={setReportDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                </CardHeader>
            </Card>

            {isLoading && <p>로딩 중...</p>}
            {selectedTeam && !isLoading && !template && <p>선택된 팀의 점검표를 찾을 수 없습니다.</p>}
            {template && (
                <>
                    {template.templateItems.map(item => (
                        <Card key={item.id}>
                            <CardContent className="p-4 space-y-3">
                                <label className="font-semibold">{item.description}</label>
                                <div className="flex gap-2 flex-wrap">
                                    {['O', '△', 'X'].map(state => <Button key={state} type="button" size="sm" variant={checkResults[item.id]?.checkState === state ? 'default' : 'outline'} onClick={() => handleCheck(item.id, state)}>{state}</Button>)}
                                </div>
                                {(checkResults[item.id]?.checkState === '△' || checkResults[item.id]?.checkState === 'X') && (
                                    <div className="space-y-2 pt-3 border-t">
                                        <Textarea placeholder="개선 조치 내용" value={checkResults[item.id]?.comment || ''} onChange={(e) => handleCommentChange(item.id, e.target.value)} />
                                        <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, item.id)} />
                                        {checkResults[item.id]?.photoUrl && <img src={checkResults[item.id].photoUrl} alt="preview" className="mt-2 max-w-xs rounded-md border"/>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    <Card>
                        <CardHeader><CardTitle>참석자 서명</CardTitle></CardHeader>
                        <CardContent>
                            <div className="p-3 mb-4 border rounded-md space-y-2 bg-secondary/50">
                                <label className="font-medium">서명 제외자 선택 (연차, 휴가 등)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{users?.map(user => (
                                    <div key={user.id} className="flex items-center space-x-2">
                                        <Checkbox id={`exclude-${user.id}`} checked={excludedUserIds.includes(user.id)} onCheckedChange={() => handleExcludeUserToggle(user.id)} />
                                        <label htmlFor={`exclude-${user.id}`}>{user.name}</label>
                                    </div>
                                ))}</div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{users?.filter(u => !excludedUserIds.includes(u.id)).map(user => (
                                <div key={user.id} className="border rounded-md p-2 text-center">
                                    <label className="block text-sm font-medium mb-1">{user.name}</label>
                                    {signatures.find(s => s.userId === user.id) ? <p className="text-green-600 font-bold py-8">서명 완료</p> : <SignatureCanvas ref={ref => (sigPads.current[user.id] = ref)} penColor='black' canvasProps={{ className: 'w-full h-24 bg-white rounded-md border' }} />}
                                    {!signatures.find(s => s.userId === user.id) && <Button type="button" size="sm" className="w-full mt-2" onClick={() => handleSaveSignature(user.id)}>서명 저장</Button>}
                                </div>
                            ))}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>관리감독자 확인</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <Textarea placeholder="특이사항" value={remarks} onChange={e => setRemarks(e.target.value)} />
                            <Input placeholder="관리감독자 성명" value={managerName} onChange={e => setManagerName(e.target.value)} required />
                        </CardContent>
                    </Card>

                    <Button type="button" onClick={handleSubmit} disabled={mutation.isPending} className="w-full text-lg py-6">{mutation.isPending ? '제출 중...' : '최종 제출'}</Button>
                </>
            )}
        </div>
    );
};

export default TBMChecklist;