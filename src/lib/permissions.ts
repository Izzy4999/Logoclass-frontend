import type { Permission } from "@/types/role";
import type { User } from "@/types/user";

export const ALL_PERMISSIONS: Permission[] = [
  "MANAGE_USERS",
  "MANAGE_ROLES",
  "MANAGE_CLASSES",
  "MANAGE_LESSONS",
  "MANAGE_LIVE_CLASSES",
  "MANAGE_ASSIGNMENTS",
  "GRADE_ASSIGNMENTS",
  "MANAGE_QUIZZES",
  "MANAGE_EXAMS",
  "CREATE_ANNOUNCEMENT",
  "MANAGE_PAYMENTS",
  "MARK_ATTENDANCE",
  "VIEW_ACTION_LOGS",
  "MANAGE_TENANT_SETTINGS",
];

export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  return user.role?.permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(user, p));
}
