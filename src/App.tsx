import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import ProtectedRoute from "./app/ProtectedRoute";
import AppLayout from "./app/AppLayout";
import LoginPage from "./features/auth/LoginPage";
import PendingGate from "./features/auth/PendingGate";
import DashboardPage from "./features/dashboard/DashboardPage";
import StudentsPage from "./features/students/StudentsPage";
import TeachersPage from "./features/teachers/TeachersPage";
import SubjectsPage from "./features/subjects/SubjectsPage";
import RequestsPage from "./features/registration/RequestsPage";
import SchedulePage from "./features/schedule/SchedulePage";
import SessionsPage from "./features/sessions/SessionsPage";
import AttendancePage from "./features/attendance/AttendancePage";
import PaymentsPage from "./features/payments/PaymentsPage";
import PayrollPage from "./features/payroll/PayrollPage";
import NotificationsPage from "./features/notifications/NotificationsPage";
import AnalyticsPage from "./features/analytics/AnalyticsPage";
import ActivityLogPage from "./features/activity/ActivityLogPage";

function LoginRoute() {
  return <LoginPage />;
}

// Decides what to render based on auth state.
function Root() {
  const { loading, authed, signedIn } = useAuth();
  if (loading) return <div className="center-screen">…</div>;
  // Signed in with Firebase but not yet an approved account → pending / complete screen.
  if (signedIn && !authed) return <PendingGate />;

  return (
    <Routes>
      <Route path="/login" element={authed ? <Navigate to="/" replace /> : <LoginRoute />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="students" element={<ProtectedRoute allow={["admin", "teacher"]}><StudentsPage /></ProtectedRoute>} />
        <Route path="teachers" element={<ProtectedRoute allow={["admin"]}><TeachersPage /></ProtectedRoute>} />
        <Route path="requests" element={<ProtectedRoute allow={["admin"]}><RequestsPage /></ProtectedRoute>} />
        <Route path="subjects" element={<ProtectedRoute allow={["admin"]}><SubjectsPage /></ProtectedRoute>} />
        <Route path="schedule" element={<ProtectedRoute allow={["admin", "teacher"]}><SchedulePage /></ProtectedRoute>} />
        <Route path="sessions" element={<ProtectedRoute allow={["admin", "teacher"]}><SessionsPage /></ProtectedRoute>} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="payments" element={<ProtectedRoute allow={["admin", "student"]}><PaymentsPage /></ProtectedRoute>} />
        <Route path="payroll" element={<ProtectedRoute allow={["admin", "teacher"]}><PayrollPage /></ProtectedRoute>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="analytics" element={<ProtectedRoute allow={["admin"]}><AnalyticsPage /></ProtectedRoute>} />
        <Route path="activity" element={<ProtectedRoute allow={["admin"]}><ActivityLogPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </AuthProvider>
  );
}
