import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../features/auth/AuthContext";
import { navItemsForRole } from "./navigation";

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const { role, profile, logout } = useAuth();

  const items = role ? navItemsForRole(role) : [];

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
          <div className="topbar-user">
            <strong>{profile?.displayName}</strong>
            {role && <span className="badge">{t(`roles.${role}`)}</span>}
          </div>
        </header>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
