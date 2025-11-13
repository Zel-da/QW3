import { Header } from "@/components/header";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Notice } from "@shared/schema";
import { Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { FileText, BookOpen, BarChart3, ClipboardCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// YouTube URL을 embed URL로 변환
function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';

  // 이미 embed URL인 경우
  if (url.includes('/embed/')) return url;

  // 다양한 YouTube URL 형식 처리
  let videoId = '';

  // https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }

  // https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }

  // https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/\/embed\/([^?]+)/);
  if (embedMatch) {
    videoId = embedMatch[1];
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
  });

  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const latestNotice = notices[0];

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

  useEffect(() => {
    if (!latestNotice) return;

    const popupKey = `notice-popup-${latestNotice.id}`;
    const hideUntil = localStorage.getItem(popupKey);

    if (hideUntil) {
      const hideDate = new Date(hideUntil);
      if (hideDate > new Date()) {
        return;
      }
    }

    setShowNoticePopup(true);
  }, [latestNotice]);

  const handleClosePopup = (hideForToday = false) => {
    if (hideForToday && latestNotice) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      localStorage.setItem(`notice-popup-${latestNotice.id}`, tomorrow.toISOString());
    }
    setShowNoticePopup(false);
  };

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
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">안전교육과 TBM 체크리스트를 통합 관리하는 플랫폼입니다.</p>
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
            <Link href="/courses">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 text-green-600" />
                  <CardTitle className="text-xl mb-2">안전교육</CardTitle>
                  <CardDescription>필수 안전교육을 수강하세요</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link href="/monthly-report">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 text-orange-600" />
                  <CardTitle className="text-xl mb-2">월별 보고서</CardTitle>
                  <CardDescription>TBM 월별 보고서 조회</CardDescription>
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

          {/* 공지사항 팝업 */}
          {latestNotice && (
            <Dialog open={showNoticePopup} onOpenChange={(open) => !open && handleClosePopup()}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl md:text-3xl leading-tight pr-8">{latestNotice.title}</DialogTitle>
                  <DialogDescription className="text-base md:text-lg pt-2">
                    {new Date(latestNotice.createdAt).toLocaleDateString()}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {latestNotice.imageUrl && (
                    <img src={latestNotice.imageUrl} alt={latestNotice.title} className="w-full rounded-md mb-4" />
                  )}
                  <div className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                    {latestNotice.content}
                  </div>
                  {latestNotice.videoUrl && (
                    <div className="mt-6">
                      {latestNotice.videoType === 'youtube' ? (
                        <div className="aspect-video">
                          <iframe
                            src={getYouTubeEmbedUrl(latestNotice.videoUrl)}
                            className="w-full h-full rounded"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          />
                        </div>
                      ) : (
                        <video src={latestNotice.videoUrl} controls className="w-full rounded max-h-[600px]" />
                      )}
                    </div>
                  )}
                  {latestNotice.attachmentUrl && (
                    <div className="mt-4">
                      <Button asChild variant="outline" className="text-base">
                        <a href={latestNotice.attachmentUrl} download={latestNotice.attachmentName || true}>
                          📎 첨부파일 다운로드: {latestNotice.attachmentName}
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => handleClosePopup(true)} className="text-base h-11 w-full sm:w-auto">
                    오늘 하루 보지 않기
                  </Button>
                  <Button asChild className="text-base h-11 w-full sm:w-auto">
                    <Link href={`/notices/${latestNotice.id}`} onClick={() => setShowNoticePopup(false)}>
                      자세히 보기
                    </Link>
                  </Button>
                  <Button onClick={() => handleClosePopup()} className="text-base h-11 w-full sm:w-auto">
                    닫기
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

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
                        {filteredNotices.map((notice, index) => (
                          <TableRow key={notice.id}>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  {/* 모바일 카드 뷰 */}
                  <div className="md:hidden space-y-3">
                    {filteredNotices.map((notice, index) => (
                      <Link key={notice.id} href={`/notices/${notice.id}`}>
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
                    ))}
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
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        {/* 공지사항 팝업 */}
        {latestNotice && (
          <Dialog open={showNoticePopup} onOpenChange={(open) => !open && handleClosePopup()}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl md:text-3xl leading-tight pr-8">{latestNotice.title}</DialogTitle>
                <DialogDescription className="text-base md:text-lg pt-2">
                  {new Date(latestNotice.createdAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {latestNotice.imageUrl && (
                  <img src={latestNotice.imageUrl} alt={latestNotice.title} className="w-full rounded-md mb-4" />
                )}
                <div className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                  {latestNotice.content}
                </div>
                {latestNotice.videoUrl && (
                  <div className="mt-6">
                    {latestNotice.videoType === 'youtube' ? (
                      <div className="aspect-video">
                        <iframe
                          src={getYouTubeEmbedUrl(latestNotice.videoUrl)}
                          className="w-full h-full rounded"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      </div>
                    ) : (
                      <video src={latestNotice.videoUrl} controls className="w-full rounded max-h-[600px]" />
                    )}
                  </div>
                )}
                {latestNotice.attachmentUrl && (
                  <div className="mt-4">
                    <Button asChild variant="outline" className="text-base">
                      <a href={latestNotice.attachmentUrl} download={latestNotice.attachmentName || true}>
                        📎 첨부파일 다운로드: {latestNotice.attachmentName}
                      </a>
                    </Button>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => handleClosePopup(true)} className="text-base h-11 w-full sm:w-auto">
                  오늘 하루 보지 않기
                </Button>
                <Button asChild className="text-base h-11 w-full sm:w-auto">
                  <Link href={`/notices/${latestNotice.id}`} onClick={() => setShowNoticePopup(false)}>
                    자세히 보기
                  </Link>
                </Button>
                <Button onClick={() => handleClosePopup()} className="text-base h-11 w-full sm:w-auto">
                  닫기
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <CardTitle className="text-2xl md:text-3xl">공지사항</CardTitle>
            {user?.role === 'ADMIN' && (
              <Button asChild className="text-base h-12 min-w-[140px]">
                <Link href="/notices/new">새 공지사항 작성</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-lg">공지사항을 불러오는 중...</p>
            ) : notices.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-lg">공지사항이 없습니다.</p>
            ) : (
              <>
                {/* 데스크톱 테이블 뷰 */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px] text-base">번호</TableHead>
                        <TableHead className="text-base">제목</TableHead>
                        <TableHead className="w-[120px] text-base">작성자</TableHead>
                        <TableHead className="w-[150px] text-base">작성일</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notices.map((notice, index) => (
                        <TableRow key={notice.id}>
                          <TableCell className="text-base">{notices.length - index}</TableCell>
                          <TableCell className="font-medium text-base">
                            <Link href={`/notices/${notice.id}`} className="hover:underline">
                              {notice.title}
                            </Link>
                          </TableCell>
                          <TableCell className="text-base">{notice.author?.name || notice.author?.username || '관리자'}</TableCell>
                          <TableCell className="text-base">{new Date(notice.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* 모바일 카드 뷰 */}
                <div className="md:hidden space-y-3">
                  {notices.map((notice, index) => (
                    <Link key={notice.id} href={`/notices/${notice.id}`}>
                      <Card className="hover:bg-accent transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="text-sm text-muted-foreground mb-1">#{notices.length - index}</div>
                              <h3 className="text-lg font-semibold leading-tight mb-2">{notice.title}</h3>
                              <div className="text-sm text-muted-foreground">
                                {new Date(notice.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
