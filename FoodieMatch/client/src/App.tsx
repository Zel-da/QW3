import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import DashboardHomePage from "@/pages/DashboardHomePage";
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
import EducationMonitoringPage from './pages/EducationMonitoringPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import UserProfilePage from './pages/UserProfilePage';
import MyCertificatesPage from './pages/MyCertificatesPage';
import SafetyInspectionPage from './pages/SafetyInspectionPage';

import CoursePage from "@/pages/course";

// ... (rest of the imports)

import { ProtectedRoute } from "./components/ProtectedRoute";
import { Role } from "@shared/schema";

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Switch>
          <Route path="/" component={DashboardHomePage} />
          <Route path="/notices" component={HomePage} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/education" component={Dashboard} />
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />
          <Route path="/courses" component={Dashboard} />
          <Route path="/courses/:id">
            <ProtectedRoute roles={[Role.ADMIN, Role.SAFETY_TEAM, Role.TEAM_LEADER, Role.WORKER, Role.OFFICE_WORKER]}>
              <CoursePage />
            </ProtectedRoute>
          </Route>
          <Route path="/courses/:id/content">
            <ProtectedRoute roles={[Role.ADMIN, Role.SAFETY_TEAM, Role.TEAM_LEADER, Role.WORKER, Role.OFFICE_WORKER]}>
              <CourseContent />
            </ProtectedRoute>
          </Route>
          <Route path="/assessment/:courseId">
            <ProtectedRoute roles={[Role.ADMIN, Role.SAFETY_TEAM, Role.TEAM_LEADER, Role.WORKER, Role.OFFICE_WORKER]}>
              <AssessmentPage />
            </ProtectedRoute>
          </Route>
          <Route path="/tbm">
            <ProtectedRoute roles={[Role.ADMIN, Role.SAFETY_TEAM, Role.TEAM_LEADER, Role.WORKER]}>
              <TbmPage />
            </ProtectedRoute>
          </Route>
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
          <Route path="/education-monitoring">
            <ProtectedRoute roles={[Role.ADMIN, Role.SAFETY_TEAM]}>
              <EducationMonitoringPage />
            </ProtectedRoute>
          </Route>
          <Route path="/monthly-report" component={MonthlyReportPage} />
          <Route path="/safety-inspection">
            <ProtectedRoute roles={[Role.ADMIN, Role.SAFETY_TEAM, Role.TEAM_LEADER]}>
              <SafetyInspectionPage />
            </ProtectedRoute>
          </Route>
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
