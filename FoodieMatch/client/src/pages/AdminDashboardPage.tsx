import { useAuth } from '@/context/AuthContext';
import { AdminPageLayout } from '@/components/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Building2, ClipboardList, Calendar, Wrench,
  GraduationCap, BarChart3, CalendarDays, Mail, Database,
  FileText, HelpCircle, Shield, TrendingUp, CheckCircle2,
  Clock, AlertCircle, Activity
} from 'lucide-react';
import { useLocation } from 'wouter';
import { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

interface MenuItem {
  title: string;
  description: string;
  path: string;
  roles: string[];
  icon: LucideIcon;
  bgColor: string;
  iconBg: string;
  iconColor: string;
}

const menuItems: MenuItem[] = [
  { title: '사용자 관리', description: '사용자 계정 및 권한 관리', path: '/admin', roles: ['ADMIN'], icon: Users, bgColor: 'bg-green-100', iconBg: 'bg-green-500', iconColor: 'text-white' },
  { title: '팀 관리', description: '팀 구성원 및 조직 관리', path: '/team-management', roles: ['ADMIN', 'TEAM_LEADER'], icon: Building2, bgColor: 'bg-amber-100', iconBg: 'bg-amber-500', iconColor: 'text-white' },
  { title: 'TBM 편집', description: 'TBM 체크리스트 템플릿 수정', path: '/checklist-editor', roles: ['ADMIN'], icon: ClipboardList, bgColor: 'bg-violet-100', iconBg: 'bg-violet-500', iconColor: 'text-white' },
  { title: '점검 일정 관리', description: '월간 안전점검 일정 설정', path: '/inspection-schedule', roles: ['ADMIN'], icon: Calendar, bgColor: 'bg-orange-100', iconBg: 'bg-orange-500', iconColor: 'text-white' },
  { title: '팀 장비/점검 관리', description: '팀별 장비 및 점검 항목 관리', path: '/team-equipment-management', roles: ['ADMIN'], icon: Wrench, bgColor: 'bg-rose-100', iconBg: 'bg-rose-500', iconColor: 'text-white' },
  { title: '교육 관리', description: '교육 과정 생성 및 수정', path: '/education-management', roles: ['ADMIN'], icon: GraduationCap, bgColor: 'bg-cyan-100', iconBg: 'bg-cyan-500', iconColor: 'text-white' },
  { title: '교육 현황', description: '전체 교육 이수 현황 조회', path: '/education-monitoring', roles: ['ADMIN'], icon: BarChart3, bgColor: 'bg-teal-100', iconBg: 'bg-teal-500', iconColor: 'text-white' },
  { title: '공휴일 관리', description: '공휴일 및 영업일 관리', path: '/holiday-management', roles: ['ADMIN'], icon: CalendarDays, bgColor: 'bg-purple-100', iconBg: 'bg-purple-500', iconColor: 'text-white' },
  { title: '이메일 설정', description: '알림 이메일 발송 설정', path: '/email-settings', roles: ['ADMIN'], icon: Mail, bgColor: 'bg-indigo-100', iconBg: 'bg-indigo-500', iconColor: 'text-white' },
  { title: '데이터베이스 관리', description: '시스템 데이터 백업/복원', path: '/db-management', roles: ['ADMIN'], icon: Database, bgColor: 'bg-slate-100', iconBg: 'bg-slate-500', iconColor: 'text-white' },
  { title: '관리자 업무 절차서', description: '관리자 매뉴얼 및 가이드', path: '/admin-help', roles: ['ADMIN'], icon: FileText, bgColor: 'bg-emerald-100', iconBg: 'bg-emerald-500', iconColor: 'text-white' },
  { title: '사용자 도움말', description: '사용자 FAQ 및 안내', path: '/help', roles: ['ADMIN', 'TEAM_LEADER'], icon: HelpCircle, bgColor: 'bg-sky-100', iconBg: 'bg-sky-500', iconColor: 'text-white' },
];

// 숫자 카운트업 애니메이션 훅
function useCountUp(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === 0) return;

    let startTime: number;
    const startValue = 0;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(startValue + (end - startValue) * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
}

// KPI 카드 컴포넌트
function KpiCard({
  icon: Icon,
  title,
  value,
  subtitle,
  trend,
  gradient,
  delay
}: {
  icon: LucideIcon;
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
  gradient: string;
  delay: number;
}) {
  const numericValue = typeof value === 'number' ? value : parseInt(value) || 0;
  const displayValue = useCountUp(numericValue, 1200);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1`}
      style={{
        animation: `slideUp 0.5s ease-out ${delay}ms both`,
      }}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Icon className="h-6 w-6" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${trend.positive ? 'text-green-200' : 'text-red-200'}`}>
              <TrendingUp className={`h-4 w-4 ${!trend.positive && 'rotate-180'}`} />
              {trend.value}
            </div>
          )}
        </div>

        <div className="text-4xl font-bold mb-1">
          {typeof value === 'number' ? displayValue.toLocaleString() : value}
        </div>
        <div className="text-white/80 font-medium">{title}</div>
        {subtitle && (
          <div className="text-white/60 text-sm mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );
}

// 진행률 바 컴포넌트
function ProgressBar({ value, max, color, label, delay }: { value: number; max: number; color: string; label: string; delay: number }) {
  const [width, setWidth] = useState(0);
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  useEffect(() => {
    const timer = setTimeout(() => setWidth(percentage), delay);
    return () => clearTimeout(timer);
  }, [percentage, delay]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{value.toLocaleString()}명</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // 관리자 통계 데이터
  const { data: stats } = useQuery<{
    users: { total: number; active: number; newThisMonth: number };
    teams: { total: number };
    education: { total: number; completed: number; inProgress: number };
    tbm: { todayCount: number; thisMonthCount: number; completionRate: number; expected: number };
    inspection: { pendingCount: number; completedThisMonth: number };
  }>({
    queryKey: ['/api/admin/dashboard-stats'],
    enabled: user?.role === 'ADMIN',
  });

  // TBM 일일 통계 (오늘 날짜)
  const todayStr = new Date().toISOString().split('T')[0];
  const { data: tbmDaily } = useQuery<{
    전체: { submitted: number; required: number };
    아산: { submitted: number; required: number };
    화성: { submitted: number; required: number };
  }>({
    queryKey: ['/api/tbm/daily-stats', todayStr],
    queryFn: async () => {
      const res = await fetch(`/api/tbm/daily-stats?date=${todayStr}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch TBM stats');
      return res.json();
    },
    enabled: user?.role === 'ADMIN',
  });

  // 최근 활동
  const { data: activities = [] } = useQuery<Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }>>({
    queryKey: ['/api/dashboard/recent-activities'],
    enabled: user?.role === 'ADMIN',
  });

  if (user?.role !== 'ADMIN' && user?.role !== 'TEAM_LEADER') {
    return (
      <AdminPageLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">관리자 권한이 필요합니다.</p>
          </CardContent>
        </Card>
      </AdminPageLayout>
    );
  }

  const accessibleItems = menuItems.filter(item => item.roles.includes(user?.role || ''));

  const today = new Date();
  const dateString = today.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  // 교육 통계 계산
  const eduCompleted = stats?.education?.completed || 0;
  const eduInProgress = stats?.education?.inProgress || 0;
  const eduTotal = stats?.users?.active || 1;
  const eduNotStarted = Math.max(0, eduTotal - eduCompleted - eduInProgress);

  return (
    <AdminPageLayout maxWidth="wide">
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      <div className="space-y-8 pb-8">
        {/* 차트 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TBM 현황 */}
          <Card
            className="shadow-lg border-0 overflow-hidden"
            style={{ animation: 'slideUp 0.5s ease-out 500ms both' }}
          >
            <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardList className="h-5 w-5 text-violet-600" />
                TBM 작성 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* 도넛 차트 대신 시각적 표현 */}
                <div className="flex items-center justify-center gap-8">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        fill="none"
                        stroke="url(#gradient)"
                        strokeWidth="12"
                        strokeDasharray={`${(tbmDaily?.전체?.submitted || 0) / (tbmDaily?.전체?.required || 1) * 352} 352`}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#8b5cf6" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-2xl font-bold text-gray-800">
                        {tbmDaily?.전체 ? Math.round((tbmDaily.전체.submitted / (tbmDaily.전체.required || 1)) * 100) : 0}%
                      </span>
                      <span className="text-xs text-gray-500">완료율</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm text-gray-600">아산</span>
                      <span className="font-semibold ml-auto">
                        {tbmDaily?.아산?.submitted || 0}/{tbmDaily?.아산?.required || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span className="text-sm text-gray-600">화성</span>
                      <span className="font-semibold ml-auto">
                        {tbmDaily?.화성?.submitted || 0}/{tbmDaily?.화성?.required || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <div className="w-3 h-3 rounded-full bg-violet-500" />
                      <span className="text-sm font-medium text-gray-700">전체</span>
                      <span className="font-bold text-violet-600 ml-auto">
                        {tbmDaily?.전체?.submitted || 0}/{tbmDaily?.전체?.required || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 교육 현황 */}
          <Card
            className="shadow-lg border-0 overflow-hidden"
            style={{ animation: 'slideUp 0.5s ease-out 600ms both' }}
          >
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5 text-cyan-600" />
                교육 진행 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <ProgressBar
                  value={eduCompleted}
                  max={eduTotal}
                  color="bg-gradient-to-r from-green-400 to-green-500"
                  label="완료"
                  delay={700}
                />
                <ProgressBar
                  value={eduInProgress}
                  max={eduTotal}
                  color="bg-gradient-to-r from-blue-400 to-blue-500"
                  label="진행중"
                  delay={800}
                />
                <ProgressBar
                  value={eduNotStarted}
                  max={eduTotal}
                  color="bg-gradient-to-r from-gray-300 to-gray-400"
                  label="미시작"
                  delay={900}
                />

                <div className="pt-4 border-t mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">전체 진행률</span>
                    <span className="text-lg font-bold text-cyan-600">
                      {eduTotal > 0 ? Math.round((eduCompleted / eduTotal) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-teal-500 rounded-full transition-all duration-1000"
                      style={{ width: `${eduTotal > 0 ? (eduCompleted / eduTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 관리 메뉴 */}
        <Card
          className="shadow-lg border-0"
          style={{ animation: 'slideUp 0.5s ease-out 700ms both' }}
        >
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-primary rounded-lg text-primary-foreground">
                <Shield className="h-5 w-5" />
              </div>
              관리 메뉴
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {accessibleItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.path}
                    className={`group ${item.bgColor} rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}
                    onClick={() => setLocation(item.path)}
                    style={{ animation: `slideUp 0.4s ease-out ${800 + index * 50}ms both` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2.5 ${item.iconBg} rounded-full shrink-0`}>
                        <Icon className={`h-5 w-5 ${item.iconColor}`} strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-gray-900 font-semibold text-base mb-0.5">{item.title}</h3>
                        <p className="text-gray-500 text-sm leading-snug">{item.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 최근 활동 */}
        <Card
          className="shadow-lg border-0"
          style={{ animation: 'slideUp 0.5s ease-out 900ms both' }}
        >
          <CardHeader className="border-b bg-gray-50/50">
            <CardTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg text-white">
                <Activity className="h-5 w-5" />
              </div>
              최근 활동
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-80 overflow-y-auto">
              {activities.length > 0 ? (
                activities.slice(0, 10).map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                    style={{ animation: `slideInRight 0.3s ease-out ${1000 + index * 100}ms both` }}
                  >
                    <div className={`p-2 rounded-lg ${
                      activity.type === 'education' ? 'bg-cyan-100 text-cyan-600' :
                      activity.type === 'tbm' ? 'bg-violet-100 text-violet-600' :
                      activity.type === 'notice' ? 'bg-blue-100 text-blue-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.type === 'education' ? <GraduationCap className="h-5 w-5" /> :
                       activity.type === 'tbm' ? <ClipboardList className="h-5 w-5" /> :
                       activity.type === 'notice' ? <FileText className="h-5 w-5" /> :
                       <CheckCircle2 className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{activity.title}</p>
                      <p className="text-sm text-gray-500 truncate">{activity.description}</p>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <Clock className="h-4 w-4" />
                      {new Date(activity.timestamp).toLocaleString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
                  <p>최근 활동이 없습니다</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  );
}
