import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/header';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation, Link } from 'wouter';
import { useState, useEffect } from 'react';
import {
  Bell,
  GraduationCap,
  ClipboardCheck,
  Shield,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
  ChevronRight,
  Clock,
  X,
  FileCheck
} from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { DashboardStats as DashboardStatsCharts } from '@/components/DashboardStats';
import type { Notice } from '@shared/schema';

// 시간 경과 표시 함수
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return '방금 전';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}일 전`;
  return past.toLocaleDateString('ko-KR');
}

// YouTube URL을 embed URL로 변환
function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';

  // 이미 embed URL인 경우
  if (url.includes('/embed/')) return url;

  // 다양한 YouTube URL 형식 처리
  let videoId = '';

  // https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }

  // https://youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }

  // https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/\/embed\/([^?]+)/);
  if (embedMatch) {
    videoId = embedMatch[1];
  }

  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

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
  approvals?: {
    pendingReceived: number;
    pendingSent: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'education' | 'tbm' | 'notice';
  title: string;
  description: string;
  timestamp: string;
  relatedId: string;
}

interface RecentActivityDisplay extends RecentActivity {
  icon: typeof GraduationCap;
  iconColor: string;
}

const fetchDashboardStats = async (): Promise<DashboardStats> => {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }
  return res.json();
};

const fetchRecentNotices = async (): Promise<Notice[]> => {
  const res = await fetch('/api/notices?limit=5');
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  // API가 pagination 형식 { data: [], pagination: {} } 또는 배열을 반환할 수 있음
  return Array.isArray(data) ? data : (data.data || data.notices || []);
};

const fetchRecentActivities = async (): Promise<RecentActivity[]> => {
  const res = await fetch('/api/dashboard/recent-activities');
  if (!res.ok) {
    throw new Error('Failed to fetch recent activities');
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

  const { data: recentNotices } = useQuery<Notice[]>({
    queryKey: ['recent-notices'],
    queryFn: fetchRecentNotices,
    enabled: !!user,
  });

  const { data: recentActivities } = useQuery<RecentActivity[]>({
    queryKey: ['recent-activities'],
    queryFn: fetchRecentActivities,
    enabled: !!user,
  });

  // 최신 공지사항 팝업용
  const { data: latestNotice } = useQuery<Notice>({
    queryKey: ['latest-notice'],
    queryFn: async () => {
      const res = await fetch('/api/notices?latest=true');
      if (!res.ok) throw new Error('Failed to fetch latest notice');
      return res.json();
    },
    enabled: !!user,
  });

  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // 팝업 표시 로직
  useEffect(() => {
    if (!latestNotice) return;

    const popupKey = `notice-popup-${latestNotice.id}`;
    const hideUntil = localStorage.getItem(popupKey);

    if (hideUntil) {
      const hideDate = new Date(hideUntil);
      if (hideDate > new Date()) {
        return;
      }
    }

    setShowNoticePopup(true);
  }, [latestNotice]);

  const handleClosePopup = (hideForToday = false) => {
    if (hideForToday && latestNotice) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      localStorage.setItem(`notice-popup-${latestNotice.id}`, tomorrow.toISOString());
    }
    setShowNoticePopup(false);
  };

  // API에서 받은 활동에 아이콘과 색상 추가
  const sortedActivities: RecentActivityDisplay[] = (recentActivities || []).map(activity => {
    let icon: typeof GraduationCap;
    let iconColor: string;

    switch (activity.type) {
      case 'notice':
        icon = Bell;
        iconColor = 'text-blue-500';
        break;
      case 'education':
        icon = GraduationCap;
        iconColor = 'text-green-500';
        break;
      case 'tbm':
        icon = ClipboardCheck;
        iconColor = 'text-orange-500';
        break;
      default:
        icon = Bell;
        iconColor = 'text-gray-500';
    }

    return {
      ...activity,
      icon,
      iconColor
    };
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
      title: 'TBM',
      description: '작업 전 안전점검',
      icon: ClipboardCheck,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      path: '/tbm',
      stats: stats
        ? `이번 달 ${stats.tbm.thisMonthSubmitted}/${stats.tbm.thisMonthTotal}일 제출`
        : 'TBM 작성하기',
      showToAll: user?.role !== 'APPROVER',
    },
    {
      title: '안전교육',
      description: '온라인 안전교육 수강',
      icon: GraduationCap,
      color: 'text-green-500',
      bgColor: 'bg-green-50 hover:bg-green-100',
      path: '/courses',
      stats: stats
        ? `이번 달 ${stats.education.completedCourses}/${stats.education.totalCourses} 완료`
        : '교육 시작하기',
      showToAll: true,
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
      showToAll: user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER',
    },
    {
      title: '결재',
      description: '월별 보고서 결재',
      icon: FileCheck,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100',
      path: '/approval-history',
      stats: stats?.approvals
        ? (() => {
            const total = (stats.approvals.pendingReceived || 0) + (stats.approvals.pendingSent || 0);
            if (total === 0) return '✅ 대기 중인 결재 없음';
            if (user?.role === 'APPROVER') return `📋 받은 결재 ${stats.approvals.pendingReceived}건 대기`;
            if (user?.role === 'TEAM_LEADER') return `📤 보낸 결재 ${stats.approvals.pendingSent}건 대기`;
            return `📋 대기 중 ${total}건`;
          })()
        : '결재 현황 보기',
      showToAll: user?.role === 'ADMIN' || user?.role === 'APPROVER' || user?.role === 'TEAM_LEADER',
    },
  ];

  const visibleCards = menuCards.filter(card => card.showToAll);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 pb-20 md:pb-0">
      <Header />

      {/* 공지사항 팝업 - 깔끔한 디자인 */}
      {latestNotice && (
        <Dialog open={showNoticePopup} onOpenChange={(open) => !open && handleClosePopup()}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden p-0 gap-0">
            {/* 헤더 영역 */}
            <DialogHeader className="px-6 py-5 border-b bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs font-normal">
                  공지사항
                </Badge>
                {latestNotice.category && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {latestNotice.category}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-semibold leading-tight">
                {latestNotice.title}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {new Date(latestNotice.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </DialogDescription>
            </DialogHeader>

            {/* 본문 영역 */}
            <div className="overflow-y-auto max-h-[calc(85vh-200px)]">
              <div className="px-6 py-5 space-y-5">
                {/* 메인 이미지 */}
                {latestNotice.imageUrl && (
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={latestNotice.imageUrl}
                      alt={latestNotice.title}
                      loading="lazy"
                      className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setEnlargedImage(latestNotice.imageUrl || null)}
                    />
                  </div>
                )}

                {/* 메인 비디오 */}
                {latestNotice.videoUrl && (
                  <div className="rounded-lg overflow-hidden border bg-black">
                    {latestNotice.videoType === 'youtube' ? (
                      <div className="aspect-video">
                        <iframe
                          src={getYouTubeEmbedUrl(latestNotice.videoUrl)}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <video
                        src={latestNotice.videoUrl}
                        controls
                        className="w-full max-h-[400px]"
                        preload="metadata"
                      />
                    )}
                  </div>
                )}

                {/* 본문 내용 */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {latestNotice.content}
                </div>

                {/* 첨부파일 섹션 */}
                {latestNotice.attachments && latestNotice.attachments.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      첨부파일 ({latestNotice.attachments.length})
                    </h4>

                    {/* 이미지 갤러리 */}
                    {latestNotice.attachments.filter(a => a.type === 'image').length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {latestNotice.attachments.filter(a => a.type === 'image').map((file, idx) => (
                          <div key={idx} className="rounded-lg overflow-hidden border">
                            <img
                              src={file.url}
                              alt={file.name}
                              loading="lazy"
                              className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setEnlargedImage(file.url)}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 비디오 */}
                    {latestNotice.attachments.filter(a => a.type === 'video').map((file, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border bg-black">
                        <video
                          src={file.url}
                          controls
                          className="w-full max-h-[300px]"
                          preload="metadata"
                        />
                      </div>
                    ))}

                    {/* YouTube 비디오 */}
                    {latestNotice.attachments.filter(a => a.type === 'youtube').map((file, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border">
                        <div className="aspect-video bg-black">
                          <iframe
                            src={getYouTubeEmbedUrl(file.url)}
                            className="w-full h-full"
                            allowFullScreen
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    ))}

                    {/* 오디오 */}
                    {latestNotice.attachments.filter(a => a.type === 'audio').map((file, idx) => (
                      <div key={idx} className="rounded-lg border p-3">
                        <audio src={file.url} controls className="w-full" />
                        <p className="text-xs text-muted-foreground mt-2 truncate">{file.name}</p>
                      </div>
                    ))}

                    {/* 파일 첨부 */}
                    {latestNotice.attachments.filter(a => a.type === 'attachment').map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button asChild variant="ghost" size="sm">
                          <a href={file.url} download={file.name}>
                            다운로드
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 레거시 첨부파일 */}
                {latestNotice.attachmentUrl && !latestNotice.attachments?.length && (
                  <div className="pt-4 border-t">
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <a href={latestNotice.attachmentUrl} download={latestNotice.attachmentName || true}>
                        첨부파일 다운로드: {latestNotice.attachmentName}
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 푸터 버튼 */}
            <DialogFooter className="px-6 py-4 border-t bg-muted/30 flex-col sm:flex-row gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClosePopup(true)}
                className="text-muted-foreground"
              >
                오늘 하루 보지 않기
              </Button>
              <div className="flex gap-2 sm:ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClosePopup()}
                >
                  닫기
                </Button>
                <Button
                  asChild
                  size="sm"
                >
                  <Link href={`/notices/${latestNotice.id}`} onClick={() => setShowNoticePopup(false)}>
                    자세히 보기
                  </Link>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 이미지 확대 뷰어 */}
      <Dialog open={!!enlargedImage} onOpenChange={(open) => !open && setEnlargedImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
              onClick={() => setEnlargedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            {enlargedImage && (
              <img
                src={enlargedImage}
                alt="확대된 이미지"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-4 py-4 md:p-8">
        {/* 헤더 섹션 - 모바일에서 간결하게 */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center md:text-center">
            안전관리 통합 플랫폼
          </h1>
          <p className="text-sm md:text-lg text-muted-foreground text-center">
            {user?.name || user?.username}님, 환영합니다
          </p>
        </div>

        {/* 메뉴 카드 그리드 - 모바일에서 2열 */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 max-w-6xl mx-auto">
          {visibleCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.title}
                className={`cursor-pointer transition-all duration-300 hover:shadow-xl active:scale-95 md:hover:scale-105 ${card.bgColor} border-2`}
                onClick={() => navigate(card.path)}
              >
                <CardHeader className="p-3 md:pb-3 md:p-6">
                  <div className="flex items-center justify-between mb-1 md:mb-2">
                    <Icon className={`h-8 w-8 md:h-10 md:w-10 ${card.color}`} />
                  </div>
                  <CardTitle className="text-lg md:text-2xl">{card.title}</CardTitle>
                  <CardDescription className="text-xs md:text-base line-clamp-2">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
                  <div className="flex items-center gap-1 md:gap-2">
                    <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">
                      {card.stats}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 최신 공지사항 */}
        {recentNotices && recentNotices.length > 0 && (
          <div className="mt-8 md:mt-12 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-3 md:mb-6">
              <h2 className="text-lg md:text-2xl font-bold">최신 공지사항</h2>
              <button
                onClick={() => navigate('/notices')}
                className="text-xs md:text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
              >
                전체보기
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <Card>
              <CardContent className="p-0">
                {recentNotices.map((notice, index) => (
                  <div
                    key={notice.id}
                    className={`flex items-center justify-between p-3 md:p-4 hover:bg-muted/50 active:bg-muted cursor-pointer transition-colors ${
                      index !== recentNotices.length - 1 ? 'border-b' : ''
                    }`}
                    onClick={() => navigate(`/notices/${notice.id}`)}
                  >
                    <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                      <Bell className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm md:text-base block truncate">{notice.title}</span>
                        <span className="text-[10px] md:text-xs text-muted-foreground">
                          {notice.category} • {new Date(notice.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard Statistics Charts */}
        <DashboardStatsCharts />

        {/* 최근 활동 타임라인 */}
        {sortedActivities.length > 0 && (
          <div className="mt-8 md:mt-12 max-w-6xl mx-auto">
            <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-6">최근 활동</h2>
            <Card>
              <CardContent className="p-3 md:p-6">
                <div className="space-y-3 md:space-y-4">
                  {sortedActivities.map((activity, index) => {
                    const Icon = activity.icon;
                    const timeAgo = getTimeAgo(activity.timestamp);

                    return (
                      <div key={activity.id} className="flex items-start gap-3 md:gap-4">
                        <div className={`p-1.5 md:p-2 rounded-full bg-muted ${activity.iconColor} flex-shrink-0`}>
                          <Icon className="h-4 w-4 md:h-5 md:w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5 md:mb-1">
                            <h3 className="font-semibold text-sm md:text-base truncate">{activity.title}</h3>
                            <span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                              <Clock className="h-3 w-3 hidden md:block" />
                              {timeAgo}
                            </span>
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{activity.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 푸터 메시지 */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            안전한 작업 환경을 위해 항상 노력하겠습니다
          </p>
        </div>
      </main>

      {/* 모바일 하단 네비게이션 */}
      <BottomNavigation />
    </div>
  );
}
