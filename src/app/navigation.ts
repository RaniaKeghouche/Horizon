// Which sections each role can see (RBAC at the UI level; Firestore rules enforce it too).
import type { Role } from "../lib/types";

export interface NavItem {
  path: string;
  labelKey: string;
  icon: string; // emoji keeps it dependency-free and readable for non-technical users
  roles: Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", labelKey: "nav.dashboard", icon: "🏠", roles: ["admin", "teacher", "student"] },
  { path: "/students", labelKey: "nav.students", icon: "🎓", roles: ["admin", "teacher"] },
  { path: "/teachers", labelKey: "nav.teachers", icon: "👨‍🏫", roles: ["admin"] },
  { path: "/subjects", labelKey: "nav.subjects", icon: "📚", roles: ["admin"] },
  { path: "/schedule", labelKey: "nav.schedule", icon: "🗓️", roles: ["admin", "teacher"] },
  { path: "/attendance", labelKey: "nav.attendance", icon: "✅", roles: ["admin", "teacher", "student"] },
  { path: "/payments", labelKey: "nav.payments", icon: "💰", roles: ["admin", "student"] },
  { path: "/notifications", labelKey: "nav.notifications", icon: "🔔", roles: ["admin", "teacher", "student"] },
  { path: "/analytics", labelKey: "nav.analytics", icon: "📈", roles: ["admin"] },
  { path: "/activity", labelKey: "nav.activity", icon: "📜", roles: ["admin"] },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
