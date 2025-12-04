import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function AdminHelpPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/more')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </Button>
          <h1 className="text-xl font-semibold">관리자 업무 절차서</h1>
        </div>
      </div>

      {/* Admin guide content iframe */}
      <iframe
        src="/admin-guide.html"
        title="관리자 업무 절차서"
        className="w-full border-0"
        style={{ height: 'calc(100vh - 60px)' }}
      />
    </div>
  );
}
