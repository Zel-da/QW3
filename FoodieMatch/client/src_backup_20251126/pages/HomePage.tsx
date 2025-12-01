import { Header } from "@/components/header";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Notice } from "@shared/schema";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { FileText, BookOpen, BarChart3, ClipboardCheck, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function HomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

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
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
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
                      <AnimatePresence mode="popLayout">
                        {notices.map((notice, index) => (
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
                    {notices.map((notice, index) => (
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
                                  <div className="flex items-center gap-2 mb-1">
                                    {!notice.isRead && (
                                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                    )}
                                    <span className="text-sm text-muted-foreground">#{notices.length - index}</span>
                                  </div>
                                  <h3 className={cn(
                                    "text-lg leading-tight mb-2",
                                    !notice.isRead ? "font-bold" : "font-semibold"
                                  )}>{notice.title}</h3>
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
