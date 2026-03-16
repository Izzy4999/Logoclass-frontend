import type { User } from "./user";

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  mustChangePassword: boolean;
  user: User;
}

export interface JwtPayload {
  userId: string;
  tenantId: string | null;
  roleId: string | null;
  isSuperAdmin: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  schoolName: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
