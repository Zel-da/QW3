import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface Team {
  id: number;
  name: string;
}

const fetchTeams = async (site: string): Promise<Team[]> => {
  const res = await fetch(`/api/teams?site=${site}`);
  if (!res.ok) {
    throw new Error('Failed to fetch teams');
  }
  return res.json();
};

const calculatePasswordStrength = (password: string): { strength: number; label: string; color: string } => {
  let strength = 0;

  if (password.length >= 8) strength += 25;
  if (password.length >= 12) strength += 15;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15;

  if (strength <= 40) return { strength, label: '약함', color: 'bg-red-500' };
  if (strength <= 70) return { strength, label: '보통', color: 'bg-yellow-500' };
  return { strength, label: '강함', color: 'bg-green-500' };
};

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    teamId: '',
    site: '아산', // Default to '아산'
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: teams, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['teams', formData.site],
    queryFn: () => fetchTeams(formData.site),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleTeamChange = (value: string) => {
    setFormData({ ...formData, teamId: value });
  };

  const handleSiteChange = (value: string) => {
    setFormData({ ...formData, site: value });
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // 검증: 사용자명 형식
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(formData.username)) {
      setError('사용자 ID는 3-20자의 영문, 숫자, 언더스코어(_)만 사용 가능합니다.');
      return;
    }

    // 검증: 이메일 형식
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (formData.password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || '회원가입에 실패했습니다.');
      }

      setSuccess('회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

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
          <CardHeader>
            <CardTitle className="text-2xl text-center">회원가입</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">사용자 ID</Label>
                <Input id="username" name="username" type="text" required onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input id="name" name="name" type="text" required onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input id="email" name="email" type="email" required onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호 (8자 이상)</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    onChange={handleChange}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">비밀번호 강도</span>
                      <span className={`font-medium ${
                        passwordStrength.label === '강함' ? 'text-green-600' :
                        passwordStrength.label === '보통' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.strength}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <div className="flex items-center gap-2 text-sm">
                    {formData.password === confirmPassword ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">비밀번호가 일치합니다</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600">비밀번호가 일치하지 않습니다</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>소속 현장</Label>
                <RadioGroup defaultValue={formData.site} onValueChange={handleSiteChange} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="아산" id="site-asan" />
                    <Label htmlFor="site-asan">아산</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="화성" id="site-hwaseong" />
                    <Label htmlFor="site-hwaseong">화성</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="team">팀 선택</Label>
                <Select onValueChange={handleTeamChange} name="teamId">
                  <SelectTrigger id="team">
                    <SelectValue placeholder={isLoadingTeams ? "팀 목록 로딩 중..." : "팀을 선택하세요"} />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map(team => (
                      <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-600">{success}</p>}
              <Button type="submit" className="w-full" disabled={isLoading || isLoadingTeams}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? '가입 처리 중...' : '가입하기'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                <p>이미 계정이 있으신가요? <a href="/login" className="text-primary hover:underline">로그인</a></p>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}