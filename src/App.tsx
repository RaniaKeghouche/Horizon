import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./features/auth/AuthContext";
import ProtectedRoute from "./app/ProtectedRoute";
import Shell from "./layouts/Shell";
import { HAS_PUBLIC_SITE } from "./app/platform";
import AuthPage from "./features/auth/AuthPage";
import PendingGate from "./features/auth/PendingGate";
import GuestShell from "./app/GuestShell";
import DiscoverPage from "./features/discover/DiscoverPage";
import DashboardPage from "./features/dashboard/DashboardPage";
import StudentsPage from "./features/students/StudentsPage";
import TeachersPage from "./features/teachers/TeachersPage";
import SubjectsPage from "./features/subjects/SubjectsPage";
import RegistrationWorkspace from "./features/registration/RegistrationWorkspace";
import StudentCoursesPage from "./features/courses/StudentCoursesPage";
import SchedulePage from "./features/schedule/SchedulePage";
import SessionsPage from "./features/sessions/SessionsPage";
import AttendancePage from "./features/attendance/AttendancePage";
import AttendanceHistoryPage from "./features/attendance/AttendanceHistoryPage";
import PaymentsPage from "./features/payments/PaymentsPage";
import PayrollPage from "./features/payroll/PayrollPage";
import NotificationsPage from "./features/notifications/NotificationsPage";
import AnalyticsPage from "./features/analytics/AnalyticsPage";
import ActivityLogPage from "./features/activity/ActivityLogPage";

/** Chargée à la demande : la landing et ses images ne sont tirées que par la
 *  cible web. Sur mobile et desktop, ce chunk n'est jamais demandé. */
const LandingPage = lazy(() => import("./pages/public/LandingPage"));

/**
 * Point d'entrée des visiteurs non connectés.
 *
 * Web     → le site vitrine, dont le bouton « Connexion » mène à /auth.
 * Mobile  → directement l'écran de connexion : une app installée n'a pas à
 *   et desktop  redérouler l'argumentaire commercial à chaque ouverture (§3 et §4
 *              du cahier des charges).
 */
function LoginRoute() {
  if (!HAS_PUBLIC_SITE) return <AuthPage />;
  return (
    <Suspense fallback={<div className="center-screen">…</div>}>
      <LandingPage />
    </Suspense>
  );
}

// Decides what to render based on auth state.
function Root() {
  const { loading, authed, signedIn, requestStatus } = useAuth();
  if (loading) return <div className="center-screen">…</div>;

  // Compte cree, dossier depose, en attente de validation.
  //
  // Ces personnes voyaient jusqu'ici un ecran d'attente et rien d'autre : elles
  // ne pouvaient pas savoir ce que l'ecole enseigne ni avec qui avant que
  // l'administration reponde. Elles entrent maintenant dans le catalogue
  // (matieres, enseignants, groupes ouverts) et peuvent reserver leurs groupes ;
  // la validation ne commande plus que l'acces aux donnees personnelles
  // — presences, paiements, notifications.
  if (signedIn && !authed && requestStatus === "pending") {
    return (
      <Routes>
        <Route element={<GuestShell />}>
          <Route index element={<DiscoverPage mode="guest" />} />
          <Route path="status" element={<PendingGate />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // Dossier pas encore depose (compte OAuth tout neuf) ou refuse : l'ecran
  // d'attente reste le bon, il n'y a rien a explorer tant que le formulaire
  // n'est pas rempli.
  if (signedIn && !authed) return <PendingGate />;

  return (
    <Routes>
      <Route path="/login" element={authed ? <Navigate to="/" replace /> : <LoginRoute />} />
      <Route path="/auth" element={authed ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Shell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="students" element={<ProtectedRoute allow={["admin", "teacher"]}><StudentsPage /></ProtectedRoute>} />
        <Route path="teachers" element={<ProtectedRoute allow={["admin"]}><TeachersPage /></ProtectedRoute>} />
        <Route path="requests" element={<ProtectedRoute allow={["admin"]}><RegistrationWorkspace /></ProtectedRoute>} />
        <Route path="subjects" element={<ProtectedRoute allow={["admin"]}><SubjectsPage /></ProtectedRoute>} />
        <Route path="courses" element={<ProtectedRoute allow={["student"]}><StudentCoursesPage /></ProtectedRoute>} />
        <Route path="schedule" element={<ProtectedRoute allow={["admin", "teacher"]}><SchedulePage /></ProtectedRoute>} />
        <Route path="sessions" element={<ProtectedRoute allow={["admin", "teacher"]}><SessionsPage /></ProtectedRoute>} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="attendance-history" element={<ProtectedRoute allow={["admin", "teacher"]}><AttendanceHistoryPage /></ProtectedRoute>} />
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
