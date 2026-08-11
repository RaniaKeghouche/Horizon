// Which sections each role can see (RBAC at the UI level; RLS enforces it too).
import type { Role } from "../lib/types";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, GraduationCap, Users, Inbox, BookOpen, BookMarked,
  CalendarDays, ClipboardList, CircleCheck, Wallet, Banknote, Bell,
  TrendingUp, ScrollText,
} from "lucide-react";

export interface NavItem {
  path: string;
  labelKey: string;
  /** Lucide icon component. Emoji render inconsistently across platforms and
   *  read as text to screen readers — a real icon set keeps stroke weight and
   *  sizing uniform. */
  icon: LucideIcon;
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
      { path: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "student"] },
    ],
  },
  {
    titleKey: "navGroup.people",
    items: [
      { path: "/students", labelKey: "nav.students", icon: GraduationCap, roles: ["admin", "teacher"] },
      { path: "/teachers", labelKey: "nav.teachers", icon: Users, roles: ["admin"] },
      { path: "/requests", labelKey: "nav.requests", icon: Inbox, roles: ["admin"] },
      { path: "/subjects", labelKey: "nav.subjects", icon: BookOpen, roles: ["admin"] },
    ],
  },
  {
    titleKey: "navGroup.teaching",
    items: [
      { path: "/courses", labelKey: "nav.courses", icon: BookMarked, roles: ["student"] },
      { path: "/schedule", labelKey: "nav.schedule", icon: CalendarDays, roles: ["admin", "teacher"] },
      { path: "/sessions", labelKey: "nav.sessions", icon: ClipboardList, roles: ["admin", "teacher"] },
      { path: "/attendance", labelKey: "nav.attendance", icon: CircleCheck, roles: ["admin", "teacher", "student"] },
    ],
  },
  {
    titleKey: "navGroup.finance",
    items: [
      { path: "/payments", labelKey: "nav.payments", icon: Wallet, roles: ["admin", "student"] },
      { path: "/payroll", labelKey: "nav.payroll", icon: Banknote, roles: ["admin", "teacher"] },
    ],
  },
  {
    titleKey: "navGroup.follow",
    items: [
      { path: "/notifications", labelKey: "nav.notifications", icon: Bell, roles: ["admin", "teacher", "student"] },
      { path: "/analytics", labelKey: "nav.analytics", icon: TrendingUp, roles: ["admin"] },
      { path: "/activity", labelKey: "nav.activity", icon: ScrollText, roles: ["admin"] },
    ],
  },
];

/** Sections with their items filtered to a role (empty sections removed). */
export function sectionsForRole(role: Role): NavSection[] {
  return NAV_SECTIONS.map((s) => ({ ...s, items: s.items.filter((i) => i.roles.includes(role)) })).filter(
    (s) => s.items.length > 0
  );
}
