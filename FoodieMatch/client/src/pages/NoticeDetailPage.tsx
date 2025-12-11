import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useRoute } from 'wouter';
import { Header } from "@/components/header";
import { useAuth } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, X, ChevronLeft, ChevronRight, ZoomIn, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ImageViewer, ImageInfo } from "@/components/ImageViewer";
import type { Notice, Comment as CommentType } from "@shared/schema";
import { sanitizeText } from "@/lib/sanitize";
import { useToast } from "@/hooks/use-toast";
import { useAutoSave } from "@/hooks/useAutoSave";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FileDropzone } from "@/components/FileDropzone";
import { NoticeDetailSkeleton } from "@/components/skeletons/NoticeListSkeleton";
import { apiRequest } from "@/lib/queryClient";

// YouTube URL을 embed URL로 변환 (youtube-nocookie.com 사용)
function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';

  let videoId = '';

  // 이미 embed URL인 경우 videoId 추출
  if (url.includes('/embed/')) {
    const embedMatch = url.match(/\/embed\/([^?&#]+)/);
    if (embedMatch) videoId = embedMatch[1];
  }

  // https://www.youtube.com/watch?v=VIDEO_ID
  if (!videoId) {
    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) videoId = watchMatch[1];
  }

  // https://youtu.be/VIDEO_ID
  if (!videoId) {
    const shortMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortMatch) videoId = shortMatch[1];
  }

  return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : url;
}

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
  const res = await apiRequest('POST', `/api/notices/${noticeId}/comments`, { content, imageUrl, attachments });
  return res.json();
}

const updateComment = async ({ noticeId, commentId, content }: { noticeId: string; commentId: string; content: string }) => {
  const res = await apiRequest('PUT', `/api/notices/${noticeId}/comments/${commentId}`, { content });
  return res.json();
}

