import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function HelpPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/profile')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </Button>
          <h1 className="text-xl font-semibold">도움말</h1>
        </div>
      </div>

      {/* Help content iframe */}
      <iframe
        src="/help.html"
        title="도움말"
        className="w-full border-0"
        style={{ height: 'calc(100vh - 60px)' }}
      />
    </div>
  );
}
