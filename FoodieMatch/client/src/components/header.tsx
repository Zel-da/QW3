import React, { useState } from 'react';
import { Link, useLocation } from "wouter";
import { Shield, BookOpen, Home, Menu, Mic, Square, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRecording, formatTime } from "@/context/RecordingContext";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const { user, logout } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [location] = useLocation();
  const { state: recordingState, startRecording, stopRecording, currentTbmInfo, canStartRecording } = useRecording();
  const { toast } = useToast();

  const handleStartRecording = async () => {
    if (!currentTbmInfo) {
      toast({
        title: "녹음 시작 불가",
        description: "TBM 체크리스트에서 팀을 먼저 선택해주세요.",
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

  const handleStopRecording = async () => {
    const result = await stopRecording();
    if (result) {
      toast({
        title: "녹음 저장 완료",
        description: `녹음이 ${recordingState.startedFrom?.teamName} 팀의 TBM에 저장되었습니다.`,
      });
    } else {
      toast({
        title: "녹음 저장 실패",
        description: "녹음 저장 중 오류가 발생했습니다.",
        variant: "destructive",
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

  const navLinks = (
    <>
      <Link href="/" onClick={() => setIsSheetOpen(false)} className={getLinkClass('/')}>
        홈
      </Link>
      <Link href="/notices" onClick={() => setIsSheetOpen(false)} className={getLinkClass('/notices')}>
        공지사항
      </Link>
      <Link href="/tbm" onClick={() => setIsSheetOpen(false)} className={getLinkClass('/tbm')}>
        TBM
      </Link>
      <Link href="/courses" onClick={() => setIsSheetOpen(false)} className={getLinkClass('/courses')}>
        안전교육
      </Link>
      {(user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER') && (
        <>
          <Link href="/safety-inspection" onClick={() => setIsSheetOpen(false)} className={getLinkClass('/safety-inspection')}>
            안전점검
          </Link>
          <Link href="/monthly-report" onClick={() => setIsSheetOpen(false)} className={getLinkClass('/monthly-report')}>
            월별 보고서
          </Link>
          <Link href="/admin-dashboard" onClick={() => setIsSheetOpen(false)} className={getLinkClass('/admin-dashboard')}>
            관리
          </Link>
        </>
      )}
    </>
  );

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3" data-testid="logo">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Shield className="text-primary-foreground w-4 h-4" />
              </div>
              <h1 className="text-base font-medium text-foreground korean-text whitespace-nowrap">안전관리 통합 프로그램</h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-4">
            {navLinks}
            {/* Desktop Recording Button */}
            {(user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER') && (
              // 녹음 중
              recordingState.isRecording ? (
                <Button
                  onClick={handleStopRecording}
                  variant="destructive"
                  size="sm"
                  className="animate-pulse flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  <span className="font-mono">{formatTime(recordingState.duration)}</span>
                  <span>중지</span>
                </Button>
              ) : // 저장 중
              recordingState.isSaving || recordingState.saveStatus === 'saving' ? (
                <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  저장 중...
                </Button>
              ) : // 저장 완료
              recordingState.saveStatus === 'success' ? (
                <Button variant="outline" size="sm" className="flex items-center gap-2 text-green-600 border-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  저장 완료
                </Button>
              ) : // 저장 실패
              recordingState.saveStatus === 'error' ? (
                <Button
                  onClick={handleStartRecording}
                  variant="destructive"
                  size="sm"
                  disabled={!canStartRecording}
                  className="flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  재시도
                </Button>
              ) : // 기본 상태
              (
                <Button
                  onClick={handleStartRecording}
                  variant={canStartRecording ? "destructive" : "outline"}
                  size="sm"
                  disabled={!canStartRecording}
                  className={`flex items-center gap-2 ${canStartRecording ? 'shadow-md' : 'opacity-60'}`}
                  title={!canStartRecording ? "TBM 체크리스트에서 팀을 먼저 선택해주세요" : "녹음 시작"}
                >
                  <Mic className="h-4 w-4" />
                  {canStartRecording ? '🎙️ 녹음 시작' : '녹음'}
                </Button>
              )
            )}
          </nav>

          {/* Mobile Center Recording Button */}
          <div className="lg:hidden flex-1 flex justify-center">
            {(user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER') && (
              // 녹음 중 - 시간 표시와 함께
              recordingState.isRecording ? (
                <Button
                  onClick={handleStopRecording}
                  variant="destructive"
                  className="rounded-lg px-3 h-10 animate-pulse shadow-lg flex items-center gap-2"
                >
                  <Square className="h-4 w-4" />
                  <span className="font-mono text-sm">{formatTime(recordingState.duration)}</span>
                </Button>
              ) : // 저장 중
              recordingState.isSaving || recordingState.saveStatus === 'saving' ? (
                <Button
                  variant="outline"
                  size="icon"
                  disabled
                  className="rounded-lg w-10 h-10 shadow-lg"
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                </Button>
              ) : // 저장 완료
              recordingState.saveStatus === 'success' ? (
                <Button
                  variant="outline"
                  className="rounded-lg px-3 h-10 shadow-lg text-green-600 border-green-600 bg-green-50 flex items-center gap-1"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">완료</span>
                </Button>
              ) : // 저장 실패
              recordingState.saveStatus === 'error' ? (
                <Button
                  onClick={handleStartRecording}
                  variant="destructive"
                  className="rounded-lg px-3 h-10 shadow-lg flex items-center gap-1"
                  disabled={!canStartRecording}
                >
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-xs">재시도</span>
                </Button>
              ) : // 기본 상태
              (
                <Button
                  onClick={handleStartRecording}
                  variant={canStartRecording ? "destructive" : "outline"}
                  className={`rounded-lg px-3 h-10 shadow-lg flex items-center gap-1 ${!canStartRecording ? 'opacity-60' : ''}`}
                  disabled={!canStartRecording}
                  title={!canStartRecording ? "TBM 체크리스트에서 팀을 먼저 선택해주세요" : "녹음 시작"}
                >
                  <Mic className="h-4 w-4" />
                  <span className="text-xs font-medium">녹음</span>
                </Button>
              )
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              {user ? (
                <>
                  <span className="text-base font-medium whitespace-nowrap">{user.username}님</span>
                  <Button asChild variant="ghost" className="text-base font-medium whitespace-nowrap">
                    <Link href="/profile">내 정보</Link>
                  </Button>
                  <Button onClick={logout} variant="ghost" className="text-base font-medium whitespace-nowrap">로그아웃</Button>
                </>
              ) : (
                <Button asChild variant="ghost" className="text-base font-medium whitespace-nowrap">
                  <Link href="/login">로그인</Link>
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
                        <Link href="/profile">내 정보</Link>
                      </Button>
                      <Button onClick={() => { logout(); setIsSheetOpen(false); }} variant="ghost" className="w-full justify-start text-destructive hover:text-destructive">
                        로그아웃
                      </Button>
                    </div>
                  </div>
                )}
                <nav className="grid gap-2 text-lg font-medium">
                  <div className="grid gap-1">
                    <Link href="/" onClick={() => setIsSheetOpen(false)} className={`${getLinkClass('/')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                      홈
                    </Link>
                    <Link href="/notices" onClick={() => setIsSheetOpen(false)} className={`${getLinkClass('/notices')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                      공지사항
                    </Link>
                    <Link href="/tbm" onClick={() => setIsSheetOpen(false)} className={`${getLinkClass('/tbm')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                      TBM
                    </Link>
                    <Link href="/courses" onClick={() => setIsSheetOpen(false)} className={`${getLinkClass('/courses')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                      안전교육
                    </Link>
                    {(user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER') && (
                      <>
                        <Link href="/safety-inspection" onClick={() => setIsSheetOpen(false)} className={`${getLinkClass('/safety-inspection')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                          안전점검
                        </Link>
                        <Link href="/monthly-report" onClick={() => setIsSheetOpen(false)} className={`${getLinkClass('/monthly-report')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                          월별 보고서
                        </Link>
                        <Link href="/admin-dashboard" onClick={() => setIsSheetOpen(false)} className={`${getLinkClass('/admin-dashboard')} min-h-[44px] px-3 py-2 rounded-lg hover:bg-accent`}>
                          관리
                        </Link>
                      </>
                    )}
                  </div>
                </nav>
                {!user && (
                  <div className="mt-6 pt-6 border-t">
                    <Button asChild className="w-full">
                      <Link href="/login" onClick={() => setIsSheetOpen(false)}>로그인</Link>
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