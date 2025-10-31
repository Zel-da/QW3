import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { Header } from "@/components/header";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, X } from "lucide-react";
import type { Notice, Comment as CommentType } from "@shared/schema";
import { sanitizeText } from "@/lib/sanitize";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

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

const postComment = async ({ noticeId, content, imageUrl, attachments }: { noticeId: string; content: string; imageUrl: string | null; attachments?: any[] }) => {
  const res = await fetch(`/api/notices/${noticeId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, imageUrl, attachments }),
  });
  if (!res.ok) throw new Error('Failed to post comment');
  return res.json();
}

export default function NoticeDetailPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, params] = useRoute("/notices/:id");
  const noticeId = params?.id;

  const [newComment, setNewComment] = useState('');
  const [commentImage, setCommentImage] = useState<File | null>(null);
  const [commentAttachments, setCommentAttachments] = useState<Array<{url: string, name: string, type: string, size: number}>>([]);

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
      setCommentAttachments([]);
    }
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'attachment') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const uploadFormData = new FormData();
    files.forEach(file => uploadFormData.append('files', file));

    try {
      const response = await fetch('/api/upload-multiple', { method: 'POST', body: uploadFormData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'File upload failed');

      const newFiles = data.files.map((f: any) => ({
        url: f.url,
        name: f.name,
        size: f.size,
        type: fileType
      }));

      setCommentAttachments(prev => [...prev, ...newFiles]);
    } catch (err) {
      toast({ title: '오류', description: (err as Error).message, variant: 'destructive' });
    }
  };

  const removeAttachment = (index: number) => {
    setCommentAttachments(prev => prev.filter((_, i) => i !== index));
  };

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

    commentMutation.mutate({ noticeId, content: newComment, imageUrl, attachments: commentAttachments } as any);
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
      toast({ title: '성공', description: '공지사항이 삭제되었습니다.' });
      await queryClient.invalidateQueries({ queryKey: ['notices'] });
      window.location.href = '/';
    } catch (err) {
      toast({ title: '오류', description: (err as Error).message, variant: 'destructive' });
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
              <CardTitle className="text-4xl md:text-5xl leading-tight font-bold">{sanitizeText(notice.title)}</CardTitle>
              <div className="text-lg md:text-xl text-muted-foreground pt-4 flex flex-wrap gap-x-6 gap-y-2">
                <span>작성자: {sanitizeText(notice.author.name || notice.author.username)}</span>
                <span>작성일: {new Date(notice.createdAt).toLocaleDateString()}</span>
                <span>조회수: {notice.viewCount}</span>
              </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-0">
              {notice.imageUrl && (
                <Dialog>
                  <DialogTrigger asChild>
                    <img
                      src={notice.imageUrl}
                      alt={sanitizeText(notice.title)}
                      className="w-full h-auto object-cover rounded-md mb-8 border cursor-pointer hover:opacity-90 transition-opacity"
                    />
                  </DialogTrigger>
                  <DialogContent className="max-w-7xl w-full">
                    <img src={notice.imageUrl} alt={sanitizeText(notice.title)} className="w-full h-auto" />
                  </DialogContent>
                </Dialog>
              )}
              <div className="prose prose-2xl max-w-none leading-relaxed whitespace-pre-wrap">{sanitizeText(notice.content)}</div>

              {/* Video Display */}
              {notice.videoUrl && (
                <div className="mt-8 p-4 border rounded-lg">
                  <h3 className="text-2xl font-semibold mb-4">동영상</h3>
                  {notice.videoType === 'youtube' ? (
                    <div className="aspect-video">
                      <iframe
                        src={notice.videoUrl.replace('watch?v=', 'embed/')}
                        className="w-full h-full rounded"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video src={notice.videoUrl} controls className="w-full rounded max-h-[600px]" />
                  )}
                </div>
              )}

              {/* Display new multi-file attachments */}
              {(notice as any).attachments && (notice as any).attachments.length > 0 && (
                <div className="mt-10 border-t pt-8">
                  <h3 className="text-2xl font-semibold mb-4">첨부 파일</h3>

                  {/* Display images */}
                  {(notice as any).attachments.filter((a: any) => a.type === 'image').length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-xl font-medium mb-3">이미지</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(notice as any).attachments.filter((a: any) => a.type === 'image').map((file: any, idx: number) => (
                          <Dialog key={idx}>
                            <DialogTrigger asChild>
                              <div className="border rounded-lg p-2 cursor-pointer hover:shadow-lg transition-shadow">
                                <img src={file.url} alt={file.name} className="w-full h-48 object-cover rounded" />
                                <p className="text-sm truncate mt-2">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-7xl w-full">
                              <img src={file.url} alt={file.name} className="w-full h-auto" />
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Display file attachments */}
                  {(notice as any).attachments.filter((a: any) => a.type === 'attachment').length > 0 && (
                    <div>
                      <h4 className="text-xl font-medium mb-3">파일</h4>
                      <div className="space-y-3">
                        {(notice as any).attachments.filter((a: any) => a.type === 'attachment').map((file: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <span className="text-3xl">📎</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-lg font-medium truncate">{file.name}</p>
                                <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <Button asChild variant="outline" className="text-lg h-12 ml-4">
                              <a href={file.url} download={file.name}>
                                다운로드
                              </a>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Legacy single file support */}
              {notice.attachmentUrl && !(notice as any).attachments?.length && (
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
                    <p className="font-semibold">{sanitizeText(comment.author.name || '')}</p>
                    <p className="whitespace-pre-wrap">{sanitizeText(comment.content)}</p>
                    {comment.imageUrl && <img src={comment.imageUrl} alt="comment image" className="mt-2 w-full max-w-xs rounded-md border" />}

                    {/* Display multi-file attachments */}
                    {(comment as any).attachments && (comment as any).attachments.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {/* Images */}
                        {(comment as any).attachments.filter((a: any) => a.type === 'image').length > 0 && (
                          <div className="grid grid-cols-2 gap-2">
                            {(comment as any).attachments.filter((a: any) => a.type === 'image').map((file: any, idx: number) => (
                              <div key={idx} className="border rounded-lg p-2">
                                <img src={file.url} alt={file.name} className="w-full h-32 object-cover rounded" />
                                <p className="text-xs truncate mt-1">{file.name}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Files */}
                        {(comment as any).attachments.filter((a: any) => a.type === 'attachment').length > 0 && (
                          <div className="space-y-2">
                            {(comment as any).attachments.filter((a: any) => a.type === 'attachment').map((file: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 p-2 border rounded-lg">
                                <span className="text-lg">📎</span>
                                <a href={file.url} download={file.name} className="text-sm hover:underline flex-1 truncate">
                                  {file.name}
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>

            {user && (
              <form onSubmit={handleCommentSubmit} className="mt-6 pt-6 border-t">
                <div className="space-y-4">
                  <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="댓글을 입력하세요..." required />

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">이미지</label>
                      <Input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFileChange(e, 'image')}
                      />
                    </div>

                    {/* Display uploaded images */}
                    {commentAttachments.filter(f => f.type === 'image').length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {commentAttachments.filter(f => f.type === 'image').map((file, idx) => (
                          <div key={idx} className="relative border rounded-lg p-2">
                            <img src={file.url} alt={file.name} className="w-full h-24 object-cover rounded" />
                            <p className="text-xs truncate mt-1">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0"
                              onClick={() => removeAttachment(commentAttachments.indexOf(file))}
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">파일</label>
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => handleFileChange(e, 'attachment')}
                      />
                    </div>

                    {/* Display uploaded files */}
                    {commentAttachments.filter(f => f.type === 'attachment').length > 0 && (
                      <div className="space-y-2">
                        {commentAttachments.filter(f => f.type === 'attachment').map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 border rounded-lg">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-xl">📎</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeAttachment(commentAttachments.indexOf(file))}
                            >
                              삭제
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button type="submit" disabled={commentMutation.isPending}>댓글 작성</Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}