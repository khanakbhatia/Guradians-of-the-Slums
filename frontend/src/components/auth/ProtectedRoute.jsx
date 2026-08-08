import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/constants";
import { Spinner } from "@/components/ui/loading";

/**
 * Guards nested routes behind dummy auth — authentication only. Role
 * restriction for individual routes is handled by <RoleGuard>, applied
 * per-route inside the shared authenticated shell (see AppRoutes.jsx).
 */
function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size={24} className="text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace state={{ from: location }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
