import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../features/auth/AuthContext";
import { useData } from "../data/store";
import { sectionsForRole } from "./navigation";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const unread = useData((s) =>
    s.notifications.filter((n) => n.userId === profile?.id && !n.read).length
  );

  const sections = role ? sectionsForRole(role) : [];
  const firstName = profile?.displayName?.split(" ")[0] ?? "";

  function toggleLang() {
    i18n.changeLanguage(i18n.language === "ar" ? "fr" : "ar");
  }
  function toggleSection(key: string) {
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">🏫</span>
          <span className="brand-name">{t("app.name")}</span>
        </div>

        <nav className="nav">
          {sections.map((section) => {
            const isCollapsed = collapsed.has(section.titleKey);
            return (
              <div className="nav-section" key={section.titleKey}>
                <button className="nav-section-head" onClick={() => toggleSection(section.titleKey)}>
                  <span>{t(section.titleKey)}</span>
                  <span className="chevron">{isCollapsed ? "▸" : "▾"}</span>
                </button>
                {!isCollapsed &&
                  section.items.map((item) => (
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
              </div>
            );
          })}
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
              <input
                placeholder={t("common.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/students?q=${encodeURIComponent(searchTerm.trim())}`)}
              />
            </div>
            <button className="icon-btn bell" onClick={() => navigate("/notifications")} aria-label={t("nav.notifications")}>
              🔔{unread > 0 && <span className="dot" />}
            </button>

            {/* User menu — always-visible logout */}
            <div className="user-menu">
              <button className="avatar" title={profile?.displayName} onClick={() => setMenuOpen((o) => !o)}>
                {initials(profile?.displayName)}
              </button>
              {menuOpen && (
                <>
                  <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="menu-pop">
                    <div className="menu-head">
                      <strong>{profile?.displayName}</strong>
                      {role && <span className="muted small">{t(`roles.${role}`)}</span>}
                    </div>
                    <button className="menu-item" onClick={() => { toggleLang(); setMenuOpen(false); }}>
                      🌐 {i18n.language === "ar" ? "Français" : "العربية"}
                    </button>
                    <button className="menu-item danger" onClick={() => { setMenuOpen(false); logout(); }}>
                      🚪 {t("nav.logout")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <div className="page">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
