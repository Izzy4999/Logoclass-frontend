import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { Notification } from "@/types/notification";

export const notificationsApi = {
  list: (params?: PaginationParams & { isRead?: boolean; type?: string }) =>
    apiClient.get<PaginatedResponse<Notification>>("/notifications", { params }),

  getUnreadCount: () =>
    apiClient.get<ApiResponse<{ unreadCount: number }>>("/notifications/unread-count"),

  markAllRead: () =>
    apiClient.patch<ApiResponse<{ markedCount: number }>>("/notifications/mark-all-read"),

  markRead: (id: string) =>
    apiClient.patch<ApiResponse<Notification>>(`/notifications/${id}/read`),
};
