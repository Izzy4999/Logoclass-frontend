import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { User, CreateUserDto, UpdateUserDto } from "@/types/user";

export const usersApi = {
  list: (params?: PaginationParams & { roleId?: string; isActive?: boolean }) =>
    apiClient.get<PaginatedResponse<User>>("/users", { params }),

  create: (dto: CreateUserDto) =>
    apiClient.post<ApiResponse<User>>("/users", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<User>>(`/users/${id}`),

  getMe: () => apiClient.get<ApiResponse<User>>("/users/me"),

  updateMe: (dto: UpdateUserDto) =>
    apiClient.patch<ApiResponse<User>>("/users/me", dto),

  update: (id: string, dto: UpdateUserDto) =>
    apiClient.patch<ApiResponse<User>>(`/users/${id}`, dto),

  activate: (id: string) =>
    apiClient.patch<ApiResponse<{ message: string }>>(`/users/${id}/activate`),

  deactivate: (id: string) =>
    apiClient.patch<ApiResponse<{ message: string }>>(`/users/${id}/deactivate`),

  resetPassword: (id: string) =>
    apiClient.patch<ApiResponse<{ message: string }>>(`/users/${id}/reset-password`),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/users/${id}`),
};
