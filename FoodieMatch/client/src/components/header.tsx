import React, { useState } from 'react';
import { Link, useLocation } from "wouter";
import { Shield, BookOpen, Home, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export function Header() {
  const { user, logout } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [location] = useLocation();

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
          </nav>

          <div className="flex items-center gap-4">
            {/* Mobile Navigation */}
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
          </div>
        </div>
      </div>
    </header>
  );
}