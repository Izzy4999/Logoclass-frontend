import type { Role } from "./role";
import type { Tenant } from "./tenant";

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  role: Pick<Role, "id" | "name" | "permissions"> | null;
  tenant: Tenant | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  phone?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  roleId?: string;
}
