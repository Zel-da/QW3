import React, { useState, useEffect, useCallback } from 'react';
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
import { SignatureDialog } from '@/components/SignatureDialog'; // Import the new component

const TBMChecklist = ({ reportIdForEdit, onFinishEditing, dateRange }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [checklist, setChecklist] = useState(null);
  const [teamUsers, setTeamUsers] = useState([]);
  const [results, setResults] = useState({});
  const [photoUrls, setPhotoUrls] = useState({});
  const [itemDescriptions, setItemDescriptions] = useState({});
  const [signatures, setSignatures] = useState({});
  const [absentUsers, setAbsentUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Signature Dialog State
  const [isSigDialogOpen, setIsSigDialogOpen] = useState(false);
  const [signingUser, setSigningUser] = useState(null);

  useEffect(() => {
    axios.get('/api/teams').then(res => setTeams(res.data));
    if (user?.teamId) setSelectedTeam(user.teamId);
  }, [user]);

  useEffect(() => {
    if (reportIdForEdit) {
      setLoading(true);
      axios.get(`/api/reports/${reportIdForEdit}`)
        .then(res => {
          const report = res.data;
          setSelectedTeam(report.teamId);
          
          const initialResults = {};
          const initialPhotos = {};
          const initialDescriptions = {};
          report.reportDetails.forEach(detail => {
            initialResults[detail.itemId] = detail.checkState;
            if (detail.photoUrl) initialPhotos[detail.itemId] = detail.photoUrl;
            if (detail.actionDescription) initialDescriptions[detail.itemId] = detail.actionDescription;
          });
          setResults(initialResults);
          setPhotoUrls(initialPhotos);
          setItemDescriptions(initialDescriptions);

          const initialSignatures = {};
          report.reportSignatures.forEach(sig => {
            if (sig.signatureImage) initialSignatures[sig.userId] = sig.signatureImage;
          });
          setSignatures(initialSignatures);
        })
        .catch(err => setError('기존 보고서 데이터를 불러오는 데 실패했습니다.'))
        .finally(() => setLoading(false));
    }
  }, [reportIdForEdit]);

  useEffect(() => {
    if (selectedTeam && !reportIdForEdit) {
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
    }
  }, [selectedTeam, reportIdForEdit]);

  const handleSignClick = (worker) => {
    setSigningUser(worker);
    setIsSigDialogOpen(true);
  };

  const handleSaveSignature = (signatureData) => {
    if (signingUser) {
      setSignatures(prev => ({ ...prev, [signingUser.id]: signatureData }));
    }
    setSigningUser(null);
  };

  const handleResultChange = (itemId, value) => {
    setResults(prev => ({ ...prev, [itemId]: value }));
  };

  const handleDescriptionChange = (itemId, value) => {
    setItemDescriptions(prev => ({ ...prev, [itemId]: value }));
  };

  const handlePhotoUpload = async (itemId, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPhotoUrls(prev => ({ ...prev, [itemId]: res.data.url }));
      toast({ title: "사진이 업로드되었습니다." });
    } catch (err) {
      toast({ title: "사진 업로드 실패", variant: "destructive" });
    }
  };

  const handleAbsentChange = (userId, isAbsent) => {
    setAbsentUsers(prev => ({ ...prev, [userId]: isAbsent }));
    if (isAbsent) {
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

    const reportData = {
      teamId: selectedTeam,
      reportDate: dateRange?.from || new Date(),
      managerName: user?.name || 'N/A',
      remarks: `연차자: ${Object.keys(absentUsers).filter(id => absentUsers[id]).length}명`,
      results: Object.entries(results).map(([itemId, checkState]) => ({
        itemId: parseInt(itemId),
        checkState,
        photoUrl: photoUrls[itemId] || null,
        actionDescription: itemDescriptions[itemId] || null,
        authorId: user.id,
      })),
      signatures: Object.entries(signatures).map(([userId, signatureImage]) => ({ 
        userId, 
        signatureImage 
      })),
    };

    try {
      if (reportIdForEdit) {
        await axios.put(`/api/reports/${reportIdForEdit}`, reportData);
        toast({ title: "TBM 일지가 성공적으로 수정되었습니다." });
      } else {
        await axios.post('/api/reports', reportData);
        toast({ title: "TBM 일지가 성공적으로 제출되었습니다." });
      }
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
          {teams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
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
              {checklist.templateItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    <RadioGroup onValueChange={(value) => handleResultChange(item.id, value)} className="flex justify-center gap-4">
                      <div className="flex items-center space-x-2"><RadioGroupItem value="O" id={`r-${item.id}-o`} /><Label htmlFor={`r-${item.id}-o`}>O</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="△" id={`r-${item.id}-d`} /><Label htmlFor={`r-${item.id}-d`}>△</Label></div>
                      <div className="flex items-center space-x-2"><RadioGroupItem value="X" id={`r-${item.id}-x`} /><Label htmlFor={`r-${item.id}-x`}>X</Label></div>
                    </RadioGroup>
                  </TableCell>
                  <TableCell className="text-center">
                    {(results[item.id] === '△' || results[item.id] === 'X') && (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center justify-center">
                          <Label htmlFor={`photo-${item.id}`} className="cursor-pointer">
                            <div className="flex items-center gap-2 p-2 border rounded-md hover:bg-muted">
                              <Camera className="h-5 w-5" />
                              <span>{photoUrls[item.id] ? '변경' : '사진 업로드'}</span>
                            </div>
                          </Label>
                          <Input id={`photo-${item.id}`} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(item.id, e.target.files[0])} />
                          {photoUrls[item.id] && <img src={photoUrls[item.id]} alt="preview" className="w-16 h-16 object-cover ml-4 rounded-md"/>}
                        </div>
                        <Textarea
                          placeholder="내용 작성..."
                          value={itemDescriptions[item.id] || ''}
                          onChange={(e) => handleDescriptionChange(item.id, e.target.value)}
                          className="mt-2 w-full"
                        />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <h3 className="font-semibold text-xl mt-8">참석자 서명</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...teamUsers, user].filter((u, i, self) => i === self.findIndex(t => t.id === u.id)).filter(u => u.role !== 'OFFICE_WORKER').map(worker => (
              <div key={worker.id} className={`p-4 border rounded-lg text-center space-y-3 ${absentUsers[worker.id] ? 'bg-gray-100' : ''}`}>
                <p className="font-semibold">{worker.name}</p>
                <div className="flex items-center justify-center space-x-2">
                    <input type="checkbox" id={`absent-${worker.id}`} checked={!!absentUsers[worker.id]} onChange={(e) => handleAbsentChange(worker.id, e.target.checked)} />
                    <Label htmlFor={`absent-${worker.id}`}>연차</Label>
                </div>
                {signatures[worker.id] ? (
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-green-600 mb-2">서명 완료</p>
                    <img src={signatures[worker.id]} alt={`${worker.name} signature`} className="w-full h-16 object-contain border rounded-md"/>
                  </div>
                ) : (
                  <Button 
                    onClick={() => handleSignClick(worker)}
                    disabled={absentUsers[worker.id]}
                    className="w-full"
                  >
                    서명
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
        onSave={handleSaveSignature}
        userName={signingUser?.name || ''}
      />

      <div className="flex justify-end mt-6">
        <Button onClick={handleSubmit} size="lg" disabled={!checklist}>제출하기</Button>
      </div>
    </div>
  );
};

export default TBMChecklist;