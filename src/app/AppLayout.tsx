import { useState } from "react";
import { School, Search, Bell, Globe, LogOut, ChevronDown, ChevronRight } from "lucide-react";
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
          <span className="brand-mark"><School size={20} /></span>
          <span className="brand-name">{t("app.name")}</span>
        </div>

        <nav className="nav">
          {sections.map((section) => {
            const isCollapsed = collapsed.has(section.titleKey);
            return (
              <div className="nav-section" key={section.titleKey}>
                <button className="nav-section-head" onClick={() => toggleSection(section.titleKey)}>
                  <span>{t(section.titleKey)}</span>
                  <span className="chevron">{isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</span>
                </button>
                {!isCollapsed &&
                  section.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/"}
                      className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
                    >
                      <span className="nav-icon"><item.icon size={18} aria-hidden="true" /></span>
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

        {/* The labels sit in their own span so narrow/short layouts can hide the text
            and keep the icon — collapsing the button to an icon-only square. */}
        <div className="sidebar-footer">
          <button className="btn btn-ghost" onClick={toggleLang} title={i18n.language === "ar" ? "Français" : "العربية"}>
            <span className="btn-icon"><Globe size={16} /></span>
            <span className="btn-label">{i18n.language === "ar" ? "Français" : "العربية"}</span>
          </button>
          <button className="btn btn-ghost" onClick={logout} title={t("nav.logout")}>
            <span className="btn-icon"><LogOut size={16} /></span>
            <span className="btn-label">{t("nav.logout")}</span>
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
              <Search size={16} aria-hidden="true" />
              <input
                placeholder={t("common.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && navigate(`/students?q=${encodeURIComponent(searchTerm.trim())}`)}
              />
            </div>
            <button className="icon-btn bell" onClick={() => navigate("/notifications")} aria-label={t("nav.notifications")}>
              <Bell size={18} />{unread > 0 && <span className="dot" />}
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
                      <Globe size={16} /> {i18n.language === "ar" ? "Français" : "العربية"}
                    </button>
                    <button className="menu-item danger" onClick={() => { setMenuOpen(false); logout(); }}>
                      <LogOut size={16} /> {t("nav.logout")}
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
