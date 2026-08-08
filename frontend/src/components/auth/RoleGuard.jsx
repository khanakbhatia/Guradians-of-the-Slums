import { Navigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { ROLE_HOME_ROUTE } from "@/constants";

/**
 * Restricts a single route's element to specific roles, without
 * introducing a new route branch (unlike ProtectedRoute's allowedRoles,
 * which forks the tree and forces DashboardLayout to remount). Used
 * for the four role dashboards, which all live under one shared
 * <DashboardLayout> in AppRoutes.
 */
function RoleGuard({ roles, children }) {
  const { user } = useAuth();

  if (!roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME_ROUTE[user.role]} replace />;
  }

  return children;
}

export default RoleGuard;
