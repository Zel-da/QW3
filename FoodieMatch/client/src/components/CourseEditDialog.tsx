import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SignatureCanvas from 'react-signature-canvas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Course, Assessment } from '@shared/schema';

interface CourseEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
}

// API Functions
const fetchAssessments = async (courseId: string): Promise<Assessment[]> => {
    const res = await fetch(`/api/courses/${courseId}/assessments`);
    if (!res.ok) throw new Error('Failed to fetch assessments');
    return res.json();
};

const updateCourse = async (courseData: Partial<Course> & { id: string }) => {
    const res = await fetch(`/api/courses/${courseData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
    });
    if (!res.ok) throw new Error('Failed to update course');
    return res.json();
};

const updateAssessments = async ({ courseId, questions }: { courseId: string; questions: any[] }) => {
    const res = await fetch(`/api/courses/${courseId}/assessments`,
    {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
    });
    if (!res.ok) throw new Error('Failed to update assessments');
    return res.json();
};

export function CourseEditDialog({ isOpen, onClose, course }: CourseEditDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<Partial<Course>>({});
  const [quizFile, setQuizFile] = useState<File | null>(null);
  const [videoType, setVideoType] = useState<'youtube' | 'file' | 'audio'>('youtube');

  // Fetch existing assessments for the course
  const { data: existingAssessments = [] } = useQuery<Assessment[]>({
      queryKey: ['assessments', course?.id],
      queryFn: () => fetchAssessments(course!.id),
      enabled: !!course && isOpen, // Only fetch when the dialog is open and a course is selected
  });

  useEffect(() => {
    if (course) {
      setFormData({
        id: course.id,
        title: course.title,
        description: course.description,
        videoUrl: course.videoUrl,
        audioUrl: course.audioUrl,
        documentUrl: course.documentUrl,
        duration: course.duration,
        videoType: course.videoType,
      });
      setVideoType((course.videoType as 'youtube' | 'file' | 'audio') || 'youtube');
    } else {
        setFormData({});
        setQuizFile(null);
        setVideoType('youtube');
    }
  }, [course]);

  const courseUpdateMutation = useMutation({ mutationFn: updateCourse });
  const assessmentUpdateMutation = useMutation({ mutationFn: updateAssessments });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) return;

    const courseData = {
        ...formData,
        duration: Number(formData.duration) || 0,
        videoType: videoType,
    };

    courseUpdateMutation.mutate(courseData as Partial<Course> & { id: string }, {
        onSuccess: (updatedCourse) => {
            if (quizFile) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const text = event.target?.result;
                    if (typeof text !== 'string') return;
                    const questions = text.split('\n').slice(1).map(line => {
                        const [question, options, correctAnswer] = line.split(',');
                        return { question, options, correctAnswer: parseInt(correctAnswer, 10) };
                    }).filter(q => q.question && q.options && !isNaN(q.correctAnswer));

                    if (questions.length > 0) {
                        assessmentUpdateMutation.mutate({ courseId: updatedCourse.id, questions }, {
                            onSuccess: () => {
                                toast({ title: '성공', description: '교육 과정과 퀴즈가 성공적으로 업데이트되었습니다.' });
                                queryClient.invalidateQueries({ queryKey: ['courses'] });
                                queryClient.invalidateQueries({ queryKey: ['assessments', updatedCourse.id] });
                                onClose();
                            },
                            onError: () => {
                                toast({ title: '퀴즈 업데이트 오류', description: '퀴즈를 업데이트하는 중 오류가 발생했습니다.', variant: 'destructive' });
                            }
                        });
                    } else {
                        toast({ title: 'CSV 형식 오류', description: 'CSV 파일 형식이 잘못되었거나 내용이 없습니다.', variant: 'destructive' });
                    }
                };
                reader.readAsText(quizFile);
            } else {
                toast({ title: '성공', description: '교육 과정이 성공적으로 업데이트되었습니다.' });
                queryClient.invalidateQueries({ queryKey: ['courses'] });
                onClose();
            }
        },
        onError: () => {
            toast({ title: '과정 업데이트 오류', description: '교육 과정을 업데이트하는 중 오류가 발생했습니다.', variant: 'destructive' });
        }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  if (!course) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>교육 과정 수정</DialogTitle>
          <DialogDescription>선택한 교육 과정의 정보를 수정합니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">교육 제목</Label>
            <Input id="title" value={formData.title || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">상세 설명</Label>
            <Input id="description" value={formData.description || ''} onChange={handleChange} />
          </div>

          {/* Media Type Selection */}
          <div className="space-y-3">
            <Label>콘텐츠 유형</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="videoType"
                  value="youtube"
                  checked={videoType === 'youtube'}
                  onChange={() => setVideoType('youtube')}
                />
                <span>YouTube 링크</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="videoType"
                  value="file"
                  checked={videoType === 'file'}
                  onChange={() => setVideoType('file')}
                />
                <span>동영상 파일</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="videoType"
                  value="audio"
                  checked={videoType === 'audio'}
                  onChange={() => setVideoType('audio')}
                />
                <span>오디오 파일</span>
              </label>
            </div>
          </div>

          {/* Conditional Input Fields */}
          {videoType === 'youtube' && (
            <div className="space-y-2">
              <Label htmlFor="videoUrl">YouTube 영상 URL</Label>
              <Input id="videoUrl" value={formData.videoUrl || ''} onChange={handleChange} placeholder="https://www.youtube.com/watch?v=..." />
            </div>
          )}

          {videoType === 'file' && (
            <div className="space-y-2">
              <Label htmlFor="videoFile">동영상 파일 업로드</Label>
              <Input
                id="videoFile"
                type="file"
                accept="video/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const formDataUpload = new FormData();
                  formDataUpload.append('files', file);

                  try {
                    const res = await fetch('/api/upload-multiple', {
                      method: 'POST',
                      body: formDataUpload
                    });
                    const data = await res.json();
                    if (data.files && data.files.length > 0) {
                      setFormData(prev => ({ ...prev, videoUrl: data.files[0].url }));
                      toast({ title: '동영상 업로드 완료' });
                    }
                  } catch (error) {
                    toast({ title: '업로드 실패', variant: 'destructive' });
                  }
                }}
              />
              {formData.videoUrl && <p className="text-sm text-green-600">✓ 업로드 완료: {formData.videoUrl}</p>}
            </div>
          )}

          {videoType === 'audio' && (
            <div className="space-y-2">
              <Label htmlFor="audioFile">오디오 파일 업로드</Label>
              <Input
                id="audioFile"
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const formDataUpload = new FormData();
                  formDataUpload.append('files', file);

                  try {
                    const res = await fetch('/api/upload-multiple', {
                      method: 'POST',
                      body: formDataUpload
                    });
                    const data = await res.json();
                    if (data.files && data.files.length > 0) {
                      setFormData(prev => ({ ...prev, audioUrl: data.files[0].url }));
                      toast({ title: '오디오 업로드 완료' });
                    }
                  } catch (error) {
                    toast({ title: '업로드 실패', variant: 'destructive' });
                  }
                }}
              />
              {formData.audioUrl && <p className="text-sm text-green-600">✓ 업로드 완료: {formData.audioUrl}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="documentFile">교육 자료 문서 (선택사항)</Label>
            <Input
              id="documentFile"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.hwp,.hwpx"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const formDataUpload = new FormData();
                formDataUpload.append('files', file);

                try {
                  const res = await fetch('/api/upload-multiple', {
                    method: 'POST',
                    body: formDataUpload
                  });
                  const data = await res.json();
                  if (data.files && data.files.length > 0) {
                    setFormData(prev => ({ ...prev, documentUrl: data.files[0].url }));
                    toast({ title: '문서 업로드 완료' });
                  }
                } catch (error) {
                  toast({ title: '업로드 실패', variant: 'destructive' });
                }
              }}
            />
            {formData.documentUrl && <p className="text-sm text-green-600">✓ 업로드 완료: {formData.documentUrl}</p>}
            <p className="text-sm text-muted-foreground">지원 형식: PDF, Word, Excel, PowerPoint, 한글</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">교육 시간 (분)</Label>
            <Input id="duration" type="number" value={formData.duration || 0} onChange={handleChange} />
          </div>
          
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">퀴즈 관리</h4>
            <div className="space-y-2">
                <Label>현재 퀴즈</Label>
                <div className="p-3 border rounded-md bg-muted h-40 overflow-y-auto text-sm">
                    {existingAssessments.length > 0 ? (
                        <ol className="list-decimal list-inside space-y-2">
                            {existingAssessments.map((q, i) => <li key={i}>{q.question}</li>)}
                        </ol>
                    ) : <p>이 과정에는 퀴즈가 없습니다.</p>}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="quizFile">새 퀴즈 파일로 교체 (CSV)</Label>
                <Input id="quizFile" type="file" accept=".csv" onChange={(e) => setQuizFile(e.target.files ? e.target.files[0] : null)} />
                <p className="text-sm text-muted-foreground">새로운 퀴즈를 업로드하면 기존 퀴즈는 모두 삭제됩니다.</p>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">취소</Button>
            </DialogClose>
            <Button type="submit" disabled={courseUpdateMutation.isPending || assessmentUpdateMutation.isPending}>
              {courseUpdateMutation.isPending || assessmentUpdateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}