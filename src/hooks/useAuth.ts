import { useAuthStore } from "@/stores/authStore";
import { hasPermission, hasAnyPermission } from "@/lib/permissions";
import type { Permission } from "@/types/role";

export function useAuth() {
  const { user, accessToken, refreshToken, isAuthenticated, mustChangePassword, setAuth, setMustChangePassword, logout, updateUser } =
    useAuthStore();

  const can = (permission: Permission) => hasPermission(user, permission);
  const canAny = (permissions: Permission[]) => hasAnyPermission(user, permissions);

  const isAdmin = Boolean(
    !user?.isSuperAdmin && user?.role?.permissions && user.role.permissions.length > 0
  );
  const isSuperAdmin = Boolean(user?.isSuperAdmin);
  const isTeacher = Boolean(
    user?.role?.name?.toLowerCase().includes("teacher")
  );
  const isStudent = Boolean(
    user?.role?.name?.toLowerCase().includes("student")
  );
  const isParent = Boolean(
    user?.role?.name?.toLowerCase().includes("parent")
  );

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    mustChangePassword,
    setAuth,
    setMustChangePassword,
    logout,
    updateUser,
    can,
    canAny,
    isAdmin,
    isSuperAdmin,
    isTeacher,
    isStudent,
    isParent,
  };
}
