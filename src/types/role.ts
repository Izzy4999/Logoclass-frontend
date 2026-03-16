export type Permission =
  | "MANAGE_USERS"
  | "MANAGE_ROLES"
  | "MANAGE_CLASSES"
  | "MANAGE_LESSONS"
  | "MANAGE_LIVE_CLASSES"
  | "MANAGE_ASSIGNMENTS"
  | "GRADE_ASSIGNMENTS"
  | "MANAGE_QUIZZES"
  | "MANAGE_EXAMS"
  | "CREATE_ANNOUNCEMENT"
  | "MANAGE_PAYMENTS"
  | "MARK_ATTENDANCE"
  | "VIEW_ACTION_LOGS"
  | "MANAGE_TENANT_SETTINGS";

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  isDefault: boolean;
  userCount?: number;
}

export interface CreateRoleDto {
  name: string;
  permissions: Permission[];
}

export interface UpdateRoleDto {
  name?: string;
  permissions?: Permission[];
}
