import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME_ROUTE } from "@/constants";
import { Spinner } from "@/components/ui/loading";

/** Wraps /login and /register so a logged-in user is bounced to their dashboard. */
function GuestRoute() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner size={24} className="text-primary" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to={ROLE_HOME_ROUTE[user.role]} replace />;

  return <Outlet />;
}

export default GuestRoute;
