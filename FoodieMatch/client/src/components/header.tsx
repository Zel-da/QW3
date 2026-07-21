import React, { useState } from 'react';
import { Link, useLocation } from "wouter";
import { Shield, BookOpen, Home, Menu, Mic, Square, Loader2, CheckCircle2, AlertCircle, Play, Save, Trash2, Pause } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRecording, formatTime } from "@/context/RecordingContext";
import { useTbmNavigation } from "@/context/TbmNavigationContext";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/useConfirm";
import { isIOSStandalone, hasMediaDevicesSupport } from "@/lib/deviceDetect";
import { X } from "lucide-react";
import { UnexpectedStopDialog } from "@/components/UnexpectedStopDialog";
import { RecordingStatusBanner } from "@/components/RecordingStatusBanner";

// iOS 홈 화면 앱 감지 배너 (sessionStorage로 dismiss 상태 유지)
const IOS_PWA_DISMISS_KEY = '__ios_pwa_banner_dismissed';

function IOSStandaloneBanner() {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(IOS_PWA_DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;
  if (!isIOSStandalone()) return null;
  const supported = hasMediaDevicesSupport();

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3 text-xs text-amber-900">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1">
        <strong>iOS 홈 화면 앱으로 실행 중입니다.</strong>
        {supported
          ? ' 녹음·업로드에 제약이 있을 수 있어요. 문제 시 Safari에서 직접 접속해주세요.'
          : ' 이 iOS 버전에서는 마이크가 지원되지 않습니다. Safari에서 직접 접속해주세요.'}
      </div>
      <button
        onClick={() => {
          try { sessionStorage.setItem(IOS_PWA_DISMISS_KEY, '1'); } catch {}
          setDismissed(true);
        }}
        className="p-1 hover:bg-amber-100 rounded"
        aria-label="닫기"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function Header() {
  const { user, logout } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [location] = useLocation();
  const { safeNavigate: tbmSafeNavigate, isTbmActive } = useTbmNavigation();
  const {
    state: recordingState,
    startRecording,
    pauseRecording,
    resumeRecording,
    saveRecording,
    discardRecording,
    currentTbmInfo,
    canStartRecording,
    uploadProgress,
  } = useRecording();
  const { toast } = useToast();
  const confirm = useConfirm();

  const handleStartRecording = async () => {
    // 진단 1: 마이크 API 자체 미지원 (iOS 16.3 이하 홈 화면 앱 등)
    if (!hasMediaDevicesSupport()) {
      toast({
        title: '마이크 기능 미지원',
        description: isIOSStandalone()
          ? 'iOS 홈 화면 앱에서는 녹음이 제한적입니다. Safari 브라우저에서 직접 접속해주세요.'
          : '이 환경에서는 마이크 접근이 지원되지 않습니다. 최신 브라우저에서 열어주세요.',
        variant: 'destructive',
        duration: 10000,
      });
      return;
    }
    // 진단 2: TBM 팀·날짜 미선택
    if (!currentTbmInfo) {
      toast({
        title: "녹음 시작 불가",
        description: "TBM 작성 화면에서 팀·날짜를 먼저 선택해주세요.",
        variant: "destructive",
      });
      return;
    }
    const success = await startRecording(currentTbmInfo.teamId, currentTbmInfo.teamName, currentTbmInfo.date);
    if (success) {
      toast({
        title: "녹음 시작",
        description: `${currentTbmInfo.teamName} 팀의 TBM 녹음을 시작합니다.`,
      });
    }
  };

  const handlePauseRecording = async () => {
    await pauseRecording();
    toast({
      title: "일시정지됨",
      description: "이어서 녹음하거나 TBM에 저장할 수 있습니다.",
    });
  };

  const handleResumeRecording = async () => {
    const success = await resumeRecording();
    if (success) {
      toast({
        title: "녹음 재개",
        description: "이어서 녹음합니다.",
      });
    } else {
      toast({
        title: "재개 실패",
        description: "마이크 접근 권한을 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  const handleSaveRecording = async () => {
    // 저장 시작 시점의 팀·날짜를 미리 캡처 (saveRecording 성공 후엔 startedFrom이 null 됨)
    const teamAtStart = recordingState.startedFrom?.teamName || recordingState.pausedInfo?.teamName || '';
    const dateAtStart = recordingState.startedFrom?.date || recordingState.pausedInfo?.date || '';
    const result = await saveRecording();
    if (result) {
      toast({
        title: "녹음 저장 완료",
        description: `${teamAtStart} 팀의 ${dateAtStart} TBM 일지에 저장되었습니다.`,
      });
    } else {
      toast({
        title: "녹음 저장 실패",
        description: recordingState.saveError || "다시 시도해주세요. 녹음 데이터는 유지됩니다.",
        variant: "destructive",
      });
    }
  };

  const handleDiscardRecording = async () => {
    const ok = await confirm({
      title: '녹음 버리기',
      description: '지금까지 녹음된 내용을 모두 버립니다. TBM에 저장되지 않으며 되돌릴 수 없습니다.',
      confirmText: '버리기',
      destructive: true,
    });
    if (ok) {
      await discardRecording();
      toast({
        title: "녹음 버려짐",
        description: "지금까지 녹음된 내용이 삭제되었습니다.",
      });
    }
  };

  // 현재 경로가 해당 링크와 일치하는지 확인 (하위 경로 포함)
  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  // 활성 상태에 따른 클래스 반환
  const getLinkClass = (path: string) => {
    const baseClass = "text-base font-medium transition-colors flex items-center whitespace-nowrap";
    if (isActive(path)) {
      return `${baseClass} text-foreground font-bold`;
    }
    return `${baseClass} text-muted-foreground hover:text-primary`;
  };

  // TBM 페이지에서 네비게이션 가로채기
  const handleNavClick = (e: React.MouseEvent, href: string) => {
    // 모바일 메뉴 닫기 (TBM 활성 여부 상관없이)
    setIsSheetOpen(false);

    // TBM 페이지에서는 임시저장 후 이동
    if (isTbmActive && tbmSafeNavigate) {
      e.preventDefault();
      tbmSafeNavigate(href);
    }
  };

  // 녹음 상태에 따른 UI 렌더링
  const renderRecordingControls = (isMobile = false) => {
    const status = recordingState.status;
    const buttonSize = isMobile ? "default" : "sm";

    // 녹음 중 - 일시정지 버튼
    if (status === 'recording') {
      return (
        <Button
          onClick={handlePauseRecording}
          variant="destructive"
          size={buttonSize}
          className={`animate-pulse flex items-center gap-2 ${isMobile ? 'rounded-lg px-3 h-10 shadow-lg' : ''}`}
        >
          <Pause className="h-4 w-4" />
          <span className="font-mono">{formatTime(recordingState.duration)}</span>
          {!isMobile && <span>일시정지</span>}
        </Button>
      );
    }

    // 일시정지 상태 - 재개/저장/삭제 버튼
    if (status === 'paused') {
      if (isMobile) {
        // 모바일: [재개] [저장] [시간] [삭제]
        return (
          <div className="flex items-center gap-1">
            <Button
              onClick={handleResumeRecording}
              variant="outline"
              size="icon"
              className="rounded-lg w-9 h-9 border-blue-500 text-blue-600"
              title="이어서 녹음"
            >
              <Play className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSaveRecording}
              variant="outline"
              size="icon"
              className="rounded-lg w-9 h-9 border-green-500 text-green-600"
              title="TBM 일지에 저장"
            >
              <Save className="h-4 w-4" />
            </Button>
            <div className="px-2 py-1 bg-amber-100 text-amber-700 rounded font-mono text-sm">
              {formatTime(recordingState.duration)}
            </div>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button
              onClick={handleDiscardRecording}
              variant="outline"
              size="icon"
              className="rounded-lg w-9 h-9 border-red-500 text-red-600"
              title="녹음 버리기"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      } else {
        // 데스크톱: [재개] [저장] [시간] | [삭제]
        return (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleResumeRecording}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 border-blue-500 text-blue-600 hover:bg-blue-50"
              title="이어서 녹음"
            >
              <Play className="h-4 w-4" />
              이어서 녹음
            </Button>
            <Button
              onClick={handleSaveRecording}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 border-green-500 text-green-600 hover:bg-green-50"
              title="TBM 일지에 저장"
            >
              <Save className="h-4 w-4" />
              TBM에 저장
            </Button>
            <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-md">
              <Pause className="h-4 w-4" />
              <span className="font-mono">{formatTime(recordingState.duration)}</span>
              <span className="text-xs ml-1">일시정지</span>
            </div>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <Button
              onClick={handleDiscardRecording}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      }
    }

    // 저장 중 — 업로드 진행률 표시 (사용자가 명확히 인지할 수 있게)
    if (status === 'saving') {
      const progress = uploadProgress;
      const showPercent = progress !== null;
      const label = showPercent
        ? (progress! < 100 ? `업로드 ${progress}%` : '서버 처리 중...')
        : '저장 준비 중...';
      return (
        <div className="flex flex-col items-stretch gap-1 min-w-[120px]">
          <Button
            variant="outline"
            size={buttonSize}
            disabled
            className={`flex items-center gap-2 ${isMobile ? 'rounded-lg px-3 h-10 shadow-lg' : ''}`}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-medium">{isMobile ? (showPercent ? `${progress}%` : '저장') : label}</span>
          </Button>
          {/* 진행률 바 (표시할 때만) */}
          {showPercent && (
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      );
    }

    // 저장 완료
    if (status === 'success') {
      return (
        <Button
          variant="outline"
          size={buttonSize}
          className={`flex items-center gap-2 text-green-600 border-green-600 ${isMobile ? 'rounded-lg px-3 h-10 shadow-lg bg-green-50' : ''}`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isMobile ? <span className="text-xs font-medium">완료</span> : '저장 완료'}
        </Button>
      );
    }

    // 저장 실패 — chunks는 IndexedDB에 유지됨. saveRecording 재호출로 서버 재업로드 시도
    if (status === 'error') {
      return (
        <div className="flex items-center gap-1">
          <Button
            onClick={handleSaveRecording}
            variant="destructive"
            size={buttonSize}
            className={`flex items-center gap-2 ${isMobile ? 'rounded-lg px-3 h-10 shadow-lg' : ''}`}
            title="저장 재시도"
          >
            <AlertCircle className="h-4 w-4" />
            {isMobile ? <span className="text-xs">재시도</span> : '저장 재시도'}
          </Button>
          <Button
            onClick={handleDiscardRecording}
            variant="ghost"
            size={buttonSize}
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            title="녹음 버리기"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    // 기본 상태 (idle) — disabled 대신 클릭 가능하게 두고 handleStartRecording에서
    // 원인별 진단 토스트 노출 (iOS PWA 미지원 / TBM 미선택 등 사용자가 원인 파악 가능)
    return (
      <Button
        onClick={handleStartRecording}
        variant={canStartRecording ? "destructive" : "outline"}
        size={buttonSize}
        aria-disabled={!canStartRecording}
        className={`flex items-center gap-2 ${canStartRecording ? 'shadow-md' : 'opacity-60'} ${isMobile ? 'rounded-lg px-3 h-10 shadow-lg' : ''}`}
        title={!canStartRecording ? "클릭하여 안내 확인 (TBM 팀 선택 필요)" : "녹음 시작"}
      >
        <Mic className="h-4 w-4" />
        {isMobile ? (
          <span className="text-xs font-medium">녹음</span>
        ) : (
          canStartRecording ? '녹음 시작' : '녹음'
        )}
      </Button>
    );
  };

  const isContractor = user?.role === 'CONTRACTOR';

  const navLinks = (
    <>
      <Link href="/" onClick={(e) => handleNavClick(e, '/')} className={getLinkClass('/')}>
        홈
      </Link>
      <Link href="/notices" onClick={(e) => handleNavClick(e, '/notices')} className={getLinkClass('/notices')}>
        공지사항
      </Link>
      {!isContractor && (
        <Link href="/tbm" onClick={(e) => handleNavClick(e, '/tbm')} className={getLinkClass('/tbm')}>
          TBM
        </Link>
      )}
      <Link href="/courses" onClick={(e) => handleNavClick(e, '/courses')} className={getLinkClass('/courses')}>
        안전교육
      </Link>
      {(user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER' || user?.role === 'EXECUTIVE_LEADER') && (
        <Link href="/safety-inspection" onClick={(e) => handleNavClick(e, '/safety-inspection')} className={getLinkClass('/safety-inspection')}>
          안전점검
        </Link>
      )}
      <Link href="/documents" onClick={(e) => handleNavClick(e, '/documents')} className={getLinkClass('/documents')}>
        자료실
      </Link>
      {(user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER' || user?.role === 'EXECUTIVE_LEADER' || user?.role === 'APPROVER') && (
        <>
          <Link href="/monthly-report" onClick={(e) => handleNavClick(e, '/monthly-report')} className={getLinkClass('/monthly-report')}>
            월별 보고서
          </Link>
          <Link href="/admin-dashboard" onClick={(e) => handleNavClick(e, '/admin-dashboard')} className={getLinkClass('/admin-dashboard')}>
            관리
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <UnexpectedStopDialog />
      <RecordingStatusBanner />
      <IOSStandaloneBanner />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3" data-testid="logo">
            <Link href="/" onClick={(e) => handleNavClick(e, '/')} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="text-primary-foreground w-4 h-4" />
              </div>
              <h1 className="text-base font-medium text-foreground korean-text whitespace-nowrap">안전관리 통합 플랫폼</h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-4">
            {navLinks}
            {/* Desktop Recording Button */}
            {(user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER' || user?.role === 'EXECUTIVE_LEADER') && renderRecordingControls(false)}
          </nav>

          {/* Mobile Center Recording Button */}
          <div className="lg:hidden flex-1 flex justify-center">
            {(user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER' || user?.role === 'EXECUTIVE_LEADER') && renderRecordingControls(true)}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <>
                  <span className="text-base font-medium whitespace-nowrap">{user.username}님</span>
                  <Button asChild variant="ghost" className="text-base font-medium whitespace-nowrap">
                    <Link href="/profile" onClick={(e) => handleNavClick(e, '/profile')}>내 정보</Link>
                  </Button>
                  <Button onClick={logout} variant="ghost" className="text-base font-medium whitespace-nowrap">로그아웃</Button>
                </>
              ) : (
                <Button asChild variant="ghost" className="text-base font-medium whitespace-nowrap">
                  <Link href="/login" onClick={(e) => handleNavClick(e, '/login')}>로그인</Link>
                </Button>
              )}
            </div>

            {/* Mobile Navigation - 가장 오른쪽에 배치 */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                {user && (
                  <div className="border-b pb-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <span className="text-primary-foreground font-semibold text-lg">
                          {user.name?.charAt(0) || user.username.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-base">{user.name || user.username}님</p>
                        <p className="text-sm text-muted-foreground">{user.role}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <Button asChild variant="outline" className="w-full justify-start" onClick={() => setIsSheetOpen(false)}>
                        <Link href="/profile" onClick={(e) => handleNavClick(e, '/profile')}>내 정보</Link>
                      </Button>
                      <Button onClick={() => { logout(); setIsSheetOpen(false); }} variant="ghost" className="w-full justify-start text-destructive hover:text-destructive">
                        로그아웃
                      </Button>
                    </div>
                  </div>
                )}
                <nav className="grid gap-2 text-lg font-medium">
                  <div className="grid gap-1">
                    <Link href="/" onClick={(e) => handleNavClick(e, '/')} className={`${getLinkClass('/')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                      홈
                    </Link>
                    <Link href="/notices" onClick={(e) => handleNavClick(e, '/notices')} className={`${getLinkClass('/notices')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                      공지사항
                    </Link>
                    {!isContractor && (
                      <Link href="/tbm" onClick={(e) => handleNavClick(e, '/tbm')} className={`${getLinkClass('/tbm')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                        TBM
                      </Link>
                    )}
                    <Link href="/courses" onClick={(e) => handleNavClick(e, '/courses')} className={`${getLinkClass('/courses')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                      안전교육
                    </Link>
                    {(user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER' || user?.role === 'EXECUTIVE_LEADER') && (
                        <Link href="/safety-inspection" onClick={(e) => handleNavClick(e, '/safety-inspection')} className={`${getLinkClass('/safety-inspection')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                          안전점검
                        </Link>
                    )}
                    <Link href="/documents" onClick={(e) => handleNavClick(e, '/documents')} className={`${getLinkClass('/documents')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                      자료실
                    </Link>
                    {(user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER' || user?.role === 'EXECUTIVE_LEADER' || user?.role === 'APPROVER') && (
                      <>
                        <Link href="/monthly-report" onClick={(e) => handleNavClick(e, '/monthly-report')} className={`${getLinkClass('/monthly-report')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                          월별 보고서
                        </Link>
                        <Link href="/admin-dashboard" onClick={(e) => handleNavClick(e, '/admin-dashboard')} className={`${getLinkClass('/admin-dashboard')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                          관리
                        </Link>
                      </>
                    )}
                  </div>
                </nav>
                {!user && (
                  <div className="mt-6 pt-6 border-t">
                    <Button asChild className="w-full">
                      <Link href="/login" onClick={(e) => handleNavClick(e, '/login')}>로그인</Link>
                    </Button>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
