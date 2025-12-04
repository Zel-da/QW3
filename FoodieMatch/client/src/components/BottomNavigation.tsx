import { Link, useLocation } from 'wouter';
import { Home, Bell, ClipboardCheck, GraduationCap, Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: typeof Home;
  label: string;
  showTo?: 'all' | 'admin' | 'leader';
}

export function BottomNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    { href: '/', icon: Home, label: '홈', showTo: 'all' },
    { href: '/notices', icon: Bell, label: '공지', showTo: 'all' },
    { href: '/tbm', icon: ClipboardCheck, label: 'TBM', showTo: 'all' },
    { href: '/courses', icon: GraduationCap, label: '교육', showTo: 'all' },
    { href: '/more', icon: Menu, label: '더보기', showTo: 'all' },
  ];

  // APPROVER는 TBM 숨김
  const visibleItems = navItems.filter(item => {
    if (item.href === '/tbm' && user?.role === 'APPROVER') return false;
    return true;
  });

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    if (href === '/more') {
      // 더보기에 포함된 경로들
      const moreRoutes = ['/safety-inspection', '/monthly-report', '/admin-dashboard', '/profile', '/more'];
      return moreRoutes.some(route => location.startsWith(route));
    }
    return location.startsWith(href);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-colors min-w-0",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-11 h-11 rounded-full transition-colors",
                active && "bg-primary/10"
              )}>
                <Icon className={cn("h-6 w-6", active && "text-primary")} />
              </div>
              <span className={cn(
                "text-xs mt-0.5 font-medium truncate",
                active && "text-primary"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
