import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { Loader2, Mail, User, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "wouter";

export default function ForgotPasswordPage() {
  const [activeTab, setActiveTab] = useState<'username' | 'password'>('password');
  const [email, setEmail] = useState('');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 아이디 찾기
  const handleFindUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/find-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '요청 처리 중 오류가 발생했습니다.');
      }

      setSuccess(true);
      setSuccessMessage(data.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 비밀번호 찾기
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!usernameOrEmail.trim()) {
      setError('아이디 또는 이메일을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      // 이메일 형식인지 확인
      const isEmail = usernameOrEmail.includes('@');
      const payload = isEmail
        ? { email: usernameOrEmail.trim() }
        : { username: usernameOrEmail.trim() };

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '요청 처리 중 오류가 발생했습니다.');
      }

      setSuccess(true);
      setSuccessMessage(data.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'username' | 'password');
    setError('');
    setSuccess(false);
    setEmail('');
    setUsernameOrEmail('');
  };

  if (success) {
    return (
      <div>
        <Header />
        <main className="container mx-auto p-4 lg:p-6 flex justify-center items-center min-h-[80vh]">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {activeTab === 'username' ? '아이디 찾기 요청 완료' : '비밀번호 재설정 요청 완료'}
              </h2>
              <p className="text-muted-foreground mb-6">{successMessage}</p>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/login">로그인 페이지로 이동</Link>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                    setUsernameOrEmail('');
                  }}
                >
                  다시 요청하기
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-4 lg:p-6 flex justify-center items-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="p-6">
            <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="w-4 h-4 mr-1" />
              로그인으로 돌아가기
            </Link>
            <CardTitle className="text-xl sm:text-2xl">계정 찾기</CardTitle>
            <CardDescription>아이디 또는 비밀번호를 찾을 수 있습니다</CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="username" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  아이디 찾기
                </TabsTrigger>
                <TabsTrigger value="password" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  비밀번호 찾기
                </TabsTrigger>
              </TabsList>

              <TabsContent value="username">
                <form onSubmit={handleFindUsername} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="find-email" className="text-sm font-medium">
                      가입 시 등록한 이메일
                    </Label>
                    <Input
                      id="find-email"
                      type="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      등록된 이메일로 아이디 정보가 발송됩니다.
                    </p>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? '처리 중...' : '아이디 찾기'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="password">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-input" className="text-sm font-medium">
                      아이디 또는 이메일
                    </Label>
                    <Input
                      id="reset-input"
                      type="text"
                      placeholder="아이디 또는 이메일 입력"
                      value={usernameOrEmail}
                      onChange={(e) => setUsernameOrEmail(e.target.value)}
                      className="h-11"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      등록된 이메일로 비밀번호 재설정 링크가 발송됩니다.
                    </p>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? '처리 중...' : '비밀번호 재설정 링크 받기'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
              <p>문제가 해결되지 않으면 관리자에게 문의해주세요.</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
