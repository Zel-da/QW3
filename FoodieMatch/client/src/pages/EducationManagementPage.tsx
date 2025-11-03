import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Search } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import type { Course } from '@shared/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { BookOpen } from 'lucide-react';
import { CourseEditDialog } from '@/components/CourseEditDialog';

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
  const [videoType, setVideoType] = useState<'youtube' | 'file' | 'audio'>('youtube');
  const [quizFile, setQuizFile] = useState<File | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
            toast({ title: '교육 과정이 생성되었습니다.' });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
        }
      }
  });

  const deleteCourseMutation = useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      toast({ title: '교육 과정이 삭제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: () => {
        toast({ title: '삭제 중 오류가 발생했습니다.', variant: 'destructive' });
    }
  });

  const assessmentMutation = useMutation({
      mutationFn: createAssessments,
      onSuccess: () => {
        toast({ title: '교육 과정과 퀴즈가 성공적으로 생성되었습니다.' });
        queryClient.invalidateQueries({ queryKey: ['courses'] });
      }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
      let youtubeEmbedUrl = videoUrl;
      if (videoUrl.includes('watch?v=')) {
        youtubeEmbedUrl = videoUrl.replace('watch?v=', 'embed/');
      }
      courseData.videoUrl = youtubeEmbedUrl;
    } else if (videoType === 'file') {
      courseData.videoUrl = videoUrl; // Already uploaded file URL
    } else if (videoType === 'audio') {
      courseData.audioUrl = audioUrl; // Already uploaded audio file URL
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
            <CardTitle className="text-2xl">교육 콘텐츠 관리</CardTitle>
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

              {/* Media Type Selection */}
              <div className="space-y-3">
                <Label>콘텐츠 유형</Label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="videoType"
                      value="youtube"
                      checked={videoType === 'youtube'}
                      onChange={(e) => {
                        setVideoType('youtube');
                        setVideoUrl('');
                        setAudioUrl('');
                      }}
                    />
                    <span>YouTube 링크</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="videoType"
                      value="file"
                      checked={videoType === 'file'}
                      onChange={(e) => {
                        setVideoType('file');
                        setVideoUrl('');
                        setAudioUrl('');
                      }}
                    />
                    <span>동영상 파일</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="videoType"
                      value="audio"
                      checked={videoType === 'audio'}
                      onChange={(e) => {
                        setVideoType('audio');
                        setVideoUrl('');
                        setAudioUrl('');
                      }}
                    />
                    <span>오디오 파일</span>
                  </label>
                </div>
              </div>

              {/* Conditional Input Fields */}
              {videoType === 'youtube' && (
                <div className="space-y-2">
                  <Label htmlFor="videoUrl">YouTube 영상 URL</Label>
                  <Input
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    required
                  />
                </div>
              )}

              {videoType === 'file' && (
                <div className="space-y-2">
                  <Label htmlFor="videoFile">동영상 파일 업로드</Label>
                  <Input
                    id="videoFile"
                    type="file"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const formData = new FormData();
                      formData.append('files', file);

                      try {
                        const res = await fetch('/api/upload-multiple', {
                          method: 'POST',
                          body: formData
                        });
                        const data = await res.json();
                        if (data.files && data.files.length > 0) {
                          setVideoUrl(data.files[0].url);
                          toast({ title: '동영상 업로드 완료' });
                        }
                      } catch (error) {
                        toast({ title: '업로드 실패', variant: 'destructive' });
                      }
                    }}
                  />
                  {videoUrl && <p className="text-sm text-green-600">✓ 업로드 완료: {videoUrl}</p>}
                </div>
              )}

              {videoType === 'audio' && (
                <div className="space-y-2">
                  <Label htmlFor="audioFile">오디오 파일 업로드</Label>
                  <Input
                    id="audioFile"
                    type="file"
                    accept="audio/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      const formData = new FormData();
                      formData.append('files', file);

                      try {
                        const res = await fetch('/api/upload-multiple', {
                          method: 'POST',
                          body: formData
                        });
                        const data = await res.json();
                        if (data.files && data.files.length > 0) {
                          setAudioUrl(data.files[0].url);
                          toast({ title: '오디오 업로드 완료' });
                        }
                      } catch (error) {
                        toast({ title: '업로드 실패', variant: 'destructive' });
                      }
                    }}
                  />
                  {audioUrl && <p className="text-sm text-green-600">✓ 업로드 완료: {audioUrl}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="duration">교육 시간 (분)</Label>
                <Input id="duration" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} placeholder="예: 30" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quizFile">퀴즈 파일 (CSV)</Label>
                <Input id="quizFile" type="file" accept=".csv" onChange={(e) => setQuizFile(e.target.files ? e.target.files[0] : null)} />
                <p className="text-sm text-muted-foreground">CSV 파일 형식: question,options (세미콜론으로 구분),correctAnswer (0-based index)</p>
              </div>
              <Button type="submit" disabled={courseMutation.isPending || assessmentMutation.isPending}>업로드</Button>
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
      </main>
    </div>
  );
}