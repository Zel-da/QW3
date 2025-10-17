import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "@/pages/HomePage";
import Dashboard from "@/pages/dashboard";
import CourseContent from "@/pages/course-content";
import AssessmentPage from "@/pages/assessment";
import TbmPage from "@/pages/TbmPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import NoticeDetailPage from "@/pages/NoticeDetailPage";
import NoticeEditor from "@/pages/NoticeEditor";
import NotFound from "@/pages/not-found";
import TeamManagementPage from "./pages/TeamManagementPage";
import AdminPage from './pages/AdminPage';
import ChecklistEditorPage from './pages/ChecklistEditorPage';
import EducationManagementPage from './pages/EducationManagementPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import UserProfilePage from './pages/UserProfilePage';
import MyCertificatesPage from './pages/MyCertificatesPage';

import CoursePage from "@/pages/course";

// ... (rest of the imports)

import { ProtectedRoute } from "./components/ProtectedRoute";
import { Role } from "@shared/schema";

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/education" component={Dashboard} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/course/:id" component={CoursePage} />
          <Route path="/course/:id/content" component={CourseContent} />
          <Route path="/assessment/:courseId" component={AssessmentPage} />
          <Route path="/tbm" component={TbmPage} />
          <Route path="/team-management">
            <ProtectedRoute roles={[Role.ADMIN, Role.TEAM_LEADER]}>
              <TeamManagementPage />
            </ProtectedRoute>
          </Route>
          <Route path="/notices/edit/:id">
            <ProtectedRoute roles={[Role.ADMIN]}>
              <NoticeEditor />
            </ProtectedRoute>
          </Route>
          <Route path="/notices/new">
            <ProtectedRoute roles={[Role.ADMIN]}>
              <NoticeEditor />
            </ProtectedRoute>
          </Route>
          <Route path="/notices/:id" component={NoticeDetailPage} />
          <Route path="/admin">
            <ProtectedRoute roles={[Role.ADMIN]}>
              <AdminPage />
            </ProtectedRoute>
          </Route>
          <Route path="/checklist-editor">
            <ProtectedRoute roles={[Role.ADMIN, Role.SAFETY_TEAM]}>
              <ChecklistEditorPage />
            </ProtectedRoute>
          </Route>
          <Route path="/education-management">
            <ProtectedRoute roles={[Role.ADMIN, Role.SAFETY_TEAM]}>
              <EducationManagementPage />
            </ProtectedRoute>
          </Route>
          <Route path="/monthly-report" component={MonthlyReportPage} />
          <Route path="/profile">
            <ProtectedRoute roles={[Role.ADMIN, Role.SAFETY_TEAM, Role.TEAM_LEADER, Role.WORKER, Role.OFFICE_WORKER]}>
              <UserProfilePage />
            </ProtectedRoute>
          </Route>
          <Route path="/my-certificates">
            <ProtectedRoute roles={[Role.ADMIN, Role.SAFETY_TEAM, Role.TEAM_LEADER, Role.WORKER, Role.OFFICE_WORKER]}>
              <MyCertificatesPage />
            </ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
