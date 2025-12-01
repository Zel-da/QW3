
import { useAuth } from "@/context/AuthContext";
import { useLocation, Redirect } from "wouter";
import type { Role } from "@shared/schema";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  // Rule 1: If not logged in, redirect to login page with redirect back info
  if (!user) {
    const redirectTo = `/login?redirect=${location}`;
    return <Redirect to={redirectTo} />;
  }

  // Rule 2: If logged in but not authorized, redirect to main page
  if (!roles.includes(user.role as Role)) {
    return <Redirect to="/" />;
  }

  // If authorized, render the child component
  return <>{children}</>;
}
