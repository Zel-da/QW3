import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link } from 'wouter';
import { BookOpen, CheckCircle2, XCircle, Search, ArrowLeft, AlertCircle } from 'lucide-react';
import type { Course, UserProgress, UserAssessment } from '@shared/schema';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { formatTime, formatDate } from '@/lib/format';

interface CourseHistoryItem {
  course: Course;
  progress?: UserProgress;
  assessment?: UserAssessment;
}

const fetchCourses = async (): Promise<Course[]> => {
  const res = await fetch('/api/courses');
  if (!res.ok) throw new Error('Failed to fetch courses');
  return res.json();
};

const fetchUserProgress = async (userId: string): Promise<UserProgress[]> => {
  const res = await fetch(`/api/users/${userId}/progress`);
  if (!res.ok) throw new Error('Failed to fetch progress');
  return res.json();
};

const fetchUserAssessments = async (userId: string): Promise<UserAssessment[]> => {
  const res = await fetch(`/api/users/${userId}/assessments`);
  if (!res.ok) throw new Error('Failed to fetch assessments');
  return res.json();
};

export default function MyCertificatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [filterStatus, setFilterStatus] = useState<"all" | "in-progress" | "completed">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'progress'>('recent');
  const ITEMS_PER_PAGE = 9;

  const { data: courses = [], isLoading: coursesLoading, isError: coursesError } = useQuery<Course[]>({
    queryKey: ['/api/courses'],
    queryFn: fetchCourses,
  });

  const { data: userProgress = [], isLoading: progressLoading, isError: progressError } = useQuery<UserProgress[]>({
    queryKey: ['userProgress', user?.id],
    queryFn: () => fetchUserProgress(user!.id),
    enabled: !!user?.id,
  });

  const { data: userAssessments = [], isLoading: assessmentsLoading, isError: assessmentsError } = useQuery<UserAssessment[]>({
    queryKey: ['userAssessments', user?.id],
    queryFn: () => fetchUserAssessments(user!.id),
    enabled: !!user?.id,
  });

  // Combine data into course history items
  const courseHistory: CourseHistoryItem[] = courses.map(course => ({
    course,
    progress: userProgress.find(p => p.courseId === course.id),
    assessment: userAssessments.find(a => a.courseId === course.id),
  }));

  // Filter based on status and search
  const filteredHistory = courseHistory.filter(item => {
    // 검색 필터
    const searchMatch = searchTerm === '' ||
      item.course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.course.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    // 상태 필터
    if (filterStatus === "all") return true;
    if (filterStatus === "completed") return item.progress?.completed === true;
    if (filterStatus === "in-progress") {
      // NOT completed (includes not started)
      return !item.progress?.completed;
    }
    return true;
  });

  // Sort filtered history
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (sortBy === 'name') {
      return a.course.title.localeCompare(b.course.title, 'ko-KR');
    } else if (sortBy === 'progress') {
      const progressA = a.progress?.progress || 0;
      const progressB = b.progress?.progress || 0;
      return progressB - progressA; // 높은 진행률부터
    } else {
      // recent: 마지막 학습일 최신순
      const dateA = a.progress?.lastAccessed ? new Date(a.progress.lastAccessed).getTime() : 0;
      const dateB = b.progress?.lastAccessed ? new Date(b.progress.lastAccessed).getTime() : 0;
      return dateB - dateA;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = sortedHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filter, search, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortBy]);

  const isLoading = authLoading || coursesLoading || progressLoading || assessmentsLoading;
  const hasError = coursesError || progressError || assessmentsError;

  if (!user) {
    return <div>로그인이 필요합니다.</div>;
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BookOpen className="w-8 h-8 text-primary" />
                <div>
                  <CardTitle className="text-2xl">나의 수강 이력</CardTitle>
                  <CardDescription>교육 과정의 진행 상황과 학습 이력을 확인할 수 있습니다.</CardDescription>
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/courses">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  돌아가기
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {hasError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-lg font-semibold mb-2">데이터를 불러올 수 없습니다</h2>
                <p className="text-muted-foreground mb-4">네트워크 연결을 확인하고 다시 시도해주세요.</p>
                <Button onClick={() => window.location.reload()} variant="outline">다시 시도</Button>
              </div>
            ) : isLoading ? (
              <LoadingSpinner size="lg" text="수강 이력을 불러오는 중..." className="py-16" />
            ) : courseHistory.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="등록된 교육 과정이 없습니다"
                description="교육 과정이 추가되면 여기에 표시됩니다."
                action={{
                  label: "교육 둘러보기",
                  onClick: () => window.location.href = "/courses"
                }}
              />
            ) : (
              <>
                <div className="mb-6 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      placeholder="과정명 또는 설명으로 검색..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 h-12 text-base"
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'recent' | 'name' | 'progress')}>
                    <SelectTrigger className="w-full sm:w-[180px] h-12">
                      <SelectValue placeholder="정렬 기준" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">최근 학습순</SelectItem>
                      <SelectItem value="name">과정명순</SelectItem>
                      <SelectItem value="progress">진행률순</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                  <TabsList className="mb-6">
                  <TabsTrigger value="all">
                    전체 ({courseHistory.length})
                  </TabsTrigger>
                  <TabsTrigger value="in-progress">
                    수강중 ({courseHistory.filter(h => !h.progress?.completed).length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    수료 ({courseHistory.filter(h => h.progress?.completed).length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={filterStatus}>
                  {filteredHistory.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title={
                        searchTerm ? "검색 결과가 없습니다" :
                        filterStatus === "completed" ? "수료한 교육이 없습니다" :
                        filterStatus === "in-progress" ? "수강중인 교육이 없습니다" :
                        "교육 이력이 없습니다"
                      }
                      description={
                        searchTerm ? `"${searchTerm}"에 대한 검색 결과가 없습니다. 다른 검색어를 입력해보세요.` :
                        filterStatus === "completed" ? "교육을 완료하고 평가에 합격하면 수료됩니다." :
                        filterStatus === "in-progress" ? "교육을 시작하면 여기에 표시됩니다." :
                        "교육을 시작하세요."
                      }
                    />
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>과정명</TableHead>
                              <TableHead className="text-center">진행률</TableHead>
                              <TableHead className="text-center">시청 시간</TableHead>
                              <TableHead className="text-center">평가 점수</TableHead>
                              <TableHead className="text-center">수료 여부</TableHead>
                              <TableHead className="text-center">마지막 학습일</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedHistory.map((item) => {
                              const { course, progress, assessment } = item;
                              const progressPercent = progress?.progress || 0;
                              const timeSpent = progress?.timeSpent || 0;
                              const assessmentScore = assessment?.score;
                              const assessmentTotal = assessment?.totalQuestions;
                              const isCompleted = progress?.completed || false;
                              const lastAccessed = progress?.lastAccessed;

                              return (
                                <TableRow key={course.id}>
                                  <TableCell className="font-medium">
                                    <Link href={`/courses/${course.id}`} className="hover:underline text-primary">
                                      {course.title}
                                    </Link>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <div className="w-16 bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-primary h-2 rounded-full transition-all"
                                          style={{ width: `${progressPercent}%` }}
                                        />
                                      </div>
                                      <span className="text-sm">{Math.round(progressPercent)}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {timeSpent > 0 ? formatTime(timeSpent) : '-'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {assessmentScore !== undefined && assessmentTotal !== undefined
                                      ? `${assessmentScore} / ${assessmentTotal}`
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto" />
                                    ) : (
                                      <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
                                    )}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {lastAccessed ? formatDate(lastAccessed) : '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

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
                </TabsContent>
              </Tabs>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
