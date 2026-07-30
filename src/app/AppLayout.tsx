import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../features/auth/AuthContext";
import { useData } from "../data/store";
import { navItemsForRole } from "./navigation";

function initials(name?: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const { role, profile, logout } = useAuth();
  const navigate = useNavigate();
  const unread = useData((s) =>
    s.notifications.filter((n) => n.userId === profile?.id && !n.read).length
  );

  const items = role ? navItemsForRole(role) : [];
  const firstName = profile?.displayName?.split(" ")[0] ?? "";

  function toggleLang() {
    i18n.changeLanguage(i18n.language === "ar" ? "fr" : "ar");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">🏫</span>
          <span className="brand-name">{t("app.name")}</span>
        </div>

        <nav className="nav">
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="side-user">
          <span className="avatar">{initials(profile?.displayName)}</span>
          <div className="side-user-meta">
            <strong>{profile?.displayName}</strong>
            {role && <span>{t(`roles.${role}`)}</span>}
          </div>
        </div>

        <div className="sidebar-footer">
          <button className="btn btn-ghost" onClick={toggleLang}>
            🌐 {i18n.language === "ar" ? "Français" : "العربية"}
          </button>
          <button className="btn btn-ghost" onClick={logout}>
            🚪 {t("nav.logout")}
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div className="topbar-greeting">
            {t("common.hello")}, {firstName} 👋
          </div>
          <div className="topbar-right">
            <div className="search-box">
              <span>🔎</span>
              <input placeholder={t("common.search")} />
            </div>
            <button
              className="icon-btn bell"
              onClick={() => navigate("/notifications")}
              aria-label={t("nav.notifications")}
            >
              🔔{unread > 0 && <span className="dot" />}
            </button>
            <span className="avatar" title={profile?.displayName}>
              {initials(profile?.displayName)}
            </span>
          </div>
        </header>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
