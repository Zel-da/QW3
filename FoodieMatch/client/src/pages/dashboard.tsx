import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { CourseCard } from "@/components/course-card";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChartLine, Shield, BookOpen, MessageSquare, ClipboardList, Clock, Tag, Award } from "lucide-react";
import { Course, UserProgress, UserAssessment } from "@shared/schema";
import { PROGRESS_STEPS } from "@/lib/constants";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { NoticePopup } from "@/components/notice-popup";

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: courses = [], isLoading: coursesLoading } = useQuery<Course[]>({ 
    queryKey: ["/api/courses"],
  });

  const { data: userProgress = [], isLoading: userProgressLoading } = useQuery<UserProgress[]>({
    queryKey: ["/api/users", user?.id, "progress"],
    enabled: !!user?.id,
  });

  const { data: userAssessments = [], isLoading: assessmentsLoading } = useQuery<UserAssessment[]>({
    queryKey: ["/api/users", user?.id, "assessments"],
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation('/login');
    }
  }, [authLoading, user, setLocation]);

  const handleStartCourse = (courseId: string) => {
    if (!user) {
      setLocation('/login');
      return;
    }
    window.location.href = `/course/${courseId}`;
  };

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === 1) return "completed"; // Step 1 is always done if you're here

    const totalCourses = courses.length;
    if (totalCourses === 0) {
        return "completed";
    }

    const startedCourses = userProgress.filter(p => p.progress > 0).length;
    const videosCompleted = userProgress.filter(p => p.progress === 100).length;
    const testsPassed = userProgress.filter(p => p.completed === true).length;

    if (stepNumber === 2) { // Video watching
      if (videosCompleted === totalCourses) return "completed";
      if (startedCourses > 0) return "in-progress";
      return "waiting";
    }

    if (stepNumber === 3) { // Test taking
      if (testsPassed === totalCourses) return "completed";
      if (videosCompleted === totalCourses || testsPassed > 0) return "in-progress";
      return "waiting";
    }

    return "waiting";
  };

  if (authLoading || coursesLoading || userProgressLoading || assessmentsLoading) {
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

  // The user check is now handled by the useEffect hook
  if (!user) {
    return null; // Render nothing while the redirect is happening
  }

  const completedCourses = userProgress.filter(p => p.completed).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12" data-testid="hero-section">
          <h1 className="text-4xl font-bold text-foreground korean-text mb-4">
            안전관리 교육 프로그램
          </h1>
          <div className="mb-4">
            <Link href="/my-certificates">
              <Button variant="outline">
                <Award className="w-4 h-4 mr-2" />
                내 이수 현황
              </Button>
            </Link>
          </div>
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
                완료한 과정: {completedCourses} / {courses.length}
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
            const assessment = userAssessments.find(a => a.courseId === course.id);
            return (
              <CourseCard
                key={course.id}
                course={course}
                progress={progress}
                assessment={assessment}
                onStartCourse={handleStartCourse}
              />
            );
          })}
        </div>

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
