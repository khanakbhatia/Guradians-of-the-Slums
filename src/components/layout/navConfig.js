import {
  LayoutDashboard,
  Map,
  Siren,
  Users,
  BarChart3,
  User,
  Settings,
  Crown,
} from "lucide-react";

import { ROLES, ROUTES } from "@/constants";

/** Role-specific primary navigation — the single source of truth for all nav surfaces. */
export const ROLE_NAV = {
  [ROLES.AUTHORITY]: [
    { label: "Overview", icon: LayoutDashboard, href: ROUTES.DASHBOARD_AUTHORITY },
    { label: "Live Map", icon: Map, href: ROUTES.MAP },
    { label: "Incidents", icon: Siren, href: ROUTES.DASHBOARD_AUTHORITY, badge: 6 },
    { label: "Field Teams", icon: Users, href: ROUTES.DASHBOARD_AUTHORITY },
    { label: "Analytics", icon: BarChart3, href: ROUTES.DASHBOARD_AUTHORITY },
  ],
  [ROLES.VOLUNTEER]: [
    { label: "Overview", icon: LayoutDashboard, href: ROUTES.DASHBOARD_VOLUNTEER },
    { label: "Assigned Zones", icon: Map, href: ROUTES.MAP },
    { label: "Active Alerts", icon: Siren, href: ROUTES.DASHBOARD_VOLUNTEER, badge: 2 },
  ],
  [ROLES.CITIZEN]: [
    { label: "Overview", icon: LayoutDashboard, href: ROUTES.DASHBOARD_CITIZEN },
    { label: "Nearby Map", icon: Map, href: ROUTES.MAP },
    { label: "My Reports", icon: Siren, href: ROUTES.DASHBOARD_CITIZEN },
  ],
  [ROLES.ADMIN]: [
    { label: "Overview", icon: LayoutDashboard, href: ROUTES.DASHBOARD_ADMIN },
    { label: "Users", icon: Users, href: ROUTES.DASHBOARD_ADMIN },
    { label: "Platform", icon: Crown, href: ROUTES.DASHBOARD_ADMIN },
  ],
};

export const ACCOUNT_NAV = [
  { label: "Profile", icon: User, href: ROUTES.PROFILE },
  { label: "Settings", icon: Settings, href: ROUTES.SETTINGS },
];

/**
 * A compact 3-item subset used by the mobile bottom tab bar (Account
 * is always the trailing slot, added separately by BottomNavigation).
 */
export function bottomNavItems(role) {
  return (ROLE_NAV[role] ?? []).slice(0, 3);
}
