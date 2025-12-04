import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { AdminPageLayout, PageHeader } from '@/components/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Users, Building2, Calendar, Package, Mail, Shield, Settings,
  BookOpen, ClipboardCheck, GraduationCap, Cog, CalendarDays,
  TrendingUp, AlertTriangle, CheckCircle2, Clock, FileText,
  ArrowRight, Activity, Database, HelpCircle, FileQuestion
} from 'lucide-react';
import { useLocation } from 'wouter';

interface MenuItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  roles: string[];
  badge?: string;
  color: string;
}

interface MenuGroup {
  groupTitle: string;
  groupIcon: React.ReactNode;
  groupColor: string;
  items: MenuItem[];
}

// 통계 데이터 타입
interface DashboardStats {
  users: { total: number; active: number; newThisMonth: number };
  teams: { total: number };
  education: { total: number; completed: number; inProgress: number };
  tbm: { todayCount: number; thisMonthCount: number; completionRate: number };
  inspection: { pendingCount: number; completedThisMonth: number };
}

const menuGroups: MenuGroup[] = [
  {
    groupTitle: '인사 관리',
    groupIcon: <Users className="h-5 w-5" />,
    groupColor: 'from-blue-500 to-blue-600',
    items: [
      {
        title: '사용자 관리',
        description: '사용자 계정 생성, 수정, 삭제 및 권한 관리',
        icon: <Users className="h-6 w-6" />,
        path: '/admin',
        roles: ['ADMIN'],
        badge: 'ADMIN',
        color: 'bg-blue-500',
      },
      {
        title: '팀 관리',
        description: '팀 생성, 수정, 팀원 배정 및 팀장 지정',
        icon: <Building2 className="h-6 w-6" />,
        path: '/team-management',
        roles: ['ADMIN', 'TEAM_LEADER'],
        color: 'bg-indigo-500',
      },
    ],
  },
  {
    groupTitle: 'TBM 관리',
    groupIcon: <ClipboardCheck className="h-5 w-5" />,
    groupColor: 'from-green-500 to-green-600',
    items: [
      {
        title: 'TBM 편집',
        description: 'TBM 체크리스트 템플릿 편집 및 항목 관리',
        icon: <Settings className="h-6 w-6" />,
        path: '/checklist-editor',
        roles: ['ADMIN'],
        badge: 'ADMIN',
        color: 'bg-green-500',
      },
    ],
  },
  {
    groupTitle: '점검 관리',
    groupIcon: <Shield className="h-5 w-5" />,
    groupColor: 'from-amber-500 to-amber-600',
    items: [
      {
        title: '점검 일정 관리',
        description: '월별 안전점검 일정 및 점검 항목 관리',
        icon: <Calendar className="h-6 w-6" />,
        path: '/inspection-schedule',
        roles: ['ADMIN'],
        badge: 'ADMIN',
        color: 'bg-amber-500',
      },
      {
        title: '팀 장비/점검 관리',
        description: '팀별 보유 장비 및 월별 점검 템플릿 통합 관리',
        icon: <Package className="h-6 w-6" />,
        path: '/team-equipment-management',
        roles: ['ADMIN'],
        badge: 'ADMIN',
        color: 'bg-orange-500',
      },
    ],
  },
  {
    groupTitle: '교육 관리',
    groupIcon: <GraduationCap className="h-5 w-5" />,
    groupColor: 'from-purple-500 to-purple-600',
    items: [
      {
        title: '교육 관리',
        description: '안전교육 과정 생성, 수정, 삭제 및 퀴즈 관리',
        icon: <BookOpen className="h-6 w-6" />,
        path: '/education-management',
        roles: ['ADMIN'],
        badge: 'ADMIN',
        color: 'bg-purple-500',
      },
      {
        title: '교육 현황',
        description: '전체 사용자 안전교육 진행 상황 모니터링',
        icon: <TrendingUp className="h-6 w-6" />,
        path: '/education-monitoring',
        roles: ['ADMIN'],
        badge: 'ADMIN',
        color: 'bg-violet-500',
      },
    ],
  },
  {
    groupTitle: '시스템 설정',
    groupIcon: <Cog className="h-5 w-5" />,
    groupColor: 'from-slate-500 to-slate-600',
    items: [
      {
        title: '공휴일 관리',
        description: '공휴일 등록 및 TBM 작성 제외일 설정',
        icon: <CalendarDays className="h-6 w-6" />,
        path: '/holiday-management',
        roles: ['ADMIN'],
        badge: 'ADMIN',
        color: 'bg-slate-500',
      },
      {
        title: '이메일 설정',
        description: '자동 이메일 발송 조건 및 스케줄 설정',
        icon: <Mail className="h-6 w-6" />,
        path: '/email-settings',
        roles: ['ADMIN'],
        badge: 'ADMIN',
        color: 'bg-rose-500',
      },
      {
        title: '데이터베이스 관리',
        description: '데이터 백업 및 오래된 데이터 정리',
        icon: <Database className="h-6 w-6" />,
        path: '/db-management',
        roles: ['ADMIN'],
        badge: 'ADMIN',
        color: 'bg-cyan-500',
      },
    ],
  },
  {
    groupTitle: '도움말',
    groupIcon: <HelpCircle className="h-5 w-5" />,
    groupColor: 'from-teal-500 to-teal-600',
    items: [
      {
        title: '관리자 업무 절차서',
        description: '관리자용 상세 업무 안내 및 플로우차트',
        icon: <FileQuestion className="h-6 w-6" />,
        path: '/admin-help',
        roles: ['ADMIN'],
        badge: 'ADMIN',
        color: 'bg-teal-500',
      },
      {
        title: '사용자 도움말',
        description: '시스템 사용 방법 안내',
        icon: <HelpCircle className="h-6 w-6" />,
        path: '/help',
        roles: ['ADMIN', 'TEAM_LEADER'],
        color: 'bg-emerald-500',
      },
    ],
  },
];

