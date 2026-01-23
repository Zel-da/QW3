import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 검증: 빈 필드 체크
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('사용자 ID와 비밀번호를 모두 입력해주세요.');
      toast({ title: '오류', description: '사용자 ID와 비밀번호를 모두 입력해주세요.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '로그인에 실패했습니다.');
      }

      // Refresh the user context to get the new session data
      await refreshUser();

      // Handle redirect after login
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect');
      const redirectTo = redirect ? decodeURIComponent(redirect) : '/';
      setLocation(redirectTo);

    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6 flex justify-center items-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="p-6">
            <CardTitle className="text-xl sm:text-2xl text-center">로그인</CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">사용자 ID</Label>
                <Input id="username" name="username" type="text" required onChange={handleChange} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    onChange={handleChange}
                    className="pr-10 h-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? '로그인 중...' : '로그인'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <p><a href="/forgot-password" className="text-primary hover:underline">아이디/비밀번호를 잊으셨나요?</a></p>
                <p className="mt-2">계정이 없으신가요? <a href="/register" className="text-primary hover:underline">회원가입</a></p>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
