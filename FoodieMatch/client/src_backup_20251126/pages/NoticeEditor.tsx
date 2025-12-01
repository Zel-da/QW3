import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Notice } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Plus, X, Video, Music, Youtube } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FileDropzone } from "@/components/FileDropzone";
import { useAutoSave } from "@/hooks/useAutoSave";

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

export default function NoticeEditor() {
  const [match, params] = useRoute("/notices/edit/:id");
  const noticeId = params?.id;
  const isEditing = !!noticeId;

  const queryClient = useQueryClient();

  const { data: noticeToEdit } = useQuery<Notice>({
    queryKey: [`/api/notices/${noticeId}`],
    enabled: isEditing,
  });

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    attachmentUrl: '',
    attachmentName: '',
    videoUrl: '',
    videoType: 'file' as 'file' | 'youtube'
  });
  const [attachments, setAttachments] = useState<Array<{url: string, name: string, type: string, size: number}>>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (isEditing && noticeToEdit) {
      setFormData({
        title: noticeToEdit.title,
        content: noticeToEdit.content,
        imageUrl: noticeToEdit.imageUrl || '',
        attachmentUrl: noticeToEdit.attachmentUrl || '',
        attachmentName: noticeToEdit.attachmentName || '',
        videoUrl: noticeToEdit.videoUrl || '',
        videoType: (noticeToEdit.videoType as 'file' | 'youtube') || 'file'
      });

      // Load existing attachments
      if ((noticeToEdit as any).attachments && Array.isArray((noticeToEdit as any).attachments)) {
        setAttachments((noticeToEdit as any).attachments.map((att: any) => ({
          url: att.url,
          name: att.name,
          type: att.type || 'file',
          size: att.size || 0
        })));
      }
    }
  }, [isEditing, noticeToEdit]);

  // 자동 임시저장 기능
  const autoSaveKey = isEditing ? `notice_draft_${noticeId}` : 'notice_draft_new';
  const { clearSaved } = useAutoSave({
    key: autoSaveKey,
    data: { formData, attachments },
    enabled: !isEditing, // 새 글 작성 시에만 자동저장 (수정 시에는 비활성화)
    onRestore: (restored) => {
      if (restored.formData) setFormData(restored.formData);
      if (restored.attachments) setAttachments(restored.attachments);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'attachment') => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const uploadFormData = new FormData();
    files.forEach(file => uploadFormData.append('files', file));

    try {
      setIsUploading(true);
      const response = await fetch('/api/upload-multiple', { method: 'POST', body: uploadFormData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'File upload failed');

      const newFiles = data.files.map((f: any) => ({
        url: f.url,
        name: f.name,
        size: f.size,
        type: fileType
      }));

      setAttachments(prev => [...prev, ...newFiles]);
      setError(''); // Clear any previous errors
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFilesSelected = async (files: File[], fileType: 'image' | 'attachment') => {
    if (files.length === 0) return;

    const uploadFormData = new FormData();
    files.forEach(file => uploadFormData.append('files', file));

    try {
      setIsUploading(true);
      const response = await fetch('/api/upload-multiple', { method: 'POST', body: uploadFormData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'File upload failed');

      const newFiles = data.files.map((f: any) => ({
        url: f.url,
        name: f.name,
        size: f.size,
        type: fileType
      }));

      setAttachments(prev => [...prev, ...newFiles]);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // 비디오/오디오 항목 추가
  const addMediaItem = (type: 'video' | 'youtube' | 'audio') => {
    const newItem = {
      url: '',
      name: type === 'youtube' ? 'YouTube 링크' : type === 'video' ? '동영상 파일' : '오디오 파일',
      type,
      size: 0
    };
    setAttachments(prev => [...prev, newItem]);
  };

  // 미디어 파일 업로드
  const handleMediaUpload = async (index: number, file: File) => {
    const uploadFormData = new FormData();
    uploadFormData.append('files', file);

    try {
      setUploadingIndex(index);
      const response = await fetch('/api/upload-multiple', { method: 'POST', body: uploadFormData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Upload failed');

      if (data.files.length > 0) {
        setAttachments(prev => prev.map((item, i) =>
          i === index
            ? { ...item, url: data.files[0].url, name: file.name, size: file.size }
            : item
        ));
      }
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingIndex(null);
    }
  };

  // YouTube URL 업데이트
  const updateMediaUrl = (index: number, url: string) => {
    setAttachments(prev => prev.map((item, i) =>
      i === index ? { ...item, url, name: url } : item
    ));
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const uploadFormData = new FormData();
    files.forEach(file => uploadFormData.append('files', file));

    try {
      const response = await fetch('/api/upload-multiple', { method: 'POST', body: uploadFormData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Video upload failed');

      // Assuming single video upload
      if (data.files.length > 0) {
        setFormData(prev => ({ ...prev, videoUrl: data.files[0].url, videoType: 'file' }));
      }
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const url = isEditing ? `/api/notices/${noticeId}` : '/api/notices';
    const method = isEditing ? 'PUT' : 'POST';

    // Prepare data with attachments
    const submitData = {
      ...formData,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    console.log('📤 Submitting notice data:', submitData);
    console.log('📹 Video URL:', submitData.videoUrl);
    console.log('📹 Video Type:', submitData.videoType);

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '저장에 실패했습니다.');

      queryClient.invalidateQueries({ queryKey: ['/api/notices'] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: [`/api/notices/${noticeId}`] });
      }

      // 저장 성공 시 임시저장 데이터 삭제
      clearSaved();

      setSuccess('성공적으로 저장되었습니다!');
      setTimeout(() => {
        window.location.href = isEditing ? `/notices/${noticeId}` : '/notices';
      }, 1500);

    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        <Card className="w-full max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-center">
              {isEditing ? '공지사항 수정' : '새 공지사항 작성'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="title" className="text-base md:text-lg">제목</Label>
                <Input id="title" name="title" type="text" required value={formData.title} onChange={handleChange} className="text-base h-12" />
              </div>
              <div className="space-y-3">
                <Label htmlFor="content" className="text-base md:text-lg">내용</Label>
                <Textarea id="content" name="content" required value={formData.content} onChange={handleChange} rows={12} className="text-base" />
              </div>
              <div className="space-y-3">
                <Label className="text-base md:text-lg">이미지 업로드</Label>
                <FileDropzone
                  onFilesSelected={(files) => handleFilesSelected(files, 'image')}
                  accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }}
                  maxFiles={50}
                  maxSize={10 * 1024 * 1024}
                  disabled={isUploading}
                />
                {isUploading && <p className="text-sm text-muted-foreground">업로드 중...</p>}

                {/* Display uploaded images */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {attachments.filter(f => f.type === 'image').map((file, idx) => (
                    <div key={idx} className="relative border rounded-lg p-2">
                      <img src={file.url} alt={file.name} className="w-full h-32 object-cover rounded" />
                      <p className="text-xs truncate mt-1">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1"
                        onClick={() => removeAttachment(attachments.indexOf(file))}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base md:text-lg">파일 첨부</Label>
                <FileDropzone
                  onFilesSelected={(files) => handleFilesSelected(files, 'attachment')}
                  maxFiles={50}
                  maxSize={50 * 1024 * 1024}
                  disabled={isUploading}
                />
                {isUploading && <p className="text-sm text-muted-foreground">업로드 중...</p>}

                {/* Display uploaded files */}
                <div className="space-y-2 mt-3">
                  {attachments.filter(f => f.type === 'attachment').map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-2xl">📎</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAttachment(attachments.indexOf(file))}
                      >
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Video/Audio Upload / YouTube Link */}
              <div className="space-y-3 border-t pt-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base md:text-lg font-semibold">동영상/오디오 첨부 (선택사항)</Label>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => addMediaItem('youtube')}>
                      <Plus className="h-4 w-4 mr-1" /> YouTube
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => addMediaItem('video')}>
                      <Plus className="h-4 w-4 mr-1" /> 동영상
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => addMediaItem('audio')}>
                      <Plus className="h-4 w-4 mr-1" /> 오디오
                    </Button>
                  </div>
                </div>

                {/* Display media items */}
                {attachments.filter(f => ['video', 'youtube', 'audio'].includes(f.type)).length > 0 && (
                  <div className="space-y-3">
                    {attachments.map((item, idx) => {
                      if (!['video', 'youtube', 'audio'].includes(item.type)) return null;

                      return (
                        <div key={idx} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {item.type === 'youtube' && <Youtube className="h-5 w-5 text-red-500" />}
                              {item.type === 'video' && <Video className="h-5 w-5 text-blue-500" />}
                              {item.type === 'audio' && <Music className="h-5 w-5 text-purple-500" />}
                              <Badge variant="outline">
                                {item.type === 'youtube' ? 'YouTube' : item.type === 'video' ? '동영상' : '오디오'}
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removeAttachment(attachments.indexOf(item))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          {item.type === 'youtube' ? (
                            <div className="space-y-2">
                              <Input
                                placeholder="YouTube URL 입력 (예: https://www.youtube.com/watch?v=...)"
                                value={item.url}
                                onChange={(e) => updateMediaUrl(attachments.indexOf(item), e.target.value)}
                              />
                              {item.url && (
                                <div className="aspect-video">
                                  <iframe
                                    src={getYouTubeEmbedUrl(item.url)}
                                    className="w-full h-full rounded"
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Input
                                type="file"
                                accept={item.type === 'video' ? 'video/*' : 'audio/*'}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleMediaUpload(attachments.indexOf(item), file);
                                }}
                              />
                              {item.url && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-green-600">
                                    <span>✓ 업로드 완료:</span>
                                    <span className="truncate">{item.name}</span>
                                    {item.size && <span>({(item.size / 1024 / 1024).toFixed(2)} MB)</span>}
                                  </div>
                                  {item.type === 'video' ? (
                                    <video src={item.url} controls className="w-full rounded max-h-96" />
                                  ) : (
                                    <audio src={item.url} controls className="w-full" />
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  + 버튼을 클릭하여 여러 개의 동영상/오디오를 추가할 수 있습니다.
                </p>
              </div>

              {error && <p className="text-base text-destructive">{error}</p>}
              {success && <p className="text-base text-green-600">{success}</p>}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button type="button" variant="outline" asChild className="text-base h-12 min-w-[100px]">
                    <Link href={isEditing ? `/notices/${noticeId}` : '/notices'}>취소</Link>
                </Button>
                <Button type="submit" className="text-base h-12 min-w-[100px]">저장하기</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}