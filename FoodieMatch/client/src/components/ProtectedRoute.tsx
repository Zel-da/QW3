
import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocation, Redirect } from "wouter";
import type { Role } from "@shared/schema";
import { toast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();
  const toastShown = useRef(false);

  const isUnauthorized = !!user && !roles.includes(user.role as Role);

  // 권한 없으면 toast 알림 표시
  useEffect(() => {
    if (isUnauthorized && !toastShown.current) {
      toastShown.current = true;
      toast({
        title: '접근 권한이 없습니다',
        description: '해당 페이지에 접근할 수 있는 권한이 없습니다.',
        variant: 'destructive',
      });
    }
  }, [isUnauthorized]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="로딩 중..." />
      </div>
    );
  }

  // Rule 1: If not logged in, redirect to login page with redirect back info
  if (!user) {
    const redirectTo = `/login?redirect=${location}`;
    return <Redirect to={redirectTo} />;
  }

  // Rule 2: If logged in but not authorized, redirect to main page
  if (isUnauthorized) {
    return <Redirect to="/" />;
  }

  // If authorized, render the child component
  return <>{children}</>;
}
