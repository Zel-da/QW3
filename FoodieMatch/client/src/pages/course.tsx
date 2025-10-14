import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Header } from "@/components/header";
import { ArrowLeft, User, Building, Mail, PlayCircle } from "lucide-react";
import { Course } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { z } from "zod";

const userFormSchema = insertUserSchema.extend({
  username: z.string().min(2, "이름은 2글자 이상이어야 합니다."),
  email: z.string().email("올바른 이메일 주소를 입력하세요."),
  department: z.string().min(2, "부서명은 2글자 이상이어야 합니다."),
});

export default function CoursePage() {
  const { id: courseId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: course, isLoading } = useQuery<Course>({
    queryKey: ["/api/courses", courseId],
    enabled: !!courseId,
  });

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      department: "",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: z.infer<typeof userFormSchema>) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: (user) => {
      toast({
        title: "사용자 등록 완료",
        description: "교육을 시작할 수 있습니다.",
      });
      
      // Store user ID in local storage for this demo
      localStorage.setItem("currentUserId", user.id);
      
      // Navigate to course content
      setLocation(`/course/${courseId}/content`);
    },
    onError: () => {
      toast({
        title: "오류",
        description: "사용자 등록 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof userFormSchema>) => {
    createUserMutation.mutate(values);
  };

  if (isLoading) {
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

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="text-center korean-text">
            <div className="text-lg">과정을 찾을 수 없습니다.</div>
            <Link href="/">
              <Button className="mt-4">대시보드로 돌아가기</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleStartCourse = () => {
    if (user) {
      setLocation(`/course/${courseId}/content`);
    } else {
      setLocation('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/education">
            <Button variant="ghost" className="korean-text" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              교육 목록으로 돌아가기
            </Button>
          </Link>
        </div>

        {user ? (
          <Card className="shadow-lg" data-testid="course-start-card">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl korean-text" data-testid="course-title">
                {course.title}
              </CardTitle>
              <p className="text-muted-foreground korean-text mt-4" data-testid="course-description">
                {course.description}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">교육 시간</p>
                  <p className="font-semibold">{course.duration}분</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">교육 유형</p>
                  <p className="font-semibold">
                    {course.type === 'workplace-safety' ? '작업장 안전' : 
                     course.type === 'hazard-prevention' ? '위험 예방' : 'TBM 활동'}
                  </p>
                </div>
              </div>

              <Button
                onClick={handleStartCourse}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground korean-text"
                size="lg"
                data-testid="button-start-course"
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                교육 시작하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg" data-testid="course-login-required">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl korean-text" data-testid="course-title">
                {course.title}
              </CardTitle>
              <p className="text-muted-foreground korean-text" data-testid="course-description">
                교육을 시작하려면 로그인이 필요합니다.
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <Button
                onClick={() => setLocation('/login')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground korean-text"
                size="lg"
              >
                로그인하러 가기
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
