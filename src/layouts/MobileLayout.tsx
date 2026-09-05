import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Bell, LogOut, Globe, MoreHorizontal, X, Hand } from "lucide-react";
import { useAuth } from "../features/auth/AuthContext";
import { useData } from "../data/store";
import { sectionsForRole, type NavItem } from "../app/navigation";
import "./mobile.css";
import { unreadCount } from "../lib/notifications";

/** Onglets visibles en bas d'écran. Au-delà, le reste bascule dans « Plus ».
 *  Cinq cibles tactiles est le maximum tenable sur un écran de téléphone —
 *  l'élève a exactement 5 entrées, l'enseignant 7 (donc 4 + Plus). */
const MAX_TABS = 5;

function initials(name?: string): string {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
}

export default function MobileLayout() {
  const { t, i18n } = useTranslation();
  const { role, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const unread = useData((s) =>
    unreadCount(s.notifications, profile?.id)
  );

  const items: NavItem[] = role ? sectionsForRole(role).flatMap((s) => s.items) : [];
  const overflow = items.length > MAX_TABS;
  const tabs = overflow ? items.slice(0, MAX_TABS - 1) : items;
  const rest = overflow ? items.slice(MAX_TABS - 1) : [];

  const firstName = profile?.displayName?.split(" ")[0] ?? "";

  return (
    <div className="mb-shell">
      <header className="mb-header">
        <div className="mb-header-id">
          <span className="mb-avatar">{initials(profile?.displayName)}</span>
          <div>
            <strong>{t("common.hello")}, {firstName} <Hand size={17} className="greet-wave" aria-hidden="true" /></strong>
            {role && <span>{t(`roles.${role}`)}</span>}
          </div>
        </div>

        <button
          className="mb-icon-btn"
          onClick={() => navigate("/notifications")}
          aria-label={t("nav.notifications")}
        >
          <Bell size={20} />
          {unread > 0 && <span className="mb-dot" aria-hidden="true" />}
        </button>
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
            <item.icon size={21} aria-hidden="true" />
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}

        {overflow && (
          <button className="mb-tab" onClick={() => setMoreOpen(true)}>
            <MoreHorizontal size={21} aria-hidden="true" />
            <span>{t("nav.menu")}</span>
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="mb-sheet-wrap" role="dialog" aria-modal="true">
          <div className="mb-sheet-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="mb-sheet">
            <div className="mb-sheet-head">
              <strong>{t("nav.menu")}</strong>
              <button className="mb-icon-btn" onClick={() => setMoreOpen(false)} aria-label={t("common.cancel")}>
                <X size={20} />
              </button>
            </div>

            <div className="mb-sheet-grid">
              {rest.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className="mb-sheet-item"
                  onClick={() => setMoreOpen(false)}
                >
                  <item.icon size={22} aria-hidden="true" />
                  <span>{t(item.labelKey)}</span>
                </NavLink>
              ))}
            </div>

            <div className="mb-sheet-foot">
              <button
                className="mb-sheet-action"
                onClick={() => i18n.changeLanguage(i18n.language === "ar" ? "fr" : "ar")}
              >
                <Globe size={18} />
                {i18n.language === "ar" ? "Français" : "العربية"}
              </button>
              <button className="mb-sheet-action danger" onClick={logout}>
                <LogOut size={18} />
                {t("nav.logout")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
