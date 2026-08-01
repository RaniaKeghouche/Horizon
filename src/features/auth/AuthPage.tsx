import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { DEMO_MODE } from "../../lib/config";
import { toLoginEmail } from "../../lib/username";
import RegisterFlow from "./RegisterFlow";
import { Mail, Lock, Eye, EyeOff, Shield, BookOpen, GraduationCap, User } from "lucide-react";
import type { Role } from "../../lib/types";

export default function AuthPage() {
  const { t } = useTranslation();
  const { login, loginAs } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [register, setRegister] = useState(false);

  const roles: { role: Role; icon: React.ReactNode }[] = [
    { role: "admin", icon: <Shield size={18} /> },
    { role: "teacher", icon: <BookOpen size={18} /> },
    { role: "student", icon: <GraduationCap size={18} /> },
  ];

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(toLoginEmail(email), password);
    } catch (err) {
      setError((err as { message?: string })?.message ?? t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-split-layout">
        {/* Left side: Form Container */}
      <div className="auth-form-side">
        <div className="auth-brand-header">
          <a href="/" className="auth-back-link">
            <span>←</span> {t("nav.home")}
          </a>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <img src="/horizon-logo.png" alt="Horizon" className="auth-logo" style={{width: '24px', height: '24px', filter: 'none'}} />
            <span className="auth-brand-text" style={{fontSize: '1.1rem', letterSpacing: '0.5px'}}>HORIZON</span>
          </div>
        </div>

          {register ? (
            <RegisterFlow
              mode="signup"
              onDone={() => {
                if (DEMO_MODE) {
                  alert("Demande d'inscription envoyée à l'administration ✅");
                  setRegister(false);
                }
              }}
              onCancel={() => setRegister(false)}
            />
          ) : (
            <div className="auth-form-content">
              <h1 className="auth-title">{t("auth.signInTitle")}</h1>
              
              {DEMO_MODE && (
                <div className="demo-login-panel">
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
                </div>
              )}

              <form onSubmit={onSubmit} className="auth-form">
                <div className="auth-form-group">
                  <label>{t("auth.emailLabel")}</label>
                  <div className="auth-input-wrapper">
                    <User size={18} className="auth-input-icon" />
                    <input 
                      type="text" 
                      placeholder={t("auth.emailPlaceholder")} 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      autoComplete="username" 
                    />
                  </div>
                </div>
                
                <div className="auth-form-group">
                  <div className="auth-label-row">
                    <label>{t("auth.passwordLabel")}</label>
                    <a href="#" className="auth-forgot-link">{t("auth.forgotPassword")}</a>
                  </div>
                  <div className="auth-input-wrapper">
                    <Lock size={18} className="auth-input-icon" />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      placeholder={t("auth.passwordPlaceholder")} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      autoComplete="current-password" 
                    />
                    <button 
                      type="button" 
                      className="auth-toggle-password" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="auth-checkbox-group">
                  <input type="checkbox" id="remember" />
                  <label htmlFor="remember">{t("auth.rememberMe")}</label>
                </div>

                {error && <p className="auth-error-message">{error}</p>}

                <button type="submit" className="auth-submit-btn" disabled={busy}>
                  {busy ? t("auth.loading") : t("auth.signInBtn")}
                </button>
              </form>

              <div className="auth-register-text">
                {t("auth.notRegistered")} <button onClick={() => setRegister(true)}>{t("auth.createAccount")}</button>
              </div>
            </div>
          )}
        </div>

        {/* Right side: Premium 3D Illustration */}
        <div className="auth-illustration-side">
          <div className="auth-illustration-bg"></div>
        </div>
      </div>
    </div>
  );
}
