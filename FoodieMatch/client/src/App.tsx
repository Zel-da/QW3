import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "@/pages/HomePage";
import Dashboard from "@/pages/dashboard";
import CoursePage from "@/pages/course";
import CourseContentPage from "@/pages/course-content";
import AssessmentPage from "@/pages/assessment";
import TbmPage from "@/pages/TbmPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import NoticeDetailPage from "@/pages/NoticeDetailPage";
import NoticeEditor from "@/pages/NoticeEditor";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/education" component={Dashboard} />
      <Route path="/tbm" component={TbmPage} />
      <Route path="/course/:id" component={CoursePage} />
      <Route path="/course/:id/content" component={CourseContentPage} />
      <Route path="/assessment/:id" component={AssessmentPage} />
      <Route path="/notices/:id" component={NoticeDetailPage} />
      <Route path="/notices/new" component={NoticeEditor} />
      <Route path="/notices/edit/:id" component={NoticeEditor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
