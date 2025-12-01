import { Header } from '@/components/header';
import { cn } from '@/lib/utils';

interface AdminPageLayoutProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'default' | 'wide' | 'full';
}

export function AdminPageLayout({
  children,
  className,
  maxWidth = 'default'
}: AdminPageLayoutProps) {
  const maxWidthClasses = {
    default: 'max-w-6xl',
    wide: 'max-w-7xl',
    full: ''
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className={cn(
        "container mx-auto p-4 lg:p-8",
        maxWidthClasses[maxWidth],
        className
      )}>
        <div className="space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminPageLayout;
