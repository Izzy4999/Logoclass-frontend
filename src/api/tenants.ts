import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { Tenant, UpdateTenantDto, TenantFeature } from "@/types/tenant";

export const tenantsApi = {
  list: (params?: PaginationParams & { status?: string }) =>
    apiClient.get<PaginatedResponse<Tenant>>("/tenants", { params }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Tenant>>(`/tenants/${id}`),

  getMe: () => apiClient.get<ApiResponse<Tenant>>("/tenants/me"),

  updateMe: (dto: UpdateTenantDto) =>
    apiClient.patch<ApiResponse<Tenant>>("/tenants/me", dto),

  getFeatures: () =>
    apiClient.get<ApiResponse<TenantFeature[]>>("/tenants/me/features"),

  updateFeature: (feature: string, enabled: boolean) =>
    apiClient.patch<ApiResponse<TenantFeature>>(`/tenants/me/features/${feature}`, { enabled }),

  updateStatus: (id: string, status: string) =>
    apiClient.patch<ApiResponse<Tenant>>(`/tenants/${id}/status`, { status }),

  updateTenantFeature: (id: string, feature: string, enabled: boolean) =>
    apiClient.patch<ApiResponse<TenantFeature>>(`/tenants/${id}/features/${feature}`, { enabled }),
};
