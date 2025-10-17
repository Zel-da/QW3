import React, { useState } from 'react';
import { Link } from "wouter";
import { Shield, BookOpen, Home, Menu } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

export function Header() {
  const { user, logout } = useAuth();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const navLinks = (
    <>
      <Link href="/" onClick={() => setIsSheetOpen(false)} className="text-base font-medium text-muted-foreground hover:text-primary transition-colors flex items-center whitespace-nowrap">
        메인
      </Link>
      <Link href="/education" onClick={() => setIsSheetOpen(false)} className="text-base font-medium text-muted-foreground hover:text-primary transition-colors flex items-center whitespace-nowrap">
        안전교육
      </Link>
      <Link href="/tbm" onClick={() => setIsSheetOpen(false)} className="text-base font-medium text-muted-foreground transition-colors hover:text-primary whitespace-nowrap">
        TBM
      </Link>
      {(user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM' || user?.role === 'TEAM_LEADER') && (
        <Link href="/monthly-report" onClick={() => setIsSheetOpen(false)} className="text-base font-medium text-muted-foreground transition-colors hover:text-primary whitespace-nowrap">
          월별 보고서
        </Link>
      )}
      {user?.role === 'ADMIN' && (
        <Link href="/admin" onClick={() => setIsSheetOpen(false)} className="text-base font-medium text-muted-foreground hover:text-primary transition-colors flex items-center whitespace-nowrap">
          사용자 관리
        </Link>
      )}
      {(user?.role === 'ADMIN' || user?.role === 'TEAM_LEADER') && (
          <Link href="/team-management" onClick={() => setIsSheetOpen(false)} className="text-base font-medium text-muted-foreground transition-colors hover:text-primary whitespace-nowrap">
            팀 관리
          </Link>
      )}
      {(user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM') && (
        <Link href="/checklist-editor" onClick={() => setIsSheetOpen(false)} className="text-base font-medium text-muted-foreground hover:text-primary transition-colors flex items-center whitespace-nowrap">
          체크리스트 편집
        </Link>
      )}
      {(user?.role === 'ADMIN' || user?.role === 'SAFETY_TEAM') && (
        <Link href="/education-management" onClick={() => setIsSheetOpen(false)} className="text-base font-medium text-muted-foreground hover:text-primary transition-colors flex items-center whitespace-nowrap">
          교육 관리
        </Link>
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
          <nav className="hidden md:flex items-center space-x-6">
            {navLinks}
          </nav>

          <div className="flex items-center gap-4">
            {/* Mobile Navigation */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="grid gap-6 text-lg font-medium mt-8">
                  {navLinks}
                </nav>
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