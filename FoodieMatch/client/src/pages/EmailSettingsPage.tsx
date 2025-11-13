import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Mail, Plus, Edit, Trash2, Eye, Send, Clock, Power, Play, TestTube, FileText, BarChart3, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  EMAIL_CONDITION_TYPES,
  RECIPIENT_TYPE_LABELS,
  CONDITION_CATEGORY_LABELS,
  type ConditionType,
  type RecipientType,
  type EmailCondition as EmailConditionType,
  type EmailSendLog as EmailSendLogType
} from '@shared/emailConditionTypes';

interface EmailTemplate {
  id: string;
  name: string;
  type: string;
  subject: string;
  htmlContent: string;
  variables: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailSchedule {
  id: string;
  name: string;
  templateId: string;
  cronExpression: string;
  description?: string;
  isEnabled: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt: string;
  template: EmailTemplate;
}

interface EmailCondition extends EmailConditionType {
  template: EmailTemplate;
}

interface EmailSendLog extends EmailSendLogType {
  condition?: { name: string; conditionType: string } | null;
  schedule?: { name: string } | null;
}

interface SendLogStats {
  sentToday: number;
  sentThisWeek: number;
  sentThisMonth: number;
  failedTotal: number;
  sentTotal: number;
}

const TEMPLATE_TYPES = [
  { value: 'EDUCATION_REMINDER', label: '교육 미이수자 알림' },
  { value: 'TBM_REMINDER', label: 'TBM 작성 독려' },
  { value: 'SAFETY_INSPECTION_REMINDER', label: '월별 안전점검 알림' },
  { value: 'EDUCATION_COMPLETION', label: '교육 완료 알림' },
  { value: 'CERTIFICATE_ISSUED', label: '이수증 발급 알림' },
  { value: 'NOTICE_PUBLISHED', label: '공지사항 알림' },
  { value: 'SAFETY_INSPECTION_RESULT', label: '안전점검 결과 공유' },
];

export default function EmailSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<EmailSchedule | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<EmailCondition | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [isConditionDialogOpen, setIsConditionDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [isTestResultDialogOpen, setIsTestResultDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Fetch templates
  const { data: templates, isLoading: loadingTemplates } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email/templates'],
  });

  // Fetch schedules
  const { data: schedules, isLoading: loadingSchedules } = useQuery<EmailSchedule[]>({
    queryKey: ['/api/email/schedules'],
  });

  // Fetch conditions
  const { data: conditions, isLoading: loadingConditions } = useQuery<EmailCondition[]>({
    queryKey: ['/api/email/conditions'],
  });

  // Fetch send logs
  const { data: sendLogsData, isLoading: loadingSendLogs } = useQuery<{ logs: EmailSendLog[]; total: number }>({
    queryKey: ['/api/email/send-logs'],
  });

  // Fetch send log stats
  const { data: sendLogStats } = useQuery<SendLogStats>({
    queryKey: ['/api/email/send-logs/stats'],
  });

