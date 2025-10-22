import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface AssessmentQuestion {
  id: string;
  question: string;
  options: string;
  correctAnswer: number;
}

interface AssessmentResult {
  passed: boolean;
  score: number;
  totalQuestions: number;
}

const fetchAssessments = async (courseId: string): Promise<AssessmentQuestion[]> => {
  const { data } = await axios.get(`/api/courses/${courseId}/assessments`);
  return data || [];
};

const submitAssessment = async ({ courseId, userId, answers }: { courseId: string; userId: string; answers: { [key: string]: string } }) => {
  const { data: questions } = await axios.get(`/api/courses/${courseId}/assessments`);
  let score = 0;
  questions.forEach((q: AssessmentQuestion) => {
    if (parseInt(answers[q.id]) === q.correctAnswer) {
      score++;
    }
  });

  const passed = (score / questions.length) >= 0.8;

  if (passed) {
    await axios.put(`/api/users/${userId}/progress/${courseId}`, {
      progress: 100,
      completed: true,
      currentStep: 3, // Assessment completed
    });
  }

  await axios.post(`/api/users/${userId}/assessments/${courseId}`, {
    score,
    totalQuestions: questions.length,
    passed,
    attemptNumber: 1, // This could be incremented based on previous attempts
  });

  return { passed, score, totalQuestions: questions.length };
};

export default function AssessmentPage() {
  const { courseId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const { data: questions, isLoading } = useQuery<AssessmentQuestion[]>({
    queryKey: ['assessments', courseId],
    queryFn: () => fetchAssessments(courseId!),
    enabled: !!courseId,
  });

  const mutation = useMutation({
    mutationFn: submitAssessment,
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['userAssessments', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['userProgress', user?.id, courseId] });
      queryClient.invalidateQueries({ queryKey: ['userCertificates', user?.id] });
    },
    onError: (error) => {
      toast({ title: "오류", description: "평가 제출 중 오류가 발생했습니다.", variant: "destructive" });
    }
  });

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    if (!user || !questions) return;

    const unansweredQuestions = questions.filter(q => !answers[q.id]);
    if (unansweredQuestions.length > 0) {
      toast({
        title: "미완료",
        description: `모든 질문에 답변해주세요. (${unansweredQuestions.length}개 남음)`,
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({ courseId: courseId!, userId: user.id, answers });
  };

  if (isLoading) return <div>평가 정보를 불러오는 중...</div>;
  if (!questions || questions.length === 0) return <div>평가 문제가 없습니다.</div>;

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">과정 평가</CardTitle>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="space-y-8">
                {questions.map((question, index) => (
                  <div key={question.id}>
                    <p className="font-semibold mb-4">{index + 1}. {question.question}</p>
                    <RadioGroup onValueChange={(value) => handleAnswerChange(question.id, value)}>
                      {question.options.split(';').map((option, i) => (
                        <div key={i} className="flex items-center space-x-2 mb-2">
                          <RadioGroupItem value={String(i)} id={`q-${question.id}-o-${i}`} />
                          <Label htmlFor={`q-${question.id}-o-${i}`} className="flex-1 cursor-pointer">{option}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
                <Button onClick={handleSubmit} disabled={mutation.isPending}>
                  {mutation.isPending ? '제출 중...' : '제출'}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">{result.passed ? '합격' : '불합격'}</h2>
                <p className="text-xl">점수: {result.score} / {result.totalQuestions}</p>
                {result.passed ? (
                  <div>
                    <p className="text-green-600">축하합니다! 과정을 성공적으로 이수하셨습니다.</p>
                    <Button onClick={async () => {
                      if (!user) return;
                      await queryClient.invalidateQueries({ queryKey: ['userCertificates', user.id] });
                      navigate('/my-certificates');
                    }} className="mt-4">내 이수증 보러가기</Button>
                  </div>
                ) : (
                  <div>
                    <p className="text-red-600">아쉽지만 합격 기준에 도달하지 못했습니다. 다시 시도해주세요.</p>
                    <Button onClick={() => navigate(`/courses/${courseId}/content`)} className="mt-4">과정으로 돌아가기</Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}