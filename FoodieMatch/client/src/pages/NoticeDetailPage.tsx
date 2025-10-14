import { Header } from "@/components/header";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Notice } from "@shared/schema";
import { Link, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NoticeDetailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [match, params] = useRoute("/notices/:id");
  const noticeId = params?.id;

  const { data: notice, isLoading, error } = useQuery<Notice>({
    queryKey: [`/api/notices/${noticeId}`],
    enabled: !!noticeId,
  });

  const handleDelete = async () => {
    if (!noticeId || !window.confirm("정말로 이 공지사항을 삭제하시겠습니까?")) {
      return;
    }
    try {
      const response = await fetch(`/api/notices/${noticeId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('삭제에 실패했습니다.');
      }
      queryClient.invalidateQueries({ queryKey: ['/api/notices'] });
      window.location.href = '/';
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Button asChild variant="outline" className="text-base h-11 min-w-[120px]">
            <Link href="/">
              <ArrowLeft className="w-5 h-5 mr-2" />
              목록으로
            </Link>
          </Button>
          {user?.role === 'admin' && notice && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button asChild variant="secondary" className="text-base h-11 flex-1 sm:flex-none min-w-[80px]">
                <Link href={`/notices/edit/${notice.id}`}>수정</Link>
              </Button>
              <Button onClick={handleDelete} variant="destructive" className="text-base h-11 flex-1 sm:flex-none min-w-[80px]">
                삭제
              </Button>
            </div>
          )}
        </div>
        {isLoading && <p className="text-lg">공지사항을 불러오는 중...</p>}
        {error && <p className="text-destructive text-lg">오류: {error.message}</p>}
        {notice && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl md:text-4xl leading-tight">{notice.title}</CardTitle>
              <div className="text-base md:text-lg text-muted-foreground pt-3 flex flex-wrap gap-2">
                <span>작성일: {new Date(notice.createdAt).toLocaleString()}</span>
                <span className="hidden sm:inline">|</span>
                <span>조회수: {notice.viewCount}</span>
              </div>
            </CardHeader>
            <CardContent className="mt-6">
              {notice.imageUrl && <img src={notice.imageUrl} alt={notice.title} className="max-w-full rounded-md mb-6" />}
              <div className="text-lg md:text-xl leading-relaxed whitespace-pre-wrap">{notice.content}</div>
              {notice.attachmentUrl && (
                <div className="mt-8">
                  <Button asChild variant="outline" className="text-base h-12 w-full sm:w-auto min-w-[200px]">
                    <a href={notice.attachmentUrl} download={notice.attachmentName || true}>
                      📎 첨부파일 다운로드: {notice.attachmentName}
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
