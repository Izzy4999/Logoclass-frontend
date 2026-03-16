import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { Role, CreateRoleDto, UpdateRoleDto, Permission } from "@/types/role";

export const rolesApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Role>>("/roles", { params }),

  getPermissions: () =>
    apiClient.get<ApiResponse<Permission[]>>("/roles/permissions"),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Role>>(`/roles/${id}`),

  create: (dto: CreateRoleDto) =>
    apiClient.post<ApiResponse<Role>>("/roles", dto),

  update: (id: string, dto: UpdateRoleDto) =>
    apiClient.patch<ApiResponse<Role>>(`/roles/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/roles/${id}`),
};
