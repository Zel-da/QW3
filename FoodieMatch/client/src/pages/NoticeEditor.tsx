import { Header } from "@/components/header";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
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
            <main className="container mx-auto p-4 lg:p-6"><p>권한이 없습니다.</p></main>
        </div>
    )
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {isEditing ? '공지사항 수정' : '새 공지사항 작성'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">제목</Label>
                <Input id="title" name="title" type="text" required value={formData.title} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">내용</Label>
                <Textarea id="content" name="content" required value={formData.content} onChange={handleChange} rows={10} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">이미지 업로드</Label>
                <Input id="image" type="file" onChange={(e) => handleFileChange(e, 'image')} />
                {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="mt-2 rounded-md max-h-48" />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="attachment">파일 첨부</Label>
                <Input id="attachment" type="file" onChange={(e) => handleFileChange(e, 'attachment')} />
                {formData.attachmentName && <p className="text-sm text-muted-foreground mt-2">첨부된 파일: {formData.attachmentName}</p>}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" asChild>
                    <Link href={isEditing ? `/notices/${noticeId}` : '/'}>취소</Link>
                </Button>
                <Button type="submit">저장하기</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
