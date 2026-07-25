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

  return (
    <div className="login-screen">
      <div className="card login-card">
        <h1 className="login-title">{t("app.name")}</h1>
        <p className="login-sub">{t("app.tagline")}</p>

        {DEMO_MODE ? (
          <>
            <p className="demo-hint">Mode démo — choisissez un profil pour entrer :</p>
            <div className="role-picker">
              {roles.map(({ role, icon }) => (
                <button
                  key={role}
                  className="btn role-btn"
                  onClick={() => loginAs(role)}
                >
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
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
              />
            </label>
            <label className="field">
              <span>{t("auth.password")}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
              {busy ? t("auth.loading") : t("auth.login")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
