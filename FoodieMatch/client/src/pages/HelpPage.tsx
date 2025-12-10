import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function HelpPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // iframe 내부에서 navigateTo 호출 시 부모 창에서 처리
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'navigate' && event.data?.path) {
        window.location.href = event.data.path;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoBack = () => {
    // 브라우저 히스토리가 있으면 뒤로가기, 없으면 홈으로
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoBack}
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
        ref={iframeRef}
        src="/help.html"
        title="도움말"
        className="w-full border-0"
        style={{ height: 'calc(100vh - 60px)' }}
      />
    </div>
  );
}
