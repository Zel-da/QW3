import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/header";
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
import { useState } from "react";
import { Mail, Send, Settings, BarChart3, CheckCircle2, XCircle, Clock, Server, Loader2 } from "lucide-react";

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
  INSPECTION_REMINDER: "안전점검 미작성 알림"
};

const SEND_TIMING_NAMES: Record<string, string> = {
  IMMEDIATE: "즉시",
  AFTER_N_DAYS: "N일 후",
  SCHEDULED_TIME: "특정 시간",
  MONTHLY_DAY: "월별 특정일"
};

interface SmtpConfig {
  host: string;
  port: string;
  user: string;
  from: string;
}

export default function EmailSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingEmail, setEditingEmail] = useState<SimpleEmailConfig | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [smtpVerified, setSmtpVerified] = useState<boolean | null>(null);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

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
      const res = await fetch(`/api/email/configs/${data.emailType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data.updates),
      });
      if (!res.ok) throw new Error(await res.text());
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
      const res = await fetch("/api/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
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
            REPORT_URL: "http://192.68.10.249:5001",
            TBM_URL: "http://192.68.10.249:5001/tbm",
            COURSE_URL: "http://192.68.10.249:5001/courses",
            INSPECTION_URL: "http://192.68.10.249:5001/safety-inspection",
          }
        }),
      });
      if (!res.ok) throw new Error(await res.text());
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
      <div>
        <Header />
        <main className="container mx-auto p-6">
          <p>로딩 중...</p>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <main className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">이메일 설정</h1>
          <p className="text-muted-foreground">자동 발송 이메일 설정을 관리합니다.</p>
        </div>

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
                  <div className={`flex items-center gap-2 p-4 rounded-lg ${smtpVerified ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    {smtpVerified ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={smtpVerified ? 'text-green-800' : 'text-red-800'}>
                      {smtpVerified ? 'SMTP 서버 연결 성공' : 'SMTP 서버 연결 실패'}
                    </span>
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
                      <div className="col-span-2">
                        <span className="text-muted-foreground">인증 계정:</span>
                        <span className="ml-2 font-mono">{smtpConfig.user}</span>
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
                        onClick={() => setEditingEmail(editingEmail?.id === config.id ? null : config)}
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

                {editingEmail?.id === config.id && (
                  <CardContent className="space-y-4">
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

                    <div className="space-y-2">
                      <Label htmlFor={`subject-${config.id}`}>제목</Label>
                      <Input
                        id={`subject-${config.id}`}
                        value={editingEmail.subject}
                        onChange={(e) =>
                          setEditingEmail({ ...editingEmail, subject: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`content-${config.id}`}>내용 (HTML)</Label>
                      <Textarea
                        id={`content-${config.id}`}
                        value={editingEmail.content}
                        onChange={(e) =>
                          setEditingEmail({ ...editingEmail, content: e.target.value })
                        }
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </div>

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
                      <Button variant="outline" onClick={() => setEditingEmail(null)}>
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
      </main>
    </div>
  );
}
