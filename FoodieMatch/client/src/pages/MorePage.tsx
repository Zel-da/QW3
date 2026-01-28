import { Link, useLocation } from 'wouter';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Shield,
  FileText,
  Settings,
  User,
  LogOut,
  ChevronRight,
  BarChart3,
  Users,
  Mail,
  BookOpen,
  HelpCircle,
  FileQuestion,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  href: string;
  icon: typeof Shield;
  label: string;
  description?: string;
  showTo: ('ADMIN' | 'TEAM_LEADER' | 'EXECUTIVE_LEADER' | 'WORKER' | 'APPROVER')[];
}

export default function MorePage() {
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: '안전관리',
      items: [
        {
          href: '/safety-inspection',
          icon: Shield,
          label: '안전점검',
          description: '월별 장비 안전점검',
          showTo: ['ADMIN', 'TEAM_LEADER', 'EXECUTIVE_LEADER'],
        },
        {
          href: '/monthly-report',
          icon: FileText,
          label: '월별 보고서',
          description: 'TBM 월별 보고서 및 통계',
          showTo: ['ADMIN', 'TEAM_LEADER', 'EXECUTIVE_LEADER', 'APPROVER'],
        },
        {
          href: '/inspection-gallery',
          icon: BookOpen,
          label: '점검 갤러리',
          description: '안전점검 사진 기록',
          showTo: ['ADMIN', 'TEAM_LEADER', 'EXECUTIVE_LEADER', 'APPROVER'],
        },
      ],
    },
    {
      title: '관리자 메뉴',
      items: [
        {
          href: '/admin-dashboard',
          icon: BarChart3,
          label: '관리 대시보드',
          description: '전체 현황 모니터링',
          showTo: ['ADMIN', 'TEAM_LEADER', 'EXECUTIVE_LEADER', 'APPROVER'],
        },
        {
          href: '/admin',
          icon: Users,
          label: '사용자 관리',
          description: '사용자 계정 및 권한 관리',
          showTo: ['ADMIN'],
        },
        {
          href: '/email-settings',
          icon: Mail,
          label: '이메일 설정',
          description: '이메일 알림 및 SMTP 설정',
          showTo: ['ADMIN'],
        },
        {
          href: '/education-monitoring',
          icon: BookOpen,
          label: '교육 현황',
          description: '교육 이수 현황 모니터링',
          showTo: ['ADMIN', 'TEAM_LEADER', 'EXECUTIVE_LEADER', 'APPROVER'],
        },
      ],
    },
    {
      title: '도움말',
      items: [
        {
          href: '/admin-help',
          icon: FileQuestion,
          label: '관리자 업무 절차서',
          description: '관리자용 상세 업무 안내',
          showTo: ['ADMIN'],
        },
        {
          href: '/help',
          icon: HelpCircle,
          label: '사용자 도움말',
          description: '시스템 사용 방법 안내',
          showTo: ['ADMIN', 'TEAM_LEADER', 'WORKER', 'APPROVER'],
        },
      ],
    },
    {
      title: '내 계정',
      items: [
        {
          href: '/profile',
          icon: User,
          label: '내 정보',
          description: '프로필 및 계정 설정',
          showTo: ['ADMIN', 'TEAM_LEADER', 'WORKER', 'APPROVER'],
        },
      ],
    },
  ];

  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        user?.role ? item.showTo.includes(user.role as any) : false
      ),
    }))
    .filter((section) => section.items.length > 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* 사용자 프로필 카드 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                  {user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold truncate">
                  {user?.name || user?.username}님
                </h2>
                <p className="text-sm text-muted-foreground">
                  {user?.role === 'ADMIN' && '관리자'}
                  {user?.role === 'TEAM_LEADER' && '팀장'}
                  {user?.role === 'EXECUTIVE_LEADER' && '임원팀장'}
                  {user?.role === 'WORKER' && '작업자'}
                  {user?.role === 'APPROVER' && '결재자'}
                </p>
                {(user as any)?.teamName && (
                  <p className="text-sm text-muted-foreground truncate">
                    {(user as any).teamName}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/profile">
                  <Settings className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 메뉴 섹션들 */}
        {filteredSections.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
              {section.title}
            </h3>
            <Card>
              <CardContent className="p-0 divide-y">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{item.label}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {item.description}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* 로그아웃 버튼 */}
        <Card>
          <CardContent className="p-0">
            <button
              onClick={handleLogout}
              className="flex items-center gap-4 p-4 w-full hover:bg-muted/50 transition-colors text-destructive"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
                <LogOut className="h-5 w-5" />
              </div>
              <span className="font-medium">로그아웃</span>
            </button>
          </CardContent>
        </Card>

        {/* 앱 버전 */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          안전관리 통합 플랫폼 v1.0
        </p>
      </main>

      <BottomNavigation />
    </div>
  );
}
