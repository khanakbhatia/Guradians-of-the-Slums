// Centralized app constants. Keep magic strings/numbers out of components.

export const APP_NAME = "Guardians of the Slums";

export const MAP_DEFAULTS = {
  center: [
    Number(import.meta.env.VITE_MAP_DEFAULT_LAT) || 19.076,
    Number(import.meta.env.VITE_MAP_DEFAULT_LNG) || 72.8777,
  ],
  zoom: Number(import.meta.env.VITE_MAP_DEFAULT_ZOOM) || 12,
};

/** User roles supported by the dummy auth system. */
export const ROLES = {
  AUTHORITY: "authority",
  VOLUNTEER: "volunteer",
  CITIZEN: "citizen",
  ADMIN: "admin",
};

export const ROLE_LABELS = {
  [ROLES.AUTHORITY]: "Authority",
  [ROLES.VOLUNTEER]: "Volunteer",
  [ROLES.CITIZEN]: "Citizen",
  [ROLES.ADMIN]: "Admin",
};

export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  DASHBOARD_AUTHORITY: "/dashboard/authority",
  DASHBOARD_VOLUNTEER: "/dashboard/volunteer",
  DASHBOARD_CITIZEN: "/dashboard/citizen",
  DASHBOARD_ADMIN: "/dashboard/admin",
  MAP: "/dashboard/map",
  INCIDENT_DETAILS: "/dashboard/incidents/:id",
  PROFILE: "/profile",
  SETTINGS: "/settings",
  NOT_FOUND: "/404",
};

export function incidentDetailsPath(id) {
  return `/dashboard/incidents/${id}`;
}

/** Where each role lands after login. */
export const ROLE_HOME_ROUTE = {
  [ROLES.AUTHORITY]: ROUTES.DASHBOARD_AUTHORITY,
  [ROLES.VOLUNTEER]: ROUTES.DASHBOARD_VOLUNTEER,
  [ROLES.CITIZEN]: ROUTES.DASHBOARD_CITIZEN,
  [ROLES.ADMIN]: ROUTES.DASHBOARD_ADMIN,
};

/**
 * Breadcrumb trail per exact route path. Any path not listed here falls
 * back to a trail built from its URL segments (see Breadcrumbs.jsx).
 */
export const ROUTE_BREADCRUMBS = {
  [ROUTES.DASHBOARD_AUTHORITY]: ["Dashboard", "Authority"],
  [ROUTES.DASHBOARD_VOLUNTEER]: ["Dashboard", "Volunteer"],
  [ROUTES.DASHBOARD_CITIZEN]: ["Dashboard", "Citizen"],
  [ROUTES.DASHBOARD_ADMIN]: ["Dashboard", "Admin"],
  [ROUTES.MAP]: ["Dashboard", "Live Map"],
  [ROUTES.PROFILE]: ["Account", "Profile"],
  [ROUTES.SETTINGS]: ["Account", "Settings"],
};
