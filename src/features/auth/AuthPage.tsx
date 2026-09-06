import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "./AuthContext";
import { DEMO_MODE } from "../../lib/config";
import { toLoginEmail } from "../../lib/username";
import RegisterFlow from "./RegisterFlow";
import { HAS_PUBLIC_SITE } from "../../app/platform";
import {
  Eye, EyeOff, Shield, BookOpen, GraduationCap, ArrowRight, ArrowLeft,
} from "lucide-react";
import type { Role } from "../../lib/types";
import "./auth.css";

const DEMO_ROLES: { role: Role; icon: typeof Shield }[] = [
  { role: "admin", icon: Shield },
  { role: "teacher", icon: BookOpen },
  { role: "student", icon: GraduationCap },
];

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 23 23">
      <path fill="#f35325" d="M1 1h10v10H1z"/>
      <path fill="#81bc06" d="M12 1h10v10H12z"/>
      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
      <path fill="#ffba08" d="M12 12h10v10H12z"/>
    </svg>
  );
}

export default function AuthPage() {
  const { t } = useTranslation();
  const { login, loginAs } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [register, setRegister] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(toLoginEmail(identifier), password);
    } catch (err) {
      setError((err as { message?: string })?.message ?? t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="au-page-wrap">
      <div className="au">
        <aside className="au-aside">
          {HAS_PUBLIC_SITE && (
            <a href="/" className="au-back">
              <ArrowLeft size={15} />
              <span>{t("nav.home")}</span>
            </a>
          )}

          <div className="au-aside-decorations">
            <svg className="au-doodle-plane" viewBox="0 0 160 90" fill="none" aria-hidden="true">
              <path
                d="M10 80 C 45 75, 70 50, 85 30 C 95 18, 115 15, 130 20"
                stroke="#eab308"
                strokeWidth="1.8"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
              <g transform="translate(125, 8) rotate(-10)">
                <polygon points="0,18 28,0 12,24" fill="#f59e0b" />
                <polygon points="12,24 28,0 20,28" fill="#d97706" />
              </g>
            </svg>

            <div className="au-dots-grid" aria-hidden="true">
              {Array.from({ length: 12 }).map((_, i) => (
                <span key={i} className="au-dot" />
              ))}
            </div>
          </div>

          <div className="au-aside-copy">
            {register ? (
              <h1>
                {t("auth.aside_join_1")}
                <br />
                <span className="au-script">{t("auth.aside_join_2")}</span>
              </h1>
            ) : (
              <h1>
                {t("auth.aside_welcome_1")}
                <br />
                <span className="au-script-wrap"><em className="au-script">{t("auth.aside_welcome_2")}</em><span className="au-brush" /></span>
              </h1>
            )}

            <p>
              {register ? t("auth.aside_join_lead") : t("auth.aside_welcome_lead")}
            </p>
          </div>

          <img src="/climb2_clean.png" alt="" className="au-art" width={1536} height={1024} />
        </aside>

        <main className="au-main">
          <div className="au-card">
            {register ? (
              <RegisterFlow
                mode="signup"
                onDone={() => {
                  if (DEMO_MODE) setRegister(false);
                }}
                onCancel={() => setRegister(false)}
              />
            ) : (
              <>
                <h2 className="au-title">
                  <span className="au-title-bar" />
                  <span>{t("auth.login")}</span>
                </h2>
                <p className="au-subtitle">{t("auth.signInTitle")}</p>

                {DEMO_MODE && (
                  <div className="au-demo">
                    <p className="au-demo-hint">{t("login.demoHint")}</p>
                    <div className="au-demo-roles">
                      {DEMO_ROLES.map(({ role, icon: Icon }) => (
                        <button key={role} type="button" onClick={() => loginAs(role)}>
                          <Icon size={16} />
                          <span>{t(`roles.${role}`)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <form onSubmit={onSubmit}>
                  <label className="au-field">
                    <span>{t("auth.emailLabel")}</span>
                    <div className="au-input">
                      <input
                        type="text"
                        placeholder={t("auth.emailPlaceholder")}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        autoComplete="username"
                      />
                    </div>
                  </label>

                  <div className="au-field">
                    <label>
                      <span>{t("auth.passwordLabel")}</span>
                    </label>
                    <div className="au-input">
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
                        className="au-eye"
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {/* Il n'y a pas de reinitialisation en libre-service :
                        les comptes utilisent une adresse interne generee
                        (prenom.nom@horizon.app), qui ne recoit aucun courriel.
                        Le lien menait donc nulle part ; il conduit desormais au
                        bloc de contact du site, seule voie reelle. */}
                    <div className="au-forgot-row">
                      <a href="/login#contact" className="au-forgot">{t("login.forgot")}</a>
                    </div>
                  </div>

                  {error && <p className="au-error">{error}</p>}

                  <button type="submit" className="au-submit" disabled={busy}>
                    <span>{busy ? t("auth.loading") : t("auth.signInBtn")}</span>
                    <ArrowRight size={18} />
                  </button>
                </form>

                <div className="au-divider">
                  <span>{t("auth.or_continue")}</span>
                </div>

                <div className="au-social-grid">
                  <button type="button" className="au-social-btn" onClick={() => loginAs("student")}>
                    <GoogleIcon />
                    <span>Google</span>
                  </button>
                  <button type="button" className="au-social-btn" onClick={() => loginAs("teacher")}>
                    <MicrosoftIcon />
                    <span>Microsoft</span>
                  </button>
                </div>

                <p className="au-alt">
                  {t("auth.notRegistered")}{" "}
                  <button type="button" onClick={() => setRegister(true)}>{t("auth.signup")}</button>
                </p>
              </>
            )}
          </div>
        </main>
      </div>

      <footer className="au-footer">
        {/* Nom et année tirés de l'i18n / de l'horloge : le pied de page affichait
            « © 2024 » en dur, qui aurait vieilli sans que personne ne le voie. */}
        <p>© {new Date().getFullYear()} {t("app.name")}. {t("hz.footer.rights")}</p>
        {/* Mentions legales et politique de confidentialite n'existent pas
            encore : deux liens vers « # » valaient moins que pas de liens. */}
      </footer>
    </div>
  );
}
