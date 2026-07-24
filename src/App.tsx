import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import ProtectedRoute from "./app/ProtectedRoute";
import AppLayout from "./app/AppLayout";
import LoginPage from "./features/auth/LoginPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import StudentsPage from "./features/students/StudentsPage";
import TeachersPage from "./features/teachers/TeachersPage";
import SchedulePage from "./features/schedule/SchedulePage";
import AttendancePage from "./features/attendance/AttendancePage";
import PaymentsPage from "./features/payments/PaymentsPage";
import NotificationsPage from "./features/notifications/NotificationsPage";

// Redirects logged-in users away from /login.
function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">…</div>;
  return user ? <Navigate to="/" replace /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route
              path="students"
              element={
                <ProtectedRoute allow={["admin", "teacher"]}>
                  <StudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="teachers"
              element={
                <ProtectedRoute allow={["admin"]}>
                  <TeachersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="schedule"
              element={
                <ProtectedRoute allow={["admin", "teacher"]}>
                  <SchedulePage />
                </ProtectedRoute>
              }
            />
            <Route path="attendance" element={<AttendancePage />} />
            <Route
              path="payments"
              element={
                <ProtectedRoute allow={["admin", "student"]}>
                  <PaymentsPage />
                </ProtectedRoute>
              }
            />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
