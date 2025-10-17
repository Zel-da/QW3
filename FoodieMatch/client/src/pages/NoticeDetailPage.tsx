import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { Header } from "@/components/header";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import type { Notice, Comment as CommentType } from "@shared/schema";

const fetchNotice = async (noticeId: string) => {
  const res = await fetch(`/api/notices/${noticeId}`);
  if (!res.ok) throw new Error('Failed to fetch notice');
  return res.json();
}

const fetchComments = async (noticeId: string) => {
  const res = await fetch(`/api/notices/${noticeId}/comments`);
  if (!res.ok) throw new Error('Failed to fetch comments');
  return res.json();
}

const postComment = async ({ noticeId, content, imageUrl }: { noticeId: string; content: string; imageUrl: string | null }) => {
  const res = await fetch(`/api/notices/${noticeId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, imageUrl }),
  });
  if (!res.ok) throw new Error('Failed to post comment');
  return res.json();
}

export default function NoticeDetailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, params] = useRoute("/notices/:id");
  const noticeId = params?.id;

  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState<File | null>(null);

  const { data: notice, isLoading, error } = useQuery<Notice>({
    queryKey: ['notice', noticeId],
    queryFn: () => fetchNotice(noticeId!),
    enabled: !!noticeId,
  });

  const { data: comments = [] } = useQuery<CommentType[]>({ // Use CommentType to avoid conflict
    queryKey: ['comments', noticeId],
    queryFn: () => fetchComments(noticeId!),
    enabled: !!noticeId,
  });

  const commentMutation = useMutation({
    mutationFn: postComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', noticeId] });
      setNewComment('');
      setCommentImage(null);
    }
  });

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment || !noticeId) return;

    let imageUrl: string | null = null;
    if (commentImage) {
      const formData = new FormData();
      formData.append('file', commentImage);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      imageUrl = uploadData.url;
    }

    commentMutation.mutate({ noticeId, content: newComment, imageUrl });
  };

  const handleDelete = async () => {
    if (!noticeId || !window.confirm("정말로 이 공지사항을 삭제하시겠습니까?")) {
      return;
    }
    try {
      const response = await fetch(`/api/notices/${noticeId}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('삭제에 실패했습니다.');
      }
      await queryClient.invalidateQueries({ queryKey: ['notices'] });
      window.location.href = '/';
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <Button asChild variant="outline" className="text-base h-12 min-w-[120px]">
            <Link href="/">
              <ArrowLeft className="w-5 h-5 mr-2" />
              목록으로
            </Link>
          </Button>
          {user?.role === 'ADMIN' && notice && (
            <div className="flex gap-2 w-full sm:w-auto">
              <Button asChild variant="secondary" className="text-base h-12 flex-1 sm:flex-none min-w-[80px]">
                <Link href={`/notices/edit/${notice.id}`}>수정</Link>
              </Button>
              <Button onClick={handleDelete} variant="destructive" className="text-base h-12 flex-1 sm:flex-none min-w-[80px]">
                삭제
              </Button>
            </div>
          )}
        </div>
        {isLoading && <p className="text-center text-lg">공지사항을 불러오는 중...</p>}
        {error && <p className="text-center text-destructive text-lg">오류: {error.message}</p>}
        {notice && (
          <Card className="shadow-lg">
            <CardHeader className="p-6 md:p-8">
              <CardTitle className="text-4xl md:text-5xl leading-tight font-bold">{notice.title}</CardTitle>
              <div className="text-lg md:text-xl text-muted-foreground pt-4 flex flex-wrap gap-x-6 gap-y-2">
                <span>작성일: {new Date(notice.createdAt).toLocaleDateString()}</span>
                <span>조회수: {notice.viewCount}</span>
              </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-0">
              {notice.imageUrl && <img src={notice.imageUrl} alt={notice.title} className="w-full h-auto object-cover rounded-md mb-8 border" />}
              <div className="prose prose-2xl max-w-none leading-relaxed whitespace-pre-wrap">{notice.content}</div>
              {notice.attachmentUrl && (
                <div className="mt-10 border-t pt-8">
                  <Button asChild variant="outline" className="text-xl h-16 w-full sm:w-auto min-w-[250px]">
                    <a href={notice.attachmentUrl} download={notice.attachmentName || true}>
                      📎 첨부파일: {notice.attachmentName}
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>댓글</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {comments.map(comment => (
                <div key={comment.id} className="flex items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold">{comment.author.name}</p>
                    <p className="whitespace-pre-wrap">{comment.content}</p>
                    {comment.imageUrl && <img src={comment.imageUrl} alt="comment image" className="mt-2 w-full max-w-xs rounded-md border" />}
                    <p className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {user && (
              <form onSubmit={handleCommentSubmit} className="mt-6 pt-6 border-t">
                <div className="space-y-4">
                  <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="댓글을 입력하세요..." required />
                  <Input type="file" accept="image/*" onChange={(e) => setCommentImage(e.target.files ? e.target.files[0] : null)} />
                  <Button type="submit" disabled={commentMutation.isLoading}>댓글 작성</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}