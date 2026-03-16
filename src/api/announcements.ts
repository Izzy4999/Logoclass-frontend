import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { Announcement } from "@/types/notification";

export const announcementsApi = {
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Announcement>>("/announcements", { params }),

  create: (dto: { title: string; content: string; targetRoles: string[]; classId?: string; endDate?: string }) =>
    apiClient.post<ApiResponse<Announcement>>("/announcements", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Announcement>>(`/announcements/${id}`),

  update: (id: string, dto: Partial<{ title: string; content: string; targetRoles: string[]; endDate: string }>) =>
    apiClient.patch<ApiResponse<Announcement>>(`/announcements/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/announcements/${id}`),
};
