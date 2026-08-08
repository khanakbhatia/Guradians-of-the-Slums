import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { ROLES, ROUTES } from "@/constants";

import PublicLayout from "@/components/layout/PublicLayout";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RoleGuard from "@/components/auth/RoleGuard";
import GuestRoute from "@/components/auth/GuestRoute";
import { LoadingPanel } from "@/components/ui/loading";

import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";

// Code-split the heavier, post-login-only pages (charts, maps, leaflet.heat)
// so the marketing/auth bundle stays small for first-time visitors.
const AuthorityDashboard = lazy(() => import("@/pages/dashboard/AuthorityDashboard"));
const VolunteerDashboard = lazy(() => import("@/pages/dashboard/VolunteerDashboard"));
const CitizenDashboard = lazy(() => import("@/pages/dashboard/CitizenDashboard"));
const AdminDashboard = lazy(() => import("@/pages/dashboard/AdminDashboard"));
const MapView = lazy(() => import("@/pages/MapView"));
const IncidentDetails = lazy(() => import("@/pages/incident/IncidentDetails"));

/** Suspense fallback for lazy-loaded pages — same LoadingPanel used elsewhere, no new visual language. */
function PageFallback() {
  return <LoadingPanel label="Loading page…" />;
}

function Lazy({ children }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

/**
 * Central route table.
 *
 * - Public routes (landing) render inside PublicLayout.
 * - /login, /register, /forgot-password use PublicLayout, wrapped in
 *   GuestRoute (bounces an already-authenticated user to their dashboard).
 * - EVERY authenticated route shares a single <ProtectedRoute> +
 *   <DashboardLayout> pair, so the sidebar/navbar shell mounts once and
 *   persists across navigation (no remount/flicker when moving between
 *   a dashboard and Profile/Settings/Map — see git history for the
 *   previous per-role-wrapper structure this replaced).
 * - Role restriction for the four dashboards happens per-route via
 *   <RoleGuard>, not by forking the route tree.
 * - Dashboard/map/incident pages are lazy-loaded (see Lazy/PageFallback
 *   above) — they pull in recharts/leaflet, which the public/auth
 *   bundle doesn't need.
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path={ROUTES.HOME} element={<LandingPage />} />

        <Route element={<GuestRoute />}>
          <Route path={ROUTES.LOGIN} element={<Login />} />
          <Route path={ROUTES.REGISTER} element={<Register />} />
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
        </Route>
      </Route>

      {/* Authenticated — one shared shell for every role */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route
            path={ROUTES.DASHBOARD_AUTHORITY}
            element={
              <RoleGuard roles={[ROLES.AUTHORITY]}>
                <Lazy><AuthorityDashboard /></Lazy>
              </RoleGuard>
            }
          />
          <Route
            path={ROUTES.DASHBOARD_VOLUNTEER}
            element={
              <RoleGuard roles={[ROLES.VOLUNTEER]}>
                <Lazy><VolunteerDashboard /></Lazy>
              </RoleGuard>
            }
          />
          <Route
            path={ROUTES.DASHBOARD_CITIZEN}
            element={
              <RoleGuard roles={[ROLES.CITIZEN]}>
                <Lazy><CitizenDashboard /></Lazy>
              </RoleGuard>
            }
          />
          <Route
            path={ROUTES.DASHBOARD_ADMIN}
            element={
              <RoleGuard roles={[ROLES.ADMIN]}>
                <Lazy><AdminDashboard /></Lazy>
              </RoleGuard>
            }
          />

          <Route path={ROUTES.MAP} element={<Lazy><MapView /></Lazy>} />
          <Route path={ROUTES.INCIDENT_DETAILS} element={<Lazy><IncidentDetails /></Lazy>} />
          <Route path={ROUTES.PROFILE} element={<Profile />} />
          <Route path={ROUTES.SETTINGS} element={<Settings />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
      <Route path="*" element={<Navigate to={ROUTES.NOT_FOUND} replace />} />
    </Routes>
  );
}

export default AppRoutes;
