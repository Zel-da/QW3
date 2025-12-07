import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, X, Video, Music, FileText, Youtube, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import type { Course } from '@shared/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { BookOpen } from 'lucide-react';
import { CourseEditDialog } from '@/components/CourseEditDialog';
import { FileDropzone } from '@/components/FileDropzone';

// YouTube URL을 임베드 URL로 변환 (youtube-nocookie.com 사용)
const getYouTubeEmbedUrl = (url: string): string => {
  if (!url) return '';

  let videoId = '';

  // 이미 embed URL인 경우 videoId 추출
  if (url.includes('/embed/')) {
    const embedMatch = url.match(/\/embed\/([^?&#]+)/);
    if (embedMatch) videoId = embedMatch[1];
  }

  // watch?v= 형식
  if (!videoId) {
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) videoId = watchMatch[1];
  }

  // youtu.be/ID 형식
  if (!videoId) {
    const shortMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortMatch) videoId = shortMatch[1];
  }

  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : url;
};

const fetchCourses = async () => {
    const res = await fetch('/api/courses');
    if (!res.ok) throw new Error('Failed to fetch courses');
    return res.json();
}

const createCourse = async (courseData: Partial<Course>) => {
    const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
    });
    if (!res.ok) throw new Error('Failed to create course');
    return res.json();
}

const deleteCourse = async (courseId: string) => {
    const res = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete course');
    // No need to return JSON for a 204 response
}

