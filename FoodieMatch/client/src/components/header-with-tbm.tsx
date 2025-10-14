import { Shield, Gauge, Book, Bell, User, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeaderWithTBM() {
  // TBM 시스템 URL - 실제 배포 환경에 맞게 수정하세요
  const TBM_URL = process.env.NODE_ENV === 'production' 
    ? 'http://192.68.10.249:8081'  // TBM 프로덕션 URL
    : 'http://localhost:3001';      // TBM 개발 URL

  const handleTBMClick = () => {
    // 새 창에서 TBM 열기
    window.open(TBM_URL, '_blank', 'width=1200,height=800');
    
    // 또는 같은 창에서 열기
    // window.location.href = TBM_URL;
  };

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3" data-testid="logo">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="text-primary-foreground w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground korean-text">안전관리 교육 프로그램</h1>
              <p className="text-xs text-muted-foreground">Safety Management Education Program</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <a 
              href="/" 
              className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center"
              data-testid="nav-dashboard"
            >
              <Gauge className="w-4 h-4 mr-2" />
              대시보드
            </a>
            
            {/* TBM 체크리스트 버튼 추가 */}
            <Button
              onClick={handleTBMClick}
              variant="outline"
              className="text-sm font-medium flex items-center korean-text"
              data-testid="nav-tbm"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              TBM 체크리스트
            </Button>
            
            <a 
              href="#" 
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors flex items-center"
              data-testid="nav-help"
            >
              <Book className="w-4 h-4 mr-2" />
              도움말
            </a>
            
            <div className="flex items-center space-x-3">
              <button 
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                data-testid="notification-button"
              >
                <Bell className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="text-primary-foreground w-4 h-4" />
              </div>
              <span className="text-sm font-medium korean-text" data-testid="user-name">관리자</span>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
