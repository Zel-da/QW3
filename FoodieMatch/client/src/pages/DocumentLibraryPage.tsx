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
import { FileText, Video, Upload, Plus, Trash2, Download, Search, Filter, ExternalLink, Eye } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface Document {
  id: number;
  title: string;
  description?: string;
  category: string;
  type: string;
  site?: string;
  department?: string;
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

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'RISK_ASSESSMENT', type: 'PDF',
    department: '', videoUrl: '', videoType: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['documents', filterCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterCategory) params.set('category', filterCategory);
      const res = await fetch(`/api/documents?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('조회 실패');
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let fileUrl = '', fileName = '', fileSize = 0, mimeType = '';

      // 파일 업로드
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
        ...form,
        department: form.department || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        mimeType: mimeType || null,
        videoUrl: form.videoUrl || null,
        videoType: form.videoType || null,
      };

      const res = await apiRequest('POST', '/api/documents', body);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '등록 완료', description: '자료가 등록되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setDialogOpen(false);
      setForm({ title: '', description: '', category: 'RISK_ASSESSMENT', type: 'PDF', department: '', videoUrl: '', videoType: '' });
      setUploadFile(null);
    },
    onError: (err: any) => {
      toast({ title: '등록 실패', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/documents/${id}`);
    },
    onSuccess: () => {
      toast({ title: '삭제 완료' });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const filtered = (documents || []).filter(doc => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return doc.title.toLowerCase().includes(q) || doc.description?.toLowerCase().includes(q) || doc.department?.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">자료실</h1>
            <p className="text-muted-foreground mt-1">위험성평가 및 교육자료</p>
          </div>
          {canManage && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="w-4 h-4 mr-2" />자료 등록</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>자료 등록</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>제목 *</Label>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="자료 제목" />
                  </div>
                  <div>
                    <Label>설명</Label>
                    <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="자료 설명" rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>카테고리 *</Label>
                      <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>파일 유형</Label>
                      <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FILE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>부서</Label>
                    <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="부서명" />
                  </div>
                  <div>
                    <Label>파일 업로드</Label>
                    <Input
                      type="file"
                      accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.mp4,.avi,.mov"
                      onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    />
                    {uploadFile && <p className="text-xs text-muted-foreground mt-1">{uploadFile.name} ({formatFileSize(uploadFile.size)})</p>}
                  </div>
                  {(form.type === 'VIDEO') && (
                    <div>
                      <Label>영상 URL (YouTube 등)</Label>
                      <Input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value, videoType: 'youtube' })} placeholder="https://youtube.com/..." />
                    </div>
                  )}
                  <Button onClick={() => createMutation.mutate()} disabled={!form.title || createMutation.isPending} className="w-full">
                    {createMutation.isPending ? '등록 중...' : '등록'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <Label className="text-xs">검색</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="제목, 설명, 부서 검색..." className="pl-9" />
                </div>
              </div>
              <div className="w-40">
                <Label className="text-xs">카테고리</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document List */}
        {isLoading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>등록된 자료가 없습니다</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead className="w-28">카테고리</TableHead>
                    <TableHead className="w-20">유형</TableHead>
                    <TableHead className="w-24">부서</TableHead>
                    <TableHead className="w-24">등록자</TableHead>
                    <TableHead className="w-28">등록일</TableHead>
                    <TableHead className="w-20 text-right">작업</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((doc, i) => (
                    <TableRow key={doc.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{doc.title}</span>
                          {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{doc.description}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          doc.category === 'RISK_ASSESSMENT' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {CATEGORIES.find(c => c.value === doc.category)?.label || doc.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        {doc.type === 'VIDEO' ? <Video className="w-4 h-4 text-purple-500" /> : <FileText className="w-4 h-4 text-gray-500" />}
                        <span className="ml-1 text-xs">{doc.type}</span>
                      </TableCell>
                      <TableCell>{doc.department || '-'}</TableCell>
                      <TableCell>{doc.author?.name || doc.author?.username}</TableCell>
                      <TableCell>{new Date(doc.createdAt).toLocaleDateString('ko-KR')}</TableCell>
                      <TableCell className="text-right space-x-1">
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
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                            if (confirm('이 자료를 삭제하시겠습니까?')) deleteMutation.mutate(doc.id);
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
