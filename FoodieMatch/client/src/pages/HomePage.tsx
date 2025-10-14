import { Header } from "@/components/header";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Notice } from "@shared/schema";
import { Link } from "wouter";

export default function HomePage() {
  const { user } = useAuth();
  const { data: notices = [], isLoading } = useQuery<Notice[]>({
    queryKey: ["/api/notices"],
  });

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold">메인 홈페이지</h1>
          <p className="mt-4 text-lg text-muted-foreground">안전관리 통합 플랫폼에 오신 것을 환영합니다.</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>공지사항</CardTitle>
            {user?.role === 'admin' && (
              <Button asChild>
                <Link href="/notices/new">새 공지사항 작성</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>공지사항을 불러오는 중...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">번호</TableHead>
                    <TableHead>제목</TableHead>
                    <TableHead className="w-[150px]">작성일</TableHead>
                    <TableHead className="w-[100px]">조회수</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notices.map((notice, index) => (
                    <TableRow key={notice.id}>
                      <TableCell>{notices.length - index}</TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/notices/${notice.id}`} className="hover:underline">
                          {notice.title}
                        </Link>
                      </TableCell>
                      <TableCell>{new Date(notice.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{notice.viewCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
