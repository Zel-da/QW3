import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  FileText, Video, Plus, Trash2, Download, Search, ExternalLink, Eye,
  Folder, FolderPlus, FolderOpen, ChevronRight, Pencil, ArrowLeft,
  Upload, X, Paperclip,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface DocumentFolder {
  id: number;
  name: string;
  description?: string;
  site?: string;
  authorId: string;
  author?: { id: string; name?: string; username: string };
  createdAt: string;
  _count?: { documents: number };
}

interface Document {
  id: number;
  title: string;
  description?: string;
  category: string;
  type: string;
  site?: string;
  department?: string;
  folderId?: number | null;
  folder?: { id: number; name: string } | null;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  videoUrl?: string;
  videoType?: string;
  authorId: string;
  author: { id: string; name?: string; username: string };
  createdAt: string;
}

const CATEGORIES = [
  { value: 'RISK_ASSESSMENT', label: '위험성평가' },
  { value: 'EDUCATION_MATERIAL', label: '교육자료' },
];

const FILE_TYPES = [
  { value: 'PDF', label: 'PDF' },
  { value: 'PPT', label: 'PPT' },
  { value: 'VIDEO', label: '영상' },
  { value: 'OTHER', label: '기타' },
];

const SITES = [
  { value: 'all', label: '전체' },
  { value: '아산', label: '아산' },
  { value: '화성', label: '화성' },
];

