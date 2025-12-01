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

import { ProtectedRoute } from "./components/ProtectedRoute";
import { Role } from "@shared/schema";

// 권한 그룹 정의
const ALL_ROLES = [Role.ADMIN, Role.APPROVER, Role.TEAM_LEADER, Role.PENDING];
const ACTIVE_ROLES = [Role.ADMIN, Role.APPROVER, Role.TEAM_LEADER]; // PENDING 제외
const WORKER_ROLES = [Role.ADMIN, Role.TEAM_LEADER]; // TBM, 점검 작성 가능

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
        <Switch>
          {/* 공개 페이지 */}
          <Route path="/login" component={LoginPage} />
          <Route path="/register" component={RegisterPage} />

          {/* PENDING 포함 - 모든 로그인 사용자 접근 가능 */}
          <Route path="/">
            <ProtectedRoute roles={ALL_ROLES}>
              <DashboardHomePage />
            </ProtectedRoute>
          </Route>
          <Route path="/notices">
            <ProtectedRoute roles={ALL_ROLES}>
              <HomePage />
            </ProtectedRoute>
          </Route>
          <Route path="/notices/:id">
            <ProtectedRoute roles={ALL_ROLES}>
              <NoticeDetailPage />
            </ProtectedRoute>
          </Route>
          <Route path="/profile">
            <ProtectedRoute roles={ALL_ROLES}>
              <UserProfilePage />
            </ProtectedRoute>
          </Route>

          {/* ACTIVE_ROLES - 승인된 사용자만 (PENDING 제외) */}
          <Route path="/dashboard">
            <ProtectedRoute roles={ACTIVE_ROLES}>
              <Dashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/education">
            <ProtectedRoute roles={ACTIVE_ROLES}>
              <Dashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/courses">
            <ProtectedRoute roles={ACTIVE_ROLES}>
              <Dashboard />
            </ProtectedRoute>
          </Route>
          <Route path="/courses/:id">
            <ProtectedRoute roles={ACTIVE_ROLES}>
              <CoursePage />
            </ProtectedRoute>
          </Route>
          <Route path="/courses/:id/content">
            <ProtectedRoute roles={ACTIVE_ROLES}>
              <CourseContent />
            </ProtectedRoute>
          </Route>
          <Route path="/assessment/:courseId">
            <ProtectedRoute roles={ACTIVE_ROLES}>
              <AssessmentPage />
            </ProtectedRoute>
          </Route>
          <Route path="/monthly-report">
            <ProtectedRoute roles={ACTIVE_ROLES}>
              <MonthlyReportPage />
            </ProtectedRoute>
          </Route>
          <Route path="/approval/:approvalId">
            <ProtectedRoute roles={ACTIVE_ROLES}>
              <ApprovalPage />
            </ProtectedRoute>
          </Route>
          <Route path="/approval-history">
            <ProtectedRoute roles={ACTIVE_ROLES}>
              <ApprovalHistoryPage />
            </ProtectedRoute>
          </Route>
          <Route path="/inspection-gallery">
            <ProtectedRoute roles={ACTIVE_ROLES}>
              <InspectionGalleryPage />
            </ProtectedRoute>
          </Route>
          <Route path="/my-certificates">
            <ProtectedRoute roles={ACTIVE_ROLES}>
              <MyCertificatesPage />
            </ProtectedRoute>
          </Route>

          {/* WORKER_ROLES - TBM, 점검 작성 가능 (ADMIN, TEAM_LEADER) */}
          <Route path="/tbm">
            <ProtectedRoute roles={WORKER_ROLES}>
              <TbmPage />
            </ProtectedRoute>
          </Route>
          <Route path="/team-management">
            <ProtectedRoute roles={WORKER_ROLES}>
              <TeamManagementPage />
            </ProtectedRoute>
          </Route>
          <Route path="/safety-inspection">
            <ProtectedRoute roles={WORKER_ROLES}>
              <SafetyInspectionPage />
            </ProtectedRoute>
          </Route>
          <Route path="/admin-dashboard">
            <ProtectedRoute roles={WORKER_ROLES}>
              <AdminDashboardPage />
            </ProtectedRoute>
          </Route>

          {/* ADMIN 전용 */}
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

          <Route component={NotFound} />
        </Switch>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
