import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/header";
import { ArrowLeft, Play, Pause, CheckCircle, Clock, Download } from "lucide-react";
import { Course, UserProgress } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

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
  const { user } = useAuth();

  const [isPlaying, setIsPlaying] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const timeSpentRef = useRef(timeSpent); // Ref to hold the latest timeSpent

  useEffect(() => {
    timeSpentRef.current = timeSpent;
  }, [timeSpent]);

  const { data: course } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const { data: userProgress, isLoading: progressLoading } = useQuery<UserProgress>({
    queryKey: ["/api/users", user?.id, "progress", courseId],
    enabled: !!user?.id && !!courseId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (progressData: Partial<UserProgress>) => {
      if (!user?.id || !courseId) return;
      const response = await apiRequest(
        "PUT",
        `/api/users/${user.id}/progress/${courseId}`,
        progressData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/users", user?.id, "progress", courseId],
      });
    },
  });

  // Stable function to save progress
  const saveProgress = useCallback(() => {
    if (!user?.id || !courseId || !course) return;

    let currentProgress: number;

    // If duration is 0, immediately set to 100%
    if (course.duration === 0) {
      currentProgress = 100;
    } else {
      currentProgress = Math.min(Math.floor((timeSpentRef.current / (course.duration * 60)) * 100), 100);
    }

    // Call API directly without using mutation object
    // Don't invalidate queries to prevent resetting timeSpent
    apiRequest(
      "PUT",
      `/api/users/${user.id}/progress/${courseId}`,
      {
        progress: currentProgress,
        timeSpent: timeSpentRef.current,
        currentStep: currentProgress >= 100 ? 3 : 2,
      }
    ).catch(err => {
      console.error('Failed to save progress:', err);
    });
  }, [course, courseId, user?.id]);

  useEffect(() => {
    if (!progressLoading) {
      if (userProgress && userProgress.timeSpent !== undefined && userProgress.timeSpent !== null) {
        // Load saved progress (including 0)
        setTimeSpent(userProgress.timeSpent);
      }
      setProgressLoaded(true);
    }
  }, [userProgress, progressLoading]);

  useEffect(() => {
    // Only start auto-play after progress is loaded
    if (course?.videoUrl && progressLoaded) {
      setIsPlaying(true);
    }

    // If duration is 0, save 100% progress immediately
    if (course && course.duration === 0 && progressLoaded) {
      saveProgress();
    }
  }, [course, saveProgress, progressLoaded]);

  // Timer effect - update time and save progress periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let saveInterval: NodeJS.Timeout;

    if (isPlaying) {
      interval = setInterval(() => {
        setTimeSpent(prevTime => prevTime + 1);
      }, 1000);

      // Save progress every 10 seconds
      saveInterval = setInterval(() => {
        saveProgress();
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (saveInterval) clearInterval(saveInterval);
    };
  }, [isPlaying, saveProgress]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      saveProgress();
    };
  }, [saveProgress]);


  const handleStartAssessment = () => {
    setLocation(`/assessment/${courseId}`);
  };

  if (!user || !course) {
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

  const videoId = course.videoUrl && course.videoType === 'youtube' ? getYouTubeId(course.videoUrl) : null;
  const progressPercent = course.duration === 0 ? 100 : Math.min(Math.floor((timeSpent / (course.duration * 60)) * 100), 100);
  const isVideoComplete = progressPercent >= 100 || (userProgress?.progress || 0) >= 100;

  // Determine media type
  const hasAudio = course.audioUrl;
  const hasVideo = course.videoUrl;
  const hasYouTube = videoId !== null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/courses">
            <Button variant="ghost" className="korean-text" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              교육 목록으로 돌아가기
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
                    <span data-testid="video-progress-text">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" data-testid="video-progress-bar" />
                </div>
              </CardContent>
            </Card>

            {/* Media Player */}
            <Card data-testid="video-player">
              <CardContent className="p-6">
                {/* Audio Player */}
                {hasAudio && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-3">오디오 교육</h3>
                    <audio
                      src={course.audioUrl || undefined}
                      controls
                      className="w-full"
                      autoPlay={progressLoaded}
                    />
                  </div>
                )}

                {/* Video Player */}
                {hasVideo && (
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
                    {hasYouTube ? (
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
                      <video
                        src={course.videoUrl || undefined}
                        controls
                        className="absolute inset-0 w-full h-full"
                        autoPlay={progressLoaded}
                      />
                    )}
                  </div>
                )}

                {!hasAudio && !hasVideo && (
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video mb-4">
                    <div className="absolute inset-0 flex items-center justify-center bg-black">
                      <div className="text-center text-white korean-text">
                        <p>교육 콘텐츠가 없거나 주소가 올바르지 않습니다.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={() => setIsPlaying(!isPlaying)}
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

                  {(timeSpent > 0 || isVideoComplete) && (
                    <Button
                      onClick={() => {
                        setTimeSpent(0);
                        setIsPlaying(true);
                        // Reset progress in database
                        if (user?.id && courseId) {
                          apiRequest("PUT", `/api/users/${user.id}/progress/${courseId}`, {
                            progress: 0,
                            timeSpent: 0,
                            currentStep: 1,
                          });
                        }
                      }}
                      variant="outline"
                      className="korean-text"
                      data-testid="button-replay"
                    >
                      처음부터 다시보기
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Document Download */}
            {course.documentUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    교육 자료 다운로드
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full">
                    <a href={course.documentUrl} download target="_blank" rel="noopener noreferrer">
                      📎 교육 자료 다운로드
                    </a>
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    클릭하여 교육 자료를 다운로드하세요
                  </p>
                </CardContent>
              </Card>
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
                {userProgress && userProgress.progress > 0 && userProgress.progress < 100 && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 korean-text">
                      이전 진행률: {userProgress.progress}%
                      <br />
                      <span className="text-xs">이어서 학습이 진행됩니다</span>
                    </p>
                  </div>
                )}

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
                      {userProgress?.completed ? '모든 과정을 이수했습니다.' : '교육 영상 시청이 완료되었습니다!'}
                      <br />
                      {userProgress?.completed ? '평가를 다시 보거나 영상을 복습할 수 있습니다.' : '이제 평가를 진행하세요.'}
                    </p>
                    <Button
                      onClick={handleStartAssessment}
                      className="w-full korean-text"
                      data-testid="button-start-assessment"
                    >
                      {userProgress?.completed ? '평가 다시 응시하기' : '평가 시작하기'}
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