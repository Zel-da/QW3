import { Header } from "@/components/header";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Notice } from "@shared/schema";
import { Link } from "wouter";
import { useState, useEffect } from "react";

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
  });

  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const latestNotice = notices[0];

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
              <CardTitle className="text-2xl md:text-3xl">공지사항</CardTitle>
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

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold">메인 홈페이지</h1>
          <p className="mt-4 text-xl md:text-2xl text-muted-foreground">안전관리 통합 플랫폼에 오신 것을 환영합니다.</p>
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
            {user?.role === 'admin' && (
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