const allMenuItems = menuGroups.flatMap(group => group.items);

// 통계 카드 컴포넌트
function StatCard({
  title,
  value,
  subValue,
  icon,
  trend,
  color = 'bg-blue-500'
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {subValue && (
              <p className="text-sm text-muted-foreground mt-1">{subValue}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className={`h-4 w-4 ${trend.value >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${trend.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {trend.value >= 0 ? '+' : ''}{trend.value}%
                </span>
                <span className="text-sm text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color} text-white`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 빠른 액션 버튼 컴포넌트
function QuickActionButton({
  title,
  icon,
  onClick,
  variant = 'default'
}: {
  title: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'warning' | 'success';
}) {
  const variants = {
    default: 'bg-white hover:bg-gray-50 border',
    warning: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    success: 'bg-green-50 hover:bg-green-100 border-green-200',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl transition-all ${variants[variant]} w-full text-left`}
    >
      <div className="p-2 bg-primary/10 rounded-lg text-primary">
        {icon}
      </div>
      <span className="font-medium">{title}</span>
      <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
    </button>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // 통계 데이터 가져오기
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard-stats');
      if (!res.ok) {
        // API가 없으면 기본값 반환
        return {
          users: { total: 0, active: 0, newThisMonth: 0 },
          teams: { total: 0 },
          education: { total: 0, completed: 0, inProgress: 0 },
          tbm: { todayCount: 0, thisMonthCount: 0, completionRate: 0 },
          inspection: { pendingCount: 0, completedThisMonth: 0 },
        };
      }
      return res.json();
    },
    refetchInterval: 60000, // 1분마다 갱신
  });

  // 사용자 수 가져오기
  const { data: usersData } = useQuery({
    queryKey: ['/api/users'],
    enabled: user?.role === 'ADMIN',
  });

  // 팀 수 가져오기
  const { data: teamsData } = useQuery({
    queryKey: ['/api/teams'],
    enabled: user?.role === 'ADMIN',
  });

  // 권한 체크
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

  const accessibleGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => item.roles.includes(user?.role || '')),
    }))
    .filter(group => group.items.length > 0);

  const userCount = Array.isArray(usersData) ? usersData.length : 0;
  const teamCount = Array.isArray(teamsData) ? teamsData.length : 0;

  return (
    <AdminPageLayout maxWidth="wide">
      {/* 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">관리자 대시보드</h1>
            <p className="text-muted-foreground mt-1">
              안녕하세요, <span className="font-medium text-foreground">{user?.name || user?.username}</span>님! 시스템 현황을 확인하세요.
            </p>
          </div>
        </div>
      </div>

      {/* 통계 카드 - 관리자만 */}
      {user?.role === 'ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="총 사용자"
            value={userCount}
            subValue="등록된 사용자"
            icon={<Users className="h-6 w-6" />}
            color="bg-blue-500"
          />
          <StatCard
            title="팀"
            value={teamCount}
            subValue="활성화된 팀"
            icon={<Building2 className="h-6 w-6" />}
            color="bg-indigo-500"
          />
          <StatCard
            title="오늘 TBM"
            value={stats?.tbm?.todayCount || '-'}
            subValue={`이번 달 ${stats?.tbm?.thisMonthCount || 0}건`}
            icon={<ClipboardCheck className="h-6 w-6" />}
            color="bg-green-500"
          />
          <StatCard
            title="대기중 점검"
            value={stats?.inspection?.pendingCount || '-'}
            subValue={`이번 달 완료 ${stats?.inspection?.completedThisMonth || 0}건`}
            icon={<AlertTriangle className="h-6 w-6" />}
            color="bg-amber-500"
          />
        </div>
      )}

      {/* 빠른 액션 */}
      {user?.role === 'ADMIN' && (
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              빠른 액션
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <QuickActionButton
                title="사용자 추가"
                icon={<Users className="h-5 w-5" />}
                onClick={() => setLocation('/admin')}
              />
              <QuickActionButton
                title="교육 현황 확인"
                icon={<GraduationCap className="h-5 w-5" />}
                onClick={() => setLocation('/education-monitoring')}
              />
              <QuickActionButton
                title="TBM 편집"
                icon={<ClipboardCheck className="h-5 w-5" />}
                onClick={() => setLocation('/checklist-editor')}
              />
              <QuickActionButton
                title="이메일 설정"
                icon={<Mail className="h-5 w-5" />}
                onClick={() => setLocation('/email-settings')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 메뉴 그룹 */}
      <div className="space-y-6">
        {accessibleGroups.map((group) => (
          <div key={group.groupTitle}>
            {/* 그룹 헤더 */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${group.groupColor} text-white shadow-sm`}>
                {group.groupIcon}
              </div>
              <h2 className="text-xl font-semibold">{group.groupTitle}</h2>
              <div className="flex-1 h-px bg-border ml-4" />
            </div>

            {/* 메뉴 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((item) => (
                <Card
                  key={item.path}
                  className="group cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 hover:border-l-primary"
                  style={{ borderLeftColor: 'transparent' }}
                  onClick={() => setLocation(item.path)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${item.color} text-white shadow-sm group-hover:scale-110 transition-transform`}>
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{item.title}</h3>
                          {item.badge && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 팀장용 접근 불가 메뉴 */}
      {user?.role === 'TEAM_LEADER' && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-gray-400 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold text-gray-500">관리자 전용 메뉴</h2>
            <div className="flex-1 h-px bg-gray-200 ml-4" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allMenuItems
              .filter(item => !item.roles.includes('TEAM_LEADER'))
              .map((item) => (
                <Card key={item.path} className="opacity-50 cursor-not-allowed">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-gray-300 text-gray-500">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-gray-500">{item.title}</h3>
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs font-semibold rounded">
                            ADMIN
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}