const createAssessments = async ({ courseId, questions }: { courseId: string; questions: any[] }) => {
    const res = await fetch(`/api/courses/${courseId}/assessments-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
    });
    if (!res.ok) throw new Error('Failed to create assessments');
    return res.json();
}

export default function EducationManagementPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [videoType, setVideoType] = useState<'youtube' | 'file' | 'audio'>('youtube');
  const [quizFile, setQuizFile] = useState<File | null>(null);

  // 여러 미디어 파일 지원
  const [mediaItems, setMediaItems] = useState<Array<{
    id: string;
    type: 'youtube' | 'video' | 'audio' | 'document';
    url: string;
    name: string;
    size?: number;
  }>>([]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { data: courses = [], isLoading } = useQuery<Course[]>({
      queryKey: ['courses'],
      queryFn: fetchCourses
  });

  // Filter courses based on search
  const filteredCourses = courses.filter((course) => {
    const searchMatch = searchTerm === '' ||
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());
    return searchMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredCourses.length / ITEMS_PER_PAGE);
  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const courseMutation = useMutation({
      mutationFn: createCourse,
      onSuccess: (newCourse) => {
        if (quizFile) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result;
                if (typeof text !== 'string') return;
                
                const questions = text.split('\n').slice(1).map(line => {
                    const [question, options, correctAnswer] = line.split(',');
                    return { question, options, correctAnswer: parseInt(correctAnswer, 10) };
                }).filter(q => q.question && q.options && !isNaN(q.correctAnswer));

                if (questions.length > 0) {
                    assessmentMutation.mutate({ courseId: newCourse.id, questions });
                } else {
                    toast({ title: 'CSV 파일 형식이 잘못되었거나 내용이 없습니다.', variant: 'destructive' });
                }
            };
            reader.readAsText(quizFile);
        } else {
            setSuccessMessage('교육 과정이 생성되었습니다.');
            toast({ title: '교육 과정이 생성되었습니다.' });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            setShowSuccessDialog(true);
        }
      }
  });

  const deleteCourseMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      setSuccessMessage('교육 과정이 삭제되었습니다.');
      toast({ title: '교육 과정이 삭제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowSuccessDialog(true);
    },
    onError: () => {
        toast({ title: '삭제 중 오류가 발생했습니다.', variant: 'destructive' });
    }
  });

  const assessmentMutation = useMutation({
      mutationFn: createAssessments,
      onSuccess: () => {
        setSuccessMessage('교육 과정과 퀴즈가 성공적으로 생성되었습니다.');
        toast({ title: '교육 과정과 퀴즈가 성공적으로 생성되었습니다.' });
        queryClient.invalidateQueries({ queryKey: ['courses'] });
        setShowSuccessDialog(true);
      }
  });

  // 미디어 항목 추가
  const addMediaItem = (type: 'youtube' | 'video' | 'audio' | 'document') => {
    const newItem = {
      id: `media-${Date.now()}`,
      type,
      url: '',
      name: '',
      size: 0
    };
    setMediaItems([...mediaItems, newItem]);
  };

  // 미디어 항목 삭제
  const removeMediaItem = (id: string) => {
    setMediaItems(mediaItems.filter(item => item.id !== id));
  };

  // 미디어 파일 업로드
  const handleMediaFileUpload = async (itemId: string, file: File) => {
    const formData = new FormData();
    formData.append('files', file);

    try {
      const res = await fetch('/api/upload-multiple', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        setMediaItems(mediaItems.map(item =>
          item.id === itemId
            ? { ...item, url: data.files[0].url, name: file.name, size: file.size }
            : item
        ));
        toast({ title: '파일 업로드 완료' });
      }
    } catch (error) {
      toast({ title: '업로드 실패', variant: 'destructive' });
    }
  };

  // YouTube URL 업데이트
  const updateMediaItemUrl = (itemId: string, url: string) => {
    setMediaItems(mediaItems.map(item =>
      item.id === itemId
        ? { ...item, url, name: url }
        : item
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 검증: 최소 1개의 미디어 콘텐츠 필요
    const hasMediaContent =
      videoUrl ||
      audioUrl ||
      documentUrl ||
      mediaItems.some(item => item.url);

    if (!hasMediaContent) {
      toast({
        title: '콘텐츠 필수',
        description: '교육 과정에는 최소 1개의 미디어 콘텐츠(YouTube, 동영상, 오디오, 문서)가 필요합니다.',
        variant: 'destructive',
      });
      return;
    }

    // 검증: YouTube URL 형식 확인
    if (videoType === 'youtube' && videoUrl) {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/).+$/;
      if (!youtubeRegex.test(videoUrl)) {
        toast({
          title: 'YouTube URL 형식 오류',
          description: '올바른 YouTube URL을 입력해주세요. (예: https://www.youtube.com/watch?v=...)',
          variant: 'destructive',
        });
        return;
      }
    }

    // 검증: 미디어 항목 중 YouTube URL 형식 확인
    const youtubeItems = mediaItems.filter(item => item.type === 'youtube' && item.url);
    for (const item of youtubeItems) {
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/).+$/;
      if (!youtubeRegex.test(item.url)) {
        toast({
          title: 'YouTube URL 형식 오류',
          description: `올바른 YouTube URL을 입력해주세요: "${item.name || item.url}"`,
          variant: 'destructive',
        });
        return;
      }
    }

    const courseData: any = {
      title,
      description,
      type: videoType === 'audio' ? 'audio' : 'video',
      duration,
      icon: 'book-open',
      color: 'blue',
      videoType
    };

    if (videoType === 'youtube') {
      courseData.videoUrl = getYouTubeEmbedUrl(videoUrl);
    } else if (videoType === 'file') {
      courseData.videoUrl = videoUrl; // Already uploaded file URL
    } else if (videoType === 'audio') {
      courseData.audioUrl = audioUrl; // Already uploaded audio file URL
    }

    // Add documentUrl if it exists
    if (documentUrl) {
      courseData.documentUrl = documentUrl;
    }

    // 여러 미디어 항목 추가
    if (mediaItems.length > 0) {
      courseData.attachments = mediaItems
        .filter(item => item.url) // URL이 있는 항목만
        .map(item => ({
          url: item.url,
          name: item.name || item.url,
          type: item.type,
          size: item.size || 0,
          mimeType: item.type === 'youtube' ? 'video/youtube' :
                    item.type === 'video' ? 'video/mp4' :
                    item.type === 'audio' ? 'audio/mpeg' : 'application/octet-stream'
        }));
    }

    courseMutation.mutate(courseData);
  };

  const handleDelete = (courseId: string) => {
    if (window.confirm('정말로 이 교육 과정을 삭제하시겠습니까? 관련된 모든 평가와 진행 기록이 삭제됩니다.')) {
        deleteCourseMutation.mutate(courseId);
    }
  }

  const handleEdit = (course: Course) => {
    setSelectedCourse(course);
    setIsEditDialogOpen(true);
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <CardTitle className="text-2xl">교육 콘텐츠 관리</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href="/admin-dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  관리자 대시보드로
                </Link>
              </Button>
            </div>
            <CardDescription>새로운 교육 영상과 퀴즈를 업로드합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">교육 제목</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 지게차 안전 운행 수칙" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">상세 설명</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="교육 과정에 대한 간단한 설명" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">교육 시간 (분)</Label>
                <Input id="duration" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} placeholder="예: 30" required />
              </div>

              {/* 문서 파일 업로드 */}
              <div className="space-y-2">
                <Label>교육 자료 문서 (선택사항)</Label>
                <FileDropzone
                  onFilesSelected={async (files) => {
                    if (files.length === 0) return;

                    const formData = new FormData();
                    formData.append('files', files[0]);

                    try {
                      const res = await fetch('/api/upload-multiple', {
                        method: 'POST',
                        body: formData
                      });
                      const data = await res.json();
                      if (data.files && data.files.length > 0) {
                        setDocumentUrl(data.files[0].url);
                        toast({ title: '문서 업로드 완료' });
                      }
                    } catch (error) {
                      toast({ title: '업로드 실패', variant: 'destructive' });
                    }
                  }}
                  accept={{
                    'application/pdf': ['.pdf'],
                    'application/msword': ['.doc'],
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                    'application/vnd.ms-excel': ['.xls'],
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                    'application/vnd.ms-powerpoint': ['.ppt'],
                    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
                  }}
                  maxFiles={1}
                  maxSize={50 * 1024 * 1024}
                  multiple={false}
                />
                {documentUrl && <p className="text-sm text-green-600">✓ 업로드 완료: {documentUrl}</p>}
                <p className="text-sm text-muted-foreground">지원 형식: PDF, Word, Excel, PowerPoint, 한글 (드래그 앤 드롭 또는 클릭하여 업로드)</p>
              </div>

              {/* 미디어 콘텐츠 */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">교육 미디어 콘텐츠 (YouTube, 동영상, 음성, 문서)</Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => addMediaItem('youtube')}>
                      <Plus className="h-4 w-4 mr-1" /> YouTube
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => addMediaItem('video')}>
                      <Plus className="h-4 w-4 mr-1" /> 동영상
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => addMediaItem('audio')}>
                      <Plus className="h-4 w-4 mr-1" /> 오디오
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => addMediaItem('document')}>
                      <Plus className="h-4 w-4 mr-1" /> 문서
                    </Button>
                  </div>
                </div>

                {mediaItems.length > 0 && (
                  <div className="space-y-3">
                    {mediaItems.map((item, index) => (
                      <div key={item.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {item.type === 'youtube' && <Youtube className="h-5 w-5 text-red-500" />}
                            {item.type === 'video' && <Video className="h-5 w-5 text-blue-500" />}
                            {item.type === 'audio' && <Music className="h-5 w-5 text-purple-500" />}
                            {item.type === 'document' && <FileText className="h-5 w-5 text-green-500" />}
                            <span className="font-medium">
                              {item.type === 'youtube' ? 'YouTube 링크' :
                               item.type === 'video' ? '동영상 파일' :
                               item.type === 'audio' ? '오디오 파일' : '문서 파일'}
                            </span>
                            <span className="text-sm text-muted-foreground">#{index + 1}</span>
                          </div>
                          <Button type="button" size="sm" variant="ghost" onClick={() => removeMediaItem(item.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {item.type === 'youtube' ? (
                          <div className="space-y-2">
                            <Input
                              placeholder="YouTube URL 입력 (예: https://www.youtube.com/watch?v=...)"
                              value={item.url}
                              onChange={(e) => updateMediaItemUrl(item.id, e.target.value)}
                            />
                            {item.url && (
                              <div className="aspect-video">
                                <iframe
                                  src={getYouTubeEmbedUrl(item.url)}
                                  className="w-full h-full rounded"
                                  title="YouTube video preview"
                                  frameBorder="0"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                  referrerPolicy="strict-origin-when-cross-origin"
                                  allowFullScreen
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              type="file"
                              accept={
                                item.type === 'video' ? 'video/*' :
                                item.type === 'audio' ? 'audio/*,video/mp4' :
                                '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx'
                              }
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleMediaFileUpload(item.id, file);
                              }}
                            />
                            {item.url && (
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <span>✓ 업로드 완료:</span>
                                <span className="truncate">{item.name}</span>
                                {item.size && <span>({(item.size / 1024 / 1024).toFixed(2)} MB)</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  + 버튼을 클릭하여 여러 개의 미디어 파일을 추가할 수 있습니다.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quizFile">퀴즈 파일 (CSV)</Label>
                <Input id="quizFile" type="file" accept=".csv" onChange={(e) => setQuizFile(e.target.files ? e.target.files[0] : null)} />
                <p className="text-sm text-muted-foreground">CSV 파일 형식: question,options (세미콜론으로 구분),correctAnswer (0-based index)</p>
              </div>
              <Button
                type="submit"
                disabled={
                  courseMutation.isPending ||
                  assessmentMutation.isPending ||
                  !title ||
                  !description ||
                  duration === 0
                }
              >
                업로드
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-8">
            <CardHeader><CardTitle>현재 교육 과정 목록</CardTitle></CardHeader>
            <CardContent>
                {courses.length > 0 && (
                  <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="과정명 또는 설명으로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                )}
                {isLoading ? (
                  <LoadingSpinner size="md" text="과정 목록을 불러오는 중..." className="py-8" />
                ) : courses.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="등록된 교육 과정이 없습니다"
                    description="위 폼을 사용하여 새로운 교육 과정을 추가하세요."
                  />
                ) : filteredCourses.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="검색 결과가 없습니다"
                    description={`"${searchTerm}"에 대한 검색 결과가 없습니다. 다른 검색어를 입력해보세요.`}
                  />
                ) : (
                    <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>제목</TableHead>
                                <TableHead>설명</TableHead>
                                <TableHead className="text-right">작업</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedCourses.map(course => (
                                <TableRow key={course.id}>
                                    <TableCell>{course.title}</TableCell>
                                    <TableCell>{course.description}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEdit(course)}>수정</Button>
                                        <Button variant="destructive" size="sm" onClick={() => handleDelete(course.id)}>삭제</Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center mt-6">
                        <Pagination>
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
                    </>
                )}
            </CardContent>
        </Card>
        <CourseEditDialog
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            course={selectedCourse}
        />

        {/* 성공 다이얼로그 */}
        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                작업 완료
              </DialogTitle>
              <DialogDescription>
                {successMessage}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowSuccessDialog(false)}>
                확인
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}