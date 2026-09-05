import { useEffect, useRef, useState, useMemo } from "react";
import {
  Search, Bell, Globe, LogOut, ChevronDown, ChevronRight, Hand,
  Menu, Moon,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../features/auth/AuthContext";
import { useData } from "../data/store";
import { sectionsForRole } from "./navigation";
import { unreadCount } from "../lib/notifications";
import { useTheme } from "./useTheme";

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
  const { dark, toggle: toggleTheme } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [rail, setRail] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const unread = useData((s) =>
    unreadCount(s.notifications, profile?.id)
  );

  const sections = role ? sectionsForRole(role) : [];
  const firstName = profile?.displayName?.split(" ")[0] ?? "";

  const roleLabel = useMemo(() => {
    if (role === "teacher") return t("roles.teacher");
    if (role === "student") return t("roles.student");
    return t("roles.admin");
  }, [role, t]);

  // Ctrl/⌘ + K met le curseur dans la recherche : le raccourci est affiché sur
  // le champ, il doit donc exister.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
    <div className={"app-shell" + (rail ? " rail" : "")}>
      <aside className="sidebar">
        {/* Le lockup occupe toute la largeur : le chevron de repli faisait double
            emploi avec le bouton hamburger de la barre du haut, et lui prenait
            la place necessaire pour rendre la marque a sa taille. */}
        <div className="brand">
          <img src="/horizon_H_logo.png" alt="" width={40} height={40} className="brand-logo-img" />
          <div className="brand-text-col">
            <span className="brand-name">HORIZON</span>
            <span className="brand-sub">SKILLS ACADEMY</span>
          </div>
        </div>

        {/* Role badge tag */}
        <div className="sidebar-role-tag">
          <span>{roleLabel}</span>
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
                      title={rail ? t(item.labelKey) : undefined}
                      className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
                    >
                      <span className="nav-icon"><item.icon size={18} aria-hidden="true" /></span>
                      <span className="nav-label">{t(item.labelKey)}</span>
                      {/* Le compteur de non-lus se lit sans ouvrir la page. */}
                      {item.path === "/notifications" && unread > 0 && (
                        <span className="nav-badge">{unread}</span>
                      )}
                      <ChevronRight size={14} className="nav-caret" aria-hidden="true" />
                    </NavLink>
                  ))}
              </div>
            );
          })}
        </nav>

        {/* Bascule de thème : tokens.css sait peindre les deux, useTheme le pilote. */}
        <button
          className="sidebar-theme"
          onClick={toggleTheme}
          role="switch"
          aria-checked={dark}
        >
          <span className="sidebar-theme-icon"><Moon size={16} /></span>
          <span className="sidebar-theme-label">{t("nav.dark_mode")}</span>
          <span className={"sidebar-switch" + (dark ? " on" : "")} aria-hidden="true"><i /></span>
        </button>
      </aside>

      <main className="content">
        <header className="topbar">
          <button
            className="topbar-burger"
            onClick={() => setRail((r) => !r)}
            aria-label={t(rail ? "nav.expand" : "nav.collapse")}
          >
            <Menu size={18} />
          </button>
          <div className="topbar-greeting">
            {t("common.hello")}, <b>{firstName}</b>
            <Hand size={17} className="greet-wave" aria-hidden="true" />
          </div>
          <div className="topbar-right">
            <div className="search-box">
              <Search size={16} aria-hidden="true" />
              <input
                ref={searchRef}
                placeholder={role === "student" ? t("disc.search_ph") : t("common.search")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                /* Un eleve n'a pas acces au repertoire : sa recherche porte sur
                   le catalogue de son accueil, pas sur la liste des eleves. */
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  navigate(
                    (role === "student" ? "/?q=" : "/students?q=") + encodeURIComponent(searchTerm.trim())
                  )
                }
              />
              <kbd className="search-kbd">Ctrl K</kbd>
            </div>
            <button className="icon-btn bell" onClick={() => navigate("/notifications")} aria-label={t("nav.notifications")}>
              <Bell size={18} />
              {unread > 0 && <span className="dot dot-count">{unread}</span>}
            </button>

            {/* User menu popover */}
            <div className="user-menu">
              <button className="topbar-user-btn" title={profile?.displayName} onClick={() => setMenuOpen((o) => !o)}>
                <span className="avatar">{initials(profile?.displayName)}</span>
                <ChevronDown size={15} />
              </button>
              {menuOpen && (
                <>
                  <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                  <div className="menu-pop">
                    <div className="menu-head">
                      <strong>{profile?.displayName}</strong>
                      <span className="muted small">{roleLabel}</span>
                    </div>
                    <button className="menu-item" onClick={() => { toggleLang(); setMenuOpen(false); }}>
                      <Globe size={16} /> {i18n.language === "ar" ? "Français" : "العربية"}
                    </button>
                    <button className="menu-item" onClick={() => { toggleTheme(); setMenuOpen(false); }}>
                      <Moon size={16} /> {t("nav.dark_mode")}
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
