import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, LogOut, Globe, MoreHorizontal, X, Search, Moon, ChevronRight } from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import { useData } from "../data/store";
import { useTheme } from "../app/useTheme";
import { sectionsForRole, type NavItem } from "../app/navigation";
import { unreadCount } from "../lib/notifications";
import "./mobile.css";

/** Onglets visibles en bas d'écran. Au-delà, le reste bascule dans « Plus ».
 *  Cinq cibles tactiles est le maximum tenable sur un écran de téléphone —
 *  l'élève a exactement 5 entrées, l'enseignant 7 (donc 4 + Plus). */
const MAX_TABS = 5;

function initials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

/**
 * La forme tactile de l'application.
 *
 * Ce n'est pas la version bureau rétrécie : l'en-tête porte l'identité, la
 * date et la recherche ; la navigation vit dans une barre flottante en bas, à
 * portée du pouce ; le reste défile dessous.
 *
 * Trois choses la distinguent du bureau, et elles tiennent au support :
 *   - la recherche est visible d'emblée (pas de raccourci clavier ici) ;
 *   - l'onglet actif est marqué par une pastille pleine, lisible en marchant,
 *     là où le bureau se contente d'un fond discret ;
 *   - tout ce qui se touche fait au moins 44 px de haut.
 */
export default function MobileLayout() {
  const { t, i18n } = useTranslation();
  const { role, profile, logout } = useAuth();
  const { dark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const [term, setTerm] = useState("");

  const unread = useData((s) => unreadCount(s.notifications, profile?.id));

  const items: NavItem[] = role ? sectionsForRole(role).flatMap((s) => s.items) : [];
  const overflow = items.length > MAX_TABS;
  const tabs = overflow ? items.slice(0, MAX_TABS - 1) : items;
  const rest = overflow ? items.slice(MAX_TABS - 1) : [];

  const firstName = profile?.displayName?.split(" ")[0] ?? "";
  const today = new Intl.DateTimeFormat(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  /** Un élève n'a pas accès au répertoire : sa recherche porte sur le catalogue. */
  function search() {
    const q = term.trim();
    if (!q) return;
    navigate((role === "student" ? "/?q=" : "/students?q=") + encodeURIComponent(q));
  }

  return (
    <div className="mb-shell">
      <header className="mb-header">
        <div className="mb-header-top">
          <span className="mb-avatar">{initials(profile?.displayName)}</span>
          <div className="mb-header-id">
            <strong>{t("common.hello")}, {firstName}</strong>
            <span>{today}</span>
          </div>

          <button
            className="mb-icon-btn"
            onClick={() => navigate("/notifications")}
            aria-label={t("nav.notifications")}
          >
            <Bell size={20} />
            {unread > 0 && <span className="mb-badge">{unread > 9 ? "9+" : unread}</span>}
          </button>
          <button className="mb-icon-btn" onClick={() => setMoreOpen(true)} aria-label={t("nav.menu")}>
            <MoreHorizontal size={20} />
          </button>
        </div>

        {/* Sur un téléphone il n'y a pas de raccourci clavier : la recherche
            doit être visible, pas cachée derrière un Ctrl+K. */}
        <label className="mb-search">
          <Search size={16} aria-hidden="true" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder={role === "student" ? t("disc.search_ph") : t("common.search")}
            aria-label={t("common.search")}
            enterKeyHint="search"
          />
        </label>
      </header>

      <main className="mb-content">
        <Outlet />
      </main>

      <nav className="mb-tabbar" aria-label={t("nav.menu")}>
        {tabs.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) => "mb-tab" + (isActive ? " active" : "")}
          >
            <span className="mb-tab-pill">
              <item.icon size={20} aria-hidden="true" />
              {item.path === "/notifications" && unread > 0 && <i className="mb-tab-dot" />}
            </span>
            <span className="mb-tab-label">{t(item.labelKey)}</span>
          </NavLink>
        ))}

        {overflow && (
          <button className="mb-tab" onClick={() => setMoreOpen(true)}>
            <span className="mb-tab-pill"><MoreHorizontal size={20} aria-hidden="true" /></span>
            <span className="mb-tab-label">{t("nav.menu")}</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="mb-sheet-wrap" role="dialog" aria-modal="true">
          <div className="mb-sheet-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="mb-sheet">
            {/* Poignée : le geste attendu sur une feuille qui monte du bas. */}
            <span className="mb-sheet-grip" aria-hidden="true" />

            <div className="mb-sheet-head">
              <div>
                <strong>{profile?.displayName}</strong>
                {role && <span>{t(`roles.${role}`)}</span>}
              </div>
              <button className="mb-icon-btn ghost" onClick={() => setMoreOpen(false)} aria-label={t("common.cancel")}>
                <X size={20} />
              </button>
            </div>

            {rest.length > 0 && (
              <div className="mb-sheet-grid">
                {rest.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className="mb-sheet-item"
                    onClick={() => setMoreOpen(false)}
                  >
                    <span className="mb-sheet-icon"><item.icon size={20} aria-hidden="true" /></span>
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                ))}
              </div>
            )}

            <div className="mb-sheet-foot">
              <button
                className="mb-sheet-action"
                onClick={() => i18n.changeLanguage(i18n.language === "ar" ? "fr" : "ar")}
              >
                <Globe size={18} />
                <span>{i18n.language === "ar" ? "Français" : "العربية"}</span>
                <ChevronRight size={16} className="mb-sheet-go" />
              </button>
              <button className="mb-sheet-action" onClick={toggleTheme} role="switch" aria-checked={dark}>
                <Moon size={18} />
                <span>{t("nav.dark_mode")}</span>
                <span className={"mb-switch" + (dark ? " on" : "")} aria-hidden="true"><i /></span>
              </button>
              <button className="mb-sheet-action danger" onClick={logout}>
                <LogOut size={18} />
                <span>{t("nav.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
