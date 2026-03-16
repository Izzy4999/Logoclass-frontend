import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { LiveClass } from "@/types/notification";

export const liveClassesApi = {
  list: (params?: PaginationParams & { classId?: string; status?: string }) =>
    apiClient.get<PaginatedResponse<LiveClass>>("/live-classes", { params }),

  create: (dto: { classId: string; termId?: string; title: string; description?: string; scheduledAt: string; duration?: number; joinUrl?: string; roomName?: string }) =>
    apiClient.post<ApiResponse<LiveClass>>("/live-classes", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<LiveClass>>(`/live-classes/${id}`),

  update: (id: string, dto: Partial<{ title: string; description: string; duration: number }>) =>
    apiClient.patch<ApiResponse<LiveClass>>(`/live-classes/${id}`, dto),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/live-classes/${id}`),

  start: (id: string) =>
    apiClient.patch<ApiResponse<LiveClass>>(`/live-classes/${id}/start`),

  end: (id: string) =>
    apiClient.patch<ApiResponse<LiveClass>>(`/live-classes/${id}/end`),

  join: (id: string) =>
    apiClient.post<ApiResponse<{ token: string; url: string; roomName: string }>>(`/live-classes/${id}/join`),

  getAttendance: (id: string) =>
    apiClient.get<ApiResponse<LiveClass["attendance"]>>(`/live-classes/${id}/attendance`),

  sendMessage: (id: string, message: string) =>
    apiClient.post<ApiResponse<unknown>>(`/live-classes/${id}/messages`, { message }),

  getMessages: (id: string, params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<unknown>>(`/live-classes/${id}/messages`, { params }),
};
