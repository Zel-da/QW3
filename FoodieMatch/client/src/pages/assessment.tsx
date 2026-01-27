import React, { useState } from 'react';
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
import { TTSButton } from '@/components/TTSButton';
import { CheckCircle, XCircle } from 'lucide-react';

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

  const passed = (score / questions.length) >= 0.6;

  if (passed) {
    // 합격: completed true, currentStep 3
    await axios.put(`/api/users/${userId}/progress/${courseId}`, {
      progress: 100,
      completed: true,
      currentStep: 3, // Assessment completed
    });
  } else {
    // 불합격: progress 100 유지 (영상 시청 완료 상태 유지)
    await axios.put(`/api/users/${userId}/progress/${courseId}`, {
      progress: 100,
      completed: false,
      currentStep: 2, // 교육은 완료, 평가는 미통과
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
  // 즉시 피드백: 각 문제별 정답 여부
  const [feedback, setFeedback] = useState<{ [questionId: string]: { isCorrect: boolean; correctAnswer: number } }>({});

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

  const handleAnswerChange = (questionId: string, value: string, correctAnswer: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));

    // 즉시 피드백: O/X 표시
    const selectedIndex = parseInt(value);
    const isCorrect = selectedIndex === correctAnswer;
    setFeedback(prev => ({
      ...prev,
      [questionId]: { isCorrect, correctAnswer }
    }));
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
                {questions.map((question, index) => {
                  const options = question.options.split(';').map(opt => opt.trim().replace(/^["']|["']$/g, ''));
                  const questionFeedback = feedback[question.id];
                  const correctOptionText = questionFeedback ? options[questionFeedback.correctAnswer] : '';

                  // TTS용 전체 텍스트: 문제 + 선택지
                  const fullTTSText = `${index + 1}번 문제. ${question.question}. 선택지. ${options.map((opt, i) => `${i + 1}번, ${opt}`).join('. ')}.`;

                  return (
                    <div key={question.id} className="border-b pb-6 last:border-b-0">
                      {/* 문제 텍스트 + TTS 버튼 (문제+선택지 전체 읽기) */}
                      <div className="flex items-start gap-2 mb-4">
                        <TTSButton text={fullTTSText} showStopButton />
                        <p className="font-semibold flex-1 text-lg">{index + 1}. {question.question}</p>
                      </div>

                      {/* 선택지 */}
                      <RadioGroup
                        onValueChange={(value) => handleAnswerChange(question.id, value, question.correctAnswer)}
                        disabled={!!questionFeedback}
                        className="ml-10"
                      >
                        {options.map((cleanedOption, i) => {
                          const isSelected = answers[question.id] === String(i);
                          const isCorrectOption = questionFeedback && i === questionFeedback.correctAnswer;
                          const isWrongSelected = questionFeedback && isSelected && !questionFeedback.isCorrect;

                          return (
                            <div
                              key={i}
                              className={`flex items-center space-x-2 mb-2 p-2 rounded-lg transition-colors ${
                                isCorrectOption ? 'bg-green-50 border border-green-200' :
                                isWrongSelected ? 'bg-red-50 border border-red-200' : ''
                              }`}
                            >
                              <RadioGroupItem value={String(i)} id={`q-${question.id}-o-${i}`} />
                              <Label
                                htmlFor={`q-${question.id}-o-${i}`}
                                className={`flex-1 cursor-pointer ${
                                  isCorrectOption ? 'text-green-700 font-medium' :
                                  isWrongSelected ? 'text-red-700' : ''
                                }`}
                              >
                                {cleanedOption}
                              </Label>
                              {isCorrectOption && <CheckCircle className="h-5 w-5 text-green-600" />}
                              {isWrongSelected && <XCircle className="h-5 w-5 text-red-600" />}
                            </div>
                          );
                        })}
                      </RadioGroup>

                      {/* 즉시 피드백 메시지 */}
                      {questionFeedback && (
                        <div className={`mt-4 ml-10 p-4 rounded-lg border-2 ${
                          questionFeedback.isCorrect
                            ? 'bg-green-50 text-green-800 border-green-300'
                            : 'bg-red-50 text-red-800 border-red-300'
                        }`}>
                          {questionFeedback.isCorrect ? (
                            <div className="flex items-center gap-3">
                              <CheckCircle className="h-6 w-6 text-green-600" />
                              <span className="font-bold text-lg">정답입니다!</span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3">
                                <XCircle className="h-6 w-6 text-red-600" />
                                <span className="font-bold text-lg">오답입니다</span>
                              </div>
                              <div className="ml-9 p-3 bg-green-100 rounded-lg border border-green-300">
                                <span className="text-green-800">
                                  <strong>정답:</strong> {correctOptionText}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <Button onClick={handleSubmit} disabled={mutation.isPending} size="lg" className="w-full">
                  {mutation.isPending ? '제출 중...' : '결과 확인'}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">{result.passed ? '합격' : '불합격'}</h2>
                <p className="text-xl">점수: {result.score} / {result.totalQuestions}</p>
                <p className="text-sm text-muted-foreground">(합격 기준: 60% 이상)</p>
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
                  <div className="space-y-3">
                    <p className="text-red-600">아쉽지만 합격 기준에 도달하지 못했습니다.</p>
                    <p className="text-sm text-muted-foreground">맞춘 문제는 유지되고, 틀린 문제만 다시 풀 수 있습니다.</p>
                    <div className="flex gap-3 justify-center mt-4">
                      <Button onClick={() => {
                        // 틀린 문제의 답변과 피드백만 제거, 맞춘 문제는 유지
                        const newAnswers: { [key: string]: string } = {};
                        const newFeedback: { [questionId: string]: { isCorrect: boolean; correctAnswer: number } } = {};
                        if (questions) {
                          questions.forEach((q) => {
                            const qFeedback = feedback[q.id];
                            if (qFeedback && qFeedback.isCorrect) {
                              // 맞춘 문제: 답변과 피드백 유지
                              newAnswers[q.id] = answers[q.id];
                              newFeedback[q.id] = qFeedback;
                            }
                            // 틀린 문제: 답변과 피드백 제거 (다시 풀 수 있도록)
                          });
                        }
                        setAnswers(newAnswers);
                        setFeedback(newFeedback);
                        setResult(null);
                      }}>
                        틀린 문제 다시 풀기
                      </Button>
                      <Button variant="outline" onClick={() => navigate(`/courses/${courseId}/content`)}>
                        과정으로 돌아가기
                      </Button>
                    </div>
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