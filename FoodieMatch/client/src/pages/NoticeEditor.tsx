import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { Notice } from "@shared/schema";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRoute, Link } from "wouter";

export default function NoticeEditor() {
  const { user } = useAuth();
  const [match, params] = useRoute("/notices/edit/:id");
  const noticeId = params?.id;
  const isEditing = !!noticeId;

  const queryClient = useQueryClient();

  const { data: noticeToEdit } = useQuery<Notice>({
    queryKey: [`/api/notices/${noticeId}`],
    enabled: isEditing,
  });

  const [formData, setFormData] = useState({ title: '', content: '', imageUrl: '', attachmentUrl: '', attachmentName: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isEditing && noticeToEdit) {
      setFormData({
        title: noticeToEdit.title,
        content: noticeToEdit.content,
        imageUrl: noticeToEdit.imageUrl || '',
        attachmentUrl: noticeToEdit.attachmentUrl || '',
        attachmentName: noticeToEdit.attachmentName || '',
      });
    }
  }, [isEditing, noticeToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'attachment') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: uploadFormData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'File upload failed');

      if (fileType === 'image') {
        setFormData(prev => ({ ...prev, imageUrl: data.url }));
      } else {
        setFormData(prev => ({ ...prev, attachmentUrl: data.url, attachmentName: data.name }));
      }
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

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '저장에 실패했습니다.');

      queryClient.invalidateQueries({ queryKey: ['/api/notices'] });
      if (isEditing) {
        queryClient.invalidateQueries({ queryKey: [`/api/notices/${noticeId}`] });
      }

      setSuccess('성공적으로 저장되었습니다!');
      setTimeout(() => {
        window.location.href = isEditing ? `/notices/${noticeId}` : '/';
      }, 1500);

    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (user?.role !== 'admin') {
    return (
        <div>
            <Header />
            <main className="container mx-auto p-4 lg:p-6"><p className="text-lg">권한이 없습니다.</p></main>
        </div>
    )
  }

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
                <Label htmlFor="image" className="text-base md:text-lg">이미지 업로드</Label>
                <Input id="image" type="file" onChange={(e) => handleFileChange(e, 'image')} className="text-base h-12" accept="image/*" />
                {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="mt-3 rounded-md max-h-64 w-full object-contain" />}
              </div>
              <div className="space-y-3">
                <Label htmlFor="attachment" className="text-base md:text-lg">파일 첨부</Label>
                <Input id="attachment" type="file" onChange={(e) => handleFileChange(e, 'attachment')} className="text-base h-12" />
                {formData.attachmentName && <p className="text-base text-muted-foreground mt-2">📎 첨부된 파일: {formData.attachmentName}</p>}
              </div>
              {error && <p className="text-base text-destructive">{error}</p>}
              {success && <p className="text-base text-green-600">{success}</p>}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <Button type="button" variant="outline" asChild className="text-base h-12 min-w-[100px]">
                    <Link href={isEditing ? `/notices/${noticeId}` : '/'}>취소</Link>
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