const deleteComment = async ({ noticeId, commentId }: { noticeId: string; commentId: string }) => {
  const res = await apiRequest('DELETE', `/api/notices/${noticeId}/comments/${commentId}`);
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

  // 댓글 수정 상태
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // 이미지 뷰어 상태
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<ImageInfo[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  // 댓글 작성 자동 임시저장
  const autoSaveKey = `comment_draft_${noticeId}`;
  const { clearSaved } = useAutoSave({
    key: autoSaveKey,
    data: { newComment, commentAttachments },
    enabled: !!noticeId,
    onRestore: (restored) => {
      if (restored.newComment) setNewComment(restored.newComment);
      if (restored.commentAttachments) setCommentAttachments(restored.commentAttachments);
    },
  });

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

  // 이미지 뷰어 열기
  const openImageViewer = (images: ImageInfo[], initialIndex: number) => {
    setViewerImages(images);
    setViewerInitialIndex(initialIndex);
    setViewerOpen(true);
  };

  // 공지사항 이미지 목록 가져오기
  const getNoticeImages = (): ImageInfo[] => {
    const images: ImageInfo[] = [];
    if (notice?.imageUrl) {
      images.push({ url: notice.imageUrl, rotation: 0 });
    }
    if ((notice as any)?.attachments) {
      (notice as any).attachments
        .filter((a: any) => a.type === 'image')
        .forEach((a: any) => images.push({ url: a.url, rotation: a.rotation || 0 }));
    }
    return images;
  };

  const commentMutation = useMutation({
    mutationFn: postComment,
    onMutate: async (newCommentData) => {
      // 진행 중인 refetch 취소
      await queryClient.cancelQueries({ queryKey: ['comments', noticeId] });

      // 이전 데이터 스냅샷
      const previousComments = queryClient.getQueryData<CommentType[]>(['comments', noticeId]);

      // 낙관적 업데이트: 임시 댓글 추가
      const optimisticComment: CommentType = {
        id: `temp-${Date.now()}`,
        content: newCommentData.content,
        createdAt: new Date(),
        author: user!,
        imageUrl: newCommentData.imageUrl,
        attachments: newCommentData.attachments || [],
        noticeId: noticeId!,
        authorId: user!.id,
      } as any;

      queryClient.setQueryData<CommentType[]>(
        ['comments', noticeId],
        (old) => [...(old || []), optimisticComment]
      );

      return { previousComments };
    },
    onError: (err, newComment, context) => {
      // 롤백
      if (context?.previousComments) {
        queryClient.setQueryData(['comments', noticeId], context.previousComments);
      }
      toast({
        title: '오류',
        description: '댓글 작성에 실패했습니다.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', noticeId] });
      setNewComment('');
      setCommentImage(null);
      setCommentAttachments([]);
      // 댓글 작성 성공 시 임시저장 데이터 삭제
      clearSaved();
    }
  });

  // 댓글 수정 mutation
  const updateCommentMutation = useMutation({
    mutationFn: updateComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', noticeId] });
      setEditingCommentId(null);
      setEditingContent('');
      toast({ title: '성공', description: '댓글이 수정되었습니다.' });
    },
    onError: (err: Error) => {
      toast({ title: '오류', description: err.message, variant: 'destructive' });
    }
  });

  // 댓글 삭제 mutation
  const deleteCommentMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', noticeId] });
      toast({ title: '성공', description: '댓글이 삭제되었습니다.' });
    },
    onError: (err: Error) => {
      toast({ title: '오류', description: err.message, variant: 'destructive' });
    }
  });

  // 댓글 수정 시작
  const handleStartEdit = (comment: CommentType) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  // 댓글 수정 취소
  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  // 댓글 수정 저장
  const handleSaveEdit = (commentId: string) => {
    if (!editingContent.trim() || !noticeId) return;
    updateCommentMutation.mutate({ noticeId, commentId, content: editingContent });
  };

  // 댓글 삭제
  const handleDeleteComment = (commentId: string) => {
    if (!noticeId) return;
    if (!window.confirm('정말 이 댓글을 삭제하시겠습니까?')) return;
    deleteCommentMutation.mutate({ noticeId, commentId });
  };

  // 공지사항 읽음 처리
  const markAsReadMutation = useMutation({
    mutationFn: async (noticeId: string) => {
      const res = await apiRequest('POST', `/api/notices/${noticeId}/mark-read`);
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onSuccess: () => {
      // 공지사항 목록과 대시보드 통계 업데이트
      queryClient.invalidateQueries({ queryKey: ['/api/notices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    }
  });

  // 공지사항 조회 시 자동으로 읽음 처리
  useEffect(() => {
    if (notice && user && noticeId && !notice.isRead) {
      markAsReadMutation.mutate(noticeId);
    }
  }, [notice, user, noticeId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'attachment') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const uploadFormData = new FormData();
    files.forEach(file => uploadFormData.append('files', file));

    try {
      const response = await fetch('/api/upload-multiple', { method: 'POST', body: uploadFormData, credentials: 'include' });
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

  const handleFilesSelected = async (files: File[], fileType: 'image' | 'attachment') => {
    if (files.length === 0) return;

    const uploadFormData = new FormData();
    files.forEach(file => uploadFormData.append('files', file));

    try {
      const response = await fetch('/api/upload-multiple', { method: 'POST', body: uploadFormData, credentials: 'include' });
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
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData, credentials: 'include' });
      const uploadData = await uploadRes.json();
      imageUrl = uploadData.url;
    }

    commentMutation.mutate({ noticeId, content: newComment, imageUrl, attachments: commentAttachments } as any);
  };

  const handleDelete = async () => {
    if (!noticeId) return;

    if (!window.confirm('정말 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/notices/${noticeId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('삭제에 실패했습니다.');

      toast({ title: '성공', description: '공지사항이 삭제되었습니다.' });
      await queryClient.invalidateQueries({ queryKey: ['notices'] });
      window.location.href = '/notices';
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
            <Link href="/notices">
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
        {isLoading && <NoticeDetailSkeleton />}
        {error && <p className="text-center text-destructive text-lg">오류: {error.message}</p>}
        {!isLoading && notice && (
          <Card className="shadow-lg">
            <CardHeader className="p-6 md:p-8">
              <CardTitle className="text-4xl md:text-5xl leading-tight font-bold">{sanitizeText(notice.title)}</CardTitle>
              <div className="text-lg md:text-xl text-muted-foreground pt-4 flex flex-wrap gap-x-6 gap-y-2">
                <span>작성자: {sanitizeText(notice.author?.name || notice.author?.username || '관리자')}</span>
                <span>작성일: {new Date(notice.createdAt).toLocaleDateString()}</span>
                <span>조회수: {notice.viewCount}</span>
              </div>
            </CardHeader>
            <CardContent className="p-6 md:p-8 pt-0">
              {/* 메인 이미지 섹션 */}
              {(() => {
                const noticeImages = getNoticeImages();
                return noticeImages.length > 0 && (
                  <>
                    {/* 메인 이미지 (첫 번째 이미지) */}
                    {notice.imageUrl && (
                      <div className="relative group mb-8">
                        <img
                          src={notice.imageUrl}
                          alt={sanitizeText(notice.title)}
                          className="w-full h-auto object-cover rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            openImageViewer(getNoticeImages(), 0);
                          }}
                        />
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="h-8 w-8 text-white drop-shadow-lg" />
                        </div>
                      </div>
                    )}

                    {/* 이미지 뷰어는 페이지 하단에서 렌더링 */}
                  </>
                );
              })()}
              <div className="prose prose-2xl max-w-none leading-relaxed whitespace-pre-wrap">{sanitizeText(notice.content)}</div>

              {/* Video Display */}
              {notice.videoUrl && (
                <div className="mt-8 p-4 border rounded-lg">
                  <h3 className="text-2xl font-semibold mb-4">동영상</h3>
                  {notice.videoType === 'youtube' ? (
                    <div className="aspect-video">
                      <iframe
                        src={getYouTubeEmbedUrl(notice.videoUrl)}
                        className="w-full h-full rounded"
                        title="YouTube video"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
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

                  {/* Display images - 클릭 시 갤러리로 열기 */}
                  {(notice as any).attachments.filter((a: any) => a.type === 'image').length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-xl font-medium mb-3">이미지</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(notice as any).attachments.filter((a: any) => a.type === 'image').map((file: any, idx: number) => {
                          // 갤러리 인덱스 계산 (메인 이미지가 있으면 +1)
                          const galleryIndex = notice.imageUrl ? idx + 1 : idx;
                          return (
                            <div
                              key={idx}
                              className="border rounded-lg p-2 cursor-pointer hover:shadow-lg transition-shadow group relative"
                              onClick={() => {
                                openImageViewer(getNoticeImages(), galleryIndex);
                              }}
                            >
                              <img src={file.url} alt={file.name} className="w-full h-48 object-cover rounded" />
                              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomIn className="h-6 w-6 text-white drop-shadow-lg" />
                              </div>
                              <p className="text-sm truncate mt-2">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Display file attachments */}
                  {(notice as any).attachments.filter((a: any) => a.type === 'attachment').length > 0 && (
                    <div className="mb-6">
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

                  {/* Display videos */}
                  {(notice as any).attachments.filter((a: any) => a.type === 'video').length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-xl font-medium mb-3">동영상</h4>
                      <div className="space-y-4">
                        {(notice as any).attachments.filter((a: any) => a.type === 'video').map((file: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-4">
                            <video src={file.url} controls className="w-full rounded max-h-[600px]" />
                            <p className="text-sm mt-2 truncate">{file.name}</p>
                            {file.size > 0 && <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Display YouTube videos */}
                  {(notice as any).attachments.filter((a: any) => a.type === 'youtube').length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-xl font-medium mb-3">YouTube 동영상</h4>
                      <div className="space-y-4">
                        {(notice as any).attachments.filter((a: any) => a.type === 'youtube').map((file: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-4">
                            <div className="aspect-video">
                              <iframe
                                src={getYouTubeEmbedUrl(file.url)}
                                className="w-full h-full rounded"
                                title={`YouTube video ${idx + 1}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                referrerPolicy="strict-origin-when-cross-origin"
                                allowFullScreen
                              />
                            </div>
                            <p className="text-sm mt-2 text-muted-foreground">YouTube: {file.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Display audio */}
                  {(notice as any).attachments.filter((a: any) => a.type === 'audio').length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-xl font-medium mb-3">오디오</h4>
                      <div className="space-y-4">
                        {(notice as any).attachments.filter((a: any) => a.type === 'audio').map((file: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-4">
                            <audio src={file.url} controls className="w-full" />
                            <p className="text-sm mt-2 truncate">{file.name}</p>
                            {file.size > 0 && <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
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
              {comments.map(comment => {
                const isAuthor = user?.id === comment.authorId;
                const isAdmin = user?.role === 'ADMIN';
                const canModify = isAuthor || isAdmin;
                const isEditing = editingCommentId === comment.id;

                return (
                <div key={comment.id} className="flex items-start gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{sanitizeText(comment.author?.name || comment.author?.username || '익명')}</p>
                      {canModify && !isEditing && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStartEdit(comment)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(comment.id)}
                            disabled={updateCommentMutation.isPending}
                          >
                            {updateCommentMutation.isPending ? '저장 중...' : '저장'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{sanitizeText(comment.content)}</p>
                    )}

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

                    <p className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleString()}
                      {(comment as any).updatedAt && new Date((comment as any).updatedAt).getTime() !== new Date(comment.createdAt).getTime() && (
                        <span className="ml-2 text-muted-foreground">(수정됨)</span>
                      )}
                    </p>
                  </div>
                </div>
              );
              })}
            </div>

            {user && user.role === 'PENDING' && (
              <div className="mt-6 pt-6 border-t text-center text-muted-foreground py-4">
                가입 승인 대기 중에는 댓글을 작성할 수 없습니다.
              </div>
            )}
            {user && user.role !== 'PENDING' && (
              <form onSubmit={handleCommentSubmit} className="mt-6 pt-6 border-t">
                <div className="space-y-4">
                  <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="댓글을 입력하세요..." required />

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">이미지</label>
                      <FileDropzone
                        onFilesSelected={(files) => handleFilesSelected(files, 'image')}
                        accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }}
                        maxFiles={50}
                        maxSize={10 * 1024 * 1024}
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
                      <FileDropzone
                        onFilesSelected={(files) => handleFilesSelected(files, 'attachment')}
                        maxFiles={50}
                        maxSize={50 * 1024 * 1024}
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

      {/* 이미지 뷰어 */}
      <ImageViewer
        images={viewerImages}
        initialIndex={viewerInitialIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        readOnly={true}
      />
    </div>
  );
}