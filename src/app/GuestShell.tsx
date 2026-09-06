import { NavLink, Outlet } from "react-router-dom";
import { LANGUAGES } from "../lib/i18n";
import { useTranslation } from "react-i18next";
import {
  Globe, LogOut, Compass, FileClock, Moon, ArrowRight, BadgeCheck, MapPin,
  CalendarDays, Phone, Lock, BookMarked, Wallet, Check, Clock,
} from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import { useData } from "../data/store";
import { useTheme } from "./useTheme";
import { SCHOOL } from "../lib/school";
import { schoolYear, dossierRef, dossierSteps, dossierProgress } from "../lib/dossier";
import { formatDate } from "../lib/format";
import SyncBanner from "../components/SyncBanner";
import "../features/discover/discover.css";

function initials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

/** Ce qui est ouvert maintenant, et ce qui s'ouvrira a la validation. */
const NAV = [
  { to: "/", icon: Compass, labelKey: "disc.explore", open: true },
  { to: "/status", icon: FileClock, labelKey: "disc.my_request", open: true },
  { to: null, icon: BookMarked, labelKey: "nav.courses", open: false },
  { to: null, icon: CalendarDays, labelKey: "nav.schedule", open: false },
  { to: null, icon: Wallet, labelKey: "nav.payments", open: false },
] as const;

/**
 * Coque des comptes en attente de validation.
 *
 * Avant, un compte non valide ne voyait qu'un ecran d'attente : impossible de
 * savoir ce que l'ecole enseigne, ni avec qui, tant que l'administration
 * n'avait pas repondu. Les eleves et les parents entrent desormais tout de
 * suite dans le catalogue — matieres, enseignants, groupes ouverts — et
 * peuvent reserver leurs groupes ; la validation ne conditionne plus que
 * l'acces aux donnees personnelles (presences, paiements, notes).
 *
 * La mise en page est celle d'un portail administratif et non du shell
 * applicatif : bandeau institutionnel, navigation horizontale, et l'etat du
 * dossier en evidence. Les pages encore fermees restent visibles, marquees
 * « en attente » : savoir ce qui arrive vaut mieux qu'une barre laterale
 * amputee, tant qu'aucune ne fait semblant d'etre cliquable.
 */
