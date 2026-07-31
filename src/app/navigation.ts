// Which sections each role can see (RBAC at the UI level; RLS enforces it too).
import type { Role } from "../lib/types";

export interface NavItem {
  path: string;
  labelKey: string;
  icon: string; // emoji keeps it dependency-free and readable for non-technical users
  roles: Role[];
}

export interface NavSection {
  titleKey: string;
  items: NavItem[];
}

// Grouped, collapsible navigation to keep the sidebar tidy.
export const NAV_SECTIONS: NavSection[] = [
  {
    titleKey: "navGroup.home",
    items: [
      { path: "/", labelKey: "nav.dashboard", icon: "🏠", roles: ["admin", "teacher", "student"] },
    ],
  },
  {
    titleKey: "navGroup.people",
    items: [
      { path: "/students", labelKey: "nav.students", icon: "🎓", roles: ["admin", "teacher"] },
      { path: "/teachers", labelKey: "nav.teachers", icon: "👨‍🏫", roles: ["admin"] },
      { path: "/requests", labelKey: "nav.requests", icon: "📥", roles: ["admin"] },
      { path: "/subjects", labelKey: "nav.subjects", icon: "📚", roles: ["admin"] },
    ],
  },
  {
    titleKey: "navGroup.teaching",
    items: [
      { path: "/schedule", labelKey: "nav.schedule", icon: "🗓️", roles: ["admin", "teacher"] },
      { path: "/sessions", labelKey: "nav.sessions", icon: "📋", roles: ["admin", "teacher"] },
      { path: "/attendance", labelKey: "nav.attendance", icon: "✅", roles: ["admin", "teacher", "student"] },
    ],
  },
  {
    titleKey: "navGroup.finance",
    items: [
      { path: "/payments", labelKey: "nav.payments", icon: "💰", roles: ["admin", "student"] },
      { path: "/payroll", labelKey: "nav.payroll", icon: "💸", roles: ["admin", "teacher"] },
    ],
  },
  {
    titleKey: "navGroup.follow",
    items: [
      { path: "/notifications", labelKey: "nav.notifications", icon: "🔔", roles: ["admin", "teacher", "student"] },
      { path: "/analytics", labelKey: "nav.analytics", icon: "📈", roles: ["admin"] },
      { path: "/activity", labelKey: "nav.activity", icon: "📜", roles: ["admin"] },
    ],
  },
];

/** Sections with their items filtered to a role (empty sections removed). */
export function sectionsForRole(role: Role): NavSection[] {
  return NAV_SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(role)) })).filter(
    (s) => s.items.length > 0
  );
}
