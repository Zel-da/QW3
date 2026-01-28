import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPageLayout, PageHeader } from "@/components/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState, useCallback } from "react";
import { Mail, Send, Settings, BarChart3, CheckCircle2, XCircle, Clock, Server, Loader2, Plus, Trash2, Code, FileText, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SimpleEmailConfig {
  id: string;
  emailType: string;
  subject: string;
  content: string;
  enabled: boolean;
  sendTiming: string;
  daysAfter: number | null;
  scheduledTime: string | null;
  monthlyDay: number | null;
  createdAt: string;
  updatedAt: string;
}

interface EmailLog {
  id: string;
  emailType: string;
  recipientEmail: string;
  subject: string;
  sentAt: string;
  status: string;
  errorMessage: string | null;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  successRate: number;
  byType: Array<{ emailType: string; count: number }>;
}

const EMAIL_TYPE_NAMES: Record<string, string> = {
  EXEC_SIGNATURE_REQUEST: "임원 서명 요청",
  EXEC_SIGNATURE_COMPLETE: "임원 서명 완료",
  TBM_REMINDER: "TBM 미작성 알림",
  EDUCATION_REMINDER: "안전교육 미수강 알림",
  INSPECTION_REMINDER: "안전점검 미작성 알림",
  PASSWORD_RESET: "관리자 비밀번호 초기화",
  PASSWORD_RESET_LINK: "비밀번호 찾기 링크",
  FIND_USERNAME: "아이디 찾기",
  APPROVAL_REQUEST: "결재 요청",
  APPROVAL_APPROVED: "결재 승인",
  APPROVAL_REJECTED: "결재 반려",
};

const SEND_TIMING_NAMES: Record<string, string> = {
  IMMEDIATE: "즉시",
  AFTER_N_DAYS: "N일 후",
  SCHEDULED_TIME: "특정 시간",
  MONTHLY_DAY: "월별 특정일"
};

// 이메일 타입별 사용 가능한 변수 목록
const EMAIL_TYPE_VARIABLES: Record<string, Array<{ name: string; desc: string }>> = {
  EDUCATION_REMINDER: [
    { name: "USER_NAME", desc: "사용자 이름" },
    { name: "COURSE_NAME", desc: "교육명" },
    { name: "DUE_DATE", desc: "마감일" },
    { name: "PROGRESS", desc: "진행률(%)" },
    { name: "COURSE_URL", desc: "교육 링크" },
  ],
  TBM_REMINDER: [
    { name: "USER_NAME", desc: "사용자 이름" },
    { name: "DATE", desc: "날짜" },
    { name: "TEAM_NAME", desc: "팀명" },
    { name: "DAYS_OVERDUE", desc: "초과 일수" },
    { name: "TBM_URL", desc: "TBM 링크" },
  ],
  INSPECTION_REMINDER: [
    { name: "USER_NAME", desc: "사용자 이름" },
    { name: "MONTH", desc: "월" },
    { name: "TEAM_NAME", desc: "팀명" },
    { name: "INSPECTION_URL", desc: "점검 링크" },
  ],
  EXEC_SIGNATURE_REQUEST: [
    { name: "MONTH", desc: "월" },
    { name: "REPORT_NAME", desc: "보고서명" },
    { name: "TEAM_NAME", desc: "팀명" },
    { name: "CREATED_DATE", desc: "생성일" },
    { name: "REPORT_URL", desc: "보고서 링크" },
  ],
  EXEC_SIGNATURE_COMPLETE: [
    { name: "MONTH", desc: "월" },
    { name: "REPORT_NAME", desc: "보고서명" },
    { name: "SIGNER_NAME", desc: "서명자" },
    { name: "SIGNER_ROLE", desc: "서명자 직급" },
    { name: "SIGNED_DATE", desc: "서명일" },
    { name: "REPORT_URL", desc: "보고서 링크" },
  ],
  PASSWORD_RESET: [
    { name: "USER_NAME", desc: "사용자 이름" },
    { name: "TEMP_PASSWORD", desc: "임시 비밀번호" },
    { name: "LOGIN_URL", desc: "로그인 링크" },
  ],
  PASSWORD_RESET_LINK: [
    { name: "USER_NAME", desc: "사용자 이름" },
    { name: "RESET_URL", desc: "재설정 링크" },
  ],
  FIND_USERNAME: [
    { name: "USER_NAME", desc: "사용자 이름" },
    { name: "USERNAME", desc: "아이디" },
    { name: "LOGIN_URL", desc: "로그인 링크" },
  ],
  APPROVAL_REQUEST: [
    { name: "APPROVER_NAME", desc: "결재자" },
    { name: "REQUESTER_NAME", desc: "요청자" },
    { name: "TEAM_NAME", desc: "팀명" },
    { name: "YEAR", desc: "연도" },
    { name: "MONTH", desc: "월" },
    { name: "APPROVAL_URL", desc: "결재 링크" },
  ],
  APPROVAL_APPROVED: [
    { name: "REQUESTER_NAME", desc: "요청자" },
    { name: "APPROVER_NAME", desc: "결재자" },
    { name: "TEAM_NAME", desc: "팀명" },
    { name: "YEAR", desc: "연도" },
    { name: "MONTH", desc: "월" },
    { name: "APPROVED_AT", desc: "승인 일시" },
  ],
  APPROVAL_REJECTED: [
    { name: "REQUESTER_NAME", desc: "요청자" },
    { name: "APPROVER_NAME", desc: "결재자" },
    { name: "TEAM_NAME", desc: "팀명" },
    { name: "YEAR", desc: "연도" },
    { name: "MONTH", desc: "월" },
    { name: "REJECTION_REASON", desc: "반려 사유" },
  ],
};

// 폼 기반 템플릿 데이터 구조
interface TemplateFormData {
  themeColor: string;
  title: string;
  greeting: string;
  bodyLines: string[];
  infoItems: Array<{ label: string; value: string }>;
  actionText: string;
  buttonText: string;
  buttonUrl: string;
  closingText: string;
}

// 기본 테마 색상 (이메일 타입별)
const DEFAULT_THEME_COLORS: Record<string, string> = {
  EDUCATION_REMINDER: "#f59e0b",
  TBM_REMINDER: "#dc2626",
  INSPECTION_REMINDER: "#f59e0b",
  EXEC_SIGNATURE_REQUEST: "#2563eb",
  EXEC_SIGNATURE_COMPLETE: "#10b981",
};

// 폼 데이터 → HTML 변환
function generateEmailHtml(data: TemplateFormData): string {
  const lines: string[] = [];
  lines.push(`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">`);
  lines.push(`  <h2 style="color: ${data.themeColor};">${data.title}</h2>`);

  if (data.greeting) {
    lines.push(`  <p>${data.greeting}</p>`);
  }

  for (const line of data.bodyLines) {
    if (line.trim()) {
      lines.push(`  <p>${line}</p>`);
    }
  }

  if (data.infoItems.length > 0) {
    for (const item of data.infoItems) {
      if (item.label && item.value) {
        lines.push(`  <p><strong>${item.label}:</strong> ${item.value}</p>`);
      }
    }
  }

  if (data.actionText) {
    lines.push(`  <p>${data.actionText}</p>`);
  }

  if (data.buttonText && data.buttonUrl) {
    lines.push(`  <p><a href="${data.buttonUrl}" style="background-color: ${data.themeColor}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">${data.buttonText}</a></p>`);
  }

  if (data.closingText) {
    lines.push(`  <p>${data.closingText}</p>`);
  }

  lines.push(`</div>`);
  return lines.join('\n');
}

// HTML → 폼 데이터 파싱 (기존 템플릿 호환)
function parseEmailHtml(html: string, emailType: string): TemplateFormData {
  const result: TemplateFormData = {
    themeColor: DEFAULT_THEME_COLORS[emailType] || "#2563eb",
    title: "",
    greeting: "",
    bodyLines: [],
    infoItems: [],
    actionText: "",
    buttonText: "",
    buttonUrl: "",
    closingText: "",
  };

  // h2 태그에서 색상과 제목 추출
  const h2Match = html.match(/<h2[^>]*?(?:color:\s*([^;"]+))?[^>]*>([\s\S]*?)<\/h2>/);
  if (h2Match) {
    if (h2Match[1]) result.themeColor = h2Match[1].trim();
    result.title = h2Match[2].trim();
  }

  // 버튼 추출 (a 태그)
  const btnMatch = html.match(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
  if (btnMatch) {
    result.buttonUrl = btnMatch[1].trim();
    result.buttonText = btnMatch[2].trim();
  }

  // p 태그들 추출
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
  let match;
  const paragraphs: string[] = [];
  while ((match = pRegex.exec(html)) !== null) {
    const content = match[1].trim();
    // 버튼이 포함된 p는 건너뜀
    if (content.includes('<a ') && content.includes('href=')) continue;
    paragraphs.push(content);
  }

  // 문단 분류
  let greetingFound = false;
  for (const p of paragraphs) {
    // 인사말 감지 (첫 번째 "님" 포함 문단)
    if (!greetingFound && (p.includes('님') || p.includes('안녕하세요'))) {
      result.greeting = p;
      greetingFound = true;
      continue;
    }

    // 강조 항목 감지 (<strong>라벨:</strong> 값)
    const strongMatch = p.match(/^<strong>(.*?):<\/strong>\s*(.+)$/);
    if (strongMatch) {
      result.infoItems.push({ label: strongMatch[1].trim(), value: strongMatch[2].trim() });
      continue;
    }

    // 마지막 "감사합니다" 류
    if (p === "감사합니다." || p === "감사합니다") {
      result.closingText = p;
      continue;
    }

    // 나머지는 본문 또는 액션 텍스트
    result.bodyLines.push(p);
  }

  // bodyLines가 비어있으면 기본 한 줄 추가
  if (result.bodyLines.length === 0) {
    result.bodyLines.push("");
  }

  return result;
}

interface SmtpConfig {
  host: string;
  port: string;
  user: string;
  from: string;
  hasPassword?: boolean;
}

export default function EmailSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingEmail, setEditingEmail] = useState<SimpleEmailConfig | null>(null);
  const [templateForm, setTemplateForm] = useState<TemplateFormData | null>(null);
  const [editorMode, setEditorMode] = useState<"form" | "html">("form");
  const [testEmail, setTestEmail] = useState("");
  const [smtpVerified, setSmtpVerified] = useState<boolean | null>(null);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [smtpErrorMessage, setSmtpErrorMessage] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);

  // 편집 시작 시 폼 데이터 초기화
  const startEditing = useCallback((config: SimpleEmailConfig) => {
    setEditingEmail(config);
    setTemplateForm(parseEmailHtml(config.content, config.emailType));
    setEditorMode("form");
  }, []);

  // 폼 데이터 변경 시 HTML 자동 생성
  const updateFormField = useCallback(<K extends keyof TemplateFormData>(field: K, value: TemplateFormData[K]) => {
    if (!templateForm || !editingEmail) return;
    const updated = { ...templateForm, [field]: value };
    setTemplateForm(updated);
    setEditingEmail({ ...editingEmail, content: generateEmailHtml(updated) });
  }, [templateForm, editingEmail]);

  // Fetch email configurations
  const { data: configs = [], isLoading } = useQuery<SimpleEmailConfig[]>({
    queryKey: ["/api/email/configs"],
  });

  // Fetch email statistics
  const { data: stats } = useQuery<EmailStats>({
    queryKey: ["/api/email/stats"],
  });

  // Fetch recent email logs
  const { data: logsData } = useQuery<{ logs: EmailLog[]; pagination: any }>({
    queryKey: ["/api/email/logs"],
  });

  // Update email configuration
  const updateMutation = useMutation({
    mutationFn: async (data: { emailType: string; updates: Partial<SimpleEmailConfig> }) => {
      const res = await apiRequest("PUT", `/api/email/configs/${data.emailType}`, data.updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/configs"] });
      toast({ title: "저장 완료", description: "이메일 설정이 업데이트되었습니다." });
      setEditingEmail(null);
    },
    onError: (error: Error) => {
      toast({
        title: "저장 실패",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  // Send test email
  const testMutation = useMutation({
    mutationFn: async (data: { emailType: string; recipientEmail: string }) => {
      const res = await apiRequest("POST", "/api/email/test", {
        emailType: data.emailType,
        recipientEmail: data.recipientEmail,
        variables: {
          USER_NAME: "테스트 사용자",
          COURSE_NAME: "샘플 교육",
          TEAM_NAME: "샘플 팀",
          MONTH: "12",
          DATE: "2024-12-01",
          DAYS_OVERDUE: 3,
          DUE_DATE: "2024-12-31",
          PROGRESS: 50,
          REPORT_NAME: "샘플 보고서",
          CREATED_DATE: "2024-12-01",
          SIGNER_NAME: "홍길동",
          SIGNER_ROLE: "임원",
          SIGNED_DATE: "2024-12-01",
          REPORT_URL: window.location.origin,
          TBM_URL: `${window.location.origin}/tbm`,
          COURSE_URL: `${window.location.origin}/courses`,
          INSPECTION_URL: `${window.location.origin}/safety-inspection`,
          APPROVAL_URL: `${window.location.origin}/approval`,
          APPROVER_NAME: "테스트 결재자",
          REQUESTER_NAME: "테스트 요청자",
          YEAR: "2026",
          APPROVED_AT: "2026-01-26 10:00",
          REJECTION_REASON: "테스트 반려 사유",
          TEMP_PASSWORD: "test1234",
          RESET_URL: `${window.location.origin}/reset-password/test-token`,
          USERNAME: "testuser",
          LOGIN_URL: `${window.location.origin}/login`,
        }
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "테스트 이메일 발송", description: `${testEmail}로 테스트 이메일이 발송되었습니다.` });
      setTestEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "발송 실패",
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const handleSave = () => {
    if (!editingEmail) return;

    updateMutation.mutate({
      emailType: editingEmail.emailType,
      updates: {
        subject: editingEmail.subject,
        content: editingEmail.content,
        enabled: editingEmail.enabled,
        sendTiming: editingEmail.sendTiming,
        daysAfter: editingEmail.daysAfter,
        scheduledTime: editingEmail.scheduledTime,
        monthlyDay: editingEmail.monthlyDay,
      },
    });
  };

  const handleTestEmail = (emailType: string) => {
    if (!testEmail) {
      toast({
        title: "이메일 주소 필요",
        description: "테스트 이메일을 받을 주소를 입력하세요.",
        variant: "destructive"
      });
      return;
    }

    testMutation.mutate({ emailType, recipientEmail: testEmail });
  };

  // SMTP 연결 테스트
  const verifySmtp = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch("/api/email/verify", {
        credentials: "include"
      });
      const data = await res.json();
      setSmtpVerified(data.success);
      setSmtpConfig(data.config);
      setSmtpErrorMessage(data.success ? '' : (data.message || ''));
      toast({
        title: data.success ? "연결 성공" : "연결 실패",
        description: data.message,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error) {
      toast({
        title: "오류",
        description: "SMTP 연결 확인 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <AdminPageLayout maxWidth="wide">
        <PageHeader
          title="이메일 설정"
          description="자동 발송 이메일 설정을 관리합니다."
          icon={<Mail className="h-6 w-6" />}
          backUrl="/admin-dashboard"
          backText="대시보드"
        />
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">로딩 중...</p>
          </CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout maxWidth="wide">
      <PageHeader
        title="이메일 설정"
        description="자동 발송 이메일 설정을 관리합니다."
        icon={<Mail className="h-6 w-6" />}
        backUrl="/admin-dashboard"
        backText="대시보드"
      />

      <Tabs defaultValue="smtp" className="space-y-6">
          <TabsList>
            <TabsTrigger value="smtp">
              <Server className="w-4 h-4 mr-2" />
              SMTP 설정
            </TabsTrigger>
            <TabsTrigger value="configs">
              <Settings className="w-4 h-4 mr-2" />
              이메일 템플릿
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="w-4 h-4 mr-2" />
              발송 통계
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Mail className="w-4 h-4 mr-2" />
              발송 기록
            </TabsTrigger>
          </TabsList>

          {/* SMTP Settings Tab */}
          <TabsContent value="smtp" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>SMTP 서버 연결 상태</CardTitle>
                <CardDescription>
                  이메일 발송을 위한 SMTP 서버 연결 상태를 확인합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={verifySmtp} disabled={isVerifying}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      확인 중...
                    </>
                  ) : (
                    <>
                      <Server className="w-4 h-4 mr-2" />
                      연결 테스트
                    </>
                  )}
                </Button>

                {smtpVerified !== null && (
                  <div className={`p-4 rounded-lg ${smtpVerified ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center gap-2">
                      {smtpVerified ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                      <span className={smtpVerified ? 'text-green-800 font-medium' : 'text-red-800 font-medium'}>
                        {smtpVerified ? 'SMTP 서버 연결 성공' : 'SMTP 서버 연결 실패'}
                      </span>
                    </div>
                    {!smtpVerified && smtpErrorMessage && (
                      <p className="mt-2 text-sm text-red-700 bg-red-100 p-2 rounded font-mono break-all">
                        {smtpErrorMessage}
                      </p>
                    )}
                  </div>
                )}

                {smtpConfig && (
                  <div className="p-4 bg-muted rounded-lg space-y-3">
                    <h4 className="font-medium text-sm">현재 SMTP 설정</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">호스트:</span>
                        <span className="ml-2 font-mono">{smtpConfig.host}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">포트:</span>
                        <span className="ml-2 font-mono">{smtpConfig.port}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">인증 계정:</span>
                        <span className="ml-2 font-mono">{smtpConfig.user}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">비밀번호:</span>
                        <span className={`ml-2 font-mono ${smtpConfig.hasPassword ? 'text-green-600' : 'text-red-600 font-medium'}`}>
                          {smtpConfig.hasPassword ? '설정됨' : '미설정'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>보내는 사람 설정</CardTitle>
                <CardDescription>
                  이메일에 표시되는 보내는 사람 정보입니다. 환경변수(SMTP_FROM)에서 설정됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm">
                    <span className="text-muted-foreground">현재 설정:</span>
                    <span className="ml-2 font-mono">{smtpConfig?.from || '(연결 테스트를 먼저 실행하세요)'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    * 이 설정을 변경하려면 서버의 환경변수(SMTP_FROM)를 수정해야 합니다.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SMTP 설정 방법</CardTitle>
                <CardDescription>
                  서버 환경변수를 통해 SMTP 설정을 변경할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg space-y-2 text-sm font-mono">
                  <div>SMTP_HOST=메일서버주소</div>
                  <div>SMTP_PORT=25</div>
                  <div>SMTP_USER=계정명 (선택)</div>
                  <div>SMTP_PASSWORD=비밀번호 (선택)</div>
                  <div>SMTP_FROM=보내는사람 &lt;email@domain.com&gt;</div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  설정 변경 후 서버를 재시작해야 적용됩니다.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Configurations Tab */}
          <TabsContent value="configs" className="space-y-4">
            {configs.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle>{EMAIL_TYPE_NAMES[config.emailType]}</CardTitle>
                      {config.enabled ? (
                        <Badge variant="default">활성</Badge>
                      ) : (
                        <Badge variant="secondary">비활성</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (editingEmail?.id === config.id) {
                            setEditingEmail(null);
                            setTemplateForm(null);
                          } else {
                            startEditing(config);
                          }
                        }}
                      >
                        {editingEmail?.id === config.id ? "닫기" : "편집"}
                      </Button>
                      <div className="flex items-center gap-2">
                        <Input
                          type="email"
                          placeholder="테스트 이메일"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="w-48"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleTestEmail(config.emailType)}
                          disabled={testMutation.isPending}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          테스트
                        </Button>
                      </div>
                    </div>
                  </div>
                  <CardDescription>
                    발송 시점: {SEND_TIMING_NAMES[config.sendTiming]}
                    {config.sendTiming === "AFTER_N_DAYS" && ` (${config.daysAfter}일 후)`}
                    {config.sendTiming === "SCHEDULED_TIME" && ` (${config.scheduledTime})`}
                    {config.sendTiming === "MONTHLY_DAY" && ` (매월 ${config.monthlyDay}일)`}
                  </CardDescription>
                </CardHeader>

                {editingEmail?.id === config.id && templateForm && (
                  <CardContent className="space-y-4">
                    {/* 활성화 토글 */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`enabled-${config.id}`}>활성화</Label>
                      <Switch
                        id={`enabled-${config.id}`}
                        checked={editingEmail.enabled}
                        onCheckedChange={(checked) =>
                          setEditingEmail({ ...editingEmail, enabled: checked })
                        }
                      />
                    </div>

                    {/* 제목 */}
                    <div className="space-y-2">
                      <Label htmlFor={`subject-${config.id}`}>메일 제목</Label>
                      <Input
                        id={`subject-${config.id}`}
                        value={editingEmail.subject}
                        onChange={(e) =>
                          setEditingEmail({ ...editingEmail, subject: e.target.value })
                        }
                      />
                    </div>

                    {/* 사용 가능한 변수 안내 */}
                    {EMAIL_TYPE_VARIABLES[config.emailType] && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-800 mb-2">
                          <Info className="w-4 h-4" />
                          사용 가능한 변수
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {EMAIL_TYPE_VARIABLES[config.emailType].map((v) => (
                            <span
                              key={v.name}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                              title={v.desc}
                              onClick={() => navigator.clipboard.writeText(`{{${v.name}}}`)}
                            >
                              {`{{${v.name}}}`}
                              <span className="ml-1 text-blue-500 font-sans">{v.desc}</span>
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-blue-600 mt-1.5">클릭하면 복사됩니다. 입력란에 붙여넣기 하세요.</p>
                      </div>
                    )}

                    {/* 편집 모드 전환 */}
                    <div className="flex items-center gap-2 border-b pb-3">
                      <Button
                        variant={editorMode === "form" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditorMode("form")}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        간편 편집
                      </Button>
                      <Button
                        variant={editorMode === "html" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEditorMode("html")}
                      >
                        <Code className="w-4 h-4 mr-1" />
                        HTML 직접 편집
                      </Button>
                    </div>

                    {editorMode === "form" ? (
                      <div className="space-y-4">
                        {/* 테마 색상 + 제목 */}
                        <div className="grid grid-cols-[auto_1fr] gap-3">
                          <div className="space-y-2">
                            <Label>테마 색상</Label>
                            <Input
                              type="color"
                              value={templateForm.themeColor}
                              onChange={(e) => updateFormField("themeColor", e.target.value)}
                              className="w-12 h-9 p-1 cursor-pointer"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>본문 제목</Label>
                            <Input
                              value={templateForm.title}
                              onChange={(e) => updateFormField("title", e.target.value)}
                              placeholder="예: 안전교육 미수강 알림"
                            />
                          </div>
                        </div>

                        {/* 인사말 */}
                        <div className="space-y-2">
                          <Label>인사말</Label>
                          <Input
                            value={templateForm.greeting}
                            onChange={(e) => updateFormField("greeting", e.target.value)}
                            placeholder='예: 안녕하세요, {{USER_NAME}}님.'
                          />
                        </div>

                        {/* 본문 */}
                        <div className="space-y-2">
                          <Label>본문 내용</Label>
                          <p className="text-xs text-muted-foreground">줄바꿈은 각각 별도 문단이 됩니다.</p>
                          <Textarea
                            value={templateForm.bodyLines.join('\n')}
                            onChange={(e) => updateFormField("bodyLines", e.target.value.split('\n'))}
                            rows={3}
                            placeholder="예: 필수 안전교육이 아직 완료되지 않았습니다."
                          />
                        </div>

                        {/* 강조 정보 항목 */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>강조 정보</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const items = [...templateForm.infoItems, { label: "", value: "" }];
                                updateFormField("infoItems", items);
                              }}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              항목 추가
                            </Button>
                          </div>
                          {templateForm.infoItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Input
                                value={item.label}
                                onChange={(e) => {
                                  const items = [...templateForm.infoItems];
                                  items[idx] = { ...items[idx], label: e.target.value };
                                  updateFormField("infoItems", items);
                                }}
                                placeholder="항목명 (예: 교육명)"
                                className="w-1/3"
                              />
                              <Input
                                value={item.value}
                                onChange={(e) => {
                                  const items = [...templateForm.infoItems];
                                  items[idx] = { ...items[idx], value: e.target.value };
                                  updateFormField("infoItems", items);
                                }}
                                placeholder="값 (예: {{COURSE_NAME}})"
                                className="flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const items = templateForm.infoItems.filter((_, i) => i !== idx);
                                  updateFormField("infoItems", items);
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        {/* 안내 문구 */}
                        <div className="space-y-2">
                          <Label>안내 문구</Label>
                          <Input
                            value={templateForm.actionText}
                            onChange={(e) => updateFormField("actionText", e.target.value)}
                            placeholder="예: 마감일까지 안전교육을 완료해주시기 바랍니다."
                          />
                        </div>

                        {/* 버튼 */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>버튼 텍스트</Label>
                            <Input
                              value={templateForm.buttonText}
                              onChange={(e) => updateFormField("buttonText", e.target.value)}
                              placeholder="예: 교육 이어보기"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>버튼 링크</Label>
                            <Input
                              value={templateForm.buttonUrl}
                              onChange={(e) => updateFormField("buttonUrl", e.target.value)}
                              placeholder="예: {{COURSE_URL}}"
                            />
                          </div>
                        </div>

                        {/* 마무리 인사 */}
                        <div className="space-y-2">
                          <Label>마무리 인사</Label>
                          <Input
                            value={templateForm.closingText}
                            onChange={(e) => updateFormField("closingText", e.target.value)}
                            placeholder="예: 감사합니다."
                          />
                        </div>

                        {/* 미리보기 */}
                        <div className="space-y-2">
                          <Label>미리보기</Label>
                          <div
                            className="border rounded-lg p-4 bg-white"
                            dangerouslySetInnerHTML={{ __html: editingEmail.content }}
                          />
                        </div>
                      </div>
                    ) : (
                      /* HTML 직접 편집 모드 */
                      <div className="space-y-2">
                        <Label htmlFor={`content-${config.id}`}>내용 (HTML)</Label>
                        <Textarea
                          id={`content-${config.id}`}
                          value={editingEmail.content}
                          onChange={(e) => {
                            setEditingEmail({ ...editingEmail, content: e.target.value });
                            // HTML 직접 편집 시 폼 데이터도 동기화 시도
                            setTemplateForm(parseEmailHtml(e.target.value, config.emailType));
                          }}
                          rows={12}
                          className="font-mono text-sm"
                        />
                      </div>
                    )}

                    {/* 발송 시점 설정 */}
                    <div className="space-y-2">
                      <Label htmlFor={`timing-${config.id}`}>발송 시점</Label>
                      <Select
                        value={editingEmail.sendTiming}
                        onValueChange={(value) =>
                          setEditingEmail({ ...editingEmail, sendTiming: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IMMEDIATE">즉시</SelectItem>
                          <SelectItem value="AFTER_N_DAYS">N일 후</SelectItem>
                          <SelectItem value="SCHEDULED_TIME">특정 시간</SelectItem>
                          <SelectItem value="MONTHLY_DAY">월별 특정일</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editingEmail.sendTiming === "AFTER_N_DAYS" && (
                      <div className="space-y-2">
                        <Label htmlFor={`days-${config.id}`}>며칠 후</Label>
                        <Input
                          id={`days-${config.id}`}
                          type="number"
                          value={editingEmail.daysAfter || 0}
                          onChange={(e) =>
                            setEditingEmail({ ...editingEmail, daysAfter: parseInt(e.target.value) })
                          }
                        />
                      </div>
                    )}

                    {editingEmail.sendTiming === "SCHEDULED_TIME" && (
                      <div className="space-y-2">
                        <Label htmlFor={`time-${config.id}`}>발송 시간 (HH:MM)</Label>
                        <Input
                          id={`time-${config.id}`}
                          type="time"
                          value={editingEmail.scheduledTime || "09:00"}
                          onChange={(e) =>
                            setEditingEmail({ ...editingEmail, scheduledTime: e.target.value })
                          }
                        />
                      </div>
                    )}

                    {editingEmail.sendTiming === "MONTHLY_DAY" && (
                      <div className="space-y-2">
                        <Label htmlFor={`day-${config.id}`}>매월 발송일 (1-31)</Label>
                        <Input
                          id={`day-${config.id}`}
                          type="number"
                          min="1"
                          max="31"
                          value={editingEmail.monthlyDay || 1}
                          onChange={(e) =>
                            setEditingEmail({ ...editingEmail, monthlyDay: parseInt(e.target.value) })
                          }
                        />
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => { setEditingEmail(null); setTemplateForm(null); }}>
                        취소
                      </Button>
                      <Button onClick={handleSave} disabled={updateMutation.isPending}>
                        저장
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">총 발송</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.total || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">성공</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats?.sent || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">실패</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">성공률</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.successRate || 0}%</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>유형별 발송 통계</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이메일 유형</TableHead>
                      <TableHead className="text-right">발송 건수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.byType.map((item) => (
                      <TableRow key={item.emailType}>
                        <TableCell>{EMAIL_TYPE_NAMES[item.emailType] || item.emailType}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>최근 발송 기록</CardTitle>
                <CardDescription>최근 50건의 이메일 발송 기록입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>발송 시간</TableHead>
                      <TableHead>유형</TableHead>
                      <TableHead>수신자</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead>상태</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData?.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            {new Date(log.sentAt).toLocaleString("ko-KR")}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {EMAIL_TYPE_NAMES[log.emailType] || log.emailType}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.recipientEmail}</TableCell>
                        <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                        <TableCell>
                          {log.status === "sent" ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle2 className="w-4 h-4" />
                              성공
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600">
                              <XCircle className="w-4 h-4" />
                              실패
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </AdminPageLayout>
  );
}
