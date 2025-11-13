import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function NotFound() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const currentPath = window.location.pathname;

  useEffect(() => {
    // 로딩이 완료되고 사용자가 로그인되어 있지 않으면 로그인 페이지로 리다이렉트
    if (!isLoading && !user) {
      const redirectUrl = encodeURIComponent(currentPath);
      setLocation(`/login?redirect=${redirectUrl}`);
    }
  }, [user, isLoading, currentPath, setLocation]);

  // 로딩 중이거나 리다이렉트 중일 때는 아무것도 표시하지 않음
  if (isLoading || !user) {
    return null;
  }

  // 로그인된 사용자에게 친절한 404 페이지 표시
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">페이지를 찾을 수 없습니다</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            요청하신 페이지가 존재하지 않거나, 접근 권한이 없을 수 있습니다.
          </p>

          <Button
            onClick={() => setLocation("/")}
            className="mt-6 w-full"
          >
            홈으로 이동
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
