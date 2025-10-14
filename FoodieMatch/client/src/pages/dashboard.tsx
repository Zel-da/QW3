import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { CourseCard } from "@/components/course-card";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartLine, Shield, BookOpen, MessageSquare, ClipboardList, Clock, Tag } from "lucide-react";
import { Course, UserProgress } from "@shared/schema";
import { PROGRESS_STEPS } from "@/lib/constants";
import { Link } from "wouter";

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  // Initialize user on app load
  useEffect(() => {
    const initializeUser = async () => {
      let userId: string | null = localStorage.getItem("currentUserId");
      
      if (!userId) {
        // Create a demo user for this session
        try {
          const response = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: "데모 사용자",
              email: "demo@example.com",
              department: "안전관리팀",
            }),
          });
          
          if (response.ok) {
            const user = await response.json();
            if (user?.id) {
              userId = user.id as string;
              localStorage.setItem("currentUserId", userId);
            } else {
              userId = "demo-user";
              localStorage.setItem("currentUserId", userId);
            }
          } else {
            // Fallback if response not ok
            userId = "demo-user";
            localStorage.setItem("currentUserId", userId);
          }
        } catch (error) {
          console.error("Failed to create demo user:", error);
          // Fallback to a static ID
          userId = "demo-user";
          localStorage.setItem("currentUserId", userId);
        }
      }
      
      if (userId) {
        setCurrentUser(userId);
      }
    };

    initializeUser();
  }, []);

  const { data: userProgress = [] } = useQuery<UserProgress[]>({
    queryKey: ["/api/users", currentUser, "progress"],
    enabled: !!currentUser,
  });

  // Debug logging
  console.log("Dashboard - Current User:", currentUser);
  console.log("Dashboard - User Progress:", userProgress);

  const handleStartCourse = (courseId: string) => {
    // Navigate to course page
    window.location.href = `/course/${courseId}`;
  };

  const calculateOverallProgress = () => {
    if (userProgress.length === 0) return 0;
    const totalProgress = userProgress.reduce((sum, p) => sum + p.progress, 0);
    return Math.round(totalProgress / userProgress.length);
  };

  const getStepStatus = (stepNumber: number) => {
    const overallProgress = calculateOverallProgress();
    if (stepNumber === 1) return "completed";
    if (stepNumber === 2 && overallProgress > 0) return overallProgress === 100 ? "completed" : "in-progress";
    if (stepNumber === 3 && overallProgress === 100) return "waiting";
    return "waiting";
  };

  if (coursesLoading || !currentUser) {
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

  const overallProgress = calculateOverallProgress();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12" data-testid="hero-section">
          <h1 className="text-4xl font-bold text-foreground mb-4 korean-text">
            안전관리 교육 프로그램
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto korean-text">
            교육 과정에 참여하세요
          </p>
        </div>

        {/* Progress Overview */}
        <Card className="mb-8 shadow-sm" data-testid="progress-overview">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center korean-text">
                <ChartLine className="text-primary mr-3 w-5 h-5" />
                교육 진행 과정
              </h2>
              <span className="text-sm text-muted-foreground" data-testid="overall-progress">
                전체 진행률: {overallProgress}%
              </span>
            </div>
            
            {/* Progress Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PROGRESS_STEPS.map((step) => {
                const status = getStepStatus(step.number);
                const icons = {
                  'clipboard-list': ClipboardList,
                  'clock': Clock,
                  'certificate': Tag,
                };
                const Icon = icons[step.icon as keyof typeof icons] || ClipboardList;

                return (
                  <div 
                    key={step.number}
                    className="flex items-center space-x-4 p-4 bg-secondary rounded-lg"
                    data-testid={`progress-step-${step.number}`}
                  >
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        status === 'completed' ? 'bg-primary' :
                        status === 'in-progress' ? 'bg-orange-500' : 'bg-gray-300'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          status === 'completed' ? 'text-primary-foreground' :
                          status === 'in-progress' ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground korean-text">
                        {step.number}단계: {step.title}
                      </h3>
                      <p className="text-sm text-muted-foreground korean-text">
                        {step.description}
                      </p>
                      <div className="mt-2">
                        <div className={`flex items-center text-sm ${
                          status === 'completed' ? 'text-green-600' :
                          status === 'in-progress' ? 'text-orange-600' : 'text-gray-500'
                        }`}>
                          {status === 'completed' && <><Tag className="mr-1 w-3 h-3" />완료됨</>}
                          {status === 'in-progress' && <><Clock className="mr-1 w-3 h-3" />진행 중</>}
                          {status === 'waiting' && <><ClipboardList className="mr-1 w-3 h-3" />대기 중</>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Course Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" data-testid="course-cards">
          {courses.map((course) => {
            const progress = userProgress.find(p => p.courseId === course.id);
            console.log(`Course ${course.id} progress:`, progress);
            return (
              <CourseCard
                key={course.id}
                course={course}
                progress={progress}
                onStartCourse={handleStartCourse}
              />
            );
          })}
        </div>

        {/* Additional Resources Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8" data-testid="additional-resources">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <Shield className="text-blue-600 w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold korean-text">진도 관리 시스템</h3>
                  <p className="text-sm text-muted-foreground korean-text">
                    개인별 학습 진도를 저장하여 언제든지 중단된 부분부터 재개할 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <BookOpen className="text-green-600 w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold korean-text">연수 교육 시스템</h3>
                  <p className="text-sm text-muted-foreground korean-text">
                    다양한 멀티미디어 자료를 통해 실제 현장과 같은 생생한 교육을 경험하세요.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                  <MessageSquare className="text-orange-600 w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold korean-text">이수증 발급</h3>
                  <p className="text-sm text-muted-foreground korean-text">
                    모든 교육 과정을 완료하고 평가에 통과하면 공식 이수증이 발급됩니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Platform Guide */}
        <Card className="shadow-sm" data-testid="platform-guide">
          <div className="p-6 border-b border-border">
            <h2 className="text-2xl font-bold text-center korean-text">안전교육 플랫폼 사용 가이드</h2>
            <p className="text-center text-muted-foreground mt-2 korean-text">
              고소작업대, 굴착기, TBM 안전교육을 위한 종합 플랫폼 이용 방법을 안내합니다.
            </p>
          </div>

          <CardContent className="p-6">
            {/* Platform Overview */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center korean-text">
                <Shield className="text-primary mr-2 w-5 h-5" />
                플랫폼 개요
              </h3>
              <div className="bg-secondary p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-4 korean-text">
                  본 플랫폼은 산업안전보건법에 따른 필수 안전교육을 온라인으로 편리하게 이수할 수 있도록 지원하는 시스템입니다. 
                  체계적인 교육 과정을 통해 안전 지식을 함양하고 인증서를 발급받으세요.
                </p>
                
                {/* Program Types */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <div className="font-medium text-blue-800 korean-text">고소작업대</div>
                    <div className="text-sm text-blue-600 korean-text">고소작업대 안전관리</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <div className="font-medium text-orange-800 korean-text">굴착기</div>
                    <div className="text-sm text-orange-600 korean-text">굴착기 안전규칙</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <div className="font-medium text-green-800 korean-text">TBM</div>
                    <div className="text-sm text-green-600 korean-text">작업 전 안전점검</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-muted-foreground korean-text">
            <p>&copy; 2024 안전관리 교육 프로그램. All rights reserved.</p>
            <p className="mt-2">Safety Management Education Program</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
