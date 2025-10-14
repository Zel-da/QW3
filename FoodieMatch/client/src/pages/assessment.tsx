import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/header";
import { ArrowLeft, Clock, CheckCircle, XCircle, Award } from "lucide-react";
import { Course, Assessment, UserAssessment } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AssessmentPage() {
  const { id: courseId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<UserAssessment | null>(null);

  useEffect(() => {
    const userId = localStorage.getItem("currentUserId");
    if (!userId) {
      setLocation(`/course/${courseId}`);
      return;
    }
    setCurrentUserId(userId);
  }, [courseId, setLocation]);

  const { data: course } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: assessments = [] } = useQuery<Assessment[]>({
    queryKey: ["/api/courses", courseId, "assessments"],
    enabled: !!courseId,
  });

  const { data: previousAttempts = [] } = useQuery<UserAssessment[]>({
    queryKey: ["/api/users", currentUserId, "assessments", courseId],
    enabled: !!currentUserId && !!courseId,
  });

  const submitAssessmentMutation = useMutation({
    mutationFn: async (assessmentData: any) => {
      const response = await apiRequest(
        "POST", 
        `/api/users/${currentUserId}/assessments/${courseId}`, 
        assessmentData
      );
      return response.json();
    },
    onSuccess: (result) => {
      setAssessmentResult(result);
      setIsSubmitted(true);
      
      if (result.passed) {
        // Update course progress to completed
        apiRequest("PUT", `/api/users/${currentUserId}/progress/${courseId}`, {
          progress: 100,
          completed: true,
          currentStep: 3,
        });
        
        toast({
          title: "평가 통과!",
          description: "축하합니다! 이수증이 발급됩니다.",
        });
      } else {
        toast({
          title: "평가 미통과",
          description: "다시 시도해보세요.",
          variant: "destructive",
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["/api/users", currentUserId, "assessments", courseId],
      });
    },
  });

  // Timer countdown
  useEffect(() => {
    if (isSubmitted || timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmitAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, timeRemaining]);

  const handleAnswerSelect = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null) return;
    
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);
    setSelectedAnswer(null);

    if (currentQuestion < assessments.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmitAssessment(newAnswers);
    }
  };

  const handleSubmitAssessment = (finalAnswers = answers) => {
    let correctCount = 0;
    
    assessments.forEach((assessment, index) => {
      if (finalAnswers[index] === assessment.correctAnswer) {
        correctCount++;
      }
    });

    const score = correctCount;
    const totalQuestions = assessments.length;
    const passed = (score / totalQuestions) >= 0.7; // 70% to pass
    const attemptNumber = previousAttempts.length + 1;

    submitAssessmentMutation.mutate({
      score,
      totalQuestions,
      passed,
      attemptNumber,
    });
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getRetryInfo = () => {
    const attemptCount = previousAttempts.length + 1;
    if (attemptCount === 1) return { percentage: 40, label: "1차 재시험" };
    if (attemptCount === 2) return { percentage: 20, label: "2차 재시험" };
    if (attemptCount === 3) return { percentage: 10, label: "3차 재시험" };
    return { percentage: 0, label: "4차 이후" };
  };

  if (!currentUserId || !course || assessments.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-center korean-text">
            <div className="text-lg">평가를 불러오는 중...</div>
          </div>
        </div>
      </div>
    );
  }

  const currentAssessment = assessments[currentQuestion];
  const options = currentAssessment ? JSON.parse(currentAssessment.options) : [];
  const progressPercent = ((currentQuestion + 1) / assessments.length) * 100;

  if (isSubmitted && assessmentResult) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center" data-testid="assessment-result">
            <CardContent className="p-8">
              {assessmentResult.passed ? (
                <>
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
                  <h2 className="text-2xl font-bold text-green-600 mb-2 korean-text">
                    평가 통과!
                  </h2>
                  <p className="text-muted-foreground mb-6 korean-text">
                    축하합니다! 안전교육을 성공적으로 완료했습니다.
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
                  <h2 className="text-2xl font-bold text-red-600 mb-2 korean-text">
                    평가 미통과
                  </h2>
                  <p className="text-muted-foreground mb-6 korean-text">
                    다시 시도해보세요. 교육 자료를 다시 확인하신 후 재응시하실 수 있습니다.
                  </p>
                </>
              )}

              <div className="bg-secondary p-4 rounded-lg mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium korean-text">점수</div>
                    <div data-testid="assessment-score">
                      {assessmentResult.score} / {assessmentResult.totalQuestions}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium korean-text">정답률</div>
                    <div data-testid="assessment-percentage">
                      {Math.round((assessmentResult.score / assessmentResult.totalQuestions) * 100)}%
                    </div>
                  </div>
                  <div>
                    <div className="font-medium korean-text">시도 횟수</div>
                    <div data-testid="attempt-number">{assessmentResult.attemptNumber}회</div>
                  </div>
                  <div>
                    <div className="font-medium korean-text">통과 기준</div>
                    <div>70%</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {assessmentResult.passed ? (
                  <Button 
                    className="w-full korean-text" 
                    onClick={() => setLocation("/")}
                    data-testid="button-view-certificate"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    이수증 확인하기
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button 
                      className="w-full korean-text"
                      onClick={() => {
                        setIsSubmitted(false);
                        setAssessmentResult(null);
                        setCurrentQuestion(0);
                        setAnswers([]);
                        setSelectedAnswer(null);
                        setTimeRemaining(600);
                      }}
                      data-testid="button-retry-assessment"
                    >
                      재시험 응시하기
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full korean-text"
                      onClick={() => setLocation(`/course/${courseId}/content`)}
                      data-testid="button-review-content"
                    >
                      교육 자료 다시 보기
                    </Button>
                  </div>
                )}
                
                <Button 
                  variant="ghost" 
                  className="w-full korean-text"
                  onClick={() => setLocation("/")}
                  data-testid="button-back-dashboard"
                >
                  대시보드로 돌아가기
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={`/course/${courseId}/content`}>
            <Button variant="ghost" className="korean-text" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              교육 내용으로 돌아가기
            </Button>
          </Link>
        </div>

        <Card data-testid="assessment-question">
          <CardHeader>
            <div className="flex justify-between items-center mb-4">
              <CardTitle className="korean-text">안전교육 평가</CardTitle>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  <span data-testid="time-remaining">{formatTime(timeRemaining)}</span>
                </div>
                <span data-testid="question-counter">
                  {currentQuestion + 1} / {assessments.length}
                </span>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2" data-testid="assessment-progress" />
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-4 korean-text" data-testid="question-text">
                문제 {currentQuestion + 1}. {currentAssessment?.question}
              </h3>

              <RadioGroup 
                value={selectedAnswer?.toString()} 
                onValueChange={(value) => handleAnswerSelect(parseInt(value))}
                className="space-y-3"
                data-testid="answer-options"
              >
                {options.map((option: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-secondary/50">
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Label 
                      htmlFor={`option-${index}`} 
                      className="flex-1 cursor-pointer korean-text"
                      data-testid={`option-${index}`}
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-muted-foreground korean-text">
                {previousAttempts.length > 0 && (
                  <span data-testid="retry-info">
                    {getRetryInfo().label} ({getRetryInfo().percentage}% 새 문제)
                  </span>
                )}
              </div>

              <Button
                onClick={handleNextQuestion}
                disabled={selectedAnswer === null || submitAssessmentMutation.isPending}
                className="korean-text"
                data-testid="button-next-question"
              >
                {currentQuestion < assessments.length - 1 ? "다음 문제" : "평가 완료"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Assessment Info */}
        <Card className="mt-6" data-testid="assessment-info">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4 text-sm text-center">
              <div>
                <div className="font-medium korean-text">통과 기준</div>
                <div className="text-primary">70% 이상</div>
              </div>
              <div>
                <div className="font-medium korean-text">제한 시간</div>
                <div className="text-primary">10분</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