  // Template mutations
  const createTemplateMutation = useMutation({
    mutationFn: async (data: Partial<EmailTemplate>) => {
      const res = await fetch('/api/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/templates'] });
      toast({ title: '템플릿이 생성되었습니다.' });
      setIsTemplateDialogOpen(false);
      setSelectedTemplate(null);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmailTemplate> }) => {
      const res = await fetch(`/api/email/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/templates'] });
      toast({ title: '템플릿이 수정되었습니다.' });
      setIsTemplateDialogOpen(false);
      setSelectedTemplate(null);
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/email/templates/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/templates'] });
      toast({ title: '템플릿이 삭제되었습니다.' });
    },
  });

  // Schedule mutations
  const createScheduleMutation = useMutation({
    mutationFn: async (data: Partial<EmailSchedule>) => {
      const res = await fetch('/api/email/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create schedule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/schedules'] });
      toast({ title: '스케줄이 생성되었습니다.' });
      setIsScheduleDialogOpen(false);
      setSelectedSchedule(null);
    },
  });

  const updateScheduleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EmailSchedule> }) => {
      const res = await fetch(`/api/email/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update schedule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/schedules'] });
      toast({ title: '스케줄이 수정되었습니다.' });
      setIsScheduleDialogOpen(false);
      setSelectedSchedule(null);
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/email/schedules/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete schedule');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/schedules'] });
      toast({ title: '스케줄이 삭제되었습니다.' });
    },
  });

  // Condition mutations
  const createConditionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/email/conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create condition');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/conditions'] });
      toast({ title: '조건이 생성되었습니다.' });
      setIsConditionDialogOpen(false);
      setSelectedCondition(null);
    },
  });

  const updateConditionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/email/conditions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update condition');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/conditions'] });
      toast({ title: '조건이 수정되었습니다.' });
      setIsConditionDialogOpen(false);
      setSelectedCondition(null);
    },
  });

  const deleteConditionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/email/conditions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete condition');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email/conditions'] });
      toast({ title: '조건이 삭제되었습니다.' });
    },
  });

  // Test condition mutation
  const testConditionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/email/conditions/${id}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to test condition');
      return res.json();
    },
    onSuccess: (data) => {
      setTestResult(data);
      setIsTestResultDialogOpen(true);
    },
  });

  // Execute condition mutation
  const executeConditionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/email/conditions/${id}/execute`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to execute condition');
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: '조건 실행 완료',
        description: `${data.emailsSent}건의 이메일이 발송되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/email/send-logs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/email/send-logs/stats'] });
    },
  });

  // Preview template
  const previewMutation = useMutation({
    mutationFn: async ({ templateId, testData }: { templateId: string; testData: any }) => {
      const res = await fetch('/api/email/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ templateId, testData }),
      });
      if (!res.ok) throw new Error('Failed to preview');
      return res.json();
    },
    onSuccess: (data) => {
      setPreviewHtml(data.html);
      setIsPreviewDialogOpen(true);
    },
  });

  // Send test email
  const testEmailMutation = useMutation({
    mutationFn: async ({
      templateId,
      recipientEmail,
      testData,
    }: {
      templateId: string;
      recipientEmail: string;
      testData: any;
    }) => {
      const res = await fetch('/api/email/test-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ templateId, recipientEmail, testData }),
      });
      if (!res.ok) throw new Error('Failed to send test email');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '테스트 이메일이 전송되었습니다.' });
    },
  });

  const handleTemplateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      subject: formData.get('subject') as string,
      htmlContent: formData.get('htmlContent') as string,
      variables: formData.get('variables') as string,
      description: formData.get('description') as string,
      isActive: formData.get('isActive') === 'on',
    };

    if (selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleScheduleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      templateId: formData.get('templateId') as string,
      cronExpression: formData.get('cronExpression') as string,
      description: formData.get('description') as string,
      isEnabled: formData.get('isEnabled') === 'on',
    };

    if (selectedSchedule) {
      updateScheduleMutation.mutate({ id: selectedSchedule.id, data });
    } else {
      createScheduleMutation.mutate(data);
    }
  };

  const handleConditionSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const conditionType = formData.get('conditionType') as ConditionType;

    // Build parameters object based on condition type
    const parameters: Record<string, any> = {};
    const conditionDef = EMAIL_CONDITION_TYPES[conditionType];

    conditionDef.parameters.forEach((param) => {
      const value = formData.get(`param_${param.name}`);
      if (value !== null) {
        parameters[param.name] = param.type === 'number' ? Number(value) : value;
      }
    });

    const data = {
      name: formData.get('name') as string,
      conditionType,
      parameters,
      templateId: formData.get('templateId') as string,
      recipientType: formData.get('recipientType') as RecipientType,
      isEnabled: formData.get('isEnabled') === 'on',
      description: formData.get('description') as string || null,
    };

    if (selectedCondition) {
      updateConditionMutation.mutate({ id: selectedCondition.id, data });
    } else {
      createConditionMutation.mutate(data);
    }
  };

  const handleTestEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const templateId = formData.get('templateId') as string;
    const recipientEmail = formData.get('recipientEmail') as string;
    const testDataStr = formData.get('testData') as string;

    let testData = {};
    if (testDataStr) {
      try {
        testData = JSON.parse(testDataStr);
      } catch (e) {
        toast({ title: '테스트 데이터 형식이 올바르지 않습니다.', variant: 'destructive' });
        return;
      }
    }

    testEmailMutation.mutate({ templateId, recipientEmail, testData });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">이메일 설정</h1>
          <p className="text-gray-600">이메일 템플릿, 스케줄 및 조건부 발송을 관리합니다.</p>
        </div>

        <Tabs defaultValue="templates" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="templates">템플릿 관리</TabsTrigger>
            <TabsTrigger value="schedules">스케줄 관리</TabsTrigger>
            <TabsTrigger value="conditions">조건부 발송</TabsTrigger>
            <TabsTrigger value="logs">발송 이력</TabsTrigger>
            <TabsTrigger value="test">테스트 발송</TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>이메일 템플릿</CardTitle>
                  <CardDescription>이메일 템플릿을 생성하고 편집합니다.</CardDescription>
                </div>
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setSelectedTemplate(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      새 템플릿
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{selectedTemplate ? '템플릿 수정' : '새 템플릿 생성'}</DialogTitle>
                      <DialogDescription>
                        이메일 템플릿의 내용을 작성합니다. 변수는 중괄호 2개로 감싸세요 (예: userName).
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleTemplateSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="name">템플릿 이름</Label>
                        <Input
                          id="name"
                          name="name"
                          defaultValue={selectedTemplate?.name}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="type">타입</Label>
                        <Select name="type" defaultValue={selectedTemplate?.type} required>
                          <SelectTrigger>
                            <SelectValue placeholder="템플릿 타입 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="subject">제목</Label>
                        <Input
                          id="subject"
                          name="subject"
                          defaultValue={selectedTemplate?.subject}
                          placeholder="예: [안전교육] {{courseName}} 이수 안내"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="htmlContent">HTML 내용</Label>
                        <Textarea
                          id="htmlContent"
                          name="htmlContent"
                          defaultValue={selectedTemplate?.htmlContent}
                          rows={15}
                          className="font-mono text-sm"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="variables">사용 가능한 변수 (JSON 배열)</Label>
                        <Input
                          id="variables"
                          name="variables"
                          defaultValue={selectedTemplate?.variables || '[]'}
                          placeholder='["userName", "courseName", "dueDate"]'
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">설명</Label>
                        <Textarea
                          id="description"
                          name="description"
                          defaultValue={selectedTemplate?.description}
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          name="isActive"
                          defaultChecked={selectedTemplate?.isActive ?? true}
                        />
                        <Label htmlFor="isActive">활성화</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsTemplateDialogOpen(false);
                            setSelectedTemplate(null);
                          }}
                        >
                          취소
                        </Button>
                        <Button type="submit">
                          {selectedTemplate ? '수정' : '생성'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingTemplates ? (
                  <LoadingSpinner />
                ) : (
                  <div className="space-y-2">
                    {templates?.map((template) => (
                      <div
                        key={template.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            <Badge variant={template.isActive ? 'default' : 'secondary'}>
                              {template.isActive ? '활성' : '비활성'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            타입: {TEMPLATE_TYPES.find((t) => t.value === template.type)?.label}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const vars = JSON.parse(template.variables || '[]');
                              const testData: any = {};
                              vars.forEach((v: string) => {
                                testData[v] = `샘플_${v}`;
                              });
                              previewMutation.mutate({ templateId: template.id, testData });
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setIsTemplateDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('정말 삭제하시겠습니까?')) {
                                deleteTemplateMutation.mutate(template.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedules Tab */}
          <TabsContent value="schedules" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>발송 스케줄</CardTitle>
                  <CardDescription>자동 발송 스케줄을 설정합니다.</CardDescription>
                </div>
                <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setSelectedSchedule(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      새 스케줄
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{selectedSchedule ? '스케줄 수정' : '새 스케줄 생성'}</DialogTitle>
                      <DialogDescription>
                        cron 표현식 예: "0 7 * * *" (매일 오전 7시), "0 6 * * 1-5" (평일 오전 6시)
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleScheduleSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="schedule-name">스케줄 이름</Label>
                        <Input
                          id="schedule-name"
                          name="name"
                          defaultValue={selectedSchedule?.name}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="templateId">템플릿</Label>
                        <Select
                          name="templateId"
                          defaultValue={selectedSchedule?.templateId}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="템플릿 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates?.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="cronExpression">Cron 표현식</Label>
                        <Input
                          id="cronExpression"
                          name="cronExpression"
                          defaultValue={selectedSchedule?.cronExpression}
                          placeholder="0 7 * * *"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="schedule-description">설명</Label>
                        <Textarea
                          id="schedule-description"
                          name="description"
                          defaultValue={selectedSchedule?.description}
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isEnabled"
                          name="isEnabled"
                          defaultChecked={selectedSchedule?.isEnabled ?? true}
                        />
                        <Label htmlFor="isEnabled">활성화</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsScheduleDialogOpen(false);
                            setSelectedSchedule(null);
                          }}
                        >
                          취소
                        </Button>
                        <Button type="submit">
                          {selectedSchedule ? '수정' : '생성'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingSchedules ? (
                  <LoadingSpinner />
                ) : (
                  <div className="space-y-2">
                    {schedules?.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{schedule.name}</h3>
                            <Badge variant={schedule.isEnabled ? 'default' : 'secondary'}>
                              {schedule.isEnabled ? '활성' : '비활성'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{schedule.description}</p>
                          <div className="text-xs text-gray-400 mt-1 space-y-1">
                            <div>템플릿: {schedule.template.name}</div>
                            <div>Cron: {schedule.cronExpression}</div>
                            {schedule.lastRun && (
                              <div>마지막 실행: {new Date(schedule.lastRun).toLocaleString('ko-KR')}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              setIsScheduleDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              if (confirm('정말 삭제하시겠습니까?')) {
                                deleteScheduleMutation.mutate(schedule.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conditions Tab */}
          <TabsContent value="conditions" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>조건부 이메일 발송</CardTitle>
                  <CardDescription>시스템 상태에 따라 자동으로 이메일을 발송하는 조건을 설정합니다.</CardDescription>
                </div>
                <Dialog open={isConditionDialogOpen} onOpenChange={setIsConditionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setSelectedCondition(null)}>
                      <Plus className="w-4 h-4 mr-2" />
                      새 조건
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{selectedCondition ? '조건 수정' : '새 조건 생성'}</DialogTitle>
                      <DialogDescription>
                        조건이 충족되면 자동으로 이메일이 발송됩니다.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleConditionSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="condition-name">조건 이름</Label>
                        <Input
                          id="condition-name"
                          name="name"
                          defaultValue={selectedCondition?.name}
                          placeholder="예: TBM 3일 미작성 알림"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="conditionType">조건 타입</Label>
                        <Select
                          name="conditionType"
                          defaultValue={selectedCondition?.conditionType}
                          required
                          onValueChange={(value) => {
                            // Update form to show relevant parameters
                            const conditionType = value as ConditionType;
                            setSelectedCondition(prev => prev ? { ...prev, conditionType } : null);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="조건 타입 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(EMAIL_CONDITION_TYPES).map(([key, def]) => (
                              <SelectItem key={key} value={key}>
                                [{CONDITION_CATEGORY_LABELS[def.category]}] {def.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dynamic Parameters based on condition type */}
                      {selectedCondition?.conditionType && EMAIL_CONDITION_TYPES[selectedCondition.conditionType as ConditionType]?.parameters.map((param) => (
                        <div key={param.name}>
                          <Label htmlFor={`param_${param.name}`}>{param.label}</Label>
                          <Input
                            id={`param_${param.name}`}
                            name={`param_${param.name}`}
                            type={param.type === 'number' ? 'number' : 'text'}
                            defaultValue={param.default}
                            min={param.min}
                            max={param.max}
                            required
                          />
                        </div>
                      ))}

                      <div>
                        <Label htmlFor="condition-templateId">이메일 템플릿</Label>
                        <Select
                          name="templateId"
                          defaultValue={selectedCondition?.templateId}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="템플릿 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates?.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="recipientType">수신자</Label>
                        <Select
                          name="recipientType"
                          defaultValue={selectedCondition?.recipientType || EMAIL_CONDITION_TYPES[selectedCondition?.conditionType as ConditionType]?.defaultRecipient}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="수신자 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(RECIPIENT_TYPE_LABELS).map(([key, label]) => (
                              <SelectItem key={key} value={key}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="condition-description">설명</Label>
                        <Textarea
                          id="condition-description"
                          name="description"
                          defaultValue={selectedCondition?.description || ''}
                          rows={2}
                          placeholder="이 조건에 대한 설명을 입력하세요"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="condition-isEnabled"
                          name="isEnabled"
                          defaultChecked={selectedCondition?.isEnabled ?? true}
                        />
                        <Label htmlFor="condition-isEnabled">활성화</Label>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsConditionDialogOpen(false);
                            setSelectedCondition(null);
                          }}
                        >
                          취소
                        </Button>
                        <Button type="submit">
                          {selectedCondition ? '수정' : '생성'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingConditions ? (
                  <LoadingSpinner />
                ) : (
                  <div className="space-y-2">
                    {conditions?.map((condition) => {
                      const conditionDef = EMAIL_CONDITION_TYPES[condition.conditionType as ConditionType];
                      const params = JSON.parse(condition.parameters);

                      return (
                        <div
                          key={condition.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{condition.name}</h3>
                              <Badge variant={condition.isEnabled ? 'default' : 'secondary'}>
                                {condition.isEnabled ? '활성' : '비활성'}
                              </Badge>
                              <Badge variant="outline">
                                {conditionDef ? CONDITION_CATEGORY_LABELS[conditionDef.category] : condition.conditionType}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{condition.description || conditionDef?.description}</p>
                            <div className="text-xs text-gray-400 mt-1 space-y-1">
                              <div>템플릿: {condition.template.name}</div>
                              <div>수신자: {RECIPIENT_TYPE_LABELS[condition.recipientType as RecipientType]}</div>
                              <div>파라미터: {JSON.stringify(params)}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => testConditionMutation.mutate(condition.id)}
                              disabled={testConditionMutation.isPending}
                            >
                              <TestTube className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (confirm('이 조건을 지금 실행하여 이메일을 발송하시겠습니까?')) {
                                  executeConditionMutation.mutate(condition.id);
                                }
                              }}
                              disabled={executeConditionMutation.isPending}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedCondition(condition);
                                setIsConditionDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm('정말 삭제하시겠습니까?')) {
                                  deleteConditionMutation.mutate(condition.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Send Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">오늘 발송</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sendLogStats?.sentToday || 0}건</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">이번 주</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sendLogStats?.sentThisWeek || 0}건</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">이번 달</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sendLogStats?.sentThisMonth || 0}건</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">총 발송</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{sendLogStats?.sentTotal || 0}건</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">실패</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{sendLogStats?.failedTotal || 0}건</div>
                </CardContent>
              </Card>
            </div>

            {/* Send Logs Table */}
            <Card>
              <CardHeader>
                <CardTitle>발송 이력</CardTitle>
                <CardDescription>최근 이메일 발송 기록을 확인합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSendLogs ? (
                  <LoadingSpinner />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">발송 시간</th>
                          <th className="text-left py-3 px-2">조건/스케줄</th>
                          <th className="text-left py-3 px-2">템플릿 타입</th>
                          <th className="text-left py-3 px-2">수신자</th>
                          <th className="text-left py-3 px-2">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sendLogsData?.logs.map((log) => (
                          <tr key={log.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-2">
                              {new Date(log.sentAt).toLocaleString('ko-KR')}
                            </td>
                            <td className="py-3 px-2">
                              {log.condition ? (
                                <div>
                                  <div className="font-medium">{log.condition.name}</div>
                                  <div className="text-xs text-gray-500">{log.condition.conditionType}</div>
                                </div>
                              ) : log.schedule ? (
                                <div>
                                  <div className="font-medium">{log.schedule.name}</div>
                                  <div className="text-xs text-gray-500">스케줄</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {log.templateType}
                              </span>
                            </td>
                            <td className="py-3 px-2">
                              <div className="text-xs text-gray-600">{log.recipientEmail}</div>
                            </td>
                            <td className="py-3 px-2">
                              <Badge
                                variant={
                                  log.status === 'sent'
                                    ? 'default'
                                    : log.status === 'failed'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {log.status === 'sent' ? '발송 완료' : log.status === 'failed' ? '실패' : log.status}
                              </Badge>
                              {log.errorMessage && (
                                <div className="text-xs text-red-600 mt-1">
                                  {log.errorMessage}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {(!sendLogsData?.logs || sendLogsData.logs.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        발송 이력이 없습니다.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Email Tab */}
          <TabsContent value="test" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>테스트 이메일 발송</CardTitle>
                <CardDescription>템플릿을 선택하고 테스트 데이터를 입력하여 이메일을 발송합니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTestEmail} className="space-y-4">
                  <div>
                    <Label htmlFor="test-templateId">템플릿</Label>
                    <Select name="templateId" required>
                      <SelectTrigger>
                        <SelectValue placeholder="템플릿 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="recipientEmail">수신자 이메일</Label>
                    <Input
                      id="recipientEmail"
                      name="recipientEmail"
                      type="email"
                      placeholder="test@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="testData">테스트 데이터 (JSON)</Label>
                    <Textarea
                      id="testData"
                      name="testData"
                      rows={8}
                      className="font-mono text-sm"
                      placeholder={`{
  "userName": "홍길동",
  "courseName": "안전교육 기초",
  "dueDate": "2024-12-31"
}`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      템플릿의 변수에 맞는 JSON 데이터를 입력하세요.
                    </p>
                  </div>
                  <Button type="submit" disabled={testEmailMutation.isPending}>
                    <Send className="w-4 h-4 mr-2" />
                    {testEmailMutation.isPending ? '전송 중...' : '테스트 이메일 전송'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>이메일 미리보기</DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg overflow-auto max-h-[70vh]">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full min-h-[500px]"
                title="Email Preview"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Test Result Dialog */}
        <Dialog open={isTestResultDialogOpen} onOpenChange={setIsTestResultDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>조건 테스트 결과</DialogTitle>
              <DialogDescription>
                이메일을 실제로 발송하지 않고 조건 체크 결과만 확인합니다.
              </DialogDescription>
            </DialogHeader>
            {testResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-600">조건 이름</Label>
                    <p className="text-lg font-semibold">{testResult.conditionName}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-600">발송 여부</Label>
                    <Badge variant={testResult.shouldSend ? 'default' : 'secondary'} className="text-lg">
                      {testResult.shouldSend ? '발송 필요' : '발송 불필요'}
                    </Badge>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">수신자 수</Label>
                  <p className="text-2xl font-bold">{testResult.recipientCount}명</p>
                </div>

                {testResult.recipients && testResult.recipients.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-gray-600 mb-2 block">수신자 목록</Label>
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left py-2 px-3">이메일</th>
                            <th className="text-left py-2 px-3">사용자 ID</th>
                            <th className="text-left py-2 px-3">중복 발송</th>
                          </tr>
                        </thead>
                        <tbody>
                          {testResult.recipients.map((recipient: any, idx: number) => (
                            <tr key={idx} className="border-t">
                              <td className="py-2 px-3">{recipient.email}</td>
                              <td className="py-2 px-3 font-mono text-xs">{recipient.userId}</td>
                              <td className="py-2 px-3">
                                {recipient.wouldBeDuplicate ? (
                                  <Badge variant="secondary">24시간 내 발송됨</Badge>
                                ) : (
                                  <Badge variant="default">발송 가능</Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {testResult.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      <strong>오류:</strong> {testResult.error}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
