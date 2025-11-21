import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Building2, Calendar, FileEdit, Package, Mail, Shield, Settings, BookOpen } from 'lucide-react';
import { useLocation } from 'wouter';

interface MenuItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  roles: string[]; // 접근 가능한 역할
  badge?: string;
}

const menuItems: MenuItem[] = [
  {
    title: '사용자 관리',
    description: '사용자 계정 생성, 수정, 삭제 및 권한 관리',
    icon: <Users className="h-8 w-8" />,
    path: '/admin',
    roles: ['ADMIN'],
    badge: 'ADMIN',
  },
  {
    title: '팀 관리',
    description: '팀 생성, 수정, 팀원 배정 및 팀장 지정',
    icon: <Building2 className="h-8 w-8" />,
    path: '/team-management',
    roles: ['ADMIN', 'TEAM_LEADER'],
  },
  {
    title: 'TBM 편집',
    description: 'TBM 체크리스트 템플릿 편집 및 항목 관리',
    icon: <Settings className="h-8 w-8" />,
    path: '/checklist-editor',
    roles: ['ADMIN'],
    badge: 'ADMIN',
  },
  {
    title: '점검 일정 관리',
    description: '월별 안전점검 일정 및 점검 항목 관리',
    icon: <Calendar className="h-8 w-8" />,
    path: '/inspection-schedule',
    roles: ['ADMIN'],
    badge: 'ADMIN',
  },
  {
    title: '점검 템플릿 편집기',
    description: '팀별 안전점검 템플릿 및 장비 목록 관리',
    icon: <FileEdit className="h-8 w-8" />,
    path: '/inspection-template-editor',
    roles: ['ADMIN'],
    badge: 'ADMIN',
  },
  {
    title: '라인 장비 관리',
    description: '라인별 보유 장비 및 수량 관리',
    icon: <Package className="h-8 w-8" />,
    path: '/team-equipment',
    roles: ['ADMIN'],
    badge: 'ADMIN',
  },
  {
    title: '교육 관리',
    description: '안전교육 과정 생성, 수정, 삭제 및 퀴즈 관리',
    icon: <BookOpen className="h-8 w-8" />,
    path: '/education-management',
    roles: ['ADMIN'],
    badge: 'ADMIN',
  },
  {
    title: '이메일 설정',
    description: '자동 이메일 발송 조건 및 스케줄 설정',
    icon: <Mail className="h-8 w-8" />,
    path: '/email-settings',
    roles: ['ADMIN'],
    badge: 'ADMIN',
  },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // 권한 체크: 관리자 또는 팀장만 접근 가능
  if (user?.role !== 'ADMIN' && user?.role !== 'TEAM_LEADER') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">관리자 권한이 필요합니다.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // 사용자가 접근 가능한 메뉴만 필터링
  const accessibleMenus = menuItems.filter(item =>
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            관리자 대시보드
          </h1>
          <p className="text-muted-foreground mt-2">
            시스템 관리 및 설정 메뉴
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accessibleMenus.map((item) => (
            <Card key={item.path} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    {item.icon}
                  </div>
                  {item.badge && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                      {item.badge}
                    </span>
                  )}
                </div>
                <CardTitle className="mt-4">{item.title}</CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setLocation(item.path)}
                  className="w-full"
                >
                  이동
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 접근 불가 메뉴 표시 (팀장용) */}
        {user?.role === 'TEAM_LEADER' && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-500">
              관리자 전용 메뉴 (접근 불가)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems
                .filter(item => !item.roles.includes('TEAM_LEADER'))
                .map((item) => (
                  <Card key={item.path} className="opacity-50">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="p-3 bg-gray-100 rounded-lg text-gray-400">
                          {item.icon}
                        </div>
                        {item.badge && (
                          <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-semibold rounded">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <CardTitle className="mt-4 text-gray-500">{item.title}</CardTitle>
                      <CardDescription className="text-gray-400">{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button disabled className="w-full">
                        접근 불가
                      </Button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
