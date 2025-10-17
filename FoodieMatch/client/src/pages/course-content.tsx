
import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/header";
import { PdfViewer } from "@/components/pdf-viewer";
import { ArrowLeft, Play, Pause, CheckCircle, Clock } from "lucide-react";
import { Course, UserProgress } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const getYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function CourseContentPage() {
  const { id: courseId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const userId = localStorage.getItem("currentUserId");
    console.log("CourseContent - localStorage userId:", userId);
    if (!userId) {
      setLocation('/login');
      return;
    }
    setCurrentUserId(userId);
  }, [courseId, setLocation]);

  const { data: course } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: userProgress } = useQuery<UserProgress>({
    queryKey: ["/api/users", currentUserId, "progress", courseId],
    enabled: !!currentUserId && !!courseId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (progressData: any) => {
      const response = await apiRequest(
        "PUT", 
        `/api/users/${currentUserId}/progress/${courseId}`, 
        progressData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/users", currentUserId, "progress", courseId],
      });
    },
  });

  useEffect(() => {
    if (userProgress) {
      setTimeSpent(userProgress.timeSpent || 0);
      setVideoProgress(userProgress.progress || 0);
      setCurrentStep(userProgress.currentStep || 1);
    }
  }, [userProgress]);

  useEffect(() => {
    if (course?.videoUrl) {
      setIsPlaying(true);
    }
  }, [course]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && course) {
      interval = setInterval(() => {
        setTimeSpent(prevTime => {
          const newTime = prevTime + 1;
          setVideoProgress(prevProgress => {
            const newProgress = Math.min(prevProgress + (100 / (course.duration * 60)), 100);

            if (newTime > 0 && newTime % 10 === 0) {
              updateProgressMutation.mutate({
                progress: Math.floor(newProgress),
                timeSpent: newTime,
                currentStep: newProgress >= 100 ? 3 : 2,
              });
            }
            return newProgress;
          });
          return newTime;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, course, updateProgressMutation]);

  const handleVideoComplete = () => {
    setIsPlaying(false);
    setVideoProgress(100);
    setCurrentStep(3);
    
    updateProgressMutation.mutate({
      progress: 100,
      timeSpent,
      currentStep: 3,
      completed: false, // Will be completed after assessment
    });

    toast({
      title: "교육 영상 완료",
      description: "이제 평가를 진행할 수 있습니다.",
    });
  };

  const handleStartAssessment = () => {
    setLocation(`/assessment/${courseId}`);
  };

  if (!currentUserId || !course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-center korean-text">
            <div className="text-lg">로딩 중...</div>
          </div>
        </div>
      </div>
    );
  }

  const videoId = course.videoUrl ? getYouTubeId(course.videoUrl) : null;
  const progressPercent = userProgress?.progress || 0;
  const isVideoComplete = videoProgress >= 100 || progressPercent >= 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="korean-text" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              대시보드로 돌아가기
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <Card data-testid="course-header">
              <CardHeader>
                <CardTitle className="korean-text" data-testid="course-title">
                  {course.title}
                </CardTitle>
                <p className="text-muted-foreground korean-text">
                  총 교육 시간: {course.duration}분
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="korean-text">진행률</span>
                    <span data-testid="video-progress-text">{Math.floor(videoProgress)}%</span>
                  </div>
                  <Progress value={videoProgress} className="h-2" data-testid="video-progress-bar" />
                </div>
              </CardContent>
            </Card>

            {/* Video Player */}
            <Card data-testid="video-player">
              <CardContent className="p-6">
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
                  {videoId ? (
                    <iframe
                      key={videoId}
                      className="absolute inset-0 w-full h-full"
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                      title="YouTube video player"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <div className="text-center text-white korean-text">
                        <p>교육 영상이 없거나 주소가 올바르지 않습니다.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button
                    onClick={() => setIsPlaying(!isPlaying)}
                    disabled={isVideoComplete}
                    className="korean-text"
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        일시정지
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        재생
                      </>
                    )}
                  </Button>

                  {isVideoComplete && (
                    <Button
                      onClick={() => setVideoProgress(0)}
                      variant="outline"
                      className="korean-text"
                      data-testid="button-replay"
                    >
                      다시 보기
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* PDF Document Viewer */}
            {course.documentUrl && (
              <PdfViewer
                documentUrl={course.documentUrl}
                title={`${course.title} - 교육 자료`}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Summary */}
            <Card data-testid="progress-summary">
              <CardHeader>
                <CardTitle className="text-lg korean-text">학습 진행 상황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm korean-text">영상 시청</span>
                  <span className="text-sm font-medium" data-testid="video-completion-status">
                    {isVideoComplete ? "완료" : "진행 중"}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm korean-text">소요 시간</span>
                  <span className="text-sm font-medium" data-testid="time-spent">
                    {Math.floor(timeSpent / 60)}분 {timeSpent % 60}초
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm korean-text">다음 단계</span>
                  <span className="text-sm font-medium korean-text" data-testid="next-step">
                    {isVideoComplete ? "평가 응시" : "영상 시청"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card data-testid="next-steps">
              <CardHeader>
                <CardTitle className="text-lg korean-text">다음 단계</CardTitle>
              </CardHeader>
              <CardContent>
                {!isVideoComplete ? (
                  <div className="text-center py-4">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground korean-text">
                      교육 영상을 모두 시청한 후<br />
                      평가를 진행할 수 있습니다.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600" />
                    <p className="text-sm text-muted-foreground mb-4 korean-text">
                      교육 영상 시청이 완료되었습니다!<br />
                      이제 평가를 진행하세요.
                    </p>
                    <Button
                      onClick={handleStartAssessment}
                      className="w-full korean-text"
                      data-testid="button-start-assessment"
                    >
                      평가 시작하기
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
