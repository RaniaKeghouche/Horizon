import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { DEMO_MODE } from "../../lib/config";
import RegisterFlow from "./RegisterFlow";
import type { Role } from "../../lib/types";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, loginWithGoogle, loginAs } = useAuth();
  const [register, setRegister] = useState(false);
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
    } catch (err) {
      setError((err as { message?: string })?.message ?? t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setError("");
    setBusy(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError((err as { message?: string })?.message ?? t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  function toggleLang() {
    i18n.changeLanguage(i18n.language === "ar" ? "fr" : "ar");
  }
  function scrollToLogin() {
    document.getElementById("login-panel")?.scrollIntoView({ behavior: "smooth" });
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
    <div className="landing">
      <header className="landing-nav">
        <div className="auth-brand">
          <span className="brand-mark">🏫</span>
          <span>{t("app.name")}</span>
        </div>
        <nav className="landing-links">
          <a href="#login-panel" onClick={(e) => { e.preventDefault(); scrollToLogin(); }}>{t("nav.dashboard")}</a>
          <a href="#features">{t("nav.schedule")}</a>
          <a href="#features">{t("nav.payments")}</a>
          <button className="btn nav-pill" onClick={toggleLang}>
            🌐 {i18n.language === "ar" ? "Français" : "العربية"}
          </button>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">✦ {t("app.tagline")}</span>
          <h1 className="hero-title">{t("login.headline")}</h1>
          <p className="hero-lead">{t("login.lead")}</p>
          <button className="btn btn-primary btn-cta" onClick={scrollToLogin}>{t("login.cta")} ↓</button>
          <div className="hero-features" id="features">
            {features.map((f) => (
              <div key={f.key} className="hero-feat">
                <span className="feat-badge">{f.icon}</span>
                <span>{t(f.key)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-visual">
          <div className="orbit">
            <div className="orbit-core">🎓</div>
            <span className="orbit-badge b1">📚</span>
            <span className="orbit-badge b2">✅</span>
            <span className="orbit-badge b3">💰</span>
            <span className="orbit-badge b4">🗓️</span>
            <span className="orbit-badge b5">🔔</span>
          </div>
        </div>
      </section>

      <svg className="landing-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,50 C240,95 480,10 720,40 C960,70 1200,95 1440,45 L1440,90 L0,90 Z" />
      </svg>

      <section className="landing-panel" id="login-panel">
        <div className="login-card2 card">
          {register ? (
            <RegisterFlow
              mode="signup"
              onDone={() => {
                if (DEMO_MODE) {
                  alert("Demande d'inscription envoyée à l'administration ✅");
                  setRegister(false);
                }
                // Firebase: the user is now signed in → the app shows the pending screen.
              }}
              onCancel={() => setRegister(false)}
            />
          ) : DEMO_MODE ? (
            <>
              <h2 className="login-title">{t("auth.login")}</h2>
              <p className="demo-hint">{t("login.demoHint")}</p>
              <div className="role-picker">
                {roles.map(({ role, icon }) => (
                  <button key={role} className="btn role-btn" onClick={() => loginAs(role)}>
                    <span className="role-icon">{icon}</span>
                    <span>{t(`roles.${role}`)}</span>
                  </button>
                ))}
              </div>
              <div className="or-divider"><span>{t("auth.or")}</span></div>
              <button className="link-btn" onClick={() => setRegister(true)}>
                {t("auth.noAccount")} (étudiant / enseignant)
              </button>
            </>
          ) : (
            <>
              <h2 className="login-title">{t("auth.login")}</h2>
              <button className="btn btn-ghost btn-lg" onClick={onGoogle} disabled={busy}>🔵 {t("auth.google")}</button>
              <div className="or-divider"><span>{t("auth.or")}</span></div>
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
              <button className="link-btn" onClick={() => setRegister(true)}>{t("auth.noAccount")}</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
