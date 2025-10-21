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

export default function NoticeEditor() {
  const [match, params] = useRoute("/notices/edit/:id");
  const noticeId = params?.id;
  const isEditing = !!noticeId;

  const queryClient = useQueryClient();

  const { data: noticeToEdit } = useQuery<Notice>({
    queryKey: [`/api/notices/${noticeId}`],
    enabled: isEditing,
  });

  const [formData, setFormData] = useState({ title: '', content: '', imageUrl: '', attachmentUrl: '', attachmentName: '' });
  const [attachments, setAttachments] = useState<Array<{url: string, name: string, type: string, size: number}>>([]);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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

      setAttachments(prev => [...prev, ...newFiles]);
      setError(''); // Clear any previous errors
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
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

      setSuccess('성공적으로 저장되었습니다!');
      setTimeout(() => {
        window.location.href = isEditing ? `/notices/${noticeId}` : '/';
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
                <Label htmlFor="image" className="text-base md:text-lg">이미지 업로드</Label>
                <Input
                  id="image"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'image')}
                  className="text-base h-12"
                  accept="image/*"
                  multiple
                />
                {formData.imageUrl && <img src={formData.imageUrl} alt="Preview" className="mt-3 rounded-md max-h-64 w-full object-contain" />}

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
                <Label htmlFor="attachment" className="text-base md:text-lg">파일 첨부</Label>
                <Input
                  id="attachment"
                  type="file"
                  onChange={(e) => handleFileChange(e, 'attachment')}
                  className="text-base h-12"
                  multiple
                />
                {formData.attachmentName && <p className="text-base text-muted-foreground mt-2">📎 첨부된 파일: {formData.attachmentName}</p>}

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