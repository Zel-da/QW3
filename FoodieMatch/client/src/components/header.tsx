import { Shield, Gauge, Book, Bell, User, ClipboardCheck, BookOpen, Home, LogOut, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/Button";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3" data-testid="logo">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="text-primary-foreground w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground korean-text">안전관리 통합 프로그램</h1>
              <p className="text-xs text-muted-foreground">Integrated Safety Management Program</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <a 
              href="/" 
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center"
              data-testid="nav-main"
            >
              <Home className="w-4 h-4 mr-2" />
              메인
            </a>
            <a 
              href="/education" 
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center"
              data-testid="nav-education"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              안전교육
            </a>
            <a 
              href="/tbm" 
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center"
              data-testid="nav-tbm"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              TBM 안전점검
            </a>
            
            <div className="flex items-center space-x-3">
              {user ? (
                <>
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <User className="text-primary-foreground w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium korean-text" data-testid="user-name">{user.username}</span>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    로그아웃
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" asChild>
                    <a href="/login">
                      <LogIn className="w-4 h-4 mr-2" />
                      로그인
                    </a>
                  </Button>
                  <Button asChild>
                     <a href="/register">회원가입</a>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
