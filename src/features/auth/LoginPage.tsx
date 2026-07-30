import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { DEMO_MODE } from "../../lib/config";
import type { Role } from "../../lib/types";

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, loginAs } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
    } catch {
      setError(t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  const roles: { role: Role; icon: string }[] = [
    { role: "admin", icon: "🏫" },
    { role: "teacher", icon: "👨‍🏫" },
    { role: "student", icon: "🎓" },
  ];

  const features: { icon: string; key: string }[] = [
    { icon: "✅", key: "login.features.attendance" },
    { icon: "💰", key: "login.features.payments" },
    { icon: "🗓️", key: "login.features.schedule" },
  ];

  return (
    <div className="login-screen">
      <div className="auth-card">
        {/* Dark hero section */}
        <div className="auth-hero">
          <div className="auth-brand">
            <span className="brand-mark">🏫</span>
            <span>{t("app.name")}</span>
          </div>
          <h1 className="auth-headline">{t("login.headline")}</h1>
          <p className="auth-tagline">{t("app.tagline")}</p>
          <div className="auth-features">
            {features.map((f) => (
              <div key={f.key} className="feat">
                <span className="feat-badge">{f.icon}</span>
                <span>{t(f.key)}</span>
              </div>
            ))}
          </div>

          {/* Wave divider between the dark hero and the light panel below */}
          <svg className="auth-wave" viewBox="0 0 480 64" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,34 C110,66 190,8 300,32 C384,50 432,54 480,28 L480,64 L0,64 Z" />
          </svg>
        </div>

        {/* Light panel */}
        <div className="auth-panel">
          {DEMO_MODE ? (
            <>
              <p className="demo-hint">{t("login.demoHint")}</p>
              <div className="role-picker">
                {roles.map(({ role, icon }) => (
                  <button key={role} className="btn role-btn" onClick={() => loginAs(role)}>
                    <span className="role-icon">{icon}</span>
                    <span>{t(`roles.${role}`)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <form onSubmit={onSubmit} className="stack">
              <label className="field">
                <span>{t("auth.email")}</span>
                <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
              </label>
              <label className="field">
                <span>{t("auth.password")}</span>
                <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </label>
              {error && <p className="error-text">{error}</p>}
              <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
                {busy ? t("auth.loading") : t("auth.login")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
