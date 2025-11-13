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
import { Terminal, Camera, X } from "lucide-react";
import { SignatureDialog } from '@/components/SignatureDialog';
import { stripSiteSuffix } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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
  const [enlargedImage, setEnlargedImage] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [remarksImages, setRemarksImages] = useState([]);

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
        if (sig.signatureImage) {
          // userId나 memberId 중 하나를 키로 사용
          const key = sig.userId || `member-${sig.memberId}`;
          initialSignatures[key] = sig.signatureImage;
        }
      });
      setSignatures(initialSignatures);

      // remarks 초기화 (JSON 파싱)
      if (reportForEdit.remarks) {
        try {
          const remarksData = JSON.parse(reportForEdit.remarks);
          setRemarks(remarksData.text || '');
          setRemarksImages(remarksData.images || []);
        } catch {
          // JSON이 아니면 그냥 텍스트로 처리
          setRemarks(reportForEdit.remarks);
          setRemarksImages([]);
        }
      }
    } else {
      setFormState({});
      setSignatures({});
      setAbsentUsers({});
      setRemarks('');
      setRemarksImages([]);
    }
  }, [reportForEdit]);

  useEffect(() => {
    if (selectedTeam) {
      setLoading(true);
      setError(null);
      const templatePromise = axios.get(`/api/teams/${selectedTeam}/template`);
      const usersPromise = axios.get(`/api/teams/${selectedTeam}/users`);
      const teamMembersPromise = axios.get(`/api/teams/${selectedTeam}/team-members`);

      Promise.all([templatePromise, usersPromise, teamMembersPromise])
        .then(([templateResponse, usersResponse, teamMembersResponse]) => {
          setChecklist(templateResponse.data);

          // User 계정과 TeamMember를 합침
          const users = usersResponse.data || [];
          const teamMembers = teamMembersResponse.data || [];

          // TeamMember를 User 형식으로 변환하여 합침
          const combinedTeamUsers = [
            ...users,
            ...teamMembers.map(member => ({
              id: `member-${member.id}`, // memberId와 userId 구분
              name: member.name,
              role: 'WORKER', // 기본 역할
              isTeamMember: true, // TeamMember 표시
              memberId: member.id // 원본 memberId 보관
            }))
          ];

          setTeamUsers(combinedTeamUsers);
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

  const handleRemarksImageUpload = async (files) => {
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append('files', file));

    try {
      const res = await axios.post('/api/upload-multiple', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newImages = res.data.files.map(f => f.url);
      setRemarksImages(prev => [...prev, ...newImages]);
      toast({ title: `${files.length}개의 사진이 업로드되었습니다.` });
    } catch (err) {
      toast({ title: "사진 업로드 실패", description: err.response?.data?.message || err.message, variant: "destructive" });
    }
  };

  const removeRemarksImage = (imageIndex) => {
    setRemarksImages(prev => prev.filter((_, idx) => idx !== imageIndex));
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

    // Validate that all items have been checked
    const validationErrors = [];
    checklist?.templateItems.forEach(item => {
      const itemState = formState[item.id];

      // 모든 항목에 대해 checkState 필수 확인
      if (!itemState || !itemState.checkState || itemState.checkState.trim() === '') {
        validationErrors.push(`"${item.description}" 항목: 점검 결과 선택 필수`);
        return;
      }

      // △ or X items require description
      if (itemState.checkState === '△' || itemState.checkState === 'X') {
        const hasDescription = itemState.description && itemState.description.trim().length > 0;

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

    // remarks를 JSON 형식으로 저장 (텍스트, 이미지, 결근자 정보)
    const remarksData = {
      text: remarks || '',
      images: remarksImages || [],
      absenceInfo: remarksText || '결근자 없음'
    };

    const reportData = {
      teamId: selectedTeam,
      reportDate: date || new Date(),
      managerName: user?.name || 'N/A',
      remarks: JSON.stringify(remarksData),
      site: site,
      results: Object.entries(formState).map(([itemId, data]) => ({
        itemId: parseInt(itemId),
        checkState: data.checkState,
        actionDescription: data.description || null,
        authorId: user.id,
        attachments: data.attachments || []
      })),
      signatures: Object.entries(signatures).map(([userId, signatureImage]) => {
        // userId가 'member-'로 시작하면 TeamMember
        const isTeamMember = userId.startsWith('member-');
        if (isTeamMember) {
          const memberId = parseInt(userId.replace('member-', ''));
          return {
            memberId,
            signatureImage
          };
        } else {
          return {
            userId,
            signatureImage
          };
        }
      }),
    };

    try {
      console.log('TBM 제출 시작:', {
        reportForEdit: !!reportForEdit,
        teamId: selectedTeam,
        reportDate: date,
        resultsCount: reportData.results.length,
        signaturesCount: reportData.signatures.length
      });

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
      console.error('TBM 제출 오류:', err);
      console.error('오류 상세:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });

      const errorMessage = err.response?.data?.message || err.message || '제출 중 오류가 발생했습니다.';

      toast({
        title: "제출 실패",
        description: errorMessage,
        variant: "destructive"
      });

      setError(errorMessage);
    }
  };

  // 팀을 사이트별로 그룹화
  const teamsBySite = teams.reduce((acc, team) => {
    const site = team.site || '기타';
    if (!acc[site]) acc[site] = [];
    acc[site].push(team);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Select onValueChange={setSelectedTeam} value={selectedTeam || ''}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="팀을 선택하세요" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px] overflow-y-auto">
          {Object.entries(teamsBySite).map(([site, siteTeams]) => (
            <React.Fragment key={site}>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground bg-muted/50">
                {site}
              </div>
              {siteTeams.map(team => (
                <SelectItem key={team.id} value={team.id} className="pl-6">
                  {stripSiteSuffix(team.name)}
                </SelectItem>
              ))}
            </React.Fragment>
          ))}
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
              {checklist.templateItems
                .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                .map((item, index, items) => {
                const currentItemState = formState[item.id] || {};

                // 이전 항목과 같은 카테고리인지 확인
                const prevItem = index > 0 ? items[index - 1] : null;
                const showCategory = !prevItem || prevItem.category !== item.category;

                // 같은 카테고리의 항목 수 계산 (rowSpan용)
                let rowSpan = 1;
                if (showCategory) {
                  for (let i = index + 1; i < items.length; i++) {
                    if (items[i].category === item.category) {
                      rowSpan++;
                    } else {
                      break;
                    }
                  }
                }

                return (
                  <TableRow key={item.id}>
                    {showCategory && (
                      <TableCell
                        className="align-top font-medium bg-muted/30 border-r"
                        rowSpan={rowSpan}
                      >
                        {item.category}
                      </TableCell>
                    )}
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
                                    <img
                                      src={file.url}
                                      alt={file.name}
                                      className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => setEnlargedImage(file.url)}
                                    />
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

          {/* 특이사항 섹션 */}
          <h3 className="font-semibold text-xl mt-8 mb-4">특이사항</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* 왼쪽: 특이사항 텍스트 */}
            <div className="space-y-2">
              <Label htmlFor="remarks">특이사항</Label>
              <Textarea
                id="remarks"
                placeholder="특이사항을 입력하세요..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={6}
                className="w-full"
              />
            </div>

            {/* 오른쪽: 사진 업로드 */}
            <div className="space-y-2">
              <Label>TBM 사진</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <Input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => e.target.files && handleRemarksImageUpload(e.target.files)}
                  className="mb-4"
                />
                {remarksImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {remarksImages.map((imageUrl, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={imageUrl}
                          alt={`특이사항 ${idx + 1}`}
                          className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setEnlargedImage(imageUrl)}
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6"
                          onClick={() => removeRemarksImage(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <h3 className="font-semibold text-xl mt-8">참석자 서명</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>출근 상태</TableHead>
                <TableHead>서명</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...teamUsers, user].filter((u, i, self) => i === self.findIndex(t => t.id === u.id)).filter(u => u.role !== 'OFFICE_WORKER').map(worker => (
                <TableRow key={worker.id} className={absentUsers[worker.id] ? 'bg-gray-100' : ''}>
                  <TableCell className="font-semibold">{worker.name}</TableCell>
                  <TableCell>
                    <Select
                      value={absentUsers[worker.id] || 'PRESENT'}
                      onValueChange={(value) => handleAbsentChange(worker.id, value === 'PRESENT' ? '' : value)}
                    >
                      <SelectTrigger className="w-[150px]">
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
                  </TableCell>
                  <TableCell>
                    {signatures[worker.id] ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-600">✓ 서명 완료</span>
                        <img
                          src={signatures[worker.id]}
                          alt={`${worker.name} signature`}
                          className="h-12 w-24 object-contain border rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setEnlargedImage(signatures[worker.id])}
                        />
                      </div>
                    ) : (
                      <Button
                        onClick={() => { setSigningUser(worker); setIsSigDialogOpen(true); }}
                        disabled={absentUsers[worker.id] && !['오전 반차', '오후 반차'].includes(absentUsers[worker.id])}
                        size="sm"
                      >
                        서명
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      <SignatureDialog
        isOpen={isSigDialogOpen}
        onClose={() => setIsSigDialogOpen(false)}
        onSave={(signatureData) => { if(signingUser) { setSignatures(prev => ({ ...prev, [signingUser.id]: signatureData })); } setSigningUser(null); }}
        userName={signingUser?.name || ''}
      />

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

      <div className="flex justify-end mt-6">
        <Button onClick={handleSubmit} size="lg" disabled={!checklist}>제출하기</Button>
      </div>
    </div>
  );
};

export default TBMChecklist;