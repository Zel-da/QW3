import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { AdminPageLayout } from '@/components/admin';
import { Card, CardContent } from '@/components/ui/card';
import {
  Users, Building2, Shield,
  ClipboardCheck, TrendingUp, AlertTriangle, ArrowRight
} from 'lucide-react';
import { useLocation } from 'wouter';

interface MenuItem {
  title: string;
  path: string;
  roles: string[];
  badge?: string;
}

interface MenuGroup {
  groupTitle: string;
  items: MenuItem[];
}

// 단순화된 메뉴 데이터

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
    items: [
      { title: '사용자 관리', path: '/admin', roles: ['ADMIN'], badge: 'ADMIN' },
      { title: '팀 관리', path: '/team-management', roles: ['ADMIN', 'TEAM_LEADER'] },
    ],
  },
  {
    groupTitle: 'TBM 관리',
    items: [
      { title: 'TBM 편집', path: '/checklist-editor', roles: ['ADMIN'], badge: 'ADMIN' },
    ],
  },
  {
    groupTitle: '점검 관리',
    items: [
      { title: '점검 일정 관리', path: '/inspection-schedule', roles: ['ADMIN'], badge: 'ADMIN' },
      { title: '팀 장비/점검 관리', path: '/team-equipment-management', roles: ['ADMIN'], badge: 'ADMIN' },
    ],
  },
  {
    groupTitle: '교육 관리',
    items: [
      { title: '교육 관리', path: '/education-management', roles: ['ADMIN'], badge: 'ADMIN' },
      { title: '교육 현황', path: '/education-monitoring', roles: ['ADMIN'], badge: 'ADMIN' },
    ],
  },
  {
    groupTitle: '시스템 설정',
    items: [
      { title: '공휴일 관리', path: '/holiday-management', roles: ['ADMIN'], badge: 'ADMIN' },
      { title: '이메일 설정', path: '/email-settings', roles: ['ADMIN'], badge: 'ADMIN' },
      { title: '데이터베이스 관리', path: '/db-management', roles: ['ADMIN'], badge: 'ADMIN' },
    ],
  },
  {
    groupTitle: '도움말',
    items: [
      { title: '관리자 업무 절차서', path: '/admin-help', roles: ['ADMIN'], badge: 'ADMIN' },
      { title: '사용자 도움말', path: '/help', roles: ['ADMIN', 'TEAM_LEADER'] },
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
    // refetchInterval 비활성화 - Neon Compute 절약 (수동 새로고침만)
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

      {/* 메뉴 그룹 */}
      <div className="space-y-6">
        {accessibleGroups.map((group) => (
          <div key={group.groupTitle}>
            {/* 그룹 헤더 */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold">{group.groupTitle}</h2>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* 메뉴 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((item) => (
                <Card
                  key={item.path}
                  className="group cursor-pointer hover:shadow-md transition-all duration-200"
                  onClick={() => setLocation(item.path)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{item.title}</h3>
                        {item.badge && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
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
            <h2 className="text-lg font-semibold text-gray-500">관리자 전용 메뉴</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allMenuItems
              .filter(item => !item.roles.includes('TEAM_LEADER'))
              .map((item) => (
                <Card key={item.path} className="opacity-50 cursor-not-allowed">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-500">{item.title}</h3>
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs font-semibold rounded">
                          ADMIN
                        </span>
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