function formatFileSize(bytes?: number) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getPreviewUrl(doc: Document): string | null {
  if (!doc.fileUrl) return null;
  const source = doc.fileName ?? doc.fileUrl;
  const ext = source.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return doc.fileUrl;
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(doc.fileUrl)}`;
  }
  return null;
}

export default function DocumentLibraryPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM';

  // 현재 보고 있는 폴더 (null = 루트, 폴더 그리드 + 폴더 미지정 자료)
  const [currentFolder, setCurrentFolder] = useState<DocumentFolder | null>(null);

  // 필터
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // 자료 등록/수정 다이얼로그 (공용)
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [docEditTarget, setDocEditTarget] = useState<Document | null>(null);
  const [docForm, setDocForm] = useState({
    title: '', description: '', category: 'RISK_ASSESSMENT', type: 'PDF',
    department: '', folderId: '', videoUrl: '', videoType: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // 폴더 다이얼로그 (생성/수정 공용)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderEditTarget, setFolderEditTarget] = useState<DocumentFolder | null>(null);
  const [folderForm, setFolderForm] = useState({ name: '', description: '', site: '' });

  // 폴더 목록
  const { data: folders } = useQuery<DocumentFolder[]>({
    queryKey: ['document-folders'],
    queryFn: async () => {
      const res = await fetch('/api/document-folders', { credentials: 'include' });
      if (!res.ok) throw new Error('폴더 조회 실패');
      return res.json();
    },
  });

  // 자료 목록 (현재 폴더 기준 — 루트면 folderId=null)
  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['documents', filterCategory, currentFolder?.id ?? 'root'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      params.set('folderId', currentFolder ? String(currentFolder.id) : 'null');
      const res = await fetch(`/api/documents?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('조회 실패');
      return res.json();
    },
  });

  // 자료 등록/수정 통합 mutation
  const docMutation = useMutation({
    mutationFn: async () => {
      // 새 파일이 선택된 경우만 업로드, 아니면 기존 파일 정보 유지 (수정 모드)
      let fileUrl: string | null = docEditTarget?.fileUrl ?? null;
      let fileName: string | null = docEditTarget?.fileName ?? null;
      let fileSize: number | null = docEditTarget?.fileSize ?? null;
      let mimeType: string | null = docEditTarget?.mimeType ?? null;

      if (uploadFile) {
        const formData = new FormData();
        formData.append('file', uploadFile);
        const uploadResp = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData });
        if (!uploadResp.ok) throw new Error('파일 업로드 실패');
        const uploadResult = await uploadResp.json();
        fileUrl = uploadResult.url || uploadResult.path || '';
        fileName = uploadFile.name;
        fileSize = uploadFile.size;
        mimeType = uploadFile.type;
      }

      const body = {
        ...docForm,
        department: docForm.department || null,
        folderId: docForm.folderId || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        videoUrl: docForm.videoUrl || null,
        videoType: docForm.videoType || null,
      };

      if (docEditTarget) {
        const res = await apiRequest('PUT', `/api/documents/${docEditTarget.id}`, body);
        return res.json();
      } else {
        const res = await apiRequest('POST', '/api/documents', body);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: docEditTarget ? '수정 완료' : '등록 완료', description: docEditTarget ? '자료가 수정되었습니다.' : '자료가 등록되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      setDocDialogOpen(false);
      setDocEditTarget(null);
      setDocForm({ title: '', description: '', category: 'RISK_ASSESSMENT', type: 'PDF', department: '', folderId: '', videoUrl: '', videoType: '' });
      setUploadFile(null);
    },
    onError: (err: any) => {
      toast({ title: docEditTarget ? '수정 실패' : '등록 실패', description: err.message, variant: 'destructive' });
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/documents/${id}`);
    },
    onSuccess: () => {
      toast({ title: '삭제 완료' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
    },
  });

  // 폴더 생성/수정
  const folderMutation = useMutation({
    mutationFn: async () => {
      const body = {
        name: folderForm.name.trim(),
        description: folderForm.description.trim() || null,
        site: folderForm.site || null,
      };
      if (folderEditTarget) {
        const res = await apiRequest('PUT', `/api/document-folders/${folderEditTarget.id}`, body);
        return res.json();
      } else {
        const res = await apiRequest('POST', '/api/document-folders', body);
        return res.json();
      }
    },
    onSuccess: () => {
      toast({ title: folderEditTarget ? '폴더 수정 완료' : '폴더 생성 완료' });
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      setFolderDialogOpen(false);
      setFolderEditTarget(null);
      setFolderForm({ name: '', description: '', site: '' });
    },
    onError: (err: any) => {
      toast({ title: '저장 실패', description: err.message, variant: 'destructive' });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/document-folders/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '폴더 삭제 완료' });
      queryClient.invalidateQueries({ queryKey: ['document-folders'] });
      // 현재 폴더가 삭제되었으면 루트로 이동
      if (currentFolder) setCurrentFolder(null);
    },
    onError: async (err: any) => {
      // API에서 응답 message 추출
      const msg = err?.message || '폴더 삭제 실패';
      toast({ title: '삭제 불가', description: msg, variant: 'destructive' });
    },
  });

  const filteredDocs = (documents || []).filter(doc => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return doc.title.toLowerCase().includes(q) || doc.description?.toLowerCase().includes(q) || doc.department?.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredFolders = (folders || []).filter(f => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return f.name.toLowerCase().includes(q) || f.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const openCreateFolder = () => {
    setFolderEditTarget(null);
    setFolderForm({ name: '', description: '', site: '' });
    setFolderDialogOpen(true);
  };

  const openEditFolder = (f: DocumentFolder) => {
    setFolderEditTarget(f);
    setFolderForm({ name: f.name, description: f.description ?? '', site: f.site ?? '' });
    setFolderDialogOpen(true);
  };

  const openEditDoc = (doc: Document) => {
    setDocEditTarget(doc);
    setDocForm({
      title: doc.title,
      description: doc.description ?? '',
      category: doc.category,
      type: doc.type,
      department: doc.department ?? '',
      folderId: doc.folderId ? String(doc.folderId) : '',
      videoUrl: doc.videoUrl ?? '',
      videoType: doc.videoType ?? '',
    });
    setUploadFile(null);
    setDocDialogOpen(true);
  };

  const openCreateDoc = () => {
    setDocEditTarget(null);
    setDocForm({
      title: '', description: '', category: 'RISK_ASSESSMENT', type: 'PDF',
      department: '',
      folderId: currentFolder ? String(currentFolder.id) : '',
      videoUrl: '', videoType: '',
    });
    setUploadFile(null);
    setDocDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* 헤더 + 액션 */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <div className="min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <button
                onClick={() => setCurrentFolder(null)}
                className={`hover:text-foreground transition-colors ${currentFolder ? '' : 'font-medium text-foreground'}`}
              >
                자료실
              </button>
              {currentFolder && (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="font-medium text-foreground truncate max-w-[200px]">{currentFolder.name}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              {currentFolder ? <FolderOpen className="w-6 h-6 text-primary" /> : null}
              {currentFolder ? currentFolder.name : '자료실'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {currentFolder
                ? (currentFolder.description || `${currentFolder.site || '전체'} 사이트 폴더`)
                : '위험성평가 및 교육자료'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {currentFolder && (
              <Button variant="outline" size="sm" onClick={() => setCurrentFolder(null)}>
                <ArrowLeft className="w-4 h-4 mr-1.5" />전체
              </Button>
            )}
            {canManage && !currentFolder && (
              <Button variant="outline" onClick={openCreateFolder}>
                <FolderPlus className="w-4 h-4 mr-2" />폴더 만들기
              </Button>
            )}
            {canManage && (
              <Button onClick={openCreateDoc}>
                <Plus className="w-4 h-4 mr-2" />자료 등록
              </Button>
            )}
          </div>
        </div>

        {/* 자료 등록/수정 다이얼로그 */}
        {canManage && (
          <Dialog open={docDialogOpen} onOpenChange={(open) => {
            setDocDialogOpen(open);
            if (!open) {
              setDocEditTarget(null);
              setUploadFile(null);
            }
          }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{docEditTarget ? '자료 수정' : '자료 등록'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>제목 *</Label>
                  <Input value={docForm.title} onChange={e => setDocForm({ ...docForm, title: e.target.value })} placeholder="자료 제목" />
                </div>
                <div>
                  <Label>설명</Label>
                  <Textarea value={docForm.description} onChange={e => setDocForm({ ...docForm, description: e.target.value })} placeholder="자료 설명" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>카테고리 *</Label>
                    <Select value={docForm.category} onValueChange={v => setDocForm({ ...docForm, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>파일 유형</Label>
                    <Select value={docForm.type} onValueChange={v => setDocForm({ ...docForm, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FILE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>폴더</Label>
                  <Select value={docForm.folderId || 'none'} onValueChange={v => setDocForm({ ...docForm, folderId: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="폴더 미지정" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">폴더 미지정</SelectItem>
                      {(folders || []).map(f => (
                        <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>부서</Label>
                  <Input value={docForm.department} onChange={e => setDocForm({ ...docForm, department: e.target.value })} placeholder="부서명" />
                </div>
                <div className="space-y-2">
                  <Label>파일</Label>

                  {/* 현재 등록된 파일 (수정 모드 + 새 파일 미선택 시) */}
                  {!uploadFile && docEditTarget?.fileName && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/40">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Paperclip className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{docEditTarget.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          현재 등록 · {docEditTarget.fileSize ? formatFileSize(docEditTarget.fileSize) : '크기 정보 없음'}
                        </p>
                      </div>
                      {docEditTarget.fileUrl && (
                        <a href={docEditTarget.fileUrl} target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" title="다운로드">
                            <Download className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  )}

                  {/* 새로 선택한 파일 카드 */}
                  {uploadFile && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-primary/40 bg-primary/5">
                      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Upload className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{uploadFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          새 파일 · {formatFileSize(uploadFile.size)}
                          {docEditTarget?.fileName && <span className="ml-1 text-amber-600">(기존 파일 교체됨)</span>}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setUploadFile(null)} title="취소">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* 파일 선택기 */}
                  <Input
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.mp4,.avi,.mov"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="cursor-pointer"
                  />
                  {docEditTarget && !uploadFile && (
                    <p className="text-xs text-muted-foreground">
                      파일을 그대로 두려면 비워두세요. 새 파일을 선택하면 기존 파일이 교체됩니다.
                    </p>
                  )}
                </div>
                {(docForm.type === 'VIDEO') && (
                  <div>
                    <Label>영상 URL (YouTube 등)</Label>
                    <Input value={docForm.videoUrl} onChange={e => setDocForm({ ...docForm, videoUrl: e.target.value, videoType: 'youtube' })} placeholder="https://youtube.com/..." />
                  </div>
                )}
                <Button onClick={() => docMutation.mutate()} disabled={!docForm.title || docMutation.isPending} className="w-full">
                  {docMutation.isPending ? (docEditTarget ? '수정 중...' : '등록 중...') : (docEditTarget ? '수정' : '등록')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* 폴더 생성/수정 다이얼로그 */}
        <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{folderEditTarget ? '폴더 수정' : '새 폴더 만들기'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>폴더명 *</Label>
                <Input
                  value={folderForm.name}
                  onChange={e => setFolderForm({ ...folderForm, name: e.target.value })}
                  placeholder="예: 2026년 정기 점검 자료"
                  autoFocus
                />
              </div>
              <div>
                <Label>설명</Label>
                <Textarea
                  value={folderForm.description}
                  onChange={e => setFolderForm({ ...folderForm, description: e.target.value })}
                  placeholder="폴더 용도 (선택)"
                  rows={2}
                />
              </div>
              <div>
                <Label>적용 사이트</Label>
                <Select
                  value={folderForm.site || 'all'}
                  onValueChange={v => setFolderForm({ ...folderForm, site: v === 'all' ? '' : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SITES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => folderMutation.mutate()}
                disabled={!folderForm.name.trim() || folderMutation.isPending}
                className="w-full"
              >
                {folderMutation.isPending ? '저장 중...' : (folderEditTarget ? '수정' : '생성')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 검색·카테고리 필터 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">검색</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={currentFolder ? '폴더 안에서 검색...' : '폴더·자료 검색...'} className="pl-9" />
                </div>
              </div>
              <div className="w-40">
                <Label className="text-xs">카테고리</Label>
                <Select value={filterCategory || 'all'} onValueChange={v => setFilterCategory(v === 'all' ? '' : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 폴더 그리드 (루트 뷰에서만) */}
        {!currentFolder && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground">
                폴더 ({filteredFolders.length})
              </h2>
            </div>
            {filteredFolders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Folder className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">아직 폴더가 없습니다</p>
                  {canManage && (
                    <Button variant="link" size="sm" onClick={openCreateFolder} className="mt-2">
                      첫 폴더 만들기
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {filteredFolders.map(f => (
                  <FolderCard
                    key={f.id}
                    folder={f}
                    onOpen={() => setCurrentFolder(f)}
                    onEdit={canManage ? () => openEditFolder(f) : undefined}
                    onDelete={canManage ? () => {
                      if (confirm(`"${f.name}" 폴더를 삭제하시겠습니까?`)) {
                        deleteFolderMutation.mutate(f.id);
                      }
                    } : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 자료 목록 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {currentFolder ? `폴더 안 자료 (${filteredDocs.length})` : `폴더 미지정 자료 (${filteredDocs.length})`}
            </h2>
          </div>

          {isLoading ? (
            <LoadingSpinner />
          ) : filteredDocs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {currentFolder ? '이 폴더에 등록된 자료가 없습니다' : '폴더 미지정 자료가 없습니다'}
                </p>
                {canManage && (
                  <Button variant="link" size="sm" onClick={() => setDocDialogOpen(true)} className="mt-2">
                    자료 등록
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table className="min-w-[960px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 whitespace-nowrap">#</TableHead>
                      <TableHead className="min-w-[240px]">제목</TableHead>
                      <TableHead className="w-32 whitespace-nowrap">카테고리</TableHead>
                      <TableHead className="w-24 whitespace-nowrap">유형</TableHead>
                      <TableHead className="w-28 whitespace-nowrap">부서</TableHead>
                      <TableHead className="w-28 whitespace-nowrap">등록자</TableHead>
                      <TableHead className="w-32 whitespace-nowrap">등록일</TableHead>
                      <TableHead className="w-40 whitespace-nowrap text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocs.map((doc, i) => (
                      <TableRow key={doc.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{i + 1}</TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <span className="font-medium block truncate">{doc.title}</span>
                            {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{doc.description}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            doc.category === 'RISK_ASSESSMENT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {doc.type === 'VIDEO' ? <Video className="w-4 h-4 text-purple-500" /> : <FileText className="w-4 h-4 text-gray-500" />}
                            <span className="text-xs">{doc.type}</span>
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{doc.department || '-'}</TableCell>
                        <TableCell className="whitespace-nowrap">{doc.author?.name || doc.author?.username}</TableCell>
                        <TableCell className="whitespace-nowrap">{new Date(doc.createdAt).toLocaleDateString('ko-KR')}</TableCell>
                        <TableCell className="text-right whitespace-nowrap space-x-1">
                          {(() => {
                            const previewUrl = getPreviewUrl(doc);
                            return previewUrl ? (
                              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="미리보기">
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </a>
                            ) : null;
                          })()}
                          {doc.fileUrl && (
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="다운로드">
                                <Download className="w-4 h-4" />
                              </Button>
                            </a>
                          )}
                          {doc.videoUrl && (
                            <a href={doc.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="영상 보기">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </a>
                          )}
                          {canManage && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="수정" onClick={() => openEditDoc(doc)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="삭제" onClick={() => {
                                if (confirm('이 자료를 삭제하시겠습니까?')) deleteDocMutation.mutate(doc.id);
                              }}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

// 폴더 카드 컴포넌트
function FolderCard({
  folder,
  onOpen,
  onEdit,
  onDelete,
}: {
  folder: DocumentFolder;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const count = folder._count?.documents ?? 0;
  return (
    <div
      onClick={onOpen}
      className="group relative cursor-pointer rounded-lg border bg-card p-4 hover:border-primary/60 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
          <Folder className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{folder.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{count}개 자료</span>
            {folder.site && (
              <>
                <span>·</span>
                <span>{folder.site}</span>
              </>
            )}
          </div>
          {folder.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{folder.description}</p>
          )}
        </div>
      </div>

      {/* 관리자용 액션 버튼 */}
      {(onEdit || onDelete) && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="w-7 h-7 rounded-md bg-background/90 hover:bg-accent flex items-center justify-center"
              title="수정"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="w-7 h-7 rounded-md bg-background/90 hover:bg-destructive/10 text-destructive flex items-center justify-center"
              title="삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
