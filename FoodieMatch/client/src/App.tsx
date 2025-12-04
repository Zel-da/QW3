import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Role } from "@shared/schema";

// 로딩 스피너 컴포넌트
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

// 동적 import - 코드 스플리팅으로 초기 번들 크기 감소
// 자주 사용되는 핵심 페이지
const DashboardHomePage = lazy(() => import("@/pages/DashboardHomePage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/ResetPasswordPage"));

// TBM 관련
const TbmPage = lazy(() => import("@/pages/TbmPage"));
const MonthlyReportPage = lazy(() => import("./pages/MonthlyReportPage"));

// 교육 관련
const Dashboard = lazy(() => import("@/pages/dashboard"));
const CoursePage = lazy(() => import("@/pages/course"));
const CourseContent = lazy(() => import("@/pages/course-content"));
const AssessmentPage = lazy(() => import("@/pages/assessment"));
const MyCertificatesPage = lazy(() => import("./pages/MyCertificatesPage"));

// 공지사항 관련
const NoticeDetailPage = lazy(() => import("@/pages/NoticeDetailPage"));
const NoticeEditor = lazy(() => import("@/pages/NoticeEditor"));

// 안전점검 관련
const SafetyInspectionPage = lazy(() => import("./pages/SafetyInspectionPage"));
const InspectionGalleryPage = lazy(() => import("./pages/InspectionGalleryPage"));

// 결재 관련
const ApprovalPage = lazy(() => import("./pages/ApprovalPage"));
const ApprovalHistoryPage = lazy(() => import("./pages/ApprovalHistoryPage"));

// 관리 페이지
const TeamManagementPage = lazy(() => import("./pages/TeamManagementPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ChecklistEditorPage = lazy(() => import("./pages/ChecklistEditorPage"));
const EducationManagementPage = lazy(() => import("./pages/EducationManagementPage"));
const EducationMonitoringPage = lazy(() => import("./pages/EducationMonitoringPage"));
const InspectionTemplateEditorPage = lazy(() => import("./pages/InspectionTemplateEditorPage"));
const EmailSettingsPage = lazy(() => import("./pages/EmailSettingsPage"));
const HolidayManagementPage = lazy(() => import("./pages/HolidayManagementPage"));
const TeamEquipmentPage = lazy(() => import("./pages/TeamEquipmentPage"));
const TeamEquipmentManagementPage = lazy(() => import("./pages/TeamEquipmentManagementPage"));
const InspectionSchedulePage = lazy(() => import("./pages/InspectionSchedulePage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const DbManagementPage = lazy(() => import("./pages/DbManagementPage"));

// 기타
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const MorePage = lazy(() => import("./pages/MorePage"));
const NotFound = lazy(() => import("@/pages/not-found"));

// 권한 그룹 정의
const ALL_ROLES = [Role.ADMIN, Role.APPROVER, Role.TEAM_LEADER, Role.PENDING];
const ACTIVE_ROLES = [Role.ADMIN, Role.APPROVER, Role.TEAM_LEADER]; // PENDING 제외
const WORKER_ROLES = [Role.ADMIN, Role.TEAM_LEADER]; // TBM, 점검 작성 가능

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<PageLoader />}>
            <Switch>
              {/* 공개 페이지 */}
              <Route path="/login" component={LoginPage} />
              <Route path="/register" component={RegisterPage} />
              <Route path="/forgot-password" component={ForgotPasswordPage} />
              <Route path="/reset-password/:token" component={ResetPasswordPage} />

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
              {/* /notices/new와 /notices/edit/:id는 /notices/:id보다 먼저 와야 함 */}
              <Route path="/notices/new">
                <ProtectedRoute roles={[Role.ADMIN]}>
                  <NoticeEditor />
                </ProtectedRoute>
              </Route>
              <Route path="/notices/edit/:id">
                <ProtectedRoute roles={[Role.ADMIN]}>
                  <NoticeEditor />
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
              <Route path="/more">
                <ProtectedRoute roles={ALL_ROLES}>
                  <MorePage />
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
              <Route path="/team-equipment-management">
                <ProtectedRoute roles={[Role.ADMIN]}>
                  <TeamEquipmentManagementPage />
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
              <Route path="/holiday-management">
                <ProtectedRoute roles={[Role.ADMIN]}>
                  <HolidayManagementPage />
                </ProtectedRoute>
              </Route>
              <Route path="/db-management">
                <ProtectedRoute roles={[Role.ADMIN]}>
                  <DbManagementPage />
                </ProtectedRoute>
              </Route>

              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
