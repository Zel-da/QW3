import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/header';
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
  Clock
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
  ];

  const visibleCards = menuCards.filter(card => card.showToAll);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header />

      {/* 공지사항 팝업 - 새로운 쌈뽕 디자인 */}
      {latestNotice && (
        <Dialog open={showNoticePopup} onOpenChange={(open) => !open && handleClosePopup()}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 gap-0 border-0 bg-gradient-to-br from-blue-50/95 via-white/95 to-purple-50/95 backdrop-blur-xl shadow-2xl animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            {/* 헤더 영역 */}
            <div className="relative overflow-hidden">
              {/* 그라데이션 배경 */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-90" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20" />

              {/* 컨텐츠 */}
              <div className="relative px-6 md:px-8 py-6 md:py-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Badge className="mb-3 bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm">
                      📢 새 공지사항
                    </Badge>
                    <DialogTitle className="text-2xl md:text-4xl font-bold text-white leading-tight mb-3 drop-shadow-lg">
                      {latestNotice.title}
                    </DialogTitle>
                    <DialogDescription className="text-white/90 text-base md:text-lg flex items-center gap-3 drop-shadow">
                      <span>{new Date(latestNotice.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      {latestNotice.category && (
                        <>
                          <span>•</span>
                          <span>{latestNotice.category}</span>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </div>

            {/* 본문 영역 */}
            <div className="overflow-y-auto max-h-[calc(90vh-280px)] scrollbar-visible">
              <div className="px-6 md:px-8 py-6 md:py-8 space-y-6">
                {/* 메인 이미지 */}
                {latestNotice.imageUrl && (
                  <div className="group relative overflow-hidden rounded-xl shadow-xl border-2 border-white/50 bg-white/50 backdrop-blur-sm">
                    <img
                      src={latestNotice.imageUrl}
                      alt={latestNotice.title}
                      loading="lazy"
                      className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                )}

                {/* 메인 비디오 */}
                {latestNotice.videoUrl && (
                  <div className="rounded-xl overflow-hidden shadow-xl border-2 border-white/50 bg-black">
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
                        className="w-full max-h-[500px]"
                        preload="metadata"
                      />
                    )}
                  </div>
                )}

                {/* 본문 내용 */}
                <div className="prose prose-lg max-w-none">
                  <div className="text-base md:text-lg leading-relaxed whitespace-pre-wrap text-gray-800 bg-white/60 backdrop-blur-sm rounded-lg p-6 shadow-sm border border-white/50">
                    {latestNotice.content}
                  </div>
                </div>

                {/* 첨부파일 섹션 */}
                {latestNotice.attachments && latestNotice.attachments.length > 0 && (
                  <div className="space-y-6 bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow-sm border border-white/50">
                    <h4 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">📎</span>
                      첨부 파일
                    </h4>

                    {/* 이미지 갤러리 */}
                    {latestNotice.attachments.filter(a => a.type === 'image').length > 0 && (
                      <div className="space-y-3">
                        <p className="font-semibold text-gray-700 flex items-center gap-2">
                          <span>🖼️</span>
                          이미지 ({latestNotice.attachments.filter(a => a.type === 'image').length})
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {latestNotice.attachments.filter(a => a.type === 'image').map((file, idx) => (
                            <div key={idx} className="group relative overflow-hidden rounded-lg border-2 border-white shadow-lg hover:shadow-xl transition-all duration-300">
                              <img
                                src={file.url}
                                alt={file.name}
                                loading="lazy"
                                className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                  <p className="text-white text-sm font-medium truncate drop-shadow">{file.name}</p>
                                  <p className="text-white/80 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 비디오 */}
                    {latestNotice.attachments.filter(a => a.type === 'video').length > 0 && (
                      <div className="space-y-3">
                        <p className="font-semibold text-gray-700 flex items-center gap-2">
                          <span>🎬</span>
                          동영상 ({latestNotice.attachments.filter(a => a.type === 'video').length})
                        </p>
                        <div className="space-y-4">
                          {latestNotice.attachments.filter(a => a.type === 'video').map((file, idx) => (
                            <div key={idx} className="rounded-lg overflow-hidden shadow-lg border-2 border-white bg-black">
                              <video
                                src={file.url}
                                controls
                                className="w-full max-h-[400px]"
                                preload="metadata"
                              />
                              <div className="bg-white p-3">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                {file.size > 0 && <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* YouTube 비디오 */}
                    {latestNotice.attachments.filter(a => a.type === 'youtube').length > 0 && (
                      <div className="space-y-3">
                        <p className="font-semibold text-gray-700 flex items-center gap-2">
                          <span>▶️</span>
                          YouTube ({latestNotice.attachments.filter(a => a.type === 'youtube').length})
                        </p>
                        <div className="space-y-4">
                          {latestNotice.attachments.filter(a => a.type === 'youtube').map((file, idx) => (
                            <div key={idx} className="rounded-lg overflow-hidden shadow-lg border-2 border-white">
                              <div className="aspect-video bg-black">
                                <iframe
                                  src={getYouTubeEmbedUrl(file.url)}
                                  className="w-full h-full"
                                  allowFullScreen
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  loading="lazy"
                                />
                              </div>
                              <div className="bg-white p-3">
                                <p className="text-sm text-muted-foreground">YouTube: {file.name}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 오디오 */}
                    {latestNotice.attachments.filter(a => a.type === 'audio').length > 0 && (
                      <div className="space-y-3">
                        <p className="font-semibold text-gray-700 flex items-center gap-2">
                          <span>🎵</span>
                          오디오 ({latestNotice.attachments.filter(a => a.type === 'audio').length})
                        </p>
                        <div className="space-y-3">
                          {latestNotice.attachments.filter(a => a.type === 'audio').map((file, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-4 shadow border">
                              <audio src={file.url} controls className="w-full mb-2" />
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              {file.size > 0 && <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 파일 첨부 */}
                    {latestNotice.attachments.filter(a => a.type === 'attachment').length > 0 && (
                      <div className="space-y-3">
                        <p className="font-semibold text-gray-700 flex items-center gap-2">
                          <span>📄</span>
                          파일 ({latestNotice.attachments.filter(a => a.type === 'attachment').length})
                        </p>
                        <div className="space-y-2">
                          {latestNotice.attachments.filter(a => a.type === 'attachment').map((file, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-lg shadow border hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-2xl">📎</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <Button asChild variant="outline" size="sm" className="ml-4">
                                <a href={file.url} download={file.name}>
                                  다운로드
                                </a>
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 레거시 첨부파일 */}
                {latestNotice.attachmentUrl && !latestNotice.attachments?.length && (
                  <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 shadow-sm border border-white/50">
                    <Button asChild variant="outline" className="text-base w-full h-12">
                      <a href={latestNotice.attachmentUrl} download={latestNotice.attachmentName || true}>
                        📎 첨부파일 다운로드: {latestNotice.attachmentName}
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 푸터 버튼 */}
            <DialogFooter className="px-6 md:px-8 py-4 md:py-6 border-t border-white/50 bg-white/80 backdrop-blur-sm flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => handleClosePopup(true)}
                className="text-base h-12 w-full sm:w-auto sm:flex-1 border-2 hover:bg-white/80 transition-all duration-300"
              >
                오늘 하루 보지 않기
              </Button>
              <Button
                asChild
                variant="default"
                className="text-base h-12 w-full sm:w-auto sm:flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Link href={`/notices/${latestNotice.id}`} onClick={() => setShowNoticePopup(false)}>
                  자세히 보기
                </Link>
              </Button>
              <Button
                onClick={() => handleClosePopup()}
                variant="secondary"
                className="text-base h-12 w-full sm:w-auto sm:flex-1 hover:bg-gray-200 transition-all duration-300"
              >
                닫기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

        {/* 최신 공지사항 */}
        {recentNotices && recentNotices.length > 0 && (
          <div className="mt-12 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">최신 공지사항</h2>
              <button
                onClick={() => navigate('/notices')}
                className="text-sm text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
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
                    className={`flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                      index !== recentNotices.length - 1 ? 'border-b' : ''
                    }`}
                    onClick={() => navigate(`/notices/${notice.id}`)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Bell className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium block truncate">{notice.title}</span>
                        <span className="text-xs text-muted-foreground">
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
          <div className="mt-12 max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">최근 활동</h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {sortedActivities.map((activity, index) => {
                    const Icon = activity.icon;
                    const timeAgo = getTimeAgo(activity.timestamp);

                    return (
                      <div key={activity.id} className="flex items-start gap-4">
                        <div className={`p-2 rounded-full bg-muted ${activity.iconColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold">{activity.title}</h3>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {timeAgo}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{activity.description}</p>
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
    </div>
  );
}
