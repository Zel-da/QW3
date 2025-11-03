import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Terminal, Camera } from "lucide-react";
import { SignatureDialog } from '@/components/SignatureDialog';
import { stripSiteSuffix } from '@/lib/utils';

const TBMChecklist = ({ reportForEdit, onFinishEditing, date, site }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [formState, setFormState] = useState({});
  const [signatures, setSignatures] = useState({});
  const [absentUsers, setAbsentUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSigDialogOpen, setIsSigDialogOpen] = useState(false);
  const [signingUser, setSigningUser] = useState(null);

  useEffect(() => {
    if (site) {
      axios.get(`/api/teams?site=${site}`).then(res => {
        setTeams(res.data);
        const userTeamInList = res.data.some(team => team.id === user?.teamId);
        if (user?.teamId && userTeamInList && !reportForEdit) {
          setSelectedTeam(user.teamId);
        } else if (reportForEdit) {
          setSelectedTeam(reportForEdit.teamId);
        }
      });
    }
  }, [user, site, reportForEdit]);

  useEffect(() => {
    if (reportForEdit) {
      const initialFormState = {};
      reportForEdit.reportDetails.forEach(detail => {
        initialFormState[detail.itemId] = {
          checkState: detail.checkState,
          description: detail.actionDescription,
          attachments: detail.attachments ? detail.attachments.map(att => ({
            url: att.url,
            name: att.name,
            size: att.size || 0,
            type: att.type || 'image'
          })) : []
        };
      });
      setFormState(initialFormState);

      const initialSignatures = {};
      reportForEdit.reportSignatures.forEach(sig => {
        if (sig.signatureImage) initialSignatures[sig.userId] = sig.signatureImage;
      });
      setSignatures(initialSignatures);
    } else {
      setFormState({});
      setSignatures({});
      setAbsentUsers({});
    }
  }, [reportForEdit]);

  useEffect(() => {
    if (selectedTeam) {
      setLoading(true);
      setError(null);
      const templatePromise = axios.get(`/api/teams/${selectedTeam}/template`);
      const usersPromise = axios.get(`/api/teams/${selectedTeam}/users`);

      Promise.all([templatePromise, usersPromise])
        .then(([templateResponse, usersResponse]) => {
          setChecklist(templateResponse.data);
          setTeamUsers(usersResponse.data);
        })
        .catch(err => {
          console.error(`Error fetching data for team ${selectedTeam}:`, err);
          setError(`데이터를 불러오는 중 오류가 발생했습니다.`);
        })
        .finally(() => setLoading(false));
    } else {
      setChecklist(null);
      setTeamUsers([]);
    }
  }, [selectedTeam]);

  const updateFormState = (itemId, field, value) => {
    setFormState(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handlePhotoUpload = async (itemId, files) => {
    if (!files || files.length === 0) return;

    const currentAttachments = formState[itemId]?.attachments || [];
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));

    try {
      const res = await axios.post('/api/upload-multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newAttachments = res.data.files.map(f => ({
        url: f.url,
        name: f.name,
        size: f.size,
        type: 'image'
      }));

      updateFormState(itemId, 'attachments', [...currentAttachments, ...newAttachments]);
      toast({ title: `${files.length}개의 사진이 업로드되었습니다.` });
    } catch (err) {
      toast({ title: "사진 업로드 실패", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  };

  const removeAttachment = (itemId, attachmentIndex) => {
    const currentAttachments = formState[itemId]?.attachments || [];
    const updatedAttachments = currentAttachments.filter((_, idx) => idx !== attachmentIndex);
    updateFormState(itemId, 'attachments', updatedAttachments);
  };

  const handleAbsentChange = (userId, absenceType) => {
    setAbsentUsers(prev => {
      if (absenceType === '') {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      }
      return { ...prev, [userId]: absenceType };
    });
    if (absenceType && absenceType !== '') {
      const newSignatures = { ...signatures };
      delete newSignatures[userId];
      setSignatures(newSignatures);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({ title: "로그인이 필요합니다.", variant: "destructive" });
      return;
    }

    // Validate mandatory photos and descriptions for △ or X items
    const validationErrors = [];
    checklist?.templateItems.forEach(item => {
      const itemState = formState[item.id];
      if (itemState?.checkState === '△' || itemState?.checkState === 'X') {
        const hasPhotos = itemState.attachments && itemState.attachments.length > 0;
        const hasDescription = itemState.description && itemState.description.trim().length > 0;

        if (!hasPhotos) {
          validationErrors.push(`"${item.description}" 항목: 사진 첨부 필수`);
        }
        if (!hasDescription) {
          validationErrors.push(`"${item.description}" 항목: 비고 입력 필수`);
        }
      }
    });

    if (validationErrors.length > 0) {
      toast({
        title: "필수 항목 미입력",
        description: validationErrors.join('\n'),
        variant: "destructive"
      });
      return;
    }

    const absentSummary = Object.entries(absentUsers).reduce((acc, [userId, absenceType]) => {
      const userName = teamUsers.find(u => u.id === userId)?.name || '알 수 없음';
      if (!acc[absenceType]) acc[absenceType] = [];
      acc[absenceType].push(userName);
      return acc;
    }, {});

    const remarksText = Object.entries(absentSummary)
      .map(([type, names]) => `${type}: ${names.join(', ')}`)
      .join(' / ');

    const reportData = {
      teamId: selectedTeam,
      reportDate: date || new Date(),
      managerName: user?.name || 'N/A',
      remarks: remarksText || '결근자 없음',
      site: site,
      results: Object.entries(formState).map(([itemId, data]) => ({
        itemId: parseInt(itemId),
        checkState: data.checkState,
        actionDescription: data.description || null,
        authorId: user.id,
        attachments: data.attachments || []
      })),
      signatures: Object.entries(signatures).map(([userId, signatureImage]) => ({
        userId,
        signatureImage
      })),
    };

    try {
      if (reportForEdit) {
        await axios.put(`/api/reports/${reportForEdit.id}`, reportData);
        toast({ title: "TBM 일지가 성공적으로 수정되었습니다." });
      } else {
        await axios.post('/api/reports', reportData);
        toast({ title: "TBM 일지가 성공적으로 제출되었습니다." });
      }
      queryClient.invalidateQueries({ queryKey: ['monthlyReport'] });
      onFinishEditing();
    } catch (err) {
      setError('제출 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <Select onValueChange={setSelectedTeam} value={selectedTeam || ''}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="팀을 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {teams.map(team => <SelectItem key={team.id} value={team.id}>{stripSiteSuffix(team.name)}</SelectItem>)}
        </SelectContent>
      </Select>

      {error && <Alert variant="destructive"><Terminal className="h-4 w-4" /><AlertTitle>오류</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
      {loading && <p>로딩 중...</p>}

      {checklist && (
        <>
          <div className="mb-4">
            <h3 className="font-semibold text-lg">작성자: {user?.name}</h3>
          </div>
          <h3 className="font-semibold text-xl mt-6">점검항목</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>구분</TableHead>
                <TableHead>점검항목</TableHead>
                <TableHead className="text-center">점검결과</TableHead>
                <TableHead className="text-center">사진/내용</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checklist.templateItems.map(item => {
                const currentItemState = formState[item.id] || {};
                return (
                  <TableRow key={item.id}>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <RadioGroup value={currentItemState.checkState || null} onValueChange={(value) => updateFormState(item.id, 'checkState', value)} className="flex justify-center gap-4">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="O" id={`r-${item.id}-o`} /><Label htmlFor={`r-${item.id}-o`}>O</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="△" id={`r-${item.id}-d`} /><Label htmlFor={`r-${item.id}-d`}>△</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="X" id={`r-${item.id}-x`} /><Label htmlFor={`r-${item.id}-x`}>X</Label></div>
                      </RadioGroup>
                    </TableCell>
                    <TableCell className="text-center">
                      {(currentItemState.checkState === '△' || currentItemState.checkState === 'X') && (
                        <div className="flex flex-col items-center justify-center gap-2 w-full">
                          <div className="w-full">
                            <Label htmlFor={`photo-${item.id}`} className="cursor-pointer">
                              <div className="flex items-center justify-center gap-2 p-2 border-2 border-red-300 rounded-md hover:bg-muted bg-red-50">
                                <Camera className="h-5 w-5 text-red-600" />
                                <span className="font-medium">사진 업로드 <span className="text-red-600">*</span></span>
                              </div>
                            </Label>
                            <Input
                              id={`photo-${item.id}`}
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(e) => handlePhotoUpload(item.id, e.target.files)}
                            />

                            {/* Display uploaded images */}
                            {currentItemState.attachments && currentItemState.attachments.length > 0 && (
                              <div className="grid grid-cols-2 gap-2 mt-3">
                                {currentItemState.attachments.map((file, idx) => (
                                  <div key={idx} className="relative border rounded-lg p-2">
                                    <img src={file.url} alt={file.name} className="w-full h-20 object-cover rounded" />
                                    <p className="text-xs truncate mt-1">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="absolute top-1 right-1 h-6 w-6 p-0"
                                      onClick={() => removeAttachment(item.id, idx)}
                                    >
                                      ✕
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="w-full">
                            <Label className="text-xs text-red-600 font-medium">비고 (필수 *)</Label>
                            <Textarea
                              placeholder="조치 내용을 상세히 작성해주세요..."
                              value={currentItemState.description || ''}
                              onChange={(e) => updateFormState(item.id, 'description', e.target.value)}
                              className="mt-1 w-full border-2 border-red-300"
                              rows={3}
                            />
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              )}
            </TableBody>
          </Table>

          <h3 className="font-semibold text-xl mt-8">참석자 서명</h3>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[...teamUsers, user].filter((u, i, self) => i === self.findIndex(t => t.id === u.id)).filter(u => u.role !== 'OFFICE_WORKER').map(worker => (
              <div key={worker.id} className={`flex-shrink-0 w-[180px] p-4 border rounded-lg text-center space-y-3 ${absentUsers[worker.id] ? 'bg-gray-100' : ''}`}>
                <p className="font-semibold">{worker.name}</p>
                <div className="flex flex-col items-center space-y-2">
                  <Label htmlFor={`absent-${worker.id}`} className="text-xs">결근 사유</Label>
                  <Select
                    value={absentUsers[worker.id] || 'PRESENT'}
                    onValueChange={(value) => handleAbsentChange(worker.id, value === 'PRESENT' ? '' : value)}
                  >
                    <SelectTrigger className="w-full h-9 text-sm">
                      <SelectValue placeholder="출근" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRESENT">출근</SelectItem>
                      <SelectItem value="연차">연차</SelectItem>
                      <SelectItem value="오전 반차">오전 반차</SelectItem>
                      <SelectItem value="오후 반차">오후 반차</SelectItem>
                      <SelectItem value="출장">출장</SelectItem>
                      <SelectItem value="교육">교육</SelectItem>
                      <SelectItem value="기타">기타</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {signatures[worker.id] ? (
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-green-600 mb-2">서명 완료</p>
                    <img src={signatures[worker.id]} alt={`${worker.name} signature`} className="w-full h-16 object-contain border rounded-md"/>
                  </div>
                ) : (
                  <Button
                    onClick={() => { setSigningUser(worker); setIsSigDialogOpen(true); }}
                    disabled={absentUsers[worker.id] && absentUsers[worker.id] !== '오전 반차' && absentUsers[worker.id] !== '오후 반차'}
                    className="w-full"
                  >
                    {(absentUsers[worker.id] === '오전 반차' || absentUsers[worker.id] === '오후 반차') ? '서명 필수' : '서명'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <SignatureDialog 
        isOpen={isSigDialogOpen}
        onClose={() => setIsSigDialogOpen(false)}
        onSave={(signatureData) => { if(signingUser) { setSignatures(prev => ({ ...prev, [signingUser.id]: signatureData })); } setSigningUser(null); }}
        userName={signingUser?.name || ''}
      />

      <div className="flex justify-end mt-6">
        <Button onClick={handleSubmit} size="lg" disabled={!checklist}>제출하기</Button>
      </div>
    </div>
  );
};

export default TBMChecklist;