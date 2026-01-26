import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Notice } from "@shared/schema";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { FileText, BookOpen, BarChart3, ClipboardCheck, Search, Plus, ChevronRight, ImageIcon, X, ChevronLeft as ChevronLeftIcon, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ImageViewer, ImageInfo } from "@/components/ImageViewer";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: notices = [], isLoading, isError: noticesError, refetch: refetchNotices } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // 팝업 이미지 상태
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupImages, setPopupImages] = useState<ImageInfo[]>([]);
  const [popupInitialIndex, setPopupInitialIndex] = useState(0);

  // 공지사항에서 이미지 목록 가져오기
  const getNoticeImages = (notice: Notice): ImageInfo[] => {
    const images: ImageInfo[] = [];
    if (notice.imageUrl) {
      images.push({ url: notice.imageUrl, rotation: 0 });
    }
    if ((notice as any)?.attachments) {
      (notice as any).attachments
        .filter((a: any) => a.type === 'image')
        .forEach((a: any) => images.push({ url: a.url, rotation: a.rotation || 0 }));
    }
    return images;
  };

  // 팝업 열기
  const openImagePopup = (notice: Notice, initialIndex: number = 0) => {
    const images = getNoticeImages(notice);
    if (images.length > 0) {
      setPopupImages(images);
      setPopupInitialIndex(initialIndex);
      setPopupOpen(true);
    }
  };

  // 사용 가능한 카테고리 목록 추출
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(notices.map(n => n.category))).filter(Boolean);
    return uniqueCategories.sort();
  }, [notices]);

  // 검색어와 카테고리로 공지사항 필터링
  const filteredNotices = useMemo(() => {
    return notices.filter(notice => {
      const matchesSearch =
        notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notice.content.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'ALL' || notice.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [notices, searchTerm, categoryFilter]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div>
        <Header />
        <main className="container mx-auto p-4 lg:p-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">안전관리 통합 플랫폼</h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">안전교육과 TBM 일지를 통합 관리하는 플랫폼입니다.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg h-14 min-w-[120px]">
                <Link href="/login">로그인</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg h-14 min-w-[120px]">
                <Link href="/register">회원가입</Link>
              </Button>
            </div>
          </div>

          {/* 4개 메뉴 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card
              className="hover:shadow-lg transition-shadow cursor-pointer h-full"
              onClick={() => window.location.href = '/notices'}
            >
              <CardContent className="p-6 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                <CardTitle className="text-xl mb-2">공지사항</CardTitle>
                <CardDescription>최신 공지사항을 확인하세요</CardDescription>
              </CardContent>
            </Card>
            <Link href="/tbm">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-orange-600" />
                  <CardTitle className="text-xl mb-2">TBM</CardTitle>
                  <CardDescription>TBM 일지 작성 및 조회</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link href="/courses">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <CardTitle className="text-xl mb-2">안전교육</CardTitle>
                  <CardDescription>필수 안전교육을 수강하세요</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link href="/safety-inspection">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 text-center">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                  <CardTitle className="text-xl mb-2">안전점검</CardTitle>
                  <CardDescription>매월 4일 안전점검 기록</CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>

          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl mb-4">공지사항</CardTitle>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="제목 또는 내용으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {categories.length > 0 && (
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">전체 카테고리</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-lg">공지사항을 불러오는 중...</p>
              ) : filteredNotices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-lg">
                  {searchTerm ? '검색 결과가 없습니다.' : '공지사항이 없습니다.'}
                </p>
              ) : (
                <>
                  {/* 데스크톱 테이블 뷰 */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px] text-base">번호</TableHead>
                          <TableHead className="w-[100px] text-base">카테고리</TableHead>
                          <TableHead className="text-base">제목</TableHead>
                          <TableHead className="w-[120px] text-base">작성자</TableHead>
                          <TableHead className="w-[130px] text-base">작성일</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence mode="popLayout">
                          {filteredNotices.map((notice, index) => (
                            <motion.tr
                              key={notice.id}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                              className="border-b transition-colors hover:bg-muted/50"
                            >
                              <TableCell className="text-base">{filteredNotices.length - index}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {notice.category || '일반'}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium text-base">
                                <Link href={`/notices/${notice.id}`} className="hover:underline">
                                  {notice.title}
                                </Link>
                              </TableCell>
                              <TableCell className="text-base">{notice.author?.name || notice.author?.username || '관리자'}</TableCell>
                              <TableCell className="text-base">{new Date(notice.createdAt).toLocaleDateString()}</TableCell>
                            </motion.tr>
                          ))}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* 모바일 카드 뷰 */}
                  <div className="md:hidden space-y-3">
                    <AnimatePresence mode="popLayout">
                      {filteredNotices.map((notice, index) => (
                        <motion.div
                          key={notice.id}
                          layout
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Link href={`/notices/${notice.id}`}>
                            <Card className="hover:bg-accent transition-colors cursor-pointer">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-sm text-muted-foreground">#{filteredNotices.length - index}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {notice.category || '일반'}
                                      </Badge>
                                    </div>
                                    <h3 className="text-lg font-semibold leading-tight mb-2">{notice.title}</h3>
                                    <div className="text-sm text-muted-foreground">
                                      {new Date(notice.createdAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      <main className="container mx-auto px-4 py-4 md:p-6">
        {/* 모바일 헤더 */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h1 className="text-xl md:text-3xl font-bold">공지사항</h1>
          {user?.role === 'ADMIN' && (
            <>
              {/* 모바일 FAB */}
              <Link href="/notices/new" className="md:hidden fixed bottom-24 right-4 z-40 bg-primary text-primary-foreground rounded-full w-14 h-14 flex items-center justify-center shadow-lg active:scale-95 transition-transform">
                <Plus className="h-6 w-6" />
              </Link>
              {/* 데스크톱 버튼 */}
              <Button asChild className="hidden md:flex text-base h-12 min-w-[140px]">
                <Link href="/notices/new">새 공지사항 작성</Link>
              </Button>
            </>
          )}
        </div>

        {noticesError ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">공지사항을 불러올 수 없습니다</h2>
            <p className="text-muted-foreground mb-4">네트워크 연결을 확인하고 다시 시도해주세요.</p>
            <Button onClick={() => refetchNotices()} variant="outline">다시 시도</Button>
          </div>
        ) : isLoading ? (
          <p className="text-lg">공지사항을 불러오는 중...</p>
        ) : notices.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground text-lg">공지사항이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 데스크톱 테이블 뷰 */}
            <Card className="hidden md:block">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px] text-base">번호</TableHead>
                      <TableHead className="text-base">제목</TableHead>
                      <TableHead className="w-[80px] text-base">이미지</TableHead>
                      <TableHead className="w-[120px] text-base">작성자</TableHead>
                      <TableHead className="w-[150px] text-base">작성일</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {notices.map((notice, index) => {
                        const noticeImages = getNoticeImages(notice);
                        const hasImages = noticeImages.length > 0;

                        return (
                          <motion.tr
                            key={notice.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="border-b transition-colors hover:bg-muted/50"
                          >
                            <TableCell className="text-base">{notices.length - index}</TableCell>
                            <TableCell className={cn(
                              "text-base",
                              !notice.isRead && "font-bold"
                            )}>
                              <Link href={`/notices/${notice.id}`} className="hover:underline flex items-center gap-2">
                                {!notice.isRead && (
                                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                )}
                                {notice.title}
                              </Link>
                            </TableCell>
                            <TableCell>
                              {hasImages && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openImagePopup(notice, 0)}
                                >
                                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-base">{notice.author?.name || notice.author?.username || '관리자'}</TableCell>
                            <TableCell className="text-base">{new Date(notice.createdAt).toLocaleDateString()}</TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* 모바일 리스트 뷰 - 커뮤니티 스타일 */}
            <div className="md:hidden space-y-0 divide-y bg-card rounded-lg border overflow-hidden">
              <AnimatePresence mode="popLayout">
                {notices.map((notice, index) => {
                  const noticeImages = getNoticeImages(notice);
                  const hasImages = noticeImages.length > 0;

                  return (
                    <motion.div
                      key={notice.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-center p-4 hover:bg-muted/50 active:bg-muted transition-colors">
                        <Link href={`/notices/${notice.id}`} className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {!notice.isRead && (
                              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                            {notice.category && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {notice.category}
                              </Badge>
                            )}
                          </div>
                          <h3 className={cn(
                            "text-sm leading-tight mb-1.5 truncate",
                            !notice.isRead ? "font-bold" : "font-medium"
                          )}>{notice.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{notice.author?.name || '관리자'}</span>
                            <span>•</span>
                            <span>{new Date(notice.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </Link>
                        <div className="flex items-center gap-1 ml-2">
                          {hasImages && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openImagePopup(notice, 0);
                              }}
                            >
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>

      <BottomNavigation />

      {/* 이미지 팝업 뷰어 */}
      <ImageViewer
        images={popupImages}
        initialIndex={popupInitialIndex}
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        readOnly={true}
      />
    </div>
  );
}
