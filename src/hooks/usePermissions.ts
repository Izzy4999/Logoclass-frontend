import { useAuth } from "./useAuth";
import type { Permission } from "@/types/role";

export function usePermissions() {
  const { user } = useAuth();

  const can = (permission: Permission): boolean => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return user.role?.permissions?.includes(permission) ?? false;
  };

  const canAny = (permissions: Permission[]): boolean =>
    permissions.some((p) => can(p));

  const canAll = (permissions: Permission[]): boolean =>
    permissions.every((p) => can(p));

  return { can, canAny, canAll };
}
