import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/header";
import { ArrowLeft, Download } from "lucide-react";
import { Course, UserProgress } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  PROGRESS_SAVE_INTERVAL,
  SECONDS_PER_MINUTE,
  PROGRESS_TIMER_INTERVAL,
  MAX_PROGRESS_PERCENT,
} from "@/config/constants";

const getYouTubeId = (url: string): string | null => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// YouTube URL을 embed URL로 변환
const getYouTubeEmbedUrl = (url: string): string => {
  if (!url) return '';
  if (url.includes('/embed/')) return url;

  let videoId = '';
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) videoId = watchMatch[1];

  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) videoId = shortMatch[1];

  const embedMatch = url.match(/\/embed\/([^?]+)/);
  if (embedMatch) videoId = embedMatch[1];

  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};

export default function CourseContentPage() {
  const { id: courseId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [timeSpent, setTimeSpent] = useState(0);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [isNavigatingToAssessment, setIsNavigatingToAssessment] = useState(false);
  const timeSpentRef = useRef(timeSpent); // Ref to hold the latest timeSpent
  const isSavingRef = useRef(false); // 중복 저장 방지 플래그

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

  // Stable function to save progress (debounced with save flag)
  const saveProgress = useCallback(async () => {
    if (!user?.id || !courseId || !course) return;

    // 중복 저장 방지: 이미 저장 중이면 스킵
    if (isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;

    try {
      let currentProgress: number;

      // If duration is 0, immediately set to 100%
      if (course.duration === 0) {
        currentProgress = MAX_PROGRESS_PERCENT;
      } else {
        currentProgress = Math.min(
          Math.floor((timeSpentRef.current / (course.duration * SECONDS_PER_MINUTE)) * MAX_PROGRESS_PERCENT),
          MAX_PROGRESS_PERCENT
        );
      }

      // Call API directly without using mutation object
      // Don't invalidate queries to prevent resetting timeSpent
      await apiRequest(
        "PUT",
        `/api/users/${user.id}/progress/${courseId}`,
        {
          progress: currentProgress,
          timeSpent: timeSpentRef.current,
          currentStep: currentProgress >= MAX_PROGRESS_PERCENT ? 3 : 2,
        }
      );
    } catch (err) {
      console.error('Failed to save progress:', err);
      // 사용자에게 에러 알림
      toast({
        title: "진행률 저장 실패",
        description: "네트워크 연결을 확인해주세요. 다시 시도합니다.",
        variant: "destructive",
      });
      // 에러 발생 시 재시도 가능하도록 플래그 해제
    } finally {
      isSavingRef.current = false;
    }
  }, [course, courseId, user?.id, toast]);

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
    // If duration is 0, save 100% progress immediately
    if (course && course.duration === 0 && progressLoaded) {
      saveProgress();
    }
  }, [course, saveProgress, progressLoaded]);

  // Timer effect - update time and save progress periodically (always running)
  useEffect(() => {
    if (!progressLoaded) return; // Wait until progress is loaded

    const interval = setInterval(() => {
      setTimeSpent(prevTime => prevTime + 1);
    }, PROGRESS_TIMER_INTERVAL);

    // Save progress every PROGRESS_SAVE_INTERVAL milliseconds
    const saveInterval = setInterval(() => {
      saveProgress();
    }, PROGRESS_SAVE_INTERVAL);

    return () => {
      clearInterval(interval);
      clearInterval(saveInterval);
    };
  }, [progressLoaded, saveProgress]);

  // Save progress on unmount
  useEffect(() => {
    return () => {
      saveProgress();
    };
  }, [saveProgress]);


  const handleStartAssessment = () => {
    setIsNavigatingToAssessment(true);
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
  const hasAttachments = course.attachments && course.attachments.length > 0;

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

            {/* Media Player - Only show if there's audio or video */}
            {(hasAudio || hasVideo) && (
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

                </CardContent>
              </Card>
            )}

            {/* Multi-Media Attachments Display */}
            {course.attachments && course.attachments.length > 0 && (
              <>
                {/* Display videos */}
                {course.attachments.filter(a => a.type === 'video').length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl korean-text">동영상</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {course.attachments.filter(a => a.type === 'video').map((file, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <video src={file.url} controls className="w-full rounded max-h-[600px]" />
                          <p className="text-sm mt-2 truncate korean-text">{file.name}</p>
                          {file.size > 0 && <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Display YouTube videos */}
                {course.attachments.filter(a => a.type === 'youtube').length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl korean-text">YouTube 동영상</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {course.attachments.filter(a => a.type === 'youtube').map((file, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="aspect-video">
                            <iframe src={getYouTubeEmbedUrl(file.url)} className="w-full h-full rounded" allowFullScreen />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Display audio */}
                {course.attachments.filter(a => a.type === 'audio').length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl korean-text">오디오</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {course.attachments.filter(a => a.type === 'audio').map((file, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <audio src={file.url} controls className="w-full" />
                          <p className="text-sm mt-2 truncate korean-text">{file.name}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            )}

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
            <Card>
              <CardHeader>
                <CardTitle className="korean-text">학습 진행 상황</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm korean-text">완료율</span>
                    <span className="text-sm font-medium">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} />
                </div>
                <div className="text-sm text-muted-foreground korean-text">
                  {progressPercent >= 100 ? '교육을 완료했습니다!' : '교육을 계속 진행하세요'}
                </div>
              </CardContent>
            </Card>

            {isVideoComplete && (
              <Card>
                <CardHeader>
                  <CardTitle className="korean-text">다음 단계</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleStartAssessment}
                    className="w-full korean-text"
                    disabled={isNavigatingToAssessment}
                  >
                    {isNavigatingToAssessment ? '평가 페이지로 이동 중...' : '평가 시작하기'}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2 korean-text">
                    교육 완료 후 평가를 진행하세요
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}