export default function GuestShell() {
  const { t, i18n } = useTranslation();
  const { profile, email, uid, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const request = useData((s) => s.registrationRequests.find((r) => r.id === uid));

  const name = profile?.displayName || request?.name || email?.split("@")[0] || "";
  const firstName = name.split(" ")[0] || name;
  const steps = request ? dossierSteps(request) : [];
  const progress = dossierProgress(steps);

  return (
    <div className="guest-portal">
      {/* -------------------------------------------- bandeau institutionnel */}
      <div className="gp-official">
        <div className="gp-official-in">
          <span className="gp-tag"><BadgeCheck size={12} /> {t("gp.official")}</span>
          <span className="gp-official-title">{t("gp.portal", { year: schoolYear() })}</span>
          {SCHOOL.city && (
            <span className="gp-official-item"><MapPin size={12} /> {SCHOOL.name} — {SCHOOL.city}</span>
          )}
          <span className="gp-official-end">
            <span className="gp-official-item"><CalendarDays size={12} /> {t("gp.year")} {schoolYear()}</span>
            {/* Le numero n'apparait que s'il est configure : afficher un contact
                invente sur un bandeau officiel serait pire que ne rien afficher. */}
            {SCHOOL.phone && (
              <a className="gp-official-item" href={`tel:${SCHOOL.phone.replace(/\s/g, "")}`}>
                <Phone size={12} /> {SCHOOL.phone}
              </a>
            )}
          </span>
        </div>
      </div>

      {/* ------------------------------------------------ navigation du haut */}
      <header className="gp-nav">
        <div className="gp-nav-in">
          <div className="brand gp-brand">
            <img src="/horizon_H_logo.png" alt="" width={34} height={34} className="brand-logo-img" />
            <div className="brand-text-col">
              <span className="brand-name">HORIZON</span>
              <span className="brand-sub">SKILLS ACADEMY</span>
            </div>
          </div>

          <span className="gp-role">{t("roles.student")}</span>

          <nav className="gp-links">
            {NAV.map((item) =>
              item.open ? (
                <NavLink
                  key={item.labelKey}
                  to={item.to!}
                  end={item.to === "/"}
                  className={({ isActive }) => "gp-link" + (isActive ? " active" : "")}
                >
                  <item.icon size={16} aria-hidden="true" />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              ) : (
                // Le cadenas seul : « En attente » ecrit trois fois de suite
                // faisait deborder la barre sans rien apprendre de plus.
                <span
                  key={item.labelKey}
                  className="gp-link locked"
                  title={`${t("gp.locked")} — ${t("gp.locked_hint")}`}
                >
                  <item.icon size={16} aria-hidden="true" />
                  <span>{t(item.labelKey)}</span>
                  <em className="gp-lock" aria-label={t("gp.locked")}><Lock size={11} aria-hidden="true" /></em>
                </span>
              )
            )}
          </nav>

          <div className="gp-nav-end">
            <div className="gp-langs" role="group" aria-label={t("common.language")}>
              <Globe size={15} aria-hidden="true" />
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={"gp-lang" + (i18n.language === l.code ? " on" : "")}
                  aria-pressed={i18n.language === l.code}
                  onClick={() => i18n.changeLanguage(l.code)}
                >
                  {l.short}
                </button>
              ))}
            </div>
            <button className="gp-icon-btn" onClick={toggleTheme} role="switch" aria-checked={dark} aria-label={t("nav.dark_mode")}>
              <Moon size={16} />
            </button>
            <div className="gp-user">
              <span className="avatar">{initials(name)}</span>
              <span className="gp-user-meta">
                <strong>{firstName}</strong>
                <em>{t("gp.user_state")}</em>
              </span>
            </div>
            <button className="gp-icon-btn danger" onClick={logout} aria-label={t("nav.logout")}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="page gp-page">
        {/* Une erreur de base de donnees pendant l'inscription serait invisible
            ici : AppLayout, qui porte habituellement ce bandeau, n'est pas rendu. */}
        <SyncBanner />

        {/* ------------------------------------------------------- le dossier */}
        <section className="gp-hero">
          <div className="gp-hero-main">
            {request && (
              <span className="gp-hero-ref">
                <span className="gp-dot" aria-hidden="true" />
                {t("gp.file_no")} {dossierRef(request.id, new Date(request.createdAt))}
                <b>·</b>
                {t("gp.file_status")}
              </span>
            )}
            <h1>
              {t("gp.hello")} <span className="gp-name">{firstName}</span> — {t("gp.hello_tail")}
            </h1>
            <p>{t("disc.pending_body")}</p>
            <div className="gp-hero-actions">
              <NavLink to="/status" className="gp-cta">
                <span>{t("disc.pending_cta")}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </NavLink>
              {/* La date de depot est un fait ; un delai promis n'en serait pas un. */}
              {request && (
                <span className="gp-since">
                  <Clock size={14} aria-hidden="true" />
                  {t("gp.filed_on", { date: formatDate(request.createdAt) })}
                </span>
              )}
            </div>
          </div>

          {steps.length > 0 && (
            <aside className="gp-progress">
              <span className="gp-progress-k">{t("gp.progress_title")}</span>
              <div className="gp-progress-top">
                <strong>{t("gp.progress_sub", { year: schoolYear() })}</strong>
                <b className="gp-pct">{progress}%</b>
              </div>
              <div className="gp-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                <i style={{ width: `${progress}%` }} />
              </div>
              <ul className="gp-steps">
                {steps.map((s) => (
                  <li key={s.key} className={s.done ? "done" : ""}>
                    <span className="gp-step-mark" aria-hidden="true">
                      {s.done ? <Check size={12} /> : <Clock size={12} />}
                    </span>
                    <span className="gp-step-label">{t("gp.step_" + s.key)}</span>
                    <em>{s.done ? t("gp.step_ok") : t("gp.step_wait")}</em>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </section>

        <Outlet />
      </div>
    </div>
  );
}
