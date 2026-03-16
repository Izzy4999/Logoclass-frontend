import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { Conversation, Message } from "@/types/notification";

export const messagingApi = {
  listConversations: () =>
    apiClient.get<ApiResponse<Conversation[]>>("/messaging/conversations"),

  createConversation: (participantIds: string[]) =>
    apiClient.post<ApiResponse<Conversation>>("/messaging/conversations", { participantIds }),

  sendMessage: (conversationId: string, dto: { content: string; attachments?: string[] }) =>
    apiClient.post<ApiResponse<Message>>(`/messaging/conversations/${conversationId}/messages`, dto),

  getMessages: (conversationId: string, params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Message>>(`/messaging/conversations/${conversationId}/messages`, { params }),

  markRead: (conversationId: string) =>
    apiClient.patch<ApiResponse<{ id: string; lastReadAt: string }>>(`/messaging/conversations/${conversationId}/read`),
};
