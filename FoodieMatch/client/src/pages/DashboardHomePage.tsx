import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'wouter';
import {
  Bell,
  GraduationCap,
  ClipboardCheck,
  Shield,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar
} from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

interface DashboardStats {
  notices: {
    total: number;
    unread: number;
  };
  education: {
    totalCourses: number;
    completedCourses: number;
    inProgressCourses: number;
  };
  tbm: {
    thisMonthSubmitted: number;
    thisMonthTotal: number;
  };
  inspection: {
    thisMonthCompleted: boolean;
    dueDate: string;
  };
}

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) {
    // 임시로 더미 데이터 반환
    return {
      notices: { total: 0, unread: 0 },
      education: { totalCourses: 0, completedCourses: 0, inProgressCourses: 0 },
      tbm: { thisMonthSubmitted: 0, thisMonthTotal: 0 },
      inspection: { thisMonthCompleted: false, dueDate: '' }
    };
  }
  return res.json();
};

export default function DashboardHomePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div>
        <Header />
        <main className="container mx-auto p-4 lg:p-8">
          <LoadingSpinner size="lg" text="대시보드를 불러오는 중..." className="py-16" />
        </main>
      </div>
    );
  }

  const menuCards = [
    {
      title: '공지사항',
      description: '최신 공지사항 및 안내사항',
      icon: Bell,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      path: '/notices',
      stats: stats ? `새 공지 ${stats.notices.unread}건` : '공지사항 확인',
      showToAll: true,
    },
    {
      title: '안전교육',
      description: '온라인 안전교육 수강',
      icon: GraduationCap,
      color: 'text-green-500',
      bgColor: 'bg-green-50 hover:bg-green-100',
      path: '/courses',
      stats: stats
        ? `${stats.education.completedCourses}/${stats.education.totalCourses} 완료`
        : '교육 시작하기',
      showToAll: true,
    },
    {
      title: 'TBM',
      description: '작업 전 안전점검',
      icon: ClipboardCheck,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      path: '/tbm',
      stats: stats
        ? `이번 달 ${stats.tbm.thisMonthSubmitted}/${stats.tbm.thisMonthTotal}일 제출`
        : 'TBM 작성하기',
      showToAll: user?.role !== 'OFFICE_WORKER',
    },
    {
      title: '안전점검',
      description: '월별 장비 안전점검',
      icon: Shield,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      path: '/safety-inspection',
      stats: stats
        ? stats.inspection.thisMonthCompleted
          ? '✅ 이번 달 점검 완료'
          : `⚠️ 점검 필요 (${stats.inspection.dueDate})`
        : '점검 시작하기',
      showToAll: user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM' || user?.role === 'TEAM_LEADER',
    },
  ];

  const visibleCards = menuCards.filter(card => card.showToAll);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />
      <main className="container mx-auto p-4 lg:p-8">
        {/* 헤더 섹션 */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            안전관리 통합 플랫폼
          </h1>
          <p className="text-lg text-muted-foreground">
            {user?.name || user?.username}님, 환영합니다
          </p>
        </div>

        {/* 메뉴 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {visibleCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 ${card.bgColor} border-2`}
                onClick={() => navigate(card.path)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-10 w-10 ${card.color}`} />
                    <div className={`h-3 w-3 rounded-full ${card.color.replace('text-', 'bg-')} animate-pulse`} />
                  </div>
                  <CardTitle className="text-2xl">{card.title}</CardTitle>
                  <CardDescription className="text-base">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.stats}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 하단 빠른 통계 */}
        {stats && (
          <div className="mt-12 max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-center">오늘의 현황</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 교육 진행률 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    교육 진행률
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold">
                        {stats.education.totalCourses > 0
                          ? Math.round((stats.education.completedCourses / stats.education.totalCourses) * 100)
                          : 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {stats.education.completedCourses}/{stats.education.totalCourses} 완료
                      </p>
                    </div>
                    <GraduationCap className="h-12 w-12 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              {/* TBM 제출 현황 */}
              {user?.role !== 'OFFICE_WORKER' && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      TBM 제출 현황
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-3xl font-bold">
                          {stats.tbm.thisMonthTotal > 0
                            ? Math.round((stats.tbm.thisMonthSubmitted / stats.tbm.thisMonthTotal) * 100)
                            : 0}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {stats.tbm.thisMonthSubmitted}/{stats.tbm.thisMonthTotal}일 제출
                        </p>
                      </div>
                      <ClipboardCheck className="h-12 w-12 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 안전점검 상태 */}
              {(user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM' || user?.role === 'TEAM_LEADER') && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      안전점검 상태
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        {stats.inspection.thisMonthCompleted ? (
                          <>
                            <p className="text-3xl font-bold text-green-600 flex items-center gap-2">
                              <CheckCircle className="h-8 w-8" /> 완료
                            </p>
                            <p className="text-sm text-muted-foreground">
                              이번 달 점검 완료
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-3xl font-bold text-orange-600 flex items-center gap-2">
                              <AlertCircle className="h-8 w-8" /> 대기
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {stats.inspection.dueDate || '매월 4일까지'}
                            </p>
                          </>
                        )}
                      </div>
                      <Shield className="h-12 w-12 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* 푸터 메시지 */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            안전한 작업 환경을 위해 항상 노력하겠습니다
          </p>
        </div>
      </main>
    </div>
  );
}
