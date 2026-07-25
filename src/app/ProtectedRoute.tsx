import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../features/auth/AuthContext";
import type { Role } from "../lib/types";

/** Guards a route: requires a logged-in user, optionally with one of `allow` roles. */
export default function ProtectedRoute({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: Role[];
}) {
  const { authed, role, loading } = useAuth();

  if (loading) return <div className="center-screen">…</div>;
  if (!authed) return <Navigate to="/login" replace />;
  if (allow && role && !allow.includes(role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
