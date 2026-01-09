import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Notice } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { Plus, X, Video, Music, Youtube, Trash2, CheckSquare, Square, ZoomIn, RotateCw, Clock } from "lucide-react";
import { ImageViewer, ImageInfo } from "@/components/ImageViewer";
import { Badge } from "@/components/ui/badge";
import { FileDropzone } from "@/components/FileDropzone";
import { useAutoSave } from "@/hooks/useAutoSave";
import { apiRequest } from "@/lib/queryClient";
import { getYouTubeEmbedUrl } from "@/lib/youtube";

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
  const [attachments, setAttachments] = useState<Array<{url: string, name: string, type: string, size: number, rotation?: number}>>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  // 선택 삭제 모드
  const [selectMode, setSelectMode] = useState<'image' | 'attachment' | null>(null);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // 이미지 뷰어 상태
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<ImageInfo[]>([]);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

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
          size: att.size || 0,
          rotation: att.rotation || 0
        })));
      }
    }
  }, [isEditing, noticeToEdit]);

  // 자동 임시저장 기능
  const autoSaveKey = isEditing ? `notice_draft_${noticeId}` : 'notice_draft_new';
  const {
    clearSaved,
    showRestoreDialog,
    savedTimestamp,
    restoreSaved,
    discardSaved
  } = useAutoSave({
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
      const response = await fetch('/api/upload-multiple', { method: 'POST', body: uploadFormData, credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'File upload failed');

      const newFiles = data.files.map((f: any) => ({
        url: f.url,
        name: f.name,
        size: f.size,
        type: fileType,
        rotation: 0
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
      const response = await fetch('/api/upload-multiple', { method: 'POST', body: uploadFormData, credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'File upload failed');

      const newFiles = data.files.map((f: any) => ({
        url: f.url,
        name: f.name,
        size: f.size,
        type: fileType,
        rotation: 0
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

  // 선택 모드 토글
  const toggleSelectMode = (type: 'image' | 'attachment') => {
    if (selectMode === type) {
      setSelectMode(null);
      setSelectedItems([]);
    } else {
      setSelectMode(type);
      setSelectedItems([]);
    }
  };

  // 항목 선택/해제
  const toggleSelectItem = (index: number) => {
    setSelectedItems(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  // 선택한 항목 삭제
  const removeSelectedItems = () => {
    setAttachments(prev => prev.filter((_, i) => !selectedItems.includes(i)));
    setSelectedItems([]);
    setSelectMode(null);
  };

  // 전체 삭제 (특정 타입)
  const removeAllByType = (type: string) => {
    if (!window.confirm(`모든 ${type === 'image' ? '이미지' : '파일'}을 삭제하시겠습니까?`)) return;
    setAttachments(prev => prev.filter(item => item.type !== type));
    setSelectedItems([]);
    setSelectMode(null);
  };

  // 전체 선택 (특정 타입)
  const selectAllByType = (type: string) => {
    const indices = attachments
      .map((item, idx) => item.type === type ? idx : -1)
      .filter(idx => idx !== -1);
    setSelectedItems(indices);
  };

  // 이미지 회전
  const rotateImage = (attachmentIndex: number) => {
    setAttachments(prev => prev.map((item, i) =>
      i === attachmentIndex
        ? { ...item, rotation: ((item.rotation || 0) + 90) % 360 }
        : item
    ));
  };

  // 이미지 뷰어 열기
  const openImageViewer = (clickedIndex: number) => {
    const imageFiles = attachments.filter(f => f.type === 'image');
    const images: ImageInfo[] = imageFiles.map(f => ({
      url: f.url,
      rotation: f.rotation || 0
    }));
    setViewerImages(images);
    setViewerInitialIndex(clickedIndex);
    setViewerOpen(true);
  };

  // 뷰어에서 회전 변경 시 attachments에 반영
  const handleViewerRotate = (viewerIndex: number, newRotation: number) => {
    const imageFiles = attachments.filter(f => f.type === 'image');
    const actualIndex = attachments.indexOf(imageFiles[viewerIndex]);
    if (actualIndex !== -1) {
      setAttachments(prev => prev.map((item, i) =>
        i === actualIndex ? { ...item, rotation: newRotation } : item
      ));
    }
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
      const response = await fetch('/api/upload-multiple', { method: 'POST', body: uploadFormData, credentials: 'include' });
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
      const response = await fetch('/api/upload-multiple', { method: 'POST', body: uploadFormData, credentials: 'include' });
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

    // 업로드 중이면 제출 방지
    if (uploadingIndex !== null) {
      setError('파일 업로드가 완료될 때까지 기다려주세요.');
      return;
    }

    const url = isEditing ? `/api/notices/${noticeId}` : '/api/notices';
    const method = isEditing ? 'PUT' : 'POST';

    // 빈 URL 첨부파일 필터링 (URL이 있는 것만 포함)
    const validAttachments = attachments.filter(att => att.url && att.url.trim() !== '');

    // Prepare data with attachments
    const submitData = {
      ...formData,
      attachments: validAttachments.length > 0 ? validAttachments : undefined
    };

    console.log('📤 Submitting notice data:', submitData);
    console.log('📹 Video URL:', submitData.videoUrl);
    console.log('📹 Video Type:', submitData.videoType);
    console.log('📎 Valid attachments:', validAttachments.length);

    try {
      const response = await apiRequest(method, url, submitData);
      const data = await response.json();

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
                <div className="flex items-center justify-between">
                  <Label className="text-base md:text-lg">이미지 업로드</Label>
                  {attachments.filter(f => f.type === 'image').length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={selectMode === 'image' ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => toggleSelectMode('image')}
                      >
                        {selectMode === 'image' ? '선택 취소' : '선택 삭제'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAllByType('image')}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        전체 삭제
                      </Button>
                    </div>
                  )}
                </div>
                <FileDropzone
                  onFilesSelected={(files) => handleFilesSelected(files, 'image')}
                  accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }}
                  maxFiles={50}
                  maxSize={10 * 1024 * 1024}
                  disabled={isUploading}
                />
                {isUploading && <p className="text-sm text-muted-foreground">업로드 중...</p>}

                {/* 선택 모드 컨트롤 */}
                {selectMode === 'image' && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllByType('image')}
                    >
                      전체 선택
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedItems.length}개 선택됨
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeSelectedItems}
                      disabled={selectedItems.length === 0}
                    >
                      선택 삭제
                    </Button>
                  </div>
                )}

                {/* Display uploaded images */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                  {attachments.filter(f => f.type === 'image').map((file, imageIndex) => {
                    const idx = attachments.indexOf(file);
                    const isSelected = selectedItems.includes(idx);
                    const rotation = file.rotation || 0;
                    return (
                      <div
                        key={idx}
                        className={`relative border rounded-lg p-2 group ${selectMode === 'image' ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-primary bg-primary/10' : ''}`}
                        onClick={() => selectMode === 'image' && toggleSelectItem(idx)}
                      >
                        {selectMode === 'image' && (
                          <div className="absolute top-2 left-2 z-10">
                            {isSelected ? (
                              <CheckSquare className="h-6 w-6 text-primary bg-white rounded" />
                            ) : (
                              <Square className="h-6 w-6 text-muted-foreground bg-white rounded" />
                            )}
                          </div>
                        )}
                        <div className="w-full h-32 overflow-hidden rounded">
                          <img
                            src={file.url}
                            alt={file.name}
                            className="w-full h-full object-cover cursor-pointer transition-transform duration-200"
                            style={{ transform: `rotate(${rotation}deg)` }}
                            onClick={(e) => { if (selectMode !== 'image') { e.stopPropagation(); openImageViewer(imageIndex); } }}
                          />
                        </div>
                        <p className="text-xs truncate mt-1">{file.name}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                          {rotation !== 0 && (
                            <Badge variant="outline" className="text-[10px] px-1">
                              {rotation}°
                            </Badge>
                          )}
                        </div>
                        {selectMode !== 'image' && (
                          <>
                            {/* 회전 버튼 */}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="absolute top-1 left-1 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                rotateImage(idx);
                              }}
                              title="90° 회전"
                            >
                              <RotateCw className="h-4 w-4" />
                            </Button>
                            {/* 확대 버튼 */}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="absolute top-1 left-9 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                openImageViewer(imageIndex);
                              }}
                              title="확대 보기"
                            >
                              <ZoomIn className="h-4 w-4" />
                            </Button>
                            {/* 삭제 버튼 */}
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-7 w-7 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeAttachment(idx);
                              }}
                            >
                              ✕
                            </Button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base md:text-lg">파일 첨부</Label>
                  {attachments.filter(f => f.type === 'attachment').length > 0 && (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={selectMode === 'attachment' ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => toggleSelectMode('attachment')}
                      >
                        {selectMode === 'attachment' ? '선택 취소' : '선택 삭제'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAllByType('attachment')}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        전체 삭제
                      </Button>
                    </div>
                  )}
                </div>
                <FileDropzone
                  onFilesSelected={(files) => handleFilesSelected(files, 'attachment')}
                  maxFiles={50}
                  maxSize={50 * 1024 * 1024}
                  disabled={isUploading}
                />
                {isUploading && <p className="text-sm text-muted-foreground">업로드 중...</p>}

                {/* 선택 모드 컨트롤 */}
                {selectMode === 'attachment' && (
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => selectAllByType('attachment')}
                    >
                      전체 선택
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {selectedItems.length}개 선택됨
                    </span>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeSelectedItems}
                      disabled={selectedItems.length === 0}
                    >
                      선택 삭제
                    </Button>
                  </div>
                )}

                {/* Display uploaded files */}
                <div className="space-y-2 mt-3">
                  {attachments.filter(f => f.type === 'attachment').map((file) => {
                    const idx = attachments.indexOf(file);
                    const isSelected = selectedItems.includes(idx);
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 border rounded-lg ${selectMode === 'attachment' ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-primary bg-primary/10' : ''}`}
                        onClick={() => selectMode === 'attachment' && toggleSelectItem(idx)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {selectMode === 'attachment' && (
                            isSelected ? (
                              <CheckSquare className="h-5 w-5 text-primary flex-shrink-0" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            )
                          )}
                          <span className="text-2xl">📎</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        {selectMode !== 'attachment' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAttachment(idx);
                            }}
                          >
                            삭제
                          </Button>
                        )}
                      </div>
                    );
                  })}
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
                                    title="YouTube video preview"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    referrerPolicy="strict-origin-when-cross-origin"
                                    allowFullScreen
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
                                disabled={uploadingIndex === attachments.indexOf(item)}
                              />
                              {uploadingIndex === attachments.indexOf(item) && (
                                <div className="flex items-center gap-2 text-sm text-blue-600 animate-pulse">
                                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                  <span>업로드 중... 대용량 파일은 시간이 걸릴 수 있습니다</span>
                                </div>
                              )}
                              {item.url && uploadingIndex !== attachments.indexOf(item) && (
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
                              {!item.url && uploadingIndex !== attachments.indexOf(item) && (
                                <p className="text-sm text-muted-foreground">파일을 선택해주세요</p>
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
                <Button
                  type="submit"
                  className="text-base h-12 min-w-[100px]"
                  disabled={isUploading || uploadingIndex !== null}
                >
                  {(isUploading || uploadingIndex !== null) ? '업로드 중...' : '저장하기'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* 이미지 뷰어 (편집 모드 - 회전 저장 가능) */}
        <ImageViewer
          images={viewerImages}
          initialIndex={viewerInitialIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
          onRotate={handleViewerRotate}
          readOnly={false}
        />

        {/* 임시저장 복원 다이얼로그 */}
        <Dialog open={showRestoreDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                임시저장된 내용이 있습니다
              </DialogTitle>
              <DialogDescription>
                {savedTimestamp && (
                  <span className="block mt-2 text-sm">
                    저장 시간: {new Date(savedTimestamp).toLocaleString('ko-KR')}
                  </span>
                )}
                <span className="block mt-1">
                  이전에 작성하던 내용을 불러오시겠습니까?
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button variant="outline" onClick={discardSaved}>
                새로 작성
              </Button>
              <Button onClick={restoreSaved}>
                불러오기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}