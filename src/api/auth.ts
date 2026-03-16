import apiClient from "./client";
import type { ApiResponse } from "@/types/api";
import type { LoginDto, LoginResponse, RegisterDto, ForgotPasswordDto, ResetPasswordDto, ChangePasswordDto } from "@/types/auth";
import type { User } from "@/types/user";

export const authApi = {
  login: (dto: LoginDto) =>
    apiClient.post<ApiResponse<LoginResponse>>("/auth/login", dto),

  register: (dto: RegisterDto) =>
    apiClient.post<ApiResponse<{ message: string }>>("/auth/register", dto),

  refresh: (refreshToken: string) =>
    apiClient.post<ApiResponse<{ accessToken: string }>>("/auth/refresh", { refreshToken }),

  logout: (refreshToken: string) =>
    apiClient.post<ApiResponse<{ message: string }>>("/auth/logout", { refreshToken }),

  forgotPassword: (dto: ForgotPasswordDto) =>
    apiClient.post<ApiResponse<{ message: string }>>("/auth/forgot-password", dto),

  resetPassword: (dto: ResetPasswordDto) =>
    apiClient.post<ApiResponse<{ message: string }>>("/auth/reset-password", dto),

  getMe: () => apiClient.get<ApiResponse<User>>("/auth/me"),

  changePassword: (dto: ChangePasswordDto) =>
    apiClient.patch<ApiResponse<{ message: string }>>("/users/me/password", dto),
};
