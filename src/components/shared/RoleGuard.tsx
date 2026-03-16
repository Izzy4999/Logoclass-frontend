import { useAuth } from "@/hooks/useAuth";
import type { Permission } from "@/types/role";

interface RoleGuardProps {
  permissions?: Permission[];
  superAdminOnly?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGuard({
  permissions = [],
  superAdminOnly = false,
  children,
  fallback = null,
}: RoleGuardProps) {
  const { isSuperAdmin, canAny } = useAuth();

  if (superAdminOnly && !isSuperAdmin) return <>{fallback}</>;
  if (permissions.length > 0 && !isSuperAdmin && !canAny(permissions)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
