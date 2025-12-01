import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { CourseCard } from "@/components/course-card";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Award, Search, Settings, BarChart3, ChevronRight, Clock, CheckCircle } from "lucide-react";
import { Course, UserProgress, UserAssessment } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { NoticePopup } from "@/components/notice-popup";
import { EmptyState } from "@/components/EmptyState";
import { DashboardStats } from "@/components/DashboardStats";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [filterStatus, setFilterStatus] = useState<"all" | "in-progress" | "completed">("in-progress");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'name' | 'progress'>('latest');
  const ITEMS_PER_PAGE = 9;

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  const { data: userProgress = [], isLoading: userProgressLoading } = useQuery<UserProgress[]>({
    queryKey: ["/api/users", user?.id, "progress"],
    enabled: !!user?.id,
  });

  const { data: userAssessments = [], isLoading: assessmentsLoading } = useQuery<UserAssessment[]>({
    queryKey: ["/api/users", user?.id, "assessments"],
    enabled: !!user?.id,
  });

  // Filter courses based on status and search
  const filteredCourses = courses.filter((course) => {
    // 검색 필터
    const searchMatch = searchTerm === '' ||
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());

    if (!searchMatch) return false;

    // 상태 필터
    if (filterStatus === "all") return true;

    const progress = userProgress.find(p => p.courseId === course.id);

    if (filterStatus === "completed") {
      return progress?.completed === true;
    }

    if (filterStatus === "in-progress") {
      // In progress means: NOT completed (includes not started)
      return !progress?.completed;
    }

    return true;
  });

  // Sort filtered courses
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === 'name') {
      return a.title.localeCompare(b.title, 'ko-KR');
    } else if (sortBy === 'progress') {
      const progressA = userProgress.find(p => p.courseId === a.id)?.progress || 0;
      const progressB = userProgress.find(p => p.courseId === b.id)?.progress || 0;
      return progressB - progressA; // 높은 진행률부터
    } else {
      // latest: 과정 ID 역순 (최근 생성된 것부터)
      return b.id.localeCompare(a.id);
    }
  });

  // Paginate sorted courses
  const totalPages = Math.ceil(sortedCourses.length / ITEMS_PER_PAGE);
  const paginatedCourses = sortedCourses.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filter, search, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, sortBy]);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/login');
    }
  }, [authLoading, user, setLocation]);

  const handleStartCourse = (courseId: string) => {
    if (!user) {
      setLocation('/login');
      return;
    }
    setLocation(`/courses/${courseId}`);
  };

  if (authLoading || coursesLoading || userProgressLoading || assessmentsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-center korean-text">
            <div className="text-lg">로딩 중...</div>
          </div>
        </div>
      </div>
    );
  }

  // The user check is now handled by the useEffect hook
  if (!user) {
    return null; // Render nothing while the redirect is happening
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="container mx-auto px-4 py-4 md:py-8">
        {/* Hero Section - 모바일 최적화 */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6" data-testid="hero-section">
          <h1 className="text-xl md:text-4xl font-bold text-foreground korean-text">
            안전 교육
          </h1>
          <div className="flex gap-2">
            {user?.role === 'ADMIN' && (
              <Link href="/education-monitoring">
                <Button variant="secondary" size="sm" className="text-xs md:text-sm">
                  <BarChart3 className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">교육 현황</span>
                </Button>
              </Link>
            )}
            <Link href="/my-certificates">
              <Button variant="outline" size="sm" className="text-xs md:text-sm">
                <Award className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">내 이수 현황</span>
                <span className="md:hidden">이수 현황</span>
              </Button>
            </Link>
          </div>
        </div>{/* Course Filtering and Display */}
        {courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="등록된 교육 과정이 없습니다"
            description={user?.role === 'ADMIN'
              ? "교육 과정을 추가하여 안전교육을 시작하세요."
              : "관리자가 교육 과정을 추가할 때까지 기다려주세요."}
            action={
              user?.role === 'ADMIN'
                ? {
                    label: "교육 과정 추가하기",
                    onClick: () => setLocation("/education-management")
                  }
                : undefined
            }
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
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'latest' | 'name' | 'progress')}>
                <SelectTrigger className="w-full sm:w-[180px] h-12">
                  <SelectValue placeholder="정렬 기준" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">최신순</SelectItem>
                  <SelectItem value="name">과정명순</SelectItem>
                  <SelectItem value="progress">진행률순</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Tabs value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)} className="mb-6 md:mb-8">
              <TabsList className="mb-4 md:mb-6 w-full md:w-auto grid grid-cols-3 md:flex md:justify-start">
                <TabsTrigger value="all" className="text-sm md:text-lg font-semibold px-3 md:px-6 py-2 md:py-3">
                  전체 <span className="ml-1">({courses.length})</span>
                </TabsTrigger>
                <TabsTrigger value="in-progress" className="text-sm md:text-lg font-semibold px-3 md:px-6 py-2 md:py-3">
                  진행중 <span className="ml-1">({courses.filter(c => {
                    const p = userProgress.find(up => up.courseId === c.id);
                    return !p?.completed;
                  }).length})</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-sm md:text-lg font-semibold px-3 md:px-6 py-2 md:py-3">
                  수료 <span className="ml-1">({courses.filter(c => {
                    const p = userProgress.find(up => up.courseId === c.id);
                    return p?.completed === true;
                  }).length})</span>
                </TabsTrigger>
              </TabsList>

            <TabsContent value={filterStatus}>
              {filteredCourses.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title={
                    filterStatus === "completed" ? "수료한 교육이 없습니다" :
                    filterStatus === "in-progress" ? "진행중인 교육이 없습니다" :
                    "교육 과정이 없습니다"
                  }
                  description={
                    filterStatus === "completed" ? "교육을 완료하고 평가에 합격하면 수료됩니다." :
                    filterStatus === "in-progress" ? "교육을 시작하면 여기에 표시됩니다." :
                    "교육 과정을 시작하세요."
                  }
                />
              ) : (
                <>
                  {/* 데스크톱 테이블 뷰 */}
                  <div className="hidden md:block mb-8" data-testid="course-table">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[250px]">과정명</TableHead>
                          <TableHead>설명</TableHead>
                          <TableHead className="w-[120px] text-center">유형</TableHead>
                          <TableHead className="w-[100px] text-center">시간</TableHead>
                          <TableHead className="w-[100px] text-center">진행률</TableHead>
                          <TableHead className="w-[100px] text-center">상태</TableHead>
                          <TableHead className="w-[120px] text-center">액션</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedCourses.map((course) => {
                          const progress = userProgress.find(p => p.courseId === course.id);
                          const assessment = userAssessments.find(a => a.courseId === course.id);
                          const progressPercent = progress?.progress || 0;
                          const isCompleted = progress?.completed || false;

                          return (
                            <TableRow key={course.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium">{course.title}</TableCell>
                              <TableCell className="text-muted-foreground">{course.description}</TableCell>
                              <TableCell className="text-center text-sm">
                                {course.type === 'workplace-safety' ? '작업장 안전' :
                                 course.type === 'hazard-prevention' ? '위험 예방' : 'TBM 활동'}
                              </TableCell>
                              <TableCell className="text-center">{course.duration}분</TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-sm font-medium">{progressPercent}%</span>
                                  <Progress value={progressPercent} className="h-2 w-16" />
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  isCompleted ? 'bg-green-100 text-green-800' :
                                  progressPercent > 0 ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {isCompleted ? '수료' : progressPercent > 0 ? '진행중' : '시작 전'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Button onClick={() => handleStartCourse(course.id)} size="sm" className="w-full">
                                  {isCompleted ? '복습하기' : progressPercent > 0 ? '이어하기' : '시작하기'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 모바일 카드 리스트 뷰 */}
                  <div className="md:hidden space-y-3 mb-6">
                    {paginatedCourses.map((course) => {
                      const progress = userProgress.find(p => p.courseId === course.id);
                      const progressPercent = progress?.progress || 0;
                      const isCompleted = progress?.completed || false;

                      return (
                        <Card
                          key={course.id}
                          className="overflow-hidden cursor-pointer hover:bg-muted/50 active:bg-muted transition-colors"
                          onClick={() => handleStartCourse(course.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                isCompleted ? 'bg-green-100' :
                                progressPercent > 0 ? 'bg-orange-100' :
                                'bg-gray-100'
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle className="h-5 w-5 text-green-600" />
                                ) : (
                                  <BookOpen className={`h-5 w-5 ${progressPercent > 0 ? 'text-orange-600' : 'text-gray-500'}`} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-medium text-sm truncate">{course.title}</h3>
                                  <span className={`flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    isCompleted ? 'bg-green-100 text-green-800' :
                                    progressPercent > 0 ? 'bg-orange-100 text-orange-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {isCompleted ? '수료' : progressPercent > 0 ? '진행중' : '시작 전'}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                                  {course.description}
                                </p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {course.duration}분
                                    </span>
                                    <span>{progressPercent}% 완료</span>
                                  </div>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                                {/* 진행률 바 */}
                                <Progress value={progressPercent} className="h-1.5 mt-2" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center">
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

      </main>

      <BottomNavigation />
    </div>
  );
}
