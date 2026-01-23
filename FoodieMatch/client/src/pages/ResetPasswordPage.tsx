import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useRoute, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function ResetPasswordPage() {
  const [, params] = useRoute('/reset-password/:token');
  const token = params?.token || '';

  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [tokenError, setTokenError] = useState('');
  const [userName, setUserName] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  // 토큰 유효성 확인
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenStatus('invalid');
        setTokenError('유효하지 않은 링크입니다.');
        return;
      }

      try {
        const response = await fetch(`/api/auth/reset-password/${token}`);
        const data = await response.json();

        if (response.ok && data.valid) {
          setTokenStatus('valid');
          setUserName(data.name || data.username || '');
        } else {
          setTokenStatus('invalid');
          setTokenError(data.message || '유효하지 않은 링크입니다.');
        }
      } catch (err) {
        setTokenStatus('invalid');
        setTokenError('토큰 확인 중 오류가 발생했습니다.');
      }
    };

    verifyToken();
  }, [token]);

  // 비밀번호 재설정
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (newPassword.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      toast({ title: '오류', description: '비밀번호는 8자 이상이어야 합니다.', variant: 'destructive' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      toast({ title: '오류', description: '비밀번호가 일치하지 않습니다.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '비밀번호 재설정에 실패했습니다.');
      }

      setSuccess(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 성공 화면
  if (success) {
    return (
      <div>
        <Header />
        <main className="container mx-auto p-4 lg:p-6 flex justify-center items-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">비밀번호 변경 완료</h2>
              <p className="text-muted-foreground mb-6">
                비밀번호가 성공적으로 변경되었습니다.<br />
                새 비밀번호로 로그인해주세요.
              </p>
              <Button asChild className="w-full">
                <Link href="/login">로그인 페이지로 이동</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // 로딩 화면
  if (tokenStatus === 'loading') {
    return (
      <div>
        <Header />
        <main className="container mx-auto p-4 lg:p-6 flex justify-center items-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">링크 확인 중...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // 유효하지 않은 토큰
  if (tokenStatus === 'invalid') {
    return (
      <div>
        <Header />
        <main className="container mx-auto p-4 lg:p-6 flex justify-center items-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">링크가 유효하지 않습니다</h2>
              <p className="text-muted-foreground mb-6">{tokenError}</p>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/forgot-password">비밀번호 재설정 다시 요청</Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/login">로그인 페이지로 이동</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // 비밀번호 입력 폼
  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6 flex justify-center items-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="p-6">
            <CardTitle className="text-xl sm:text-2xl">새 비밀번호 설정</CardTitle>
            <CardDescription>
              {userName ? `${userName}님, ` : ''}새로운 비밀번호를 입력해주세요
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-medium">
                  새 비밀번호
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8자 이상 입력"
                    className="pr-10 h-11"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  비밀번호 확인
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="비밀번호 다시 입력"
                    className="pr-10 h-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    비밀번호가 일치하지 않습니다
                  </p>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="font-medium mb-1">비밀번호 요구사항:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li className={newPassword.length >= 8 ? 'text-green-600' : ''}>
                    8자 이상
                  </li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isLoading || newPassword !== confirmPassword || newPassword.length < 8}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? '변경 중...' : '비밀번호 변경'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
