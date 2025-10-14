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
import { ArrowLeft, User, Building, Mail } from "lucide-react";
import { Course } from "@shared/schema";
import { insertUserSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="korean-text" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              대시보드로 돌아가기
            </Button>
          </Link>
        </div>

        <Card className="shadow-lg" data-testid="course-registration-form">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl korean-text" data-testid="course-title">
              {course.title}
            </CardTitle>
            <p className="text-muted-foreground korean-text" data-testid="course-description">
              교육을 시작하기 위해 참가자 정보를 입력해주세요.
            </p>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center korean-text">
                        <User className="w-4 h-4 mr-2" />
                        이름
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="이름을 입력하세요" 
                          {...field} 
                          data-testid="input-username"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center korean-text">
                        <Building className="w-4 h-4 mr-2" />
                        부서
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="부서명을 입력하세요" 
                          {...field} 
                          data-testid="input-department"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center korean-text">
                        <Mail className="w-4 h-4 mr-2" />
                        이메일
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="이메일 주소를 입력하세요" 
                          {...field} 
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground korean-text"
                  disabled={createUserMutation.isPending}
                  data-testid="button-submit-registration"
                >
                  {createUserMutation.isPending ? "등록 중..." : "교육 시작하기"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
