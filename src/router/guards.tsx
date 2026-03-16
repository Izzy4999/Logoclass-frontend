import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Permission } from "@/types/role";

/** Redirect to /login if not authenticated; redirect to /change-password if must change */
export function ProtectedRoute() {
  const { isAuthenticated, mustChangePassword } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}

/** Redirect to /dashboard if already authenticated */
export function GuestRoute() {
  const { isAuthenticated, mustChangePassword } = useAuth();
  if (isAuthenticated && !mustChangePassword) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

/** Only accessible when authenticated AND mustChangePassword is true */
export function ForcePasswordChangeRoute() {
  const { isAuthenticated, mustChangePassword } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!mustChangePassword) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

/** Super admin only */
export function SuperAdminRoute() {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}

/** Permission-gated route */
interface PermissionRouteProps {
  permissions: Permission[];
}
export function PermissionRoute({ permissions }: PermissionRouteProps) {
  const { canAny, isSuperAdmin } = useAuth();
  if (isSuperAdmin || canAny(permissions)) {
    return <Outlet />;
  }
  return <Navigate to="/dashboard" replace />;
}
