import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { DEMO_MODE } from "../../lib/config";
import type { Role } from "../../lib/types";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
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
      {/* Top navigation */}
      <header className="landing-nav">
        <div className="auth-brand">
          <span className="brand-mark">🏫</span>
          <span>{t("app.name")}</span>
        </div>
        <nav className="landing-links">
          <a href="#login-panel" onClick={(e) => { e.preventDefault(); scrollToLogin(); }}>
            {t("nav.dashboard")}
          </a>
          <a href="#features">{t("nav.schedule")}</a>
          <a href="#features">{t("nav.payments")}</a>
          <button className="btn nav-pill" onClick={toggleLang}>
            🌐 {i18n.language === "ar" ? "Français" : "العربية"}
          </button>
        </nav>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="hero-eyebrow">✦ {t("app.tagline")}</span>
          <h1 className="hero-title">{t("login.headline")}</h1>
          <p className="hero-lead">{t("login.lead")}</p>
          <button className="btn btn-primary btn-cta" onClick={scrollToLogin}>
            {t("login.cta")} ↓
          </button>
          <div className="hero-features" id="features">
            {features.map((f) => (
              <div key={f.key} className="hero-feat">
                <span className="feat-badge">{f.icon}</span>
                <span>{t(f.key)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Neon orbit visual */}
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

      {/* Wave divider */}
      <svg className="landing-wave" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,50 C240,95 480,10 720,40 C960,70 1200,95 1440,45 L1440,90 L0,90 Z" />
      </svg>

      {/* Light panel: choose profile / login */}
      <section className="landing-panel" id="login-panel">
        <div className="login-card2 card">
          <h2 className="login-title">{t("auth.login")}</h2>
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
      </section>
    </div>
  );
}
