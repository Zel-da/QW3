import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
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
import InspectionGalleryPage from './pages/InspectionGalleryPage';
import ApprovalPage from './pages/ApprovalPage';
import ApprovalHistoryPage from './pages/ApprovalHistoryPage';
import InspectionTemplateEditorPage from './pages/InspectionTemplateEditorPage';
import EmailSettingsPage from './pages/EmailSettingsPage';
import TeamEquipmentPage from './pages/TeamEquipmentPage';
import InspectionSchedulePage from './pages/InspectionSchedulePage';
import AdminDashboardPage from './pages/AdminDashboardPage';

import CoursePage from "@/pages/course";

// ... (rest of the imports)

import { ProtectedRoute } from "./components/ProtectedRoute";
import { Role } from "@shared/schema";

function App() {
  return (
    <ErrorBoundary>
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
            <ProtectedRoute roles={[Role.ADMIN, Role.TEAM_LEADER, Role.SITE_MANAGER, Role.APPROVER]}>
              <CoursePage />
            </ProtectedRoute>
          </Route>
          <Route path="/courses/:id/content">
            <ProtectedRoute roles={[Role.ADMIN, Role.TEAM_LEADER, Role.SITE_MANAGER, Role.APPROVER]}>
              <CourseContent />
            </ProtectedRoute>
          </Route>
          <Route path="/assessment/:courseId">
            <ProtectedRoute roles={[Role.ADMIN, Role.TEAM_LEADER, Role.SITE_MANAGER, Role.APPROVER]}>
              <AssessmentPage />
            </ProtectedRoute>
          </Route>
          <Route path="/tbm">
            <ProtectedRoute roles={[Role.ADMIN, Role.TEAM_LEADER, Role.SITE_MANAGER]}>
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
            <ProtectedRoute roles={[Role.ADMIN]}>
              <ChecklistEditorPage />
            </ProtectedRoute>
          </Route>
          <Route path="/education-management">
            <ProtectedRoute roles={[Role.ADMIN]}>
              <EducationManagementPage />
            </ProtectedRoute>
          </Route>
          <Route path="/education-monitoring">
            <ProtectedRoute roles={[Role.ADMIN]}>
              <EducationMonitoringPage />
            </ProtectedRoute>
          </Route>
          <Route path="/monthly-report" component={MonthlyReportPage} />
          <Route path="/approval/:approvalId" component={ApprovalPage} />
          <Route path="/approval-history" component={ApprovalHistoryPage} />
          <Route path="/safety-inspection">
            <ProtectedRoute roles={[Role.ADMIN, Role.TEAM_LEADER]}>
              <SafetyInspectionPage />
            </ProtectedRoute>
          </Route>
          <Route path="/inspection-gallery">
            <ProtectedRoute roles={[Role.ADMIN, Role.TEAM_LEADER, Role.SITE_MANAGER, Role.APPROVER]}>
              <InspectionGalleryPage />
            </ProtectedRoute>
          </Route>
          <Route path="/admin-dashboard">
            <ProtectedRoute roles={[Role.ADMIN, Role.TEAM_LEADER]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          </Route>
          <Route path="/team-equipment">
            <ProtectedRoute roles={[Role.ADMIN]}>
              <TeamEquipmentPage />
            </ProtectedRoute>
          </Route>
          <Route path="/inspection-schedule">
            <ProtectedRoute roles={[Role.ADMIN]}>
              <InspectionSchedulePage />
            </ProtectedRoute>
          </Route>
          <Route path="/inspection-template-editor">
            <ProtectedRoute roles={[Role.ADMIN]}>
              <InspectionTemplateEditorPage />
            </ProtectedRoute>
          </Route>
          <Route path="/email-settings">
            <ProtectedRoute roles={[Role.ADMIN]}>
              <EmailSettingsPage />
            </ProtectedRoute>
          </Route>
          <Route path="/profile">
            <ProtectedRoute roles={[Role.ADMIN, Role.TEAM_LEADER, Role.SITE_MANAGER, Role.APPROVER]}>
              <UserProfilePage />
            </ProtectedRoute>
          </Route>
          <Route path="/my-certificates">
            <ProtectedRoute roles={[Role.ADMIN, Role.TEAM_LEADER, Role.SITE_MANAGER, Role.APPROVER]}>
              <MyCertificatesPage />
            </ProtectedRoute>
          </Route>
          <Route component={NotFound} />
        </Switch>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
