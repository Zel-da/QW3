import { Header } from "@/components/header";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Notice } from "@shared/schema";
import { Link, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

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
        <div className="mb-4 flex justify-between items-center">
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로
            </Link>
          </Button>
          {user?.role === 'admin' && notice && (
            <div className="flex gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/notices/edit/${notice.id}`}>수정</Link>
              </Button>
              <Button onClick={handleDelete} variant="destructive" size="sm">
                삭제
              </Button>
            </div>
          )}
        </div>
        {isLoading && <p>공지사항을 불러오는 중...</p>}
        {error && <p className="text-destructive">오류: {error.message}</p>}
        {notice && (
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{notice.title}</CardTitle>
              <div className="text-sm text-muted-foreground pt-2">
                <span>작성일: {new Date(notice.createdAt).toLocaleString()}</span>
                <span className="mx-2">|</span>
                <span>조회수: {notice.viewCount}</span>
              </div>
            </CardHeader>
            <CardContent className="prose max-w-none mt-6">
              {notice.imageUrl && <img src={notice.imageUrl} alt={notice.title} className="max-w-full rounded-md mb-4" />}
              <p>{notice.content}</p>
              {notice.attachmentUrl && (
                <div className="mt-6">
                  <Button asChild variant="outline">
                    <a href={notice.attachmentUrl} download={notice.attachmentName || true}>
                      첨부파일 다운로드: {notice.attachmentName}
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